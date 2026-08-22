import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ELEVATED_LEVELS } from "@/lib/org";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  color: z.string().trim().max(20).optional(),
  departmentId: z.string().trim().min(1).optional().nullable(),
  leadId: z.string().trim().min(1).optional().nullable(),
  memberIds: z.array(z.string().trim().min(1)).optional(),
});

const TEAM_DETAIL_SELECT = {
  id: true,
  name: true,
  description: true,
  color: true,
  createdAt: true,
  departmentId: true,
  department: { select: { id: true, name: true, color: true } },
  leadId: true,
  lead: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true, title: true } },
  members: {
    select: { user: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true, title: true, level: true, active: true, email: true } } },
  },
} as const;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await params;

  const team = await prisma.team.findUnique({ where: { id }, select: TEAM_DETAIL_SELECT });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ team });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!ELEVATED_LEVELS.has(user.level)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await prisma.team.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const team = await prisma.team.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description || null } : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
      ...(data.departmentId !== undefined ? { departmentId: data.departmentId || null } : {}),
      ...(data.leadId !== undefined ? { leadId: data.leadId || null } : {}),
      ...(data.memberIds !== undefined
        ? { members: { deleteMany: {}, create: data.memberIds.map((userId) => ({ userId })) } }
        : {}),
    },
    select: TEAM_DETAIL_SELECT,
  });

  return NextResponse.json({ team });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!ELEVATED_LEVELS.has(user.level)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }
  const { id } = await params;

  const existing = await prisma.team.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.team.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
