import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ORG_LEVELS = ["CIO", "DIRECTOR", "HEAD_OF_DEPARTMENT", "MANAGER", "LEAD", "STAFF"] as const;

const createSchema = z.object({
  email: z.string().trim().email().max(160),
  name: z.string().trim().min(1).max(120),
  password: z.string().trim().min(6).max(200).optional(),
  title: z.string().trim().max(120).optional().nullable(),
  level: z.enum(ORG_LEVELS).default("STAFF"),
  avatarColor: z.string().trim().max(20).optional(),
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

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const departmentId = searchParams.get("departmentId") || undefined;
  const teamId = searchParams.get("teamId") || undefined;
  const level = searchParams.get("level") || undefined;
  const active = searchParams.get("active");

  const users = await prisma.user.findMany({
    where: {
      departmentId,
      level: level ? (level as (typeof ORG_LEVELS)[number]) : undefined,
      active: active === "true" ? true : active === "false" ? false : undefined,
      ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { title: { contains: q } }] } : {}),
      ...(teamId ? { teamMemberships: { some: { teamId } } } : {}),
    },
    select: USER_CARD_SELECT,
    orderBy: [{ name: "asc" }],
  });

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return NextResponse.json({ error: "A user with that email already exists" }, { status: 409 });
  }

  const passwordHash = await hashPassword(data.password || "password123");

  const created = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      passwordHash,
      title: data.title || null,
      level: data.level,
      avatarColor: data.avatarColor || "#6366f1",
      departmentId: data.departmentId || null,
      managerId: data.managerId || null,
      teamMemberships: data.teamIds.length
        ? { create: data.teamIds.map((teamId) => ({ teamId })) }
        : undefined,
    },
    select: USER_CARD_SELECT,
  });

  return NextResponse.json({ user: created }, { status: 201 });
}
