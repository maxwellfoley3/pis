# PIS — a Personal Intelligence System

A "second brain" that treats knowledge as living at **two temperatures**, bridged by an AI:

```
Stream  ──►  Gardener (AI)  ──►  Garden  ──►  Index (SQLite)
firehose     distills          atomic notes   keyword + vector + graph
```

- **Stream** — the firehose. Capture any thought with zero friction; it lands as portable, append-only markdown, one file per day. Permission to be messy is the point.
- **Gardener** — an AI pass that reads the Stream and distills it into durable knowledge: atomic notes, with links and mandatory provenance back to the fragment each note came from.
- **Garden** — the durable core. A graph of atomic, interconnected notes (a Zettelkasten), stored as markdown files so it outlives any tool.

The guiding bet is **ergonomics over demo-speed**: the goal is something genuinely livable to use every day, not a flashy prototype.

## Design principles

- **Files are the source of truth.** Every fragment and every note is a plain markdown file. The SQLite index (keyword + vector + link graph) is *derived and fully rebuildable* — the database is disposable, the files are not.
- **Provenance is mandatory.** No orphan knowledge: every Garden note traces back to the Stream fragment(s) it was distilled from.
- **Start atomic.** One idea per note, untyped links. Structure is added only when a real need appears.

## Surfaces

| Route | What it is |
|---|---|
| `/` — **Stream** | The firehose + a capture box. Type a thought, `⌘/Ctrl+Enter`, it lands in the Stream. |
| `/garden` — **Garden** | The atomic-note graph, with a live "context capacity" bar (how much of an LLM context window the Garden currently fills). |
| `/marshall` — **Marshall** | An experimental strategic cockpit: run an OODA loop (Observe → Orient → Decide → Act) across a domain, with parallel AI "lenses" and you as the decider. |
| `/projects` — **Projects** | A lightweight registry of what's being worked on. |

Capture also works headless: `POST /api/capture` (used by an iOS Shortcut). A `/log …` prefix routes the entry to a separate daily-log service instead of the Stream.

## Status

This is an actively-evolving personal project. Honest state:

- ✅ **Stream** — capture (UI + API), daily-file firehose, `/log` routing.
- ✅ **Garden** — markdown notes as source of truth, SQLite index (FTS + vector + link graph), manual note authoring, context-capacity metering.
- 🚧 **Gardener** — the AI Stream→Garden distillation is designed ([spec](https://github.com/maxwellfoley3/pis)) but not yet built; notes are authored by hand today.
- 🧪 **Marshall** — working manual OODA cockpit; the "learns from your calls" ambition is deliberately deferred.
- 🚧 **Recall** — retrieval-augmented Q&A over the Garden with citations is next.

## Stack

- **Next.js 16** (App Router) + React 19, Tailwind v4
- **better-sqlite3** + **sqlite-vec** for the derived index (keyword + embeddings)
- **drizzle-orm** for schema
- **@anthropic-ai/sdk** for the AI passes
- **gray-matter** for note frontmatter

## Running locally

```bash
npm install
npm run dev        # http://localhost:3000
```

By default the Stream and Garden read/write markdown under a sibling `documents/pis/` directory; override with the `STREAM_DIR` env var. Set `ANTHROPIC_API_KEY` in `.env.local` to enable the AI-backed features.
