import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const bodySchema = z.object({ userId: z.string().min(1), role: z.string().trim().max(60).optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const member = await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: id, userId: parsed.data.userId } },
    create: { projectId: id, userId: parsed.data.userId, role: parsed.data.role || "Contributor" },
    update: { role: parsed.data.role || "Contributor" },
    include: { user: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true, title: true } } },
  });

  try {
    if (parsed.data.userId !== user.id) {
      const project = await prisma.project.findUnique({ where: { id }, select: { name: true } });
      await prisma.notification.create({
        data: {
          userId: parsed.data.userId,
          type: "ASSIGNMENT",
          title: `${user.name} added you to a project`,
          body: project?.name,
          link: `/projects/${id}`,
        },
      });
    }
  } catch {
    // best-effort
  }

  return NextResponse.json({ member });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  await prisma.projectMember.deleteMany({ where: { projectId: id, userId } });
  return NextResponse.json({ ok: true });
}
