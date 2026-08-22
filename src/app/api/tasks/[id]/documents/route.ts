import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canActOnTask } from "@/lib/task-permissions";
import { storageConfigured, prepareDocumentStorage } from "@/lib/storage";
import { MAX_INLINE_BYTES } from "@/lib/documents";

const MAX_SIZE = 20 * 1024 * 1024; // 20MB hard cap, enforced regardless of storage backend

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

  if (!storageConfigured() && parsed.data.size > MAX_INLINE_BYTES) {
    return NextResponse.json(
      { error: "Files over 5MB require object storage to be configured. Ask an admin to set it up." },
      { status: 413 }
    );
  }

  const task = await prisma.task.findUnique({ where: { id }, select: { id: true } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  if (!(await canActOnTask(user.id, id))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const stored = await prepareDocumentStorage(parsed.data.mimeType, parsed.data.dataUrl, parsed.data.name);

  const doc = await prisma.document.create({
    data: {
      id: stored.id,
      taskId: id,
      uploadedById: user.id,
      name: parsed.data.name,
      mimeType: parsed.data.mimeType,
      size: parsed.data.size,
      dataUrl: stored.dataUrl,
      storageKey: stored.storageKey,
    },
    include: { uploadedBy: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } } },
  });

  return NextResponse.json({ document: doc });
}
