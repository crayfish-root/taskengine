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

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  isDefault: z.boolean().optional(),
  statuses: z.array(statusSchema).min(1).max(20).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await params;

  const workflow = await prisma.workflow.findUnique({
    where: { id },
    include: { statuses: { orderBy: { order: "asc" } } },
  });
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ workflow });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.workflow.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;

  let workflow;
  try {
    workflow = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.workflow.updateMany({ where: { isDefault: true, id: { not: id } }, data: { isDefault: false } });
      }
      if (data.statuses) {
        await tx.workflowStatus.deleteMany({ where: { workflowId: id } });
      }
      return tx.workflow.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.description !== undefined ? { description: data.description || null } : {}),
          ...(data.isDefault !== undefined ? { isDefault: data.isDefault } : {}),
          ...(data.statuses
            ? {
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
              }
            : {}),
        },
        include: { statuses: { orderBy: { order: "asc" } } },
      });
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return NextResponse.json({ error: "Two statuses can't share the same key." }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not save workflow" }, { status: 500 });
  }

  return NextResponse.json({ workflow });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.workflow.findUnique({
    where: { id },
    include: { _count: { select: { projects: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing._count.projects > 0) {
    return NextResponse.json(
      { error: "This workflow is in use by one or more projects and can't be deleted." },
      { status: 409 }
    );
  }

  await prisma.workflow.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
