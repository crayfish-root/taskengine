import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const statusSchema = z.object({
  key: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(60),
  color: z.string().trim().min(1).max(20),
  isTerminal: z.boolean().default(false),
  isDelayFlag: z.boolean().default(false),
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  isDefault: z.boolean().default(false),
  statuses: z.array(statusSchema).min(1).max(20),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const workflows = await prisma.workflow.findMany({
    include: {
      statuses: { orderBy: { order: "asc" } },
      _count: { select: { projects: true } },
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ workflows });
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

  const workflow = await prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.workflow.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    }
    return tx.workflow.create({
      data: {
        name: data.name,
        description: data.description || null,
        isDefault: data.isDefault,
        statuses: {
          create: data.statuses.map((s, i) => ({
            key: s.key,
            label: s.label,
            color: s.color,
            order: i,
            isTerminal: s.isTerminal,
            isDelayFlag: s.isDelayFlag,
          })),
        },
      },
      include: { statuses: { orderBy: { order: "asc" } } },
    });
  });

  return NextResponse.json({ workflow }, { status: 201 });
}
