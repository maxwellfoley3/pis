import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { Loop, LoopStatus, StageRecord } from "./types";

// Files are the source of truth for Marshall, mirroring the Garden. Each OODA pass
// is one JSON file under documents/pis/marshall/<domain>/<loopId>.json — portable,
// inspectable, owned. A derived index (à la the Garden's SQLite) can come later.
export const MARSHALL_DIR =
  process.env.MARSHALL_DIR ?? path.resolve(process.cwd(), "../../documents/pis/marshall");

function nowISO(): string {
  return new Date().toISOString();
}

/** Stable, sortable, unique id — `m_<base36 time><random>`. */
export function genLoopId(): string {
  const t = Date.now().toString(36);
  const r = Math.floor(Math.random() * 36 ** 4)
    .toString(36)
    .padStart(4, "0");
  return `m_${t}${r}`;
}

function domainDir(domain: string): string {
  return path.join(MARSHALL_DIR, domain);
}

function loopPath(domain: string, id: string): string {
  return path.join(domainDir(domain), `${id}.json`);
}

export async function listLoops(domain: string): Promise<Loop[]> {
  let files: string[];
  try {
    files = (await readdir(domainDir(domain))).filter((f) => f.endsWith(".json"));
  } catch {
    return []; // domain dir not created yet
  }
  const loops: Loop[] = [];
  for (const f of files) {
    try {
      loops.push(JSON.parse(await readFile(path.join(domainDir(domain), f), "utf8")) as Loop);
    } catch {
      /* skip unreadable/malformed file */
    }
  }
  loops.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
  return loops;
}

export async function getLoop(domain: string, id: string): Promise<Loop | null> {
  try {
    return JSON.parse(await readFile(loopPath(domain, id), "utf8")) as Loop;
  } catch {
    return null;
  }
}

async function writeLoop(loop: Loop): Promise<Loop> {
  await mkdir(domainDir(loop.domain), { recursive: true });
  await writeFile(loopPath(loop.domain, loop.id), JSON.stringify(loop, null, 2), "utf8");
  return loop;
}

export async function createLoop(domain: string, title: string): Promise<Loop> {
  const ts = nowISO();
  return writeLoop({
    id: genLoopId(),
    domain,
    title: title.trim() || "Untitled loop",
    status: "open",
    createdAt: ts,
    updatedAt: ts,
    stages: [],
  });
}

/** Insert or replace a stage record (re-running a stage overwrites it). */
export async function saveStage(domain: string, id: string, stage: StageRecord): Promise<Loop | null> {
  const loop = await getLoop(domain, id);
  if (!loop) return null;
  const idx = loop.stages.findIndex((s) => s.stage === stage.stage);
  if (idx >= 0) loop.stages[idx] = stage;
  else loop.stages.push(stage);
  loop.updatedAt = nowISO();
  return writeLoop(loop);
}

export async function setStatus(domain: string, id: string, status: LoopStatus): Promise<Loop | null> {
  const loop = await getLoop(domain, id);
  if (!loop) return null;
  loop.status = status;
  loop.updatedAt = nowISO();
  return writeLoop(loop);
}
