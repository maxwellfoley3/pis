import { readStream, type Fragment } from "@/lib/stream";
import { CaptureBox } from "./capture-box";

export const dynamic = "force-dynamic"; // always re-read the Stream on load

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const s = Math.round((Date.now() - then) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function FragmentCard({ f }: { f: Fragment }) {
  return (
    <li className="rounded-xl border border-black/10 dark:border-white/10 bg-black/[.02] dark:bg-white/[.03] p-4">
      <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{f.text}</p>
      <div className="mt-3 flex items-center gap-2 text-xs text-black/40 dark:text-white/40">
        <span title={f.ts}>{relativeTime(f.ts)}</span>
        <span>·</span>
        <span className="rounded-full bg-black/[.05] dark:bg-white/[.06] px-2 py-0.5">{f.source}</span>
      </div>
    </li>
  );
}

export default async function Home() {
  const fragments = await readStream();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
      <header className="mb-8 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stream</h1>
          <p className="mt-1 text-sm text-black/50 dark:text-white/50">
            The firehose — everything you&apos;ve captured.
          </p>
        </div>
        <span className="text-sm tabular-nums text-black/40 dark:text-white/40">
          {fragments.length} {fragments.length === 1 ? "fragment" : "fragments"}
        </span>
      </header>

      <CaptureBox />

      {fragments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/15 dark:border-white/15 p-10 text-center text-sm text-black/50 dark:text-white/50">
          Nothing captured yet. Fire your first fragment above.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {fragments.map((f, i) => (
            <FragmentCard key={`${f.file}-${f.ts}-${i}`} f={f} />
          ))}
        </ul>
      )}
    </main>
  );
}
