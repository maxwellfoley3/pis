import { db } from "./db";
import { listNotes } from "./store";
import type { GardenNote } from "./types";

// Reflect the Garden files into the derived SQLite index. Idempotent.

function upsertNoteStmt(d = db()) {
  return {
    note: d.prepare(
      `INSERT INTO notes (id, title, slug, file, body, created, updated)
       VALUES (@id, @title, @slug, @file, @body, @created, @updated)
       ON CONFLICT(id) DO UPDATE SET
         title=@title, slug=@slug, file=@file, body=@body,
         created=@created, updated=@updated`,
    ),
    delTags: d.prepare(`DELETE FROM note_tags WHERE note_id=?`),
    insTag: d.prepare(`INSERT OR IGNORE INTO note_tags (note_id, tag) VALUES (?, ?)`),
    delLinks: d.prepare(`DELETE FROM note_links WHERE src_id=?`),
    insLink: d.prepare(`INSERT OR IGNORE INTO note_links (src_id, dst_id) VALUES (?, ?)`),
    delProv: d.prepare(`DELETE FROM note_provenance WHERE note_id=?`),
    insProv: d.prepare(
      `INSERT OR IGNORE INTO note_provenance (note_id, stream_file, stream_ts) VALUES (?, ?, ?)`,
    ),
    delFts: d.prepare(`DELETE FROM notes_fts WHERE id=?`),
    insFts: d.prepare(
      `INSERT INTO notes_fts (id, title, body, tags) VALUES (?, ?, ?, ?)`,
    ),
  };
}

function indexOne(note: GardenNote, s: ReturnType<typeof upsertNoteStmt>): void {
  s.note.run(note);
  s.delTags.run(note.id);
  for (const tag of note.tags) s.insTag.run(note.id, tag);
  s.delLinks.run(note.id);
  for (const dst of note.links) s.insLink.run(note.id, dst);
  s.delProv.run(note.id);
  for (const p of note.provenance) s.insProv.run(note.id, p.file, p.ts);
  s.delFts.run(note.id);
  s.insFts.run(note.id, note.title, note.body, note.tags.join(" "));
}

/** Sync a single note into the index (after create/update). */
export function syncNote(note: GardenNote): void {
  const s = upsertNoteStmt();
  indexOne(note, s);
}

/** Remove a note from the index (after delete). */
export function removeNoteFromIndex(id: string): void {
  const d = db();
  d.prepare(`DELETE FROM notes WHERE id=?`).run(id);
  d.prepare(`DELETE FROM note_tags WHERE note_id=?`).run(id);
  d.prepare(`DELETE FROM note_links WHERE src_id=?`).run(id);
  d.prepare(`DELETE FROM note_provenance WHERE note_id=?`).run(id);
  d.prepare(`DELETE FROM notes_fts WHERE id=?`).run(id);
}

/** Full rebuild: reflect every Garden file into the index, drop stale rows. */
export async function syncGarden(): Promise<{ indexed: number; removed: number }> {
  const d = db();
  const notes = await listNotes();
  const s = upsertNoteStmt(d);
  const liveIds = new Set(notes.map((n) => n.id));

  const run = d.transaction(() => {
    for (const note of notes) indexOne(note, s);
    // prune notes whose files no longer exist
    let removed = 0;
    const existing = d.prepare(`SELECT id FROM notes`).all() as { id: string }[];
    for (const { id } of existing) {
      if (!liveIds.has(id)) {
        removeNoteFromIndex(id);
        removed++;
      }
    }
    return removed;
  });

  const removed = run();
  return { indexed: notes.length, removed };
}
