import { listProjects } from "@/lib/projects/store";
import { STATUS_LABEL, type ProjectStatus } from "@/lib/projects/types";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<ProjectStatus, string> = {
  active:
    "bg-green-500/10 text-green-700 dark:text-green-400 ring-1 ring-inset ring-green-500/20",
  tentative:
    "bg-black/[.04] text-black/50 dark:bg-white/[.06] dark:text-white/50 ring-1 ring-inset ring-black/10 dark:ring-white/10",
  idle:
    "bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-1 ring-inset ring-amber-500/20",
  archived:
    "bg-black/[.04] text-black/40 dark:bg-white/[.06] dark:text-white/40 ring-1 ring-inset ring-black/10 dark:ring-white/10",
};

function repoHref(repo: string): string {
  return repo.startsWith("http") ? repo : `https://github.com/${repo}`;
}

export default async function ProjectsPage() {
  const projects = await listProjects();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
          The coding projects in flight — what&apos;s active, what&apos;s tentative, and where each lives.
        </p>
      </header>

      {projects.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-white/50">No projects yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {projects.map((p) => (
            <li
              key={p.id}
              className="rounded-xl border border-black/10 dark:border-white/10 p-4"
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="font-medium">{p.name}</div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[p.status]}`}
                >
                  {STATUS_LABEL[p.status]}
                </span>
              </div>
              <p className="mt-1 text-sm text-black/55 dark:text-white/55">{p.summary}</p>
              {p.repo && (
                <a
                  href={repoHref(p.repo)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-xs text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white"
                >
                  {p.repo} ↗
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
