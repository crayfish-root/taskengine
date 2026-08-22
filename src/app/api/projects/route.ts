import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ELEVATED_LEVELS } from "@/lib/org";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  code: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9-]+$/, "Use uppercase letters, numbers and dashes only"),
  description: z.string().trim().max(4000).optional(),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "AT_RISK", "DELAYED", "COMPLETED", "CANCELLED"]).default("PLANNING"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  departmentId: z.string().optional().nullable(),
  ownerId: z.string().min(1),
  startDate: z.string().optional().nullable(),
  targetDate: z.string().optional().nullable(),
  budget: z.number().optional().nullable(),
  color: z.string().optional(),
  memberIds: z.array(z.string()).default([]),
  teamIds: z.array(z.string()).default([]),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }
  const d = parsed.data;

  if (d.ownerId !== user.id && !ELEVATED_LEVELS.has(user.level)) {
    return NextResponse.json({ error: "You can only create a project owned by yourself" }, { status: 403 });
  }

  const existing = await prisma.project.findUnique({ where: { code: d.code } });
  if (existing) {
    return NextResponse.json({ error: `Project code "${d.code}" is already in use` }, { status: 409 });
  }

  const memberIds = [...new Set([...d.memberIds, d.ownerId])];

  const project = await prisma.project.create({
    data: {
      name: d.name,
      code: d.code,
      description: d.description || null,
      status: d.status as never,
      priority: d.priority as never,
      departmentId: d.departmentId || null,
      ownerId: d.ownerId,
      startDate: d.startDate ? new Date(d.startDate) : null,
      targetDate: d.targetDate ? new Date(d.targetDate) : null,
      budget: d.budget ?? null,
      color: d.color || "#6366f1",
      members: { create: memberIds.map((uid) => ({ userId: uid, role: uid === d.ownerId ? "Owner" : "Contributor" })) },
      teams: { create: d.teamIds.map((teamId) => ({ teamId })) },
    },
  });

  return NextResponse.json({ project });
}
