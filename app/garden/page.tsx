import Link from "next/link";
import { listNotes } from "@/lib/garden/store";
import { NewNoteForm } from "./new-note-form";

export const dynamic = "force-dynamic";

export default async function GardenPage() {
  const notes = await listNotes();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
      <header className="mb-6 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Garden</h1>
          <p className="mt-1 text-sm text-black/50 dark:text-white/50">
            Durable, interconnected knowledge — atomic notes.
          </p>
        </div>
        <span className="text-sm tabular-nums text-black/40 dark:text-white/40">
          {notes.length} {notes.length === 1 ? "note" : "notes"}
        </span>
      </header>

      <div className="mb-6">
        <NewNoteForm />
      </div>

      {notes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/15 dark:border-white/15 p-10 text-center text-sm text-black/50 dark:text-white/50">
          The Garden is empty. Add a note above — or, later, let the Gardener grow it from the Stream.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {notes.map((n) => (
            <li key={n.id}>
              <Link
                href={`/garden/${n.id}`}
                className="block rounded-xl border border-black/10 dark:border-white/10 p-4 hover:bg-black/[.03] dark:hover:bg-white/[.04]"
              >
                <div className="font-medium">{n.title}</div>
                {n.body && (
                  <p className="mt-1 line-clamp-2 text-sm text-black/55 dark:text-white/55">{n.body}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-black/40 dark:text-white/40">
                  {n.tags.map((t) => (
                    <span key={t} className="rounded-full bg-black/[.05] dark:bg-white/[.06] px-2 py-0.5">
                      #{t}
                    </span>
                  ))}
                  {n.links.length > 0 && <span>· {n.links.length} links</span>}
                  {n.provenance.length > 0 && <span>· {n.provenance.length} sources</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
