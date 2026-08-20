import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isInManagementChain } from "@/lib/org";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  const leave = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!leave) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (leave.status !== "PENDING") {
    return NextResponse.json({ error: "Only pending requests can be approved" }, { status: 400 });
  }

  const canApprove = currentUser.level === "CIO" || (await isInManagementChain(currentUser.id, leave.userId));
  if (!canApprove) return NextResponse.json({ error: "Not authorized to approve this request" }, { status: 403 });

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: { status: "APPROVED", approverId: currentUser.id },
  });

  await prisma.notification.create({
    data: {
      userId: leave.userId,
      type: "LEAVE",
      title: "Leave request approved",
      body: `Your leave request was approved by ${currentUser.name}.`,
      link: "/leave",
    },
  });

  return NextResponse.json({ ok: true, leave: updated });
}
