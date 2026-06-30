import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Multi-LLM orchestration (the Scout / Analyst / Strategist lens fan-out) is wired
// in the next build slice, using @anthropic-ai/sdk. Until then this route stays
// honest: it does NOT fabricate lens output — it tells the operator what's missing.
export async function POST() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "Multi-LLM lenses aren't configured yet — set ANTHROPIC_API_KEY, then Run will fan out across the Scout / Analyst / Strategist models.",
      },
      { status: 501 },
    );
  }
  return NextResponse.json(
    { error: "Orchestration endpoint is scaffolded; the lens fan-out lands in the next build step." },
    { status: 501 },
  );
}
