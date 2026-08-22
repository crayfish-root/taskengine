import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { issueAuthToken } from "@/lib/tokens";
import { ELEVATED_LEVELS } from "@/lib/org";
import { NextRequest, NextResponse } from "next/server";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!ELEVATED_LEVELS.has(user.level)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, active: true, passwordHash: true } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (target.active || target.passwordHash) {
    return NextResponse.json({ error: "This account has already been activated" }, { status: 409 });
  }

  const token = await issueAuthToken("INVITE", target.id, user.id);
  return NextResponse.json({ token });
}
