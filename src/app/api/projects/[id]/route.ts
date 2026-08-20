import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "AT_RISK", "DELAYED", "COMPLETED", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  departmentId: z.string().nullable().optional(),
  ownerId: z.string().optional(),
  startDate: z.string().nullable().optional(),
  targetDate: z.string().nullable().optional(),
  budget: z.number().nullable().optional(),
});

async function canManageProject(userId: string, projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { ownerId: true } });
  if (!project) return false;
  if (project.ownerId === userId) return true;
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return !!membership;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const allowed = await canManageProject(user.id, id);
  if (!allowed) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const d = parsed.data;
  const project = await prisma.project.update({
    where: { id },
    data: {
      ...(d.name !== undefined && { name: d.name }),
      ...(d.description !== undefined && { description: d.description }),
      ...(d.status !== undefined && {
        status: d.status as never,
        completedAt: (d.status as string) === "COMPLETED" ? new Date() : null,
      }),
      ...(d.priority !== undefined && { priority: d.priority as never }),
      ...(d.departmentId !== undefined && { departmentId: d.departmentId }),
      ...(d.ownerId !== undefined && { ownerId: d.ownerId }),
      ...(d.startDate !== undefined && { startDate: d.startDate ? new Date(d.startDate) : null }),
      ...(d.targetDate !== undefined && { targetDate: d.targetDate ? new Date(d.targetDate) : null }),
      ...(d.budget !== undefined && { budget: d.budget }),
    },
  });

  return NextResponse.json({ project });
}
