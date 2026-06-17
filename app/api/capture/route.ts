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

async function readText(req: NextRequest): Promise<{ text: string; source: string }> {
  const ctype = req.headers.get("content-type") ?? "";
  let text = "";
  let source = "ios-shortcut";
  try {
    if (ctype.includes("application/json")) {
      const b = await req.json();
      text = String(b.text ?? b.note ?? b.content ?? "");
      if (b.source) source = String(b.source);
    } else if (ctype.includes("form")) {
      const f = await req.formData();
      text = String(f.get("text") ?? f.get("note") ?? f.get("content") ?? "");
      if (f.get("source")) source = String(f.get("source"));
    } else {
      text = await req.text();
    }
  } catch {
    text = "";
  }
  return { text: text.trim(), source };
}

export async function POST(req: NextRequest) {
  if (CAPTURE_TOKEN && extractToken(req) !== CAPTURE_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { text, source } = await readText(req);
  if (!text) return NextResponse.json({ error: "empty capture" }, { status: 400 });

  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  await mkdir(STREAM_DIR, { recursive: true });
  const file = path.join(STREAM_DIR, `${day}.md`);
  const entry = `\n## ${now.toISOString()} · ${source}\n\n${text}\n`;
  await appendFile(file, entry, "utf8");

  return NextResponse.json({
    ok: true,
    capturedAt: now.toISOString(),
    file: `${day}.md`,
    chars: text.length,
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: "POST { text } here (Bearer token) to capture a fragment into the Stream.",
  });
}
