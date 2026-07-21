"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

// The one interaction the Stream is built around: dump a thought and have it land
// in the firehose. Posts to the existing /api/capture endpoint (same one the iOS
// Shortcut uses), so `/log ...` still routes to LifeOS. Cmd/Ctrl+Enter to fire.
export function CaptureBox() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  async function capture() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: body, source: "web" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Capture failed.");
        return;
      }
      setText("");
      ref.current?.focus();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Capture failed.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mb-8">
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            capture();
          }
        }}
        placeholder="Capture a thought…  (⌘/Ctrl+Enter to fire · prefix /log for the daily log)"
        rows={3}
        className="w-full resize-y rounded-xl border border-black/15 bg-transparent p-3 text-[15px] leading-relaxed outline-none placeholder:text-black/30 focus:border-black/30 dark:border-white/15 dark:placeholder:text-white/30 dark:focus:border-white/30"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-xs text-red-500">{error}</span>
        <button
          onClick={capture}
          disabled={sending || !text.trim()}
          className="rounded-lg bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-40"
        >
          {sending ? "Capturing…" : "Capture"}
        </button>
      </div>
    </div>
  );
}
