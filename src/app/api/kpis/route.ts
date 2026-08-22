import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ELEVATED_LEVELS } from "@/lib/org";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  unit: z.string().trim().max(24).optional().default(""),
  target: z.coerce.number(),
  direction: z.enum(["HIGHER_IS_BETTER", "LOWER_IS_BETTER"]).default("HIGHER_IS_BETTER"),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY"]).default("MONTHLY"),
  departmentId: z.string().trim().min(1).optional().nullable(),
  projectId: z.string().trim().min(1).optional().nullable(),
  ownerId: z.string().trim().min(1),
});

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get("departmentId") || undefined;
  const projectId = searchParams.get("projectId") || undefined;
  const ownerId = searchParams.get("ownerId") || undefined;

  const kpis = await prisma.kpi.findMany({
    where: { departmentId, projectId, ownerId },
    include: {
      department: { select: { id: true, name: true, color: true } },
      project: { select: { id: true, name: true, code: true } },
      owner: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } },
      records: { orderBy: { periodEnd: "asc" } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ kpis });
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

  if (data.ownerId !== user.id && !ELEVATED_LEVELS.has(user.level)) {
    return NextResponse.json({ error: "You can only create a KPI owned by yourself" }, { status: 403 });
  }

  const kpi = await prisma.kpi.create({
    data: {
      name: data.name,
      description: data.description || null,
      unit: data.unit || "",
      target: data.target,
      direction: data.direction,
      frequency: data.frequency,
      departmentId: data.departmentId || null,
      projectId: data.projectId || null,
      ownerId: data.ownerId,
    },
  });

  return NextResponse.json({ kpi }, { status: 201 });
}
