import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  color: z.string().trim().max(20).optional(),
});

const DEPARTMENT_SELECT = {
  id: true,
  name: true,
  description: true,
  color: true,
  createdAt: true,
  _count: { select: { users: true, teams: true, projects: true } },
} as const;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const departments = await prisma.department.findMany({
    select: DEPARTMENT_SELECT,
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ departments });
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

  const existing = await prisma.department.findUnique({ where: { name: data.name } });
  if (existing) return NextResponse.json({ error: "A department with that name already exists" }, { status: 409 });

  const department = await prisma.department.create({
    data: { name: data.name, description: data.description || null, color: data.color || "#6366f1" },
    select: DEPARTMENT_SELECT,
  });

  return NextResponse.json({ department }, { status: 201 });
}
