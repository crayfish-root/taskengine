import type { PrismaClient, NotificationType } from "@prisma/client";

// 1x1 transparent PNG — good enough as a placeholder image blob.
const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function textDataUrl(mime: string, content: string) {
  return `data:${mime};base64,${Buffer.from(content).toString("base64")}`;
}

function pick<T>(arr: T[], i: number): T | undefined {
  return arr.length ? arr[i % arr.length] : undefined;
}

/**
 * Seeds a realistic mix of Documents, Comments, ActivityLog rows and Notifications
 * so the Documents hub, Notifications center and activity feeds have real content
 * to render. Idempotent — each section only inserts if that table is still empty,
 * and every lookup degrades gracefully if the org/project/task seed hasn't run yet.
 */
export default async function seedDocuments(prisma: PrismaClient) {
  const users = await prisma.user.findMany({ select: { id: true, name: true }, take: 60 });
  const projects = await prisma.project.findMany({
    select: { id: true, name: true, ownerId: true },
    take: 60,
  });
  const tasks = await prisma.task.findMany({
    select: { id: true, title: true, projectId: true, createdById: true, status: true },
    take: 150,
  });

  if (users.length === 0) {
    console.warn("[seed:documents] No users found yet — skipping documents/comments/activity/notifications seed.");
    return;
  }

  const userAt = (i: number) => pick(users, i)!;

  // ---------------------------------------------------------------------
  // Documents
  // ---------------------------------------------------------------------
  const docCount = await prisma.document.count();
  if (docCount === 0 && (projects.length > 0 || tasks.length > 0)) {
    const specs: {
      name: string;
      mimeType: string;
      size: number;
      dataUrl: string;
      target: "project" | "task" | "none";
    }[] = [
      { name: "Kickoff Deck.pdf", mimeType: "application/pdf", size: 482_311, dataUrl: textDataUrl("application/pdf", "Kickoff deck placeholder content"), target: "project" },
      { name: "Requirements v3.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 128_004, dataUrl: textDataUrl("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Requirements document placeholder"), target: "project" },
      { name: "Budget Tracker.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size: 94_512, dataUrl: textDataUrl("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Budget tracker placeholder"), target: "project" },
      { name: "Architecture Diagram.png", mimeType: "image/png", size: 41_209, dataUrl: TINY_PNG, target: "task" },
      { name: "Screenshot — bug repro.png", mimeType: "image/png", size: 76_884, dataUrl: TINY_PNG, target: "task" },
      { name: "API Spec.md", mimeType: "text/markdown", size: 12_004, dataUrl: textDataUrl("text/markdown", "# API Spec\n\nPlaceholder spec content."), target: "task" },
      { name: "Design Review Notes.txt", mimeType: "text/plain", size: 3_402, dataUrl: textDataUrl("text/plain", "Design review notes placeholder."), target: "task" },
      { name: "Vendor Contract.pdf", mimeType: "application/pdf", size: 611_233, dataUrl: textDataUrl("application/pdf", "Vendor contract placeholder"), target: "project" },
      { name: "Sprint Retro Slides.pptx", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", size: 355_902, dataUrl: textDataUrl("application/vnd.openxmlformats-officedocument.presentationml.presentation", "Sprint retro slides placeholder"), target: "project" },
      { name: "Test Coverage Report.csv", mimeType: "text/csv", size: 8_811, dataUrl: textDataUrl("text/csv", "module,coverage\nauth,92\nbilling,81"), target: "task" },
      { name: "Onboarding Checklist.pdf", mimeType: "application/pdf", size: 55_120, dataUrl: textDataUrl("application/pdf", "Onboarding checklist placeholder"), target: "none" },
      { name: "Release Notes v2.4.md", mimeType: "text/markdown", size: 6_772, dataUrl: textDataUrl("text/markdown", "# Release notes v2.4\n\nPlaceholder."), target: "project" },
      { name: "Logo Assets.zip", mimeType: "application/zip", size: 1_204_552, dataUrl: textDataUrl("application/zip", "zip placeholder"), target: "none" },
      { name: "Incident Postmortem.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 71_009, dataUrl: textDataUrl("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Incident postmortem placeholder"), target: "task" },
      { name: "Mockup — dashboard.png", mimeType: "image/png", size: 133_770, dataUrl: TINY_PNG, target: "task" },
    ];

    let projIdx = 0;
    let taskIdx = 0;
    for (let i = 0; i < specs.length; i++) {
      const spec = specs[i];
      const uploader = userAt(i);
      let projectId: string | null = null;
      let taskId: string | null = null;

      if (spec.target === "project" && projects.length > 0) {
        projectId = pick(projects, projIdx++)!.id;
      } else if (spec.target === "task" && tasks.length > 0) {
        taskId = pick(tasks, taskIdx++)!.id;
      } else if (spec.target === "project" && tasks.length > 0) {
        taskId = pick(tasks, taskIdx++)!.id;
      } else if (spec.target === "task" && projects.length > 0) {
        projectId = pick(projects, projIdx++)!.id;
      }

      await prisma.document.create({
        data: {
          name: spec.name,
          mimeType: spec.mimeType,
          size: spec.size,
          dataUrl: spec.dataUrl,
          uploadedById: uploader.id,
          projectId,
          taskId,
        },
      });
    }
    console.log(`[seed:documents] Created ${specs.length} documents.`);
  } else {
    console.log("[seed:documents] Documents already present — skipping.");
  }

  // ---------------------------------------------------------------------
  // Comments
  // ---------------------------------------------------------------------
  const commentCount = await prisma.comment.count();
  if (commentCount === 0 && (projects.length > 0 || tasks.length > 0)) {
    const messages = [
      "Picking this up now, will have an update by EOD.",
      "Blocked on the vendor response — chasing them again today.",
      "Merged the fix, moving this to review.",
      "Can we get a second pair of eyes on the approach before I go further?",
      "Just synced with the team offline — we're aligned on scope now.",
      "This is looking good. Nice work on the turnaround.",
      "Pushed the deadline out by two days to account for the review cycle.",
      "Reopening — QA found a regression on the staging build.",
      "Attached the latest numbers, budget is tracking within range.",
      "Let's discuss this in tomorrow's standup, a few open questions.",
      "Closing this out, verified in production.",
      "Reassigning to the platform team, this touches shared infra.",
      "Added the missing edge case to the test plan.",
      "Confirmed with the client, this can move to next sprint.",
      "Draft is ready for feedback, please take a look when you can.",
      "Following up — any blockers on your end?",
      "Nice catch, updated the doc to reflect that.",
      "This one's higher priority than I initially scoped — flagging it.",
      "All good from my side, approving.",
      "Need one more day, hit an unexpected dependency issue.",
    ];

    let created = 0;
    for (let i = 0; i < messages.length; i++) {
      const author = userAt(i + 3);
      const onProject = i % 2 === 0;
      let projectId: string | null = null;
      let taskId: string | null = null;
      if (onProject && projects.length > 0) {
        projectId = pick(projects, i)!.id;
      } else if (tasks.length > 0) {
        taskId = pick(tasks, i)!.id;
      } else if (projects.length > 0) {
        projectId = pick(projects, i)!.id;
      } else {
        continue;
      }
      await prisma.comment.create({
        data: { body: messages[i], authorId: author.id, projectId, taskId },
      });
      created++;
    }
    console.log(`[seed:documents] Created ${created} comments.`);
  } else {
    console.log("[seed:documents] Comments already present — skipping.");
  }

  // ---------------------------------------------------------------------
  // Activity log
  // ---------------------------------------------------------------------
  const activityCount = await prisma.activityLog.count();
  if (activityCount === 0 && (projects.length > 0 || tasks.length > 0)) {
    type ActivitySpec = { action: string; entityType: string; entityId: string; meta?: Record<string, unknown> };
    const specs: ActivitySpec[] = [];

    tasks.slice(0, 5).forEach((t, i) => {
      specs.push({ action: `created task "${t.title}"`, entityType: "Task", entityId: t.id });
      if (i % 2 === 0) {
        specs.push({ action: "changed status to In Progress", entityType: "Task", entityId: t.id, meta: { from: "TODO", to: "IN_PROGRESS" } });
      }
    });

    if (tasks.length > 0) {
      const t = tasks[0];
      const from = userAt(1);
      const to = userAt(2);
      specs.push({ action: `delegated task to ${to.name}`, entityType: "Task", entityId: t.id, meta: { from: from.name, to: to.name } });
    }

    projects.slice(0, 4).forEach((p) => {
      specs.push({ action: `created project "${p.name}"`, entityType: "Project", entityId: p.id });
      specs.push({ action: "updated the project timeline", entityType: "Project", entityId: p.id });
    });

    specs.push({ action: "approved a leave request", entityType: "LeaveRequest", entityId: "seed-leave-1" });
    specs.push({ action: "raised a blocker", entityType: "Blocker", entityId: "seed-blocker-1", meta: { severity: "HIGH" } });
    specs.push({ action: "resolved a blocker", entityType: "Blocker", entityId: "seed-blocker-1" });
    specs.push({ action: "logged a KPI update", entityType: "Kpi", entityId: "seed-kpi-1", meta: { value: 87 } });

    let created = 0;
    for (let i = 0; i < specs.length; i++) {
      const spec = specs[i];
      const actor = userAt(i);
      await prisma.activityLog.create({
        data: {
          userId: actor.id,
          action: spec.action,
          entityType: spec.entityType,
          entityId: spec.entityId,
          meta: spec.meta ? JSON.stringify(spec.meta) : null,
        },
      });
      created++;
    }
    console.log(`[seed:documents] Created ${created} activity log entries.`);
  } else {
    console.log("[seed:documents] Activity log already present — skipping.");
  }

  // ---------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------
  const notificationCount = await prisma.notification.count();
  if (notificationCount === 0) {
    const types: NotificationType[] = [
      "ASSIGNMENT",
      "DELEGATION",
      "STATUS_CHANGE",
      "MENTION",
      "BLOCKER",
      "UPDATE_REQUEST",
      "LEAVE",
      "KPI",
      "DEADLINE",
      "SYSTEM",
    ];

    const titleFor = (type: NotificationType, i: number): { title: string; body: string; link: string | null } => {
      const task = pick(tasks, i);
      const project = pick(projects, i);
      switch (type) {
        case "ASSIGNMENT":
          return { title: "You were assigned a task", body: task ? `"${task.title}" is now on your plate.` : "A new task is now on your plate.", link: task ? `/tasks/${task.id}` : null };
        case "DELEGATION":
          return { title: "A task was delegated to you", body: task ? `"${task.title}" was delegated to you.` : "A task was delegated to you.", link: task ? `/tasks/${task.id}` : null };
        case "STATUS_CHANGE":
          return { title: "Status changed", body: task ? `"${task.title}" moved to a new status.` : "A task status changed.", link: task ? `/tasks/${task.id}` : null };
        case "MENTION":
          return { title: "You were mentioned", body: task ? `Mentioned in a comment on "${task.title}".` : "You were mentioned in a comment.", link: task ? `/tasks/${task.id}` : null };
        case "BLOCKER":
          return { title: "New blocker raised", body: project ? `A blocker was raised on ${project.name}.` : "A new blocker was raised.", link: project ? `/projects/${project.id}` : null };
        case "UPDATE_REQUEST":
          return { title: "Status update requested", body: "Someone asked for a status update from you.", link: "/updates" };
        case "LEAVE":
          return { title: "Leave request update", body: "Your leave request status changed.", link: "/leave" };
        case "KPI":
          return { title: "KPI needs attention", body: "A KPI you own has drifted from target.", link: "/kpis" };
        case "DEADLINE":
          return { title: "Deadline approaching", body: task ? `"${task.title}" is due soon.` : "A task deadline is approaching.", link: task ? `/tasks/${task.id}` : null };
        case "SYSTEM":
        default:
          return { title: "Welcome to TaskEngine", body: "Your workspace is set up and ready to go.", link: null };
      }
    };

    const total = 26;
    let created = 0;
    for (let i = 0; i < total; i++) {
      const recipient = userAt(i);
      const type = types[i % types.length];
      const { title, body, link } = titleFor(type, i);
      const read = i % 3 === 0; // roughly a third already read
      const daysAgo = Math.floor(i / 2);
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 - (i % 5) * 60 * 60 * 1000);
      await prisma.notification.create({
        data: { userId: recipient.id, type, title, body, link, read, createdAt },
      });
      created++;
    }
    console.log(`[seed:documents] Created ${created} notifications.`);
  } else {
    console.log("[seed:documents] Notifications already present — skipping.");
  }
}
