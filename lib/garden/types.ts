// The Garden ontology (see documents/pis/garden-spec.md): one node type — the
// atomic Note. Untyped links + mandatory provenance back to Stream fragments.

/** A reference to the Stream fragment a note was distilled from. */
export type StreamRef = { file: string; ts: string };

export type GardenNote = {
  id: string; // stable, never changes (links/provenance reference this)
  title: string;
  created: string; // ISO
  updated: string; // ISO
  tags: string[];
  links: string[]; // ids of related notes (untyped)
  provenance: StreamRef[]; // Stream fragments this was distilled from
  body: string; // markdown, the idea in the user's words
  // Derived (not in frontmatter):
  slug: string; // filename without .md
  file: string; // filename, e.g. "frictionless-capture.md"
};

/** Fields accepted when creating a note; the rest are generated. */
export type NewNote = {
  title: string;
  body: string;
  tags?: string[];
  links?: string[];
  provenance?: StreamRef[];
};
