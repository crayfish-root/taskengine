import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ALL_TASK_STATUSES } from "@/lib/task-utils";

const bodySchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(5000).optional(),
  projectId: z.string().optional().nullable(),
  parentTaskId: z.string().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  status: z.enum(ALL_TASK_STATUSES as [string, ...string[]]).default("TODO"),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  estimatedHours: z.number().optional().nullable(),
  assigneeIds: z.array(z.string()).default([]),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }
  const d = parsed.data;

  let parentDepth = 0;
  if (d.parentTaskId) {
    const parent = await prisma.task.findUnique({ where: { id: d.parentTaskId }, select: { delegationDepth: true, projectId: true } });
    if (parent) {
      parentDepth = parent.delegationDepth;
      if (!d.projectId) d.projectId = parent.projectId;
    }
  }

  const task = await prisma.task.create({
    data: {
      title: d.title,
      description: d.description || null,
      projectId: d.projectId || null,
      parentTaskId: d.parentTaskId || null,
      priority: d.priority as never,
      status: d.status as never,
      startDate: d.startDate ? new Date(d.startDate) : null,
      dueDate: d.dueDate ? new Date(d.dueDate) : null,
      estimatedHours: d.estimatedHours ?? null,
      createdById: user.id,
      delegationDepth: parentDepth,
      completedAt: d.status === "DONE" ? new Date() : null,
      assignments: {
        create: d.assigneeIds.map((uid, i) => ({ userId: uid, isPrimary: i === 0 })),
      },
      statusHistory: {
        create: { toStatus: d.status as never, byId: user.id, note: "Task created" },
      },
    },
    include: {
      assignments: { include: { user: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } } } },
    },
  });

  try {
    const recipients = d.assigneeIds.filter((uid) => uid !== user.id);
    if (recipients.length) {
      await prisma.notification.createMany({
        data: recipients.map((uid) => ({
          userId: uid,
          type: "ASSIGNMENT" as const,
          title: `${user.name} assigned you a new task`,
          body: task.title,
          link: `/tasks/${task.id}`,
        })),
      });
    }
  } catch {
    // best-effort
  }

  return NextResponse.json({ task });
}
