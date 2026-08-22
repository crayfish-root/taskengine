import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notify";
import { MAX_UPLOAD_BYTES, MAX_INLINE_BYTES, estimateDataUrlBytes } from "@/lib/documents";
import { storageConfigured, prepareDocumentStorage } from "@/lib/storage";
import { canViewDocument } from "@/lib/document-access";
import { canManageProject } from "@/lib/project-permissions";
import { canActOnTask } from "@/lib/task-permissions";
import { ELEVATED_LEVELS } from "@/lib/org";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Excludes dataUrl/storageKey — file bytes are served separately via /api/documents/[id]/file
// so list responses don't ship megabyte-sized base64 blobs.
const DOCUMENT_SELECT = {
  id: true,
  name: true,
  mimeType: true,
  size: true,
  restricted: true,
  createdAt: true,
  uploadedById: true,
  uploadedBy: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } },
  projectId: true,
  project: { select: { id: true, name: true, code: true } },
  taskId: true,
  task: { select: { id: true, title: true, projectId: true, project: { select: { id: true, name: true, code: true } } } },
} as const;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const uploaderId = searchParams.get("uploaderId") ?? undefined;
  const scope = searchParams.get("scope"); // "project" | "task" | "unattached"

  const where: Record<string, unknown> = {};
  if (q) where.name = { contains: q };
  if (uploaderId) where.uploadedById = uploaderId;
  if (scope === "project") where.projectId = { not: null };
  else if (scope === "task") where.taskId = { not: null };
  else if (scope === "unattached") {
    where.AND = [{ projectId: null }, { taskId: null }];
  }

  const documents = await prisma.document.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: DOCUMENT_SELECT,
    take: 500,
  });

  const visible = (
    await Promise.all(documents.map(async (d) => ((await canViewDocument(user.id, user.level, d)) ? d : null)))
  ).filter((d): d is (typeof documents)[number] => d !== null);

  return NextResponse.json({ documents: visible });
}

const uploadSchema = z.object({
  name: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(255),
  size: z.number().int().positive(),
  dataUrl: z.string().startsWith("data:"),
  projectId: z.string().trim().min(1).nullable().optional(),
  taskId: z.string().trim().min(1).nullable().optional(),
  restricted: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = uploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid upload payload", issues: parsed.error.issues }, { status: 400 });
  }

  const { name, mimeType, size, dataUrl, projectId, taskId, restricted } = parsed.data;

  if (size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File is too large. Maximum size is 20MB." }, { status: 413 });
  }
  const actualBytes = estimateDataUrlBytes(dataUrl);
  if (actualBytes > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File is too large. Maximum size is 20MB." }, { status: 413 });
  }
  if (!storageConfigured() && actualBytes > MAX_INLINE_BYTES) {
    return NextResponse.json(
      { error: "Files over 5MB require object storage to be configured. Ask an admin to set it up." },
      { status: 413 }
    );
  }

  if (projectId) {
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, name: true, ownerId: true } });
    if (!project) return NextResponse.json({ error: "Selected project was not found" }, { status: 400 });
    if (!ELEVATED_LEVELS.has(user.level) && !(await canManageProject(user.id, projectId))) {
      return NextResponse.json({ error: "Not authorized to attach documents to this project" }, { status: 403 });
    }
  }
  if (taskId) {
    const task = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true, title: true, createdById: true } });
    if (!task) return NextResponse.json({ error: "Selected task was not found" }, { status: 400 });
    if (!ELEVATED_LEVELS.has(user.level) && !(await canActOnTask(user.id, taskId))) {
      return NextResponse.json({ error: "Not authorized to attach documents to this task" }, { status: 403 });
    }
  }

  const stored = await prepareDocumentStorage(mimeType, dataUrl, name);

  const document = await prisma.document.create({
    data: {
      id: stored.id,
      name,
      mimeType,
      size,
      dataUrl: stored.dataUrl,
      storageKey: stored.storageKey,
      restricted,
      uploadedById: user.id,
      projectId: projectId || null,
      taskId: taskId || null,
    },
    select: DOCUMENT_SELECT,
  });

  await logActivity(prisma, {
    userId: user.id,
    action: `uploaded a document — "${name}"`,
    entityType: "Document",
    entityId: document.id,
    meta: { name, projectId: projectId || undefined, taskId: taskId || undefined },
  });

  // Let the owner of the target project, or the task creator, know something landed.
  try {
    if (document.project && document.project.id && document.taskId === null) {
      const project = await prisma.project.findUnique({ where: { id: document.project.id }, select: { ownerId: true, name: true } });
      if (project && project.ownerId !== user.id) {
        await notify(prisma, {
          userId: project.ownerId,
          type: "SYSTEM",
          title: `New document on ${project.name}`,
          body: `${user.name} uploaded "${name}"`,
          link: `/projects/${document.project.id}`,
        });
      }
    } else if (document.task) {
      const task = await prisma.task.findUnique({ where: { id: document.task.id }, select: { createdById: true, title: true } });
      if (task && task.createdById !== user.id) {
        await notify(prisma, {
          userId: task.createdById,
          type: "SYSTEM",
          title: `New document on ${task.title}`,
          body: `${user.name} uploaded "${name}"`,
          link: `/tasks/${document.task.id}`,
        });
      }
    }
  } catch {
    // notification is best-effort; never fail the upload over it
  }

  return NextResponse.json({ document }, { status: 201 });
}
