import { NextRequest, NextResponse } from "next/server";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

// The Stream: raw firehose capture lands here as portable, append-only markdown,
// one file per day under documents/pis/stream/.
const STREAM_DIR =
  process.env.STREAM_DIR ?? path.resolve(process.cwd(), "../../documents/pis/stream");
const CAPTURE_TOKEN = process.env.CAPTURE_TOKEN;

// A capture starting with `/log` is routed to LifeOS's daily log instead of the
// Stream. LifeOS owns the log format and the "current day" rule (its own 7am
// boundary), so we forward to its endpoint rather than touch its data files.
const LIFEOS_LOG_URL =
  process.env.LIFEOS_LOG_URL ?? "http://localhost:3001/api/log/add";

// Matches a `/log` command word and captures the rest as the entry. Requires a
// word boundary so `/logging ...` is NOT treated as a command.
const LOG_COMMAND = /^\/log\b[ \t]*([\s\S]*)$/;

function extractToken(req: NextRequest): string {
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.replace(/^Bearer\s+/i, "").trim();
  if (bearer) return bearer;
  return new URL(req.url).searchParams.get("token")?.trim() ?? "";
}

// Pull a text fragment out of whatever shape the client sent — JSON (a known
// text key), urlencoded/form, raw text body, or a query param. Deliberately does
// NOT fall back to arbitrary values (e.g. `source`) or the raw JSON string, so a
// misconfigured client that sends empty text fails loudly with 400 rather than
// silently capturing the wrong thing.
const TEXT_KEYS = ["text", "note", "content", "body", "input", "value"];

function fromQuery(url: URL): string {
  for (const k of TEXT_KEYS) {
    const v = url.searchParams.get(k);
    if (v && v.trim()) return v.trim();
  }
  return "";
}

function pickText(raw: string, ctype: string, url: URL): { text: string; source: string } {
  let source = "ios-shortcut";

  if (ctype.includes("application/json")) {
    try {
      const j = JSON.parse(raw);
      if (j && typeof j === "object") {
        if (typeof j.source === "string" && j.source.trim()) source = j.source.trim();
        for (const k of TEXT_KEYS) {
          if (typeof j[k] === "string" && j[k].trim()) return { text: j[k].trim(), source };
        }
        // Valid JSON but no non-empty text key → empty (do NOT capture the raw JSON).
        return { text: fromQuery(url), source };
      }
      if (typeof j === "string" && j.trim()) return { text: j.trim(), source };
    } catch {
      // Header says JSON but body isn't valid JSON — treat the raw body as text.
      if (raw.trim()) return { text: raw.trim(), source };
    }
    return { text: fromQuery(url), source };
  }

  if (ctype.includes("urlencoded") || ctype.includes("form")) {
    const p = new URLSearchParams(raw);
    if (p.get("source")?.trim()) source = p.get("source")!.trim();
    for (const k of TEXT_KEYS) {
      const v = p.get(k);
      if (v && v.trim()) return { text: v.trim(), source };
    }
    return { text: fromQuery(url), source };
  }

  // Plain text / unknown content type: the raw body is the fragment.
  return { text: raw.trim() || fromQuery(url), source };
}

async function appendToStream(text: string, source: string, now: Date): Promise<string> {
  const day = now.toISOString().slice(0, 10);
  await mkdir(STREAM_DIR, { recursive: true });
  const file = path.join(STREAM_DIR, `${day}.md`);
  const entry = `\n## ${now.toISOString()} · ${source}\n\n${text}\n`;
  await appendFile(file, entry, "utf8");
  return day;
}

// Forward a `/log` entry to LifeOS. Time-boxed so a down/slow LifeOS can't hang
// the capture request; caller handles failure by falling back to the Stream.
async function forwardToLifeOsLog(entry: string): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    return await fetch(LIFEOS_LOG_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ entry }),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  if (CAPTURE_TOKEN && extractToken(req) !== CAPTURE_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const ctype = req.headers.get("content-type") ?? "";
  const raw = await req.text();
  const { text, source } = pickText(raw, ctype, url);

  // Diagnostic log so we can see exactly what a client (e.g. iOS Shortcut) sends.
  console.log("[capture]", {
    ctype,
    rawLen: raw.length,
    rawPreview: raw.slice(0, 300),
    parsedChars: text.length,
  });

  if (!text) {
    return NextResponse.json(
      { error: "empty capture", hint: "send { \"text\": \"...\" } as JSON, or a raw text body", got: { ctype, rawLen: raw.length } },
      { status: 400 },
    );
  }

  // `/log ...` → LifeOS daily log instead of the Stream.
  const logMatch = text.match(LOG_COMMAND);
  if (logMatch) {
    const logEntry = logMatch[1].trim();
    if (!logEntry) {
      return NextResponse.json(
        { error: "empty /log entry", hint: "write `/log <what happened>`" },
        { status: 400 },
      );
    }
    try {
      const res = await forwardToLifeOsLog(logEntry);
      if (!res.ok) throw new Error(`LifeOS responded ${res.status}`);
      const data = (await res.json().catch(() => ({}))) as { time?: string };
      return NextResponse.json({
        ok: true,
        routedTo: "lifeos-log",
        time: data.time ?? null,
        chars: logEntry.length,
      });
    } catch (err) {
      // Never lose a capture: if LifeOS is unreachable, keep it in the Stream
      // (with the `/log` prefix intact) and report the fallback.
      const now = new Date();
      const day = await appendToStream(text, source, now);
      return NextResponse.json({
        ok: true,
        routedTo: "stream-fallback",
        warning: `LifeOS log unreachable (${(err as Error).message}); saved to Stream instead`,
        file: `${day}.md`,
        chars: text.length,
      });
    }
  }

  const now = new Date();
  const day = await appendToStream(text, source, now);

  return NextResponse.json({ ok: true, capturedAt: now.toISOString(), file: `${day}.md`, chars: text.length });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: "POST { text } here (Bearer token) to capture a fragment into the Stream. Prefix with `/log ` to route it to LifeOS's daily log instead.",
  });
}
