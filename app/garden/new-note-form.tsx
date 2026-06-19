"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewNoteForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/garden", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed to create note");
      setTitle("");
      setBody("");
      setTags("");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-black/15 dark:border-white/15 px-3 py-1.5 text-sm hover:bg-black/[.04] dark:hover:bg-white/[.06]"
      >
        + New note
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-xl border border-black/10 dark:border-white/10 p-4">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title — the idea, in one line"
        className="bg-transparent text-[15px] font-medium outline-none placeholder:text-black/30 dark:placeholder:text-white/30"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="The idea, in your words (markdown)…"
        rows={4}
        className="resize-y bg-transparent text-sm outline-none placeholder:text-black/30 dark:placeholder:text-white/30"
      />
      <input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="tags, comma, separated"
        className="bg-transparent text-xs outline-none placeholder:text-black/30 dark:placeholder:text-white/30"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={busy || !title.trim() || !body.trim()}
          className="rounded-lg bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-black/50 dark:text-white/50">
          Cancel
        </button>
      </div>
    </form>
  );
}
