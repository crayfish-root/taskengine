import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ELEVATED_LEVELS } from "@/lib/org";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  unit: z.string().trim().max(24).optional(),
  target: z.coerce.number().optional(),
  direction: z.enum(["HIGHER_IS_BETTER", "LOWER_IS_BETTER"]).optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY"]).optional(),
  departmentId: z.string().trim().min(1).optional().nullable(),
  projectId: z.string().trim().min(1).optional().nullable(),
  ownerId: z.string().trim().min(1).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await params;

  const kpi = await prisma.kpi.findUnique({
    where: { id },
    include: {
      department: { select: { id: true, name: true, color: true } },
      project: { select: { id: true, name: true, code: true } },
      owner: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } },
      records: {
        orderBy: { periodEnd: "asc" },
        include: {
          subject: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } },
          updatedBy: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } },
        },
      },
    },
  });
  if (!kpi) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ kpi });
}

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

  const existing = await prisma.kpi.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.ownerId !== user.id && !ELEVATED_LEVELS.has(user.level)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const kpi = await prisma.kpi.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description || null } : {}),
      ...(data.unit !== undefined ? { unit: data.unit } : {}),
      ...(data.target !== undefined ? { target: data.target } : {}),
      ...(data.direction !== undefined ? { direction: data.direction } : {}),
      ...(data.frequency !== undefined ? { frequency: data.frequency } : {}),
      ...(data.departmentId !== undefined ? { departmentId: data.departmentId || null } : {}),
      ...(data.projectId !== undefined ? { projectId: data.projectId || null } : {}),
      ...(data.ownerId !== undefined ? { ownerId: data.ownerId } : {}),
    },
  });

  return NextResponse.json({ kpi });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.kpi.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.ownerId !== user.id && !ELEVATED_LEVELS.has(user.level)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  await prisma.kpi.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
