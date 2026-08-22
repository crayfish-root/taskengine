import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canManageProject } from "@/lib/project-permissions";

const bodySchema = z.object({ teamId: z.string().min(1) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  if (!(await canManageProject(user.id, id))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const link = await prisma.projectTeam.upsert({
    where: { projectId_teamId: { projectId: id, teamId: parsed.data.teamId } },
    create: { projectId: id, teamId: parsed.data.teamId },
    update: {},
    include: { team: true },
  });

  return NextResponse.json({ link });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  const teamId = req.nextUrl.searchParams.get("teamId");
  if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

  if (!(await canManageProject(user.id, id))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  await prisma.projectTeam.deleteMany({ where: { projectId: id, teamId } });
  return NextResponse.json({ ok: true });
}
