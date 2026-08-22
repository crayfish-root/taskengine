import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canActOnTask } from "@/lib/task-permissions";

const bodySchema = z.object({ body: z.string().trim().min(1).max(4000) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Comment body required" }, { status: 400 });

  const task = await prisma.task.findUnique({ where: { id }, select: { id: true } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  if (!(await canActOnTask(user.id, id))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const comment = await prisma.comment.create({
    data: { taskId: id, authorId: user.id, body: parsed.data.body },
    include: { author: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } } },
  });

  return NextResponse.json({ comment });
}
