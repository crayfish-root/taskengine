import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ELEVATED_LEVELS } from "@/lib/org";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  color: z.string().trim().max(20).optional(),
  departmentId: z.string().trim().min(1).optional().nullable(),
  leadId: z.string().trim().min(1).optional().nullable(),
  memberIds: z.array(z.string().trim().min(1)).optional().default([]),
});

const TEAM_CARD_SELECT = {
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
    select: { user: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true, title: true, level: true, active: true } } },
  },
} as const;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get("departmentId") || undefined;

  const teams = await prisma.team.findMany({
    where: { departmentId },
    select: TEAM_CARD_SELECT,
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ teams });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!ELEVATED_LEVELS.has(user.level)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;

  const team = await prisma.team.create({
    data: {
      name: data.name,
      description: data.description || null,
      color: data.color || "#0ea5e9",
      departmentId: data.departmentId || null,
      leadId: data.leadId || null,
      members: data.memberIds.length ? { create: data.memberIds.map((userId) => ({ userId })) } : undefined,
    },
    select: TEAM_CARD_SELECT,
  });

  return NextResponse.json({ team }, { status: 201 });
}
