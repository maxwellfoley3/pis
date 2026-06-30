import { NextRequest, NextResponse } from "next/server";
import { getDomain } from "@/lib/marshall/domains";
import { createLoop, saveStage, setStatus } from "@/lib/marshall/store";
import type { StageRecord } from "@/lib/marshall/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const domain = typeof body.domain === "string" ? body.domain : "";
  if (!getDomain(domain)) {
    return NextResponse.json({ error: "unknown domain" }, { status: 400 });
  }

  switch (body.action) {
    case "create": {
      const title = typeof body.title === "string" ? body.title : "";
      const loop = await createLoop(domain, title);
      return NextResponse.json({ ok: true, loop }, { status: 201 });
    }
    case "saveStage": {
      const loopId = typeof body.loopId === "string" ? body.loopId : "";
      const stage = body.stage as StageRecord | undefined;
      if (!loopId || !stage || typeof stage.stage !== "string") {
        return NextResponse.json({ error: "loopId and stage are required" }, { status: 400 });
      }
      const loop = await saveStage(domain, loopId, stage);
      if (!loop) return NextResponse.json({ error: "loop not found" }, { status: 404 });
      return NextResponse.json({ ok: true, loop });
    }
    case "close":
    case "reopen": {
      const loopId = typeof body.loopId === "string" ? body.loopId : "";
      const loop = await setStatus(domain, loopId, body.action === "close" ? "closed" : "open");
      if (!loop) return NextResponse.json({ error: "loop not found" }, { status: 404 });
      return NextResponse.json({ ok: true, loop });
    }
    default:
      return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }
}
