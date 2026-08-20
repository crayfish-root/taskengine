import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAllReportIds } from "@/lib/org";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ORG_LEVELS = ["CIO", "DIRECTOR", "HEAD_OF_DEPARTMENT", "MANAGER", "LEAD", "STAFF"] as const;

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  title: z.string().trim().max(120).optional().nullable(),
  level: z.enum(ORG_LEVELS).optional(),
  avatarColor: z.string().trim().max(20).optional(),
  avatarEmoji: z.string().trim().max(8).optional().nullable(),
  active: z.boolean().optional(),
  departmentId: z.string().trim().min(1).optional().nullable(),
  managerId: z.string().trim().min(1).optional().nullable(),
  teamIds: z.array(z.string().trim().min(1)).optional(),
});

const USER_DETAIL_SELECT = {
  id: true,
  email: true,
  name: true,
  title: true,
  level: true,
  avatarColor: true,
  avatarEmoji: true,
  active: true,
  createdAt: true,
  departmentId: true,
  managerId: true,
  department: { select: { id: true, name: true, color: true } },
  manager: { select: { id: true, name: true, title: true, level: true, avatarColor: true, avatarEmoji: true } },
  directReports: {
    select: { id: true, name: true, title: true, level: true, avatarColor: true, avatarEmoji: true, active: true },
    orderBy: { name: "asc" as const },
  },
  teamMemberships: {
    select: { team: { select: { id: true, name: true, color: true, departmentId: true } } },
  },
} as const;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await params;

  const found = await prisma.user.findUnique({ where: { id }, select: USER_DETAIL_SELECT });
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ user: found });
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

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (data.managerId !== undefined && data.managerId) {
    if (data.managerId === id) {
      return NextResponse.json({ error: "A person cannot manage themselves" }, { status: 400 });
    }
    // Prevent creating a cycle: the new manager can't be one of this user's own reports.
    const reportIds = await getAllReportIds(id);
    if (reportIds.includes(data.managerId)) {
      return NextResponse.json({ error: "That would create a circular reporting line" }, { status: 400 });
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.title !== undefined ? { title: data.title || null } : {}),
      ...(data.level !== undefined ? { level: data.level } : {}),
      ...(data.avatarColor !== undefined ? { avatarColor: data.avatarColor } : {}),
      ...(data.avatarEmoji !== undefined ? { avatarEmoji: data.avatarEmoji || null } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
      ...(data.departmentId !== undefined ? { departmentId: data.departmentId || null } : {}),
      ...(data.managerId !== undefined ? { managerId: data.managerId || null } : {}),
      ...(data.teamIds !== undefined
        ? {
            teamMemberships: {
              deleteMany: {},
              create: data.teamIds.map((teamId) => ({ teamId })),
            },
          }
        : {}),
    },
    select: USER_DETAIL_SELECT,
  });

  return NextResponse.json({ user: updated });
}

// Soft delete — users are referenced across the whole app (tasks, comments, activity),
// so we deactivate rather than hard-delete to keep referential integrity intact.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.user.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
