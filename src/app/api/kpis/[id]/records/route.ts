import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ELEVATED_LEVELS } from "@/lib/org";
import { derivePeriodStart } from "@/app/(app)/kpis/_lib/kpi-math";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  value: z.coerce.number(),
  periodEnd: z.coerce.date().optional(),
  note: z.string().trim().max(2000).optional().nullable(),
  subjectId: z.string().trim().min(1).optional().nullable(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await params;

  const kpi = await prisma.kpi.findUnique({ where: { id } });
  if (!kpi) return NextResponse.json({ error: "KPI not found" }, { status: 404 });
  if (kpi.ownerId !== user.id && !ELEVATED_LEVELS.has(user.level)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;
  const periodEnd = data.periodEnd ?? new Date();
  const periodStart = derivePeriodStart(kpi.frequency, periodEnd);

  const record = await prisma.kpiRecord.create({
    data: {
      kpiId: id,
      value: data.value,
      periodStart,
      periodEnd,
      note: data.note || null,
      subjectId: data.subjectId || null,
      updatedById: user.id,
    },
  });

  return NextResponse.json({ record }, { status: 201 });
}
