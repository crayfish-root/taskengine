// Seed fragment for the Projects & Tasks module.
// Idempotent on Project.code — safe to re-run. Assumes the org seed
// (users/departments/teams) has already populated the database; if it
// hasn't, this logs a message and exits without touching anything.
//
// Usage from the root seed script:
//   import seedProjects from "./seed-fragments/projects";
//   await seedProjects(prisma);

import type {
  PrismaClient,
  User,
  BlockerSeverity,
  BlockerStatus,
  Priority,
  ProjectStatus,
  TaskStatus,
} from "@prisma/client";

// ---------------------------------------------------------------------------
// Small deterministic-ish random helpers (seed data — exact values don't
// matter, only that they're plausible and varied).
// ---------------------------------------------------------------------------

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (copy.length && out.length < n) {
    const i = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

// ---------------------------------------------------------------------------
// Project templates
// ---------------------------------------------------------------------------

const PROJECT_TEMPLATES: {
  code: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: Priority;
  departmentHint: string;
  startOffset: number; // days from now
  targetOffset: number; // days from now (negative = already overdue)
}[] = [
  { code: "CBU", name: "Core Banking Upgrade", description: "Migrate the core ledger platform to the new transaction engine with zero downtime.", status: "ACTIVE", priority: "CRITICAL", departmentHint: "Engineering", startOffset: -90, targetOffset: 60 },
  { code: "MOB2", name: "Mobile App 2.0", description: "Full rebuild of the customer mobile app with biometric auth and offline support.", status: "ACTIVE", priority: "HIGH", departmentHint: "Engineering", startOffset: -60, targetOffset: 45 },
  { code: "FRAUD", name: "Fraud Detection Engine", description: "Real-time transaction scoring pipeline to catch fraud before settlement.", status: "AT_RISK", priority: "CRITICAL", departmentHint: "Engineering", startOffset: -75, targetOffset: 20 },
  { code: "PAYG", name: "Payment Gateway Integration", description: "Integrate the new regional payment gateway across all channels.", status: "DELAYED", priority: "HIGH", departmentHint: "Engineering", startOffset: -120, targetOffset: -10 },
  { code: "DLAKE", name: "Enterprise Data Lake", description: "Stand up a governed data lake to unify reporting across departments.", status: "PLANNING", priority: "MEDIUM", departmentHint: "Engineering", startOffset: 10, targetOffset: 150 },
  { code: "SECUP", name: "Security Hardening Sprint", description: "Org-wide push to close the findings from the last penetration test.", status: "ON_HOLD", priority: "CRITICAL", departmentHint: "Engineering", startOffset: -30, targetOffset: 40 },
  { code: "BRAND", name: "Brand Refresh", description: "New visual identity, design system and marketing site refresh.", status: "ACTIVE", priority: "MEDIUM", departmentHint: "Design", startOffset: -40, targetOffset: 35 },
  { code: "UXRES", name: "UX Research Program", description: "Quarterly research cadence to inform the product roadmap.", status: "ON_HOLD", priority: "LOW", departmentHint: "Design", startOffset: -20, targetOffset: 70 },
  { code: "PLAUNCH", name: "Product Launch Q3", description: "Cross-functional launch of the new savings product line.", status: "ACTIVE", priority: "HIGH", departmentHint: "Product", startOffset: -50, targetOffset: 25 },
  { code: "ROADMAP", name: "2027 Roadmap Planning", description: "Define and align the product roadmap for the next fiscal year.", status: "PLANNING", priority: "MEDIUM", departmentHint: "Product", startOffset: 5, targetOffset: 90 },
  { code: "BUDCTL", name: "Budget Controls Rollout", description: "New departmental budget approval workflow and controls.", status: "AT_RISK", priority: "HIGH", departmentHint: "Finance", startOffset: -55, targetOffset: 15 },
  { code: "AUDIT", name: "Annual Compliance Audit", description: "Year-end regulatory compliance audit and remediation tracking.", status: "COMPLETED", priority: "MEDIUM", departmentHint: "Finance", startOffset: -150, targetOffset: -20 },
  { code: "CRMMIG", name: "CRM Migration", description: "Migrate the sales team off the legacy CRM onto the new platform.", status: "DELAYED", priority: "HIGH", departmentHint: "Sales", startOffset: -100, targetOffset: -5 },
  { code: "OPSAUTO", name: "Operations Automation", description: "Automate manual back-office workflows to cut processing time.", status: "ACTIVE", priority: "MEDIUM", departmentHint: "Operations", startOffset: -35, targetOffset: 55 },
  { code: "ONBOARD", name: "Employee Onboarding Revamp", description: "Streamlined onboarding journey for new hires across all departments.", status: "COMPLETED", priority: "LOW", departmentHint: "Operations", startOffset: -180, targetOffset: -60 },
];

const TASK_TITLES = [
  "Requirements gathering",
  "Stakeholder alignment workshop",
  "Technical design review",
  "API implementation",
  "Database schema migration",
  "Integration testing",
  "Security review",
  "Performance testing",
  "QA test plan",
  "User acceptance testing",
  "Documentation update",
  "Deployment runbook",
  "Production rollout",
  "Post-launch monitoring",
  "Vendor coordination call",
  "Data migration script",
  "Training material prep",
  "Rollback plan",
  "Code review pass",
  "Bug triage session",
  "Release notes",
  "Customer communication draft",
  "Compliance checklist",
  "Budget reconciliation",
  "Risk assessment",
  "Sprint retrospective",
  "Dashboard build-out",
  "Accessibility audit",
  "Load testing",
  "Legal sign-off",
];

const SUBTASK_SUFFIXES = ["— backend", "— frontend", "— review", "— sign-off", "— follow-up"];

const COMMENT_TEMPLATES = [
  "Made good progress on this today — should have an update by end of week.",
  "Flagging a dependency on the platform team before we can move forward.",
  "This is ready for review whenever you get a chance.",
  "Pushed the timeline slightly to account for the extra QA pass.",
  "All good here, closing out shortly.",
  "Can we sync on this tomorrow? A couple of open questions.",
];

export default async function seedProjects(prisma: PrismaClient) {
  const [users, departments, teams] = await Promise.all([
    prisma.user.findMany(),
    prisma.department.findMany(),
    prisma.team.findMany({ include: { members: true } }),
  ]);

  if (users.length === 0) {
    console.log("[seed-projects] No users found — run the org seed first. Skipping projects seed.");
    return;
  }

  const usersById = new Map(users.map((u) => [u.id, u]));
  const staffLike = users.filter((u) => u.level === "STAFF" || u.level === "LEAD");
  const seededCodes: string[] = [];

  function reportingChainUp(user: User, maxLen = 5): User[] {
    const chain: User[] = [user];
    let current = user;
    let guard = 0;
    while (current.managerId && guard < maxLen - 1) {
      const manager = usersById.get(current.managerId);
      if (!manager) break;
      chain.push(manager);
      current = manager;
      guard++;
    }
    return chain;
  }

  for (const template of PROJECT_TEMPLATES) {
    const department = departments.find((d) => d.name.toLowerCase().includes(template.departmentHint.toLowerCase())) ?? null;

    const deptUsers = department ? users.filter((u) => u.departmentId === department.id) : users;
    const pool = deptUsers.length > 0 ? deptUsers : users;

    const owner =
      pool.find((u) => u.level === "HEAD_OF_DEPARTMENT") ??
      pool.find((u) => u.level === "MANAGER") ??
      pool.find((u) => u.level === "DIRECTOR") ??
      pick(pool);

    const existing = await prisma.project.findUnique({ where: { code: template.code } });

    const project = await prisma.project.upsert({
      where: { code: template.code },
      create: {
        name: template.name,
        code: template.code,
        description: template.description,
        status: template.status,
        priority: template.priority,
        departmentId: department?.id ?? null,
        ownerId: owner.id,
        startDate: daysFromNow(template.startOffset),
        targetDate: daysFromNow(template.targetOffset),
        completedAt: template.status === "COMPLETED" ? daysFromNow(template.targetOffset - 3) : null,
        color: pick(["#6366f1", "#0ea5e9", "#22c55e", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6"]),
      },
      update: {},
    });
    seededCodes.push(project.code);

    // Members: owner + a handful of others from the same pool.
    const memberCandidates = pool.filter((u) => u.id !== owner.id);
    const members = [owner, ...pickN(memberCandidates, Math.min(randInt(3, 7), memberCandidates.length))];
    for (const u of members) {
      await prisma.projectMember.upsert({
        where: { projectId_userId: { projectId: project.id, userId: u.id } },
        create: { projectId: project.id, userId: u.id, role: u.id === owner.id ? "Owner" : "Contributor" },
        update: {},
      });
    }

    // Teams: attach 1 team from the department if one exists.
    const deptTeams = department ? teams.filter((t) => t.departmentId === department.id) : [];
    if (deptTeams.length > 0) {
      const team = pick(deptTeams);
      await prisma.projectTeam.upsert({
        where: { projectId_teamId: { projectId: project.id, teamId: team.id } },
        create: { projectId: project.id, teamId: team.id },
        update: {},
      });
    }

    if (existing) {
      const taskCount = await prisma.task.count({ where: { projectId: project.id } });
      if (taskCount > 0) {
        console.log(`[seed-projects] ${project.code} already has tasks — skipping task generation.`);
        continue;
      }
    }

    // -------------------------------------------------------------------
    // Tasks
    // -------------------------------------------------------------------
    const taskCount = randInt(8, 25);
    const titles = pickN(TASK_TITLES, Math.min(taskCount, TASK_TITLES.length));
    while (titles.length < taskCount) titles.push(pick(TASK_TITLES));

    const isProjectDone = project.status === "COMPLETED" || project.status === "CANCELLED";

    for (let i = 0; i < taskCount; i++) {
      const title = titles[i];

      // ~45% of tasks get a real multi-hop delegation chain rooted in the org structure.
      const delegate = Math.random() < 0.45 && staffLike.length > 0;
      const finalAssignee = delegate ? pick(pool.filter((u) => u.level === "STAFF" || u.level === "LEAD").length ? pool.filter((u) => u.level === "STAFF" || u.level === "LEAD") : staffLike) : pick(pool);

      const chain = delegate ? reportingChainUp(finalAssignee, randInt(2, 5)) : [finalAssignee];
      const topOfChain = chain[chain.length - 1];
      const createdBy = topOfChain;
      const delegatedBy = chain.length > 1 ? chain[1] : null;
      const delegationDepth = Math.max(0, chain.length - 1);

      // Status distribution — completed projects skew toward DONE, others vary.
      let status: TaskStatus;
      if (isProjectDone) {
        status = Math.random() < 0.9 ? "DONE" : "CANCELLED";
      } else {
        status = pick<TaskStatus>(["BACKLOG", "TODO", "TODO", "IN_PROGRESS", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "DONE"]);
      }

      const createdAt = daysFromNow(randInt(template.startOffset, -1));
      // ~25% of open tasks are overdue.
      const overdue = !isProjectDone && status !== "DONE" && status !== "CANCELLED" && Math.random() < 0.25;
      const dueDate = overdue ? daysFromNow(-randInt(1, 21)) : Math.random() < 0.85 ? daysFromNow(randInt(3, Math.max(4, template.targetOffset))) : null;

      const task = await prisma.task.create({
        data: {
          title,
          description: Math.random() < 0.6 ? `Part of ${project.name}. ${title}.` : null,
          status,
          priority: pick<Priority>(["LOW", "MEDIUM", "MEDIUM", "HIGH", "CRITICAL"]),
          startDate: Math.random() < 0.7 ? createdAt : null,
          dueDate,
          completedAt: status === "DONE" ? daysFromNow(-randInt(0, 10)) : null,
          estimatedHours: Math.random() < 0.5 ? randInt(2, 40) : null,
          createdAt,
          updatedAt: createdAt,
          projectId: project.id,
          createdById: createdBy.id,
          delegatedById: delegatedBy?.id ?? null,
          delegationDepth,
        },
      });

      // Assignments — final assignee is primary; occasionally add collaborators.
      await prisma.taskAssignment.create({
        data: {
          taskId: task.id,
          userId: finalAssignee.id,
          isPrimary: true,
          reassignedFromId: chain.length > 1 ? chain[1].id : null,
          assignedAt: createdAt,
        },
      });
      if (Math.random() < 0.2) {
        const extra = pickN(
          pool.filter((u) => u.id !== finalAssignee.id),
          randInt(1, 2)
        );
        for (const u of extra) {
          await prisma.taskAssignment.create({
            data: { taskId: task.id, userId: u.id, isPrimary: false, assignedAt: createdAt },
          }).catch(() => {});
        }
      }

      // Status history: creation event, plus intermediate hops leading to the final status.
      await prisma.taskStatusEvent.create({
        data: { taskId: task.id, fromStatus: null, toStatus: "TODO", byId: createdBy.id, createdAt, note: "Task created" },
      });
      if (status !== "TODO") {
        const path: TaskStatus[] = ["TODO", "IN_PROGRESS", status].filter((s, idx, arr) => arr.indexOf(s) === idx) as TaskStatus[];
        let prev: TaskStatus = "TODO";
        let t = createdAt.getTime();
        for (const s of path.slice(1)) {
          t += 1000 * 60 * 60 * randInt(4, 72);
          await prisma.taskStatusEvent.create({
            data: {
              taskId: task.id,
              fromStatus: prev,
              toStatus: s,
              byId: pick([finalAssignee, createdBy]).id,
              createdAt: new Date(Math.min(t, Date.now())),
            },
          });
          prev = s;
        }
      }

      // Delegation trail — mirrors what the /delegate API would have written,
      // so the task detail page's chain UI has real history to render.
      if (chain.length > 1) {
        let t = createdAt.getTime();
        for (let h = chain.length - 1; h > 0; h--) {
          const by = chain[h];
          const to = chain[h - 1];
          t += 1000 * 60 * 60 * randInt(2, 48);
          await prisma.activityLog.create({
            data: {
              userId: by.id,
              action: "DELEGATE",
              entityType: "Task",
              entityId: task.id,
              createdAt: new Date(Math.min(t, Date.now())),
              meta: JSON.stringify({
                toUserId: to.id,
                toName: to.name,
                toAvatarColor: to.avatarColor,
                toAvatarEmoji: to.avatarEmoji,
                toLevel: to.level,
                toTitle: to.title,
                note: h === chain.length - 1 ? "Delegating down the chain — please own end to end." : null,
              }),
            },
          });
        }
      }

      // A couple of comments for texture.
      if (Math.random() < 0.35) {
        const commenter = pick([finalAssignee, createdBy]);
        await prisma.comment.create({
          data: { taskId: task.id, authorId: commenter.id, body: pick(COMMENT_TEMPLATES), createdAt: new Date(createdAt.getTime() + 1000 * 60 * 60 * 12) },
        });
      }

      // Subtasks for ~30% of tasks.
      if (Math.random() < 0.3) {
        const subCount = randInt(1, 3);
        for (let s = 0; s < subCount; s++) {
          const subAssignee = Math.random() < 0.6 ? finalAssignee : pick(pool);
          const subStatus = status === "DONE" ? "DONE" : pick<TaskStatus>(["TODO", "IN_PROGRESS", "DONE"]);
          const subtask = await prisma.task.create({
            data: {
              title: `${title} ${pick(SUBTASK_SUFFIXES)}`,
              status: subStatus,
              priority: "MEDIUM",
              dueDate,
              completedAt: subStatus === "DONE" ? new Date() : null,
              createdAt,
              projectId: project.id,
              parentTaskId: task.id,
              createdById: createdBy.id,
              delegationDepth,
            },
          });
          await prisma.taskAssignment.create({
            data: { taskId: subtask.id, userId: subAssignee.id, isPrimary: true, assignedAt: createdAt },
          });
          await prisma.taskStatusEvent.create({
            data: { taskId: subtask.id, fromStatus: null, toStatus: subStatus, byId: createdBy.id, createdAt, note: "Subtask created" },
          });
        }
      }

      // Blockers: raised on ~10% of BLOCKED/at-risk tasks, capped globally below.
      if (status === "BLOCKED" && Math.random() < 0.5) {
        await prisma.blocker.create({
          data: {
            title: pick([
              "Waiting on third-party vendor response",
              "Blocked on infra provisioning",
              "Pending legal / compliance sign-off",
              "Dependent on another team's API",
              "Waiting on budget approval",
              "Key stakeholder unavailable",
            ]),
            description: "Raised automatically from task status — see task for context.",
            severity: pick<BlockerSeverity>(["MEDIUM", "HIGH", "HIGH", "CRITICAL"]),
            status: pick<BlockerStatus>(["OPEN", "OPEN", "IN_PROGRESS"]),
            taskId: task.id,
            projectId: project.id,
            raisedById: finalAssignee.id,
            ownerId: delegatedBy?.id ?? createdBy.id,
            createdAt: daysFromNow(-randInt(1, 14)),
          },
        });
      }
    }
  }

  const blockerCount = await prisma.blocker.count();
  if (blockerCount < 8) {
    // Top up with a handful of project-level blockers so the register has
    // a healthy mix even if few tasks happened to land on BLOCKED.
    const allProjects = await prisma.project.findMany({ where: { code: { in: seededCodes } } });
    const extra = Math.max(0, 10 - blockerCount);
    for (let i = 0; i < extra; i++) {
      const project = pick(allProjects);
      const raiser = pick(users);
      const owner = pick(users);
      const status = pick<BlockerStatus>(["OPEN", "IN_PROGRESS", "RESOLVED"]);
      await prisma.blocker.create({
        data: {
          title: pick([
            "Cross-team dependency not yet resolved",
            "Awaiting external vendor SLA confirmation",
            "Resourcing gap on this workstream",
            "Change freeze impacting timeline",
            "Data quality issue discovered in migration",
            "Awaiting executive decision on scope",
          ]),
          description: "Logged directly against the project.",
          severity: pick<BlockerSeverity>(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
          status,
          projectId: project.id,
          raisedById: raiser.id,
          ownerId: owner.id,
          createdAt: daysFromNow(-randInt(1, 30)),
          resolvedAt: status === "RESOLVED" ? daysFromNow(-randInt(0, 5)) : null,
        },
      });
    }
  }

  console.log(`[seed-projects] Seeded/verified ${seededCodes.length} projects: ${seededCodes.join(", ")}`);
}
