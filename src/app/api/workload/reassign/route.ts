import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { applyReassignment } from "@/lib/auto-assign";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  assignmentId: z.string(),
  newUserId: z.string(),
});

// Confirms one coverage suggestion: moves a task assignment from someone on
// leave to a replacement. Always human-confirmed — see src/lib/auto-assign.ts.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { assignmentId, newUserId } = parsed.data;

  const assignment = await prisma.taskAssignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

  const newUser = await prisma.user.findUnique({ where: { id: newUserId }, select: { id: true, active: true } });
  if (!newUser || !newUser.active) return NextResponse.json({ error: "Replacement user not found" }, { status: 404 });

  const result = await applyReassignment(assignmentId, newUserId, prisma);
  return NextResponse.json({ ok: true, assignment: result });
}
