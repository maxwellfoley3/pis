import { NextRequest, NextResponse } from "next/server";
import { createNote, listNotes } from "@/lib/garden/store";
import { syncNote } from "@/lib/garden/sync";

export const runtime = "nodejs";

export async function GET() {
  const notes = await listNotes();
  return NextResponse.json({ notes, count: notes.length });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.body === "string" ? body.body.trim() : "";
  if (!title || !content) {
    return NextResponse.json({ error: "title and body are required" }, { status: 400 });
  }

  const note = await createNote({
    title,
    body: content,
    tags: Array.isArray(body.tags) ? (body.tags as string[]) : [],
    links: Array.isArray(body.links) ? (body.links as string[]) : [],
    provenance: Array.isArray(body.provenance) ? (body.provenance as never[]) : [],
  });
  syncNote(note); // keep the index in step with the new file

  return NextResponse.json({ ok: true, note }, { status: 201 });
}
