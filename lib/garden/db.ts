import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

// The SQLite index is a DERIVED, rebuildable cache over the Garden files — never
// the source of truth. It exists for fast retrieval (keyword search now; vector
// search added with Recall later). Safe to delete; rebuild via syncGarden().
const DATA_DIR = process.env.PIS_DATA_DIR ?? path.resolve(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "pis.db");

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const d = new Database(DB_PATH);
  d.pragma("journal_mode = WAL");
  d.pragma("foreign_keys = ON");
  initSchema(d);
  _db = d;
  return d;
}

function initSchema(d: Database.Database): void {
  d.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id      TEXT PRIMARY KEY,
      title   TEXT NOT NULL,
      slug    TEXT,
      file    TEXT,
      body    TEXT,
      created TEXT,
      updated TEXT
    );

    CREATE TABLE IF NOT EXISTS note_tags (
      note_id TEXT NOT NULL,
      tag     TEXT NOT NULL,
      PRIMARY KEY (note_id, tag)
    );
    CREATE INDEX IF NOT EXISTS idx_note_tags_tag ON note_tags(tag);

    -- untyped links between notes (by stable id)
    CREATE TABLE IF NOT EXISTS note_links (
      src_id TEXT NOT NULL,
      dst_id TEXT NOT NULL,
      PRIMARY KEY (src_id, dst_id)
    );
    CREATE INDEX IF NOT EXISTS idx_note_links_dst ON note_links(dst_id);

    -- provenance: which Stream fragment(s) a note was distilled from
    CREATE TABLE IF NOT EXISTS note_provenance (
      note_id     TEXT NOT NULL,
      stream_file TEXT NOT NULL,
      stream_ts   TEXT NOT NULL,
      PRIMARY KEY (note_id, stream_file, stream_ts)
    );

    -- keyword search over notes (standalone FTS, repopulated on sync)
    CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
      id UNINDEXED, title, body, tags
    );
  `);
  // NOTE: the vector/embeddings table (sqlite-vec) is intentionally deferred to
  // the Recall phase, when an embedding provider is wired in.
}
