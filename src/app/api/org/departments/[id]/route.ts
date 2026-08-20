import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  color: z.string().trim().max(20).optional(),
});

const DEPARTMENT_SELECT = {
  id: true,
  name: true,
  description: true,
  color: true,
  createdAt: true,
  _count: { select: { users: true, teams: true, projects: true } },
} as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await prisma.department.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const department = await prisma.department.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description || null } : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
    },
    select: DEPARTMENT_SELECT,
  });

  return NextResponse.json({ department });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.department.findUnique({
    where: { id },
    select: { _count: { select: { users: true, teams: true, projects: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing._count.users > 0 || existing._count.teams > 0 || existing._count.projects > 0) {
    return NextResponse.json(
      { error: "Cannot delete a department that still has users, teams, or projects assigned to it" },
      { status: 409 }
    );
  }

  await prisma.department.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
