import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canManageProject } from "@/lib/project-permissions";
import { canActOnTask } from "@/lib/task-permissions";
import { ELEVATED_LEVELS } from "@/lib/org";

const patchSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]).optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  ownerId: z.string().nullable().optional(),
  description: z.string().trim().max(4000).nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const d = parsed.data;

  const existing = await prisma.blocker.findUnique({
    where: { id },
    select: { raisedById: true, ownerId: true, projectId: true, taskId: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed =
    user.id === existing.raisedById ||
    user.id === existing.ownerId ||
    ELEVATED_LEVELS.has(user.level) ||
    (existing.projectId ? await canManageProject(user.id, existing.projectId) : false) ||
    (existing.taskId ? await canActOnTask(user.id, existing.taskId) : false);
  if (!allowed) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const blocker = await prisma.blocker.update({
    where: { id },
    data: {
      ...(d.status !== undefined && {
        status: d.status as never,
        resolvedAt: d.status === "RESOLVED" ? new Date() : null,
      }),
      ...(d.severity !== undefined && { severity: d.severity as never }),
      ...(d.ownerId !== undefined && { ownerId: d.ownerId }),
      ...(d.description !== undefined && { description: d.description }),
    },
  });

  return NextResponse.json({ blocker });
}
