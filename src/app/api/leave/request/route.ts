import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const LEAVE_TYPES = ["ANNUAL", "SICK", "PUBLIC_HOLIDAY", "UNPAID", "OTHER"] as const;

const bodySchema = z.object({
  type: z.enum(LEAVE_TYPES),
  startDate: z.string(),
  endDate: z.string(),
  halfDay: z.boolean().optional().default(false),
  reason: z.string().max(2000).optional(),
  backupUserIds: z.array(z.string()).max(5).optional().default([]),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }
  const { type, halfDay, reason, backupUserIds } = parsed.data;
  const startDate = new Date(parsed.data.startDate);
  const endDate = new Date(parsed.data.endDate);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  const leave = await prisma.leaveRequest.create({
    data: {
      userId: user.id,
      type,
      startDate,
      endDate,
      halfDay,
      reason: reason || null,
      status: "PENDING",
      backupUserIds: backupUserIds.length ? JSON.stringify(backupUserIds) : null,
    },
  });

  return NextResponse.json({ ok: true, leave });
}
