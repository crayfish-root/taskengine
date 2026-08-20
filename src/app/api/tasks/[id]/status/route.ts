import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canActOnTask } from "@/lib/task-permissions";
import { ALL_TASK_STATUSES } from "@/lib/task-utils";

const bodySchema = z.object({
  toStatus: z.enum(ALL_TASK_STATUSES as [string, ...string[]]),
  note: z.string().trim().max(2000).optional(),
  blocker: z
    .object({
      title: z.string().trim().min(1).max(200),
      description: z.string().trim().max(2000).optional(),
      severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
    })
    .optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }
  const { toStatus, note, blocker } = parsed.data;

  const allowed = await canActOnTask(user.id, id);
  if (!allowed) return NextResponse.json({ error: "Not authorized to update this task" }, { status: 403 });

  const task = await prisma.task.findUnique({
    where: { id },
    include: { assignments: { select: { userId: true } } },
  });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const fromStatus = task.status;

  const updated = await prisma.$transaction(async (tx) => {
    const t = await tx.task.update({
      where: { id },
      data: {
        status: toStatus as never,
        completedAt: toStatus === "DONE" ? new Date() : null,
      },
    });
    await tx.taskStatusEvent.create({
      data: {
        taskId: id,
        fromStatus: fromStatus as never,
        toStatus: toStatus as never,
        note,
        byId: user.id,
      },
    });

    let createdBlocker = null;
    if (toStatus === "BLOCKED" && blocker) {
      createdBlocker = await tx.blocker.create({
        data: {
          title: blocker.title,
          description: blocker.description,
          severity: blocker.severity as never,
          taskId: id,
          projectId: task.projectId,
          raisedById: user.id,
          ownerId: task.assignments[0]?.userId ?? user.id,
        },
      });
    }

    return { t, createdBlocker };
  });

  // Notify assignees (best-effort, never block on failure).
  try {
    const recipients = task.assignments.map((a) => a.userId).filter((uid) => uid !== user.id);
    if (recipients.length) {
      await prisma.notification.createMany({
        data: recipients.map((uid) => ({
          userId: uid,
          type: "STATUS_CHANGE" as const,
          title: `Task moved to ${toStatus.replace("_", " ")}`,
          body: task.title,
          link: `/tasks/${id}`,
        })),
      });
    }
  } catch {
    // notifications are best-effort
  }

  return NextResponse.json({ task: updated.t, blocker: updated.createdBlocker });
}
