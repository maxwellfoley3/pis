import Link from "next/link";
import { DOMAINS } from "@/lib/marshall/domains";
import { listLoops } from "@/lib/marshall/store";

export const dynamic = "force-dynamic";

export default async function MarshallPage() {
  const counts = await Promise.all(
    DOMAINS.map(async (d) => ({
      id: d.id,
      open: (await listLoops(d.id)).filter((l) => l.status === "open").length,
    })),
  );
  const openByDomain: Record<string, number> = Object.fromEntries(counts.map((c) => [c.id, c.open]));

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Marshall</h1>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
          A strategic cockpit — run the OODA loop (Observe → Orient → Decide → Act) across your domains,
          with AI lenses and you as the decider.
        </p>
      </header>

      <ul className="flex flex-col gap-2">
        {DOMAINS.map((d) => (
          <li key={d.id}>
            <Link
              href={`/marshall/${d.id}`}
              className="block rounded-xl border border-black/10 dark:border-white/10 p-4 hover:bg-black/[.03] dark:hover:bg-white/[.04]"
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="font-medium">{d.label}</div>
                <span className="text-xs tabular-nums text-black/40 dark:text-white/40">
                  {openByDomain[d.id] ? `${openByDomain[d.id]} open` : "—"}
                </span>
              </div>
              <p className="mt-1 text-sm text-black/55 dark:text-white/55">{d.tagline}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
