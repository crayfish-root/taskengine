import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canActOnTask } from "@/lib/task-permissions";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  estimatedHours: z.number().nullable().optional(),
  actualHours: z.number().nullable().optional(),
  projectId: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const allowed = await canActOnTask(user.id, id);
  if (!allowed) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const d = parsed.data;
  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(d.title !== undefined && { title: d.title }),
      ...(d.description !== undefined && { description: d.description }),
      ...(d.priority !== undefined && { priority: d.priority as never }),
      ...(d.startDate !== undefined && { startDate: d.startDate ? new Date(d.startDate) : null }),
      ...(d.dueDate !== undefined && { dueDate: d.dueDate ? new Date(d.dueDate) : null }),
      ...(d.estimatedHours !== undefined && { estimatedHours: d.estimatedHours }),
      ...(d.actualHours !== undefined && { actualHours: d.actualHours }),
      ...(d.projectId !== undefined && { projectId: d.projectId }),
    },
  });

  return NextResponse.json({ task });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id }, select: { createdById: true } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  if (task.createdById !== user.id) {
    return NextResponse.json({ error: "Only the creator can delete this task" }, { status: 403 });
  }
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
