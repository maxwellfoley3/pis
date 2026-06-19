import Link from "next/link";
import { listNotes } from "@/lib/garden/store";
import { computeGardenStats, formatDuration, type GardenStats } from "@/lib/garden/stats";
import { NewNoteForm } from "./new-note-form";

export const dynamic = "force-dynamic";

function CapacityBar({ stats }: { stats: GardenStats }) {
  const projection =
    stats.daysToFull === 0
      ? "exceeds the context window"
      : stats.daysToFull == null
        ? "no growth yet"
        : `exceeds context in ${formatDuration(stats.daysToFull)}${stats.earlyEstimate ? " (early est.)" : ""}`;

  return (
    <div className="mb-6 rounded-xl border border-black/10 dark:border-white/10 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs">
        <span className="tabular-nums text-black/60 dark:text-white/60">
          <span className="font-medium text-foreground">{stats.tokens.toLocaleString()}</span> /{" "}
          {stats.contextWindow.toLocaleString()} tokens · {(stats.pct * 100).toFixed(2)}% of {stats.model} context
        </span>
        <span className="tabular-nums text-black/40 dark:text-white/40">{projection}</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
        <div
          className="h-full rounded-full bg-foreground"
          style={{ width: `${Math.max(stats.pct * 100, 0.4)}%` }}
        />
      </div>
      <div className="mt-1.5 text-[11px] tabular-nums text-black/40 dark:text-white/40">
        ~{Math.round(stats.tokensPerDay).toLocaleString()} tokens/day · estimated (~4 chars/token)
      </div>
    </div>
  );
}

export default async function GardenPage() {
  const notes = await listNotes();
  const stats = computeGardenStats(notes, Date.now());

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

      <CapacityBar stats={stats} />

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
