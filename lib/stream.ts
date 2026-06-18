import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export type Fragment = {
  ts: string; // ISO timestamp
  source: string;
  text: string;
  file: string; // e.g. 2026-06-18.md
};

export const STREAM_DIR =
  process.env.STREAM_DIR ?? path.resolve(process.cwd(), "../../documents/pis/stream");

// Each entry is written as: "\n## <iso> · <source>\n\n<text>\n"
function parseFile(content: string, file: string): Fragment[] {
  const out: Fragment[] = [];
  const blocks = ("\n" + content).split(/\n## /).slice(1); // drop preamble before first header
  for (const block of blocks) {
    const nl = block.indexOf("\n");
    const header = (nl === -1 ? block : block.slice(0, nl)).trim();
    const text = (nl === -1 ? "" : block.slice(nl + 1)).trim();
    const m = header.match(/^(\S+)\s*·\s*(.*)$/);
    if (!m) continue;
    out.push({ ts: m[1], source: m[2].trim() || "unknown", text, file });
  }
  return out;
}

export async function readStream(): Promise<Fragment[]> {
  let files: string[];
  try {
    files = (await readdir(STREAM_DIR)).filter((f) => f.endsWith(".md"));
  } catch {
    return []; // no stream dir yet
  }
  const all: Fragment[] = [];
  for (const f of files) {
    try {
      const content = await readFile(path.join(STREAM_DIR, f), "utf8");
      all.push(...parseFile(content, f));
    } catch {
      /* skip unreadable file */
    }
  }
  // newest first
  all.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
  return all;
}
