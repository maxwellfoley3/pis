import { readdir, readFile, writeFile, unlink, mkdir } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import type { GardenNote, NewNote, StreamRef } from "./types";

// Files are the source of truth for the Garden. The SQLite index (see ./db.ts,
// ./sync.ts) is derived and rebuildable from this folder.
export const GARDEN_DIR =
  process.env.GARDEN_DIR ?? path.resolve(process.cwd(), "../../documents/pis/garden");

function nowISO(): string {
  return new Date().toISOString();
}

/** Stable, sortable, unique id — `g_<base36 time><random>`. Never changes. */
export function genId(): string {
  const t = Date.now().toString(36);
  const r = Math.floor(Math.random() * 36 ** 4)
    .toString(36)
    .padStart(4, "0");
  return `g_${t}${r}`;
}

export function slugify(title: string): string {
  const s = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return s || "note";
}

async function listFiles(): Promise<string[]> {
  try {
    return (await readdir(GARDEN_DIR)).filter((f) => f.endsWith(".md"));
  } catch {
    return []; // garden dir not created yet
  }
}

async function uniqueSlug(base: string): Promise<string> {
  const files = new Set(await listFiles());
  if (!files.has(`${base}.md`)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!files.has(`${candidate}.md`)) return candidate;
  }
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function asProvenance(v: unknown): StreamRef[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => ({ file: String(x.file ?? ""), ts: String(x.ts ?? "") }))
    .filter((r) => r.file && r.ts);
}

function parseNote(raw: string, file: string): GardenNote {
  const { data, content } = matter(raw);
  const slug = file.replace(/\.md$/, "");
  return {
    id: typeof data.id === "string" ? data.id : slug,
    title: typeof data.title === "string" ? data.title : slug,
    created: typeof data.created === "string" ? data.created : "",
    updated: typeof data.updated === "string" ? data.updated : "",
    tags: asStringArray(data.tags),
    links: asStringArray(data.links),
    provenance: asProvenance(data.provenance),
    body: content.trim(),
    slug,
    file,
  };
}

function serializeNote(note: GardenNote): string {
  // Keep frontmatter order stable and human-friendly.
  const frontmatter = {
    id: note.id,
    title: note.title,
    created: note.created,
    updated: note.updated,
    tags: note.tags,
    links: note.links,
    provenance: note.provenance,
  };
  return matter.stringify(`\n${note.body}\n`, frontmatter);
}

export async function listNotes(): Promise<GardenNote[]> {
  const files = await listFiles();
  const notes: GardenNote[] = [];
  for (const f of files) {
    try {
      notes.push(parseNote(await readFile(path.join(GARDEN_DIR, f), "utf8"), f));
    } catch {
      /* skip unreadable/malformed file */
    }
  }
  notes.sort((a, b) => (a.updated < b.updated ? 1 : a.updated > b.updated ? -1 : 0));
  return notes;
}

export async function getNote(id: string): Promise<GardenNote | null> {
  // Files are truth; for the current scale a scan is fine.
  const notes = await listNotes();
  return notes.find((n) => n.id === id) ?? null;
}

export async function createNote(input: NewNote): Promise<GardenNote> {
  await mkdir(GARDEN_DIR, { recursive: true });
  const ts = nowISO();
  const slug = await uniqueSlug(slugify(input.title));
  const note: GardenNote = {
    id: genId(),
    title: input.title.trim(),
    created: ts,
    updated: ts,
    tags: input.tags ?? [],
    links: input.links ?? [],
    provenance: input.provenance ?? [],
    body: input.body.trim(),
    slug,
    file: `${slug}.md`,
  };
  await writeFile(path.join(GARDEN_DIR, note.file), serializeNote(note), "utf8");
  return note;
}

export async function updateNote(
  id: string,
  patch: Partial<Pick<GardenNote, "title" | "body" | "tags" | "links" | "provenance">>,
): Promise<GardenNote | null> {
  const existing = await getNote(id);
  if (!existing) return null;
  const updated: GardenNote = {
    ...existing,
    ...patch,
    updated: nowISO(),
  };
  await writeFile(path.join(GARDEN_DIR, existing.file), serializeNote(updated), "utf8");
  return updated;
}

export async function deleteNote(id: string): Promise<boolean> {
  const existing = await getNote(id);
  if (!existing) return false;
  await unlink(path.join(GARDEN_DIR, existing.file));
  return true;
}
