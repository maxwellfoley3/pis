"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Domain } from "@/lib/marshall/domains";
import { STAGES, type Loop, type StageId, type StageRecord, type LensOutput } from "@/lib/marshall/types";

export function Cockpit({ domain, loops }: { domain: Domain; loops: Loop[] }) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(
    loops.find((l) => l.status === "open")?.id ?? loops[0]?.id ?? null,
  );
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const active = loops.find((l) => l.id === activeId) ?? null;

  async function createLoop(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/marshall/loop", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create", domain: domain.id, title }),
      });
      const data = await res.json();
      if (res.ok && data.loop) {
        setTitle("");
        setActiveId(data.loop.id);
        router.refresh();
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <form onSubmit={createLoop} className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New loop — the situation, in one line"
            className="flex-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-1.5 text-sm outline-none placeholder:text-black/30 dark:placeholder:text-white/30"
          />
          <button
            type="submit"
            disabled={creating || !title.trim()}
            className="rounded-lg bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-40"
          >
            {creating ? "…" : "Start"}
          </button>
        </form>

        {loops.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {loops.map((l) => (
              <button
                key={l.id}
                onClick={() => setActiveId(l.id)}
                className={
                  l.id === activeId
                    ? "rounded-full border border-foreground px-2.5 py-0.5 text-xs"
                    : "rounded-full border border-black/15 px-2.5 py-0.5 text-xs text-black/55 dark:border-white/15 dark:text-white/55"
                }
              >
                {l.title}
                {l.status === "closed" ? " ✓" : ""}
              </button>
            ))}
          </div>
        )}
      </div>

      {active ? (
        <div className="flex flex-col gap-4">
          {STAGES.map((s) => (
            <StagePanel
              key={`${active.id}:${s.id}`}
              domain={domain}
              loop={active}
              stageId={s.id}
              label={s.label}
              onChanged={() => router.refresh()}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-black/15 p-8 text-center text-sm text-black/50 dark:border-white/15 dark:text-white/50">
          No loop yet. Name a situation above to start an OODA pass.
        </div>
      )}
    </div>
  );
}

function StagePanel({
  domain,
  loop,
  stageId,
  label,
  onChanged,
}: {
  domain: Domain;
  loop: Loop;
  stageId: StageId;
  label: string;
  onChanged: () => void;
}) {
  const existing = loop.stages.find((s) => s.stage === stageId);
  const [note, setNote] = useState(existing?.humanNote ?? "");
  const [outputs, setOutputs] = useState<LensOutput[]>(existing?.outputs ?? []);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setMsg(null);
    try {
      const res = await fetch("/api/marshall/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domain: domain.id, loopId: loop.id, stage: stageId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Run failed.");
        return;
      }
      setOutputs(data.outputs ?? []);
      onChanged();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Run failed.");
    } finally {
      setRunning(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const stage: StageRecord = {
        stage: stageId,
        outputs,
        humanNote: note,
        at: new Date().toISOString(),
      };
      await fetch("/api/marshall/loop", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "saveStage", domain: domain.id, loopId: loop.id, stage }),
      });
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-black/10 p-4 dark:border-white/10">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">{label}</h3>
        <button
          onClick={run}
          disabled={running}
          className="rounded-lg border border-black/15 px-2.5 py-1 text-xs hover:bg-black/[.04] disabled:opacity-40 dark:border-white/15 dark:hover:bg-white/[.06]"
        >
          {running ? "Running…" : "Run lenses"}
        </button>
      </div>
      <p className="mt-1.5 text-xs text-black/45 dark:text-white/45">{domain.ooda[stageId]}</p>

      {msg && <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{msg}</p>}

      {outputs.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {outputs.map((o, i) => (
            <div key={i} className="rounded-lg bg-black/[.03] p-3 dark:bg-white/[.04]">
              <div className="mb-1 flex items-center gap-2 text-[11px] text-black/45 dark:text-white/45">
                <span className="font-medium">{o.lensLabel}</span>
                <span>·</span>
                <span>{o.model}</span>
                {o.error && <span className="text-red-500">· error</span>}
              </div>
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{o.error ?? o.text}</p>
            </div>
          ))}
        </div>
      )}

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={`Your ${label.toLowerCase()} — the call you're making (the signal Marshall learns from)`}
        rows={2}
        className="mt-3 w-full resize-y rounded-lg border border-black/10 bg-transparent p-2 text-sm outline-none placeholder:text-black/30 dark:border-white/10 dark:placeholder:text-white/30"
      />
      <div className="mt-2">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg border border-black/15 px-2.5 py-1 text-xs hover:bg-black/[.04] disabled:opacity-40 dark:border-white/15 dark:hover:bg-white/[.06]"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </section>
  );
}
