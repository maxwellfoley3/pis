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

// Pull a text fragment out of whatever shape the client sent — JSON (any common
// key, or the first string value), urlencoded/form, or a raw text body.
function pickText(raw: string, ctype: string, url: URL): { text: string; source: string } {
  let source = "ios-shortcut";
  const keys = ["text", "note", "content", "body", "input", "value"];

  if (ctype.includes("application/json")) {
    try {
      const j = JSON.parse(raw);
      if (j && typeof j === "object") {
        if (typeof j.source === "string") source = j.source;
        for (const k of keys) {
          if (typeof j[k] === "string" && j[k].trim()) return { text: j[k].trim(), source };
        }
        // fall back to the first non-empty string value in the object
        for (const v of Object.values(j)) {
          if (typeof v === "string" && v.trim()) return { text: v.trim(), source };
        }
      } else if (typeof j === "string" && j.trim()) {
        return { text: j.trim(), source };
      }
    } catch {
      // not valid JSON despite the header — treat the raw body as the text
      if (raw.trim()) return { text: raw.trim(), source };
    }
  }

  if (ctype.includes("urlencoded") || ctype.includes("form")) {
    try {
      const p = new URLSearchParams(raw);
      if (p.get("source")) source = p.get("source")!;
      for (const k of keys) {
        const v = p.get(k);
        if (v && v.trim()) return { text: v.trim(), source };
      }
    } catch {
      /* fall through */
    }
  }

  // query string fallback (e.g. ?text=...)
  for (const k of keys) {
    const v = url.searchParams.get(k);
    if (v && v.trim()) return { text: v.trim(), source };
  }

  // last resort: the entire raw body is the fragment
  return { text: raw.trim(), source };
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
