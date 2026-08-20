import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id, recordId } = await params;

  const record = await prisma.kpiRecord.findUnique({ where: { id: recordId } });
  if (!record || record.kpiId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.kpiRecord.delete({ where: { id: recordId } });
  return NextResponse.json({ ok: true });
}
