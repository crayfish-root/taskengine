import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// Powers the searchable project/task picker in the upload modal.
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const [projects, tasks] = await Promise.all([
    prisma.project.findMany({
      where: q ? { OR: [{ name: { contains: q } }, { code: { contains: q } }] } : undefined,
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
      take: 25,
    }),
    prisma.task.findMany({
      where: q ? { title: { contains: q } } : undefined,
      select: { id: true, title: true, project: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 25,
    }),
  ]);

  return NextResponse.json({ projects, tasks });
}
