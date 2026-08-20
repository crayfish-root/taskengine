import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canActOnTask } from "@/lib/task-permissions";

const postSchema = z.object({
  userIds: z.array(z.string()).optional(),
  teamId: z.string().optional(),
});

// Plain assignment (add collaborators / fan out a team) — does NOT touch
// delegatedById/delegationDepth. Use POST /api/tasks/[id]/delegate for that.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  const parsed = postSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const allowed = await canActOnTask(user.id, id);
  if (!allowed) return NextResponse.json({ error: "Not authorized to assign this task" }, { status: 403 });

  const task = await prisma.task.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  let userIds = parsed.data.userIds ?? [];
  let autoAssigned = false;
  if (parsed.data.teamId) {
    const members = await prisma.teamMembership.findMany({
      where: { teamId: parsed.data.teamId },
      select: { userId: true },
    });
    userIds = [...new Set([...userIds, ...members.map((m) => m.userId)])];
    autoAssigned = true;
  }
  if (userIds.length === 0) {
    return NextResponse.json({ error: "No users to assign" }, { status: 400 });
  }

  const existing = await prisma.taskAssignment.findMany({ where: { taskId: id }, select: { userId: true } });
  const existingIds = new Set(existing.map((e) => e.userId));
  const toCreate = userIds.filter((uid) => !existingIds.has(uid));

  if (toCreate.length) {
    await prisma.taskAssignment.createMany({
      data: toCreate.map((uid) => ({
        taskId: id,
        userId: uid,
        isPrimary: existing.length === 0 && uid === toCreate[0],
        autoAssigned,
      })),
    });
    try {
      await prisma.notification.createMany({
        data: toCreate
          .filter((uid) => uid !== user.id)
          .map((uid) => ({
            userId: uid,
            type: "ASSIGNMENT" as const,
            title: `${user.name} assigned you to a task`,
            body: task.title,
            link: `/tasks/${id}`,
          })),
      });
    } catch {
      // best-effort
    }
  }

  const assignments = await prisma.taskAssignment.findMany({
    where: { taskId: id },
    include: { user: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } } },
  });
  return NextResponse.json({ assignments });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  const assignmentId = req.nextUrl.searchParams.get("assignmentId");
  if (!assignmentId) return NextResponse.json({ error: "assignmentId required" }, { status: 400 });

  const allowed = await canActOnTask(user.id, id);
  if (!allowed) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const assignment = await prisma.taskAssignment.findUnique({ where: { id: assignmentId } });
  if (!assignment || assignment.taskId !== id) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }
  await prisma.taskAssignment.delete({ where: { id: assignmentId } });

  return NextResponse.json({ ok: true });
}
