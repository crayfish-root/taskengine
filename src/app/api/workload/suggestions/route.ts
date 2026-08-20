import { getCurrentUser } from "@/lib/auth";
import { buildCoverageQueue } from "@/lib/auto-assign";
import { NextResponse } from "next/server";

// Coverage suggestions while people are away — read-only computation, no mutation.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const items = await buildCoverageQueue();
  return NextResponse.json({ ok: true, items });
}
