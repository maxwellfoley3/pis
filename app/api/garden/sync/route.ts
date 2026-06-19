import { NextResponse } from "next/server";
import { syncGarden } from "@/lib/garden/sync";

export const runtime = "nodejs";

// Rebuild the derived SQLite index from the Garden files.
export async function POST() {
  const result = await syncGarden();
  return NextResponse.json({ ok: true, ...result });
}
