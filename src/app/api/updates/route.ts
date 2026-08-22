import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { advanceDueDate } from "@/app/(app)/updates/_lib/frequency";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().trim().min(1).max(160),
  question: z.string().trim().min(1).max(2000).optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]).default("WEEKLY"),
  requestedOfId: z.string().trim().min(1),
  projectId: z.string().trim().min(1).optional().nullable(),
  taskId: z.string().trim().min(1).optional().nullable(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const [made, ofMe] = await Promise.all([
    prisma.scheduledUpdateRequest.findMany({
      where: { requestedById: user.id },
      include: {
        requestedOf: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } },
        project: { select: { id: true, name: true, code: true } },
        task: { select: { id: true, title: true } },
        responses: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { nextDueAt: "asc" },
    }),
    prisma.scheduledUpdateRequest.findMany({
      where: { requestedOfId: user.id },
      include: {
        requestedBy: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true } },
        project: { select: { id: true, name: true, code: true } },
        task: { select: { id: true, title: true } },
        responses: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { nextDueAt: "asc" },
    }),
  ]);

  return NextResponse.json({ made, ofMe });
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

  // Deliberately open: the "who to ask" picker lists every colleague (reports sorted
  // first as a convenience, not a restriction) — peer-to-peer and upward requests are
  // an intended use case, not just top-down management.
  const request = await prisma.scheduledUpdateRequest.create({
    data: {
      title: data.title,
      question: data.question || "What is the current status?",
      frequency: data.frequency,
      requestedById: user.id,
      requestedOfId: data.requestedOfId,
      projectId: data.projectId || null,
      taskId: data.taskId || null,
      nextDueAt: advanceDueDate(data.frequency, new Date()),
    },
  });

  await prisma.notification.create({
    data: {
      userId: data.requestedOfId,
      type: "UPDATE_REQUEST",
      title: `${user.name} requested a ${data.frequency.toLowerCase()} update`,
      body: data.title,
      link: "/updates",
    },
  });

  return NextResponse.json({ request }, { status: 201 });
}
