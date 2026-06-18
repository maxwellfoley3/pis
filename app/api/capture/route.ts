import { NextRequest, NextResponse } from "next/server";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

// The Stream: raw firehose capture lands here as portable, append-only markdown,
// one file per day under documents/pis/stream/.
const STREAM_DIR =
  process.env.STREAM_DIR ?? path.resolve(process.cwd(), "../../documents/pis/stream");
const CAPTURE_TOKEN = process.env.CAPTURE_TOKEN;

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

  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  await mkdir(STREAM_DIR, { recursive: true });
  const file = path.join(STREAM_DIR, `${day}.md`);
  const entry = `\n## ${now.toISOString()} · ${source}\n\n${text}\n`;
  await appendFile(file, entry, "utf8");

  return NextResponse.json({ ok: true, capturedAt: now.toISOString(), file: `${day}.md`, chars: text.length });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: "POST { text } here (Bearer token) to capture a fragment into the Stream.",
  });
}
