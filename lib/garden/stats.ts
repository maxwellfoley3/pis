import type { GardenNote } from "./types";

// The context window we measure the Garden against. Opus 4.8 = 1M tokens.
export const CONTEXT_WINDOW = 1_000_000;
export const CONTEXT_MODEL = "Opus 4.8";

// No tokenizer API key available, so estimate at ~4 chars/token (English prose).
// This is an approximation; exact counts would use the count_tokens API.
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export type GardenStats = {
  noteCount: number;
  tokens: number;
  contextWindow: number;
  model: string;
  pct: number; // 0..1 of the context window
  tokensPerDay: number;
  daysToFull: number | null; // 0 = already exceeds; null = no growth rate yet
  earlyEstimate: boolean; // true while we have < 1 day of history
};

export function computeGardenStats(notes: GardenNote[], nowMs: number): GardenStats {
  let tokens = 0;
  let firstCreatedMs = nowMs;
  for (const n of notes) {
    tokens += estimateTokens(`${n.title}\n${n.body}`); // the note's "knowledge" payload
    const c = Date.parse(n.created);
    if (!Number.isNaN(c) && c < firstCreatedMs) firstCreatedMs = c;
  }

  const rawElapsedDays = (nowMs - firstCreatedMs) / 86_400_000;
  // Clamp to >= 1 day so a cold start (all notes created today) doesn't produce
  // an absurd "fills in minutes" rate. The estimate self-corrects as history grows.
  const elapsedDays = Math.max(rawElapsedDays, 1);
  const tokensPerDay = tokens / elapsedDays;

  const remaining = CONTEXT_WINDOW - tokens;
  const daysToFull = remaining <= 0 ? 0 : tokensPerDay > 0 ? remaining / tokensPerDay : null;

  return {
    noteCount: notes.length,
    tokens,
    contextWindow: CONTEXT_WINDOW,
    model: CONTEXT_MODEL,
    pct: Math.min(tokens / CONTEXT_WINDOW, 1),
    tokensPerDay,
    daysToFull,
    earlyEstimate: rawElapsedDays < 1,
  };
}

export function formatDuration(days: number): string {
  if (days >= 365) return `~${(days / 365).toFixed(1)} years`;
  if (days >= 60) return `~${Math.round(days / 30)} months`;
  if (days >= 2) return `~${Math.round(days)} days`;
  return "< 2 days";
}
