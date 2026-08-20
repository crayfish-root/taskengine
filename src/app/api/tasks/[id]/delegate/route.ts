import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canActOnTask } from "@/lib/task-permissions";

const bodySchema = z.object({
  toUserId: z.string().min(1),
  note: z.string().trim().max(1000).optional(),
});

// Explicit "delegate to" — distinct from a plain add-assignee. Records the
// chain of custody (delegatedById + delegationDepth) so it can be surfaced
// as a breadcrumb (CIO -> Director -> Manager -> Staff) on the task.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { toUserId, note } = parsed.data;

  const allowed = await canActOnTask(user.id, id);
  if (!allowed) return NextResponse.json({ error: "Not authorized to delegate this task" }, { status: 403 });

  const [task, target] = await Promise.all([
    prisma.task.findUnique({ where: { id }, include: { assignments: true } }),
    prisma.user.findUnique({
      where: { id: toUserId },
      select: { id: true, name: true, active: true, avatarColor: true, avatarEmoji: true, level: true, title: true },
    }),
  ]);
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  if (!target || !target.active) return NextResponse.json({ error: "Target user not found" }, { status: 404 });

  const currentPrimary = task.assignments.find((a) => a.isPrimary);
  if (currentPrimary?.userId === toUserId) {
    return NextResponse.json({ error: `${target.name} is already the primary assignee` }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.taskAssignment.updateMany({ where: { taskId: id }, data: { isPrimary: false } });
    await tx.taskAssignment.upsert({
      where: { taskId_userId: { taskId: id, userId: toUserId } },
      create: {
        taskId: id,
        userId: toUserId,
        isPrimary: true,
        reassignedFromId: currentPrimary?.userId,
      },
      update: {
        isPrimary: true,
        reassignedFromId: currentPrimary?.userId ?? undefined,
      },
    });

    const t = await tx.task.update({
      where: { id },
      data: {
        delegatedById: user.id,
        delegationDepth: { increment: 1 },
      },
    });

    await tx.comment.create({
      data: {
        taskId: id,
        authorId: user.id,
        body: `Delegated this task to ${target.name}.${note ? ` Note: ${note}` : ""}`,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: "DELEGATE",
        entityType: "Task",
        entityId: id,
        meta: JSON.stringify({
          toUserId,
          toName: target.name,
          toAvatarColor: target.avatarColor,
          toAvatarEmoji: target.avatarEmoji,
          toLevel: target.level,
          toTitle: target.title,
          note: note ?? null,
        }),
      },
    });

    return t;
  });

  try {
    await prisma.notification.create({
      data: {
        userId: toUserId,
        type: "DELEGATION",
        title: `${user.name} delegated a task to you`,
        body: task.title,
        link: `/tasks/${id}`,
      },
    });
  } catch {
    // best-effort
  }

  return NextResponse.json({ task: updated });
}
