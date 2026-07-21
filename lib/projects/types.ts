// Projects — a lightweight registry of the coding projects in flight, surfaced in
// PIS. Files are the source of truth (see store.ts), mirroring the Garden and
// Marshall: one JSON file per project under documents/pis/projects/<id>.json.

export type ProjectStatus = "active" | "tentative" | "idle" | "archived";

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: "Active",
  tentative: "Tentative",
  idle: "Idle",
  archived: "Archived",
};

/** A single coding project in the registry. */
export type Project = {
  id: string;
  name: string;
  status: ProjectStatus;
  summary: string; // one line: what it is
  repo?: string; // github "owner/name" or full URL, if it has one
  updatedAt: string; // ISO — last meaningful movement
};
