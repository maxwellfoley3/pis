import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { listNotes } from "@/lib/garden/store";

export const dynamic = "force-dynamic";

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notes = await listNotes();
  const note = notes.find((n) => n.id === id);
  if (!note) notFound();

  const byId = new Map(notes.map((n) => [n.id, n]));
  const linked = note.links.map((lid) => byId.get(lid)).filter((n) => n != null);
  const backlinks = notes.filter((n) => n.links.includes(note.id));

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
      <Link href="/garden" className="text-sm text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white">
        ← Garden
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{note.title}</h1>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-black/40 dark:text-white/40">
        {note.tags.map((t) => (
          <span key={t} className="rounded-full bg-black/[.05] dark:bg-white/[.06] px-2 py-0.5">
            #{t}
          </span>
        ))}
        <span title={note.updated}>updated {note.updated.slice(0, 10)}</span>
      </div>

      <article className="prose-sm mt-6 max-w-none whitespace-pre-wrap break-words text-[15px] leading-relaxed">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.body}</ReactMarkdown>
      </article>

      {linked.length > 0 && (
        <Section title="Links">
          {linked.map((n) => (
            <NoteRef key={n!.id} id={n!.id} title={n!.title} />
          ))}
        </Section>
      )}

      {backlinks.length > 0 && (
        <Section title="Backlinks">
          {backlinks.map((n) => (
            <NoteRef key={n.id} id={n.id} title={n.title} />
          ))}
        </Section>
      )}

      {note.provenance.length > 0 && (
        <Section title="Provenance (from the Stream)">
          {note.provenance.map((p, i) => (
            <div key={i} className="text-sm text-black/55 dark:text-white/55">
              {p.file} · <span title={p.ts}>{p.ts.slice(11, 19)}</span>
            </div>
          ))}
        </Section>
      )}
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 border-t border-black/10 dark:border-white/10 pt-4">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
        {title}
      </h2>
      <div className="flex flex-col gap-1">{children}</div>
    </section>
  );
}

function NoteRef({ id, title }: { id: string; title: string }) {
  return (
    <Link href={`/garden/${id}`} className="text-sm text-blue-600 hover:underline dark:text-blue-400">
      {title}
    </Link>
  );
}
