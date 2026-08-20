import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// Lets a requester withdraw their own still-pending leave request.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  const leave = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!leave) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (leave.userId !== currentUser.id) return NextResponse.json({ error: "Not your request" }, { status: 403 });
  if (leave.status !== "PENDING") {
    return NextResponse.json({ error: "Only pending requests can be cancelled" }, { status: 400 });
  }

  const updated = await prisma.leaveRequest.update({ where: { id }, data: { status: "CANCELLED" } });
  return NextResponse.json({ ok: true, leave: updated });
}
