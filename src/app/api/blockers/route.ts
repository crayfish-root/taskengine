import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const bodySchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(4000).optional(),
    severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
    taskId: z.string().optional().nullable(),
    projectId: z.string().optional().nullable(),
    ownerId: z.string().optional().nullable(),
  })
  .refine((d) => d.taskId || d.projectId, { message: "A blocker must be linked to a task or a project" });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const d = parsed.data;

  let projectId = d.projectId ?? null;
  if (d.taskId && !projectId) {
    const task = await prisma.task.findUnique({ where: { id: d.taskId }, select: { projectId: true } });
    projectId = task?.projectId ?? null;
  }

  const blocker = await prisma.blocker.create({
    data: {
      title: d.title,
      description: d.description || null,
      severity: d.severity as never,
      taskId: d.taskId || null,
      projectId,
      raisedById: user.id,
      ownerId: d.ownerId || null,
    },
  });

  try {
    if (d.ownerId && d.ownerId !== user.id) {
      await prisma.notification.create({
        data: {
          userId: d.ownerId,
          type: "BLOCKER",
          title: `New blocker assigned to you: ${d.title}`,
          link: d.taskId ? `/tasks/${d.taskId}` : d.projectId ? `/projects/${d.projectId}` : undefined,
        },
      });
    }
  } catch {
    // best-effort
  }

  return NextResponse.json({ blocker });
}
