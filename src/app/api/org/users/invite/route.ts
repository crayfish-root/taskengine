import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { issueAuthToken } from "@/lib/tokens";
import { ELEVATED_LEVELS } from "@/lib/org";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ORG_LEVELS = ["CIO", "DIRECTOR", "HEAD_OF_DEPARTMENT", "MANAGER", "LEAD", "STAFF"] as const;

const inviteSchema = z.object({
  email: z.string().trim().email().max(160),
  name: z.string().trim().min(1).max(120),
  title: z.string().trim().max(120).optional().nullable(),
  level: z.enum(ORG_LEVELS).default("STAFF"),
  departmentId: z.string().trim().min(1).optional().nullable(),
  managerId: z.string().trim().min(1).optional().nullable(),
  teamIds: z.array(z.string().trim().min(1)).optional().default([]),
});

const USER_CARD_SELECT = {
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
  manager: { select: { id: true, name: true } },
  teamMemberships: { select: { team: { select: { id: true, name: true, color: true } } } },
} as const;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!ELEVATED_LEVELS.has(user.level)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return NextResponse.json({ error: "A user with that email already exists" }, { status: 409 });
  }

  const created = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      passwordHash: null,
      active: false,
      title: data.title || null,
      level: data.level,
      departmentId: data.departmentId || null,
      managerId: data.managerId || null,
      teamMemberships: data.teamIds.length
        ? { create: data.teamIds.map((teamId) => ({ teamId })) }
        : undefined,
    },
    select: USER_CARD_SELECT,
  });

  const token = await issueAuthToken("INVITE", created.id, user.id);

  return NextResponse.json({ user: created, token }, { status: 201 });
}
