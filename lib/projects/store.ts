import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Project, ProjectStatus } from "./types";

// Files are the source of truth, mirroring the Garden and Marshall. One JSON file
// per project under documents/pis/projects/<id>.json — portable, inspectable, owned.
export const PROJECTS_DIR =
  process.env.PROJECTS_DIR ?? path.resolve(process.cwd(), "../../documents/pis/projects");

// Sort order: active first, then tentative/idle, archived last; within a status,
// most recently moved first.
const STATUS_RANK: Record<ProjectStatus, number> = {
  active: 0,
  tentative: 1,
  idle: 2,
  archived: 3,
};

export async function listProjects(): Promise<Project[]> {
  let files: string[];
  try {
    files = (await readdir(PROJECTS_DIR)).filter((f) => f.endsWith(".json"));
  } catch {
    return []; // dir not created yet
  }
  const projects: Project[] = [];
  for (const f of files) {
    try {
      projects.push(JSON.parse(await readFile(path.join(PROJECTS_DIR, f), "utf8")) as Project);
    } catch {
      /* skip unreadable/malformed file */
    }
  }
  projects.sort((a, b) => {
    const r = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (r !== 0) return r;
    return a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0;
  });
  return projects;
}
