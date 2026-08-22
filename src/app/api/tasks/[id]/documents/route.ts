import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canActOnTask } from "@/lib/task-permissions";

const MAX_SIZE = 8 * 1024 * 1024; // 8MB, base64 blob stored inline in the database

const bodySchema = z.object({
  name: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(120),
  size: z.number().int().min(0).max(MAX_SIZE),
  dataUrl: z.string().min(1),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid file" }, { status: 400 });

  const task = await prisma.task.findUnique({ where: { id }, select: { id: true } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  if (!(await canActOnTask(user.id, id))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const doc = await prisma.document.create({
    data: { taskId: id, uploadedById: user.id, ...parsed.data },
    include: { uploadedBy: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } } },
  });

  return NextResponse.json({ document: doc });
}
