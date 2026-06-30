import Link from "next/link";
import { notFound } from "next/navigation";
import { getDomain } from "@/lib/marshall/domains";
import { listLoops } from "@/lib/marshall/store";
import { Cockpit } from "./cockpit";

export const dynamic = "force-dynamic";

export default async function DomainPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const d = getDomain(domain);
  if (!d) notFound();

  const loops = await listLoops(domain);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <Link
        href="/marshall"
        className="text-sm text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
      >
        ← Marshall
      </Link>
      <header className="mb-6 mt-4">
        <h1 className="text-2xl font-semibold tracking-tight">{d.label}</h1>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">{d.tagline}</p>
      </header>

      <Cockpit domain={d} loops={loops} />
    </main>
  );
}
