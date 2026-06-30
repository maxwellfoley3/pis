import type { StageId } from "./types";

// The parallel LLM "lenses" — distinct roles the operator reads simultaneously
// (Boyd's "multiple observations" at once). Model tiers are mapped to concrete
// models in the orchestration layer (orchestrate.ts), kept out of config so the
// model choice lives in one place.
export type LensTier = "fast" | "balanced" | "deep";

export type Lens = {
  id: string;
  label: string;
  tier: LensTier;
  role: string; // composed with domain + stage context at run time
};

export const LENSES: Lens[] = [
  {
    id: "scout",
    label: "Scout",
    tier: "fast",
    role: "You are the Scout: fast and broad. Surface the widest set of relevant signals and options. Favor recall over precision — speculation is fine if you label it.",
  },
  {
    id: "analyst",
    label: "Analyst",
    tier: "balanced",
    role: "You are the Analyst: rigorous and grounded. Weigh the signals, separate what actually matters from noise, and flag what is uncertain or unverified.",
  },
  {
    id: "strategist",
    label: "Strategist",
    tier: "deep",
    role: "You are the Strategist: think in moves and second-order effects. Name the highest-leverage action available and the trap to avoid.",
  },
];

export type Domain = {
  id: string;
  label: string;
  tagline: string;
  /** What each OODA stage means in this domain — shown as guidance in the cockpit. */
  ooda: Record<StageId, string>;
};

// Three domains, each chosen because the operator has real positional sensing,
// recurring decisions, and live signal (see Garden: human-is-sensor-ai-is-orientation).
// Observe is framed as ingestion the human feeds, not scraping the AI does.
export const DOMAINS: Domain[] = [
  {
    id: "career",
    label: "Career",
    tagline: "Land the role and win the work that builds the FDE path.",
    ooda: {
      observe:
        "Gather live opportunities into one view — roles (ATS feeds, referrals, recruiter pings) and freelance gigs (forwarded/captured from Upwork, LinkedIn, inbound). You're the sensor: capture what's behind the walls into the Stream; let public sources (ATS APIs, web search) fill the rest.",
      orient:
        "Read each opportunity against your position: fit, level, referral surface, and how your AI/LLM edge maps to what they actually need. For gigs: is it customer-facing, scoped-by-you, shippable, and publishable — does it build the FDE narrative, not just income?",
      decide:
        "Decide which to pursue now, which to warm up via referral, and which to skip — with reasons — and how to position the move.",
      act: "Produce the concrete next move: a tailored application, an outreach message, a referral ask, or a proposal.",
    },
  },
  {
    id: "tastemaker",
    label: "Tastemaker",
    tagline: "Read where taste is moving and place your bets early.",
    ooda: {
      observe:
        "Capture cultural signal from where you're embedded — what's being picked up, by whom, when (the consecration frontier). You're the sensor: forward posts, accounts, and moves from X/IG/the scene into the Stream, since none of it is scrapable.",
      orient:
        "Locate each signal on the taste graph: where is it in the consecration → legitimacy → saturation → exhaustion cycle, relative to your position? Decode what's actually driving it.",
      decide:
        "Decide what to adopt, boost, make, or avoid — and the timing: forward enough to point at the frontier without being saturated.",
      act: "Produce the concrete move: a post, a recomposition, an adoption, or a curatorial call.",
    },
  },
  {
    id: "marshall",
    label: "Marshall (meta)",
    tagline: "Improve the operator, the capability, and the system itself.",
    ooda: {
      observe:
        "Scan your own recent loops, captures, and outcomes across the domains — and the AI frontier as it bears on your capability (what would actually raise your edge). Where did orienting or deciding go well or badly?",
      orient:
        "Diagnose the pattern: which habits, gaps, or biases shape your decisions, which capability would most raise your leverage, and where Marshall itself is weak.",
      decide:
        "Decide the one change to make — to your process, your priorities, a skill to build, or Marshall's design.",
      act: "Produce the concrete adjustment: a new habit, a reprioritization, a skill/build to ship, or a Marshall improvement.",
    },
  },
];

export function getDomain(id: string): Domain | undefined {
  return DOMAINS.find((d) => d.id === id);
}
