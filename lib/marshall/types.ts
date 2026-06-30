// Marshall — an OODA-loop interface layered onto PIS. A "Loop" is one pass of the
// Observe → Orient → Decide → Act cycle within a domain. Files are the source of
// truth (see store.ts), mirroring the Garden. Each pass records both what the AI
// lenses surfaced and the operator's call — the signal Marshall is meant to learn
// from (see Garden: ooda-interface-ais-learn-the-loop).

export type StageId = "observe" | "orient" | "decide" | "act";

export const STAGES: { id: StageId; label: string }[] = [
  { id: "observe", label: "Observe" },
  { id: "orient", label: "Orient" },
  { id: "decide", label: "Decide" },
  { id: "act", label: "Act" },
];

/** One LLM "lens" run within a stage — the parallel models the operator reads across. */
export type LensOutput = {
  lensId: string;
  lensLabel: string;
  model: string;
  text: string;
  ms?: number; // latency
  error?: string;
};

/** A stage of a loop. Append-only as the loop advances (re-running replaces it). */
export type StageRecord = {
  stage: StageId;
  outputs: LensOutput[]; // what the lenses surfaced
  humanNote?: string; // the operator's orientation / decision — the training signal
  at: string; // ISO
};

export type LoopStatus = "open" | "closed";

/** One OODA pass within a domain. */
export type Loop = {
  id: string;
  domain: string; // domain id
  title: string; // the situation, in one line
  status: LoopStatus;
  createdAt: string;
  updatedAt: string;
  stages: StageRecord[];
};
