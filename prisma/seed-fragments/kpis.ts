import type { PrismaClient } from "@prisma/client";

// ---------------------------------------------------------------------------
// Seeds Workflows, KPIs + KpiRecords, and ScheduledUpdateRequests + UpdateResponses.
// Idempotent: safe to run multiple times against the same database. Assumes
// org (User/Department) and Project data has already been seeded — looks
// everything up by name/email instead of hardcoding ids, and skips/logs
// gracefully when something it expects isn't there yet.
// ---------------------------------------------------------------------------

function addDays(d: Date, n: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}
function addMonths(d: Date, n: number) {
  const c = new Date(d);
  c.setMonth(c.getMonth() + n);
  return c;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfQuarter(d: Date) {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3, 1);
}

type Frequency = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY";

/** Steps a date backward by one cadence interval. */
function stepBack(freq: Frequency, d: Date): Date {
  switch (freq) {
    case "DAILY":
      return addDays(d, -1);
    case "WEEKLY":
      return addDays(d, -7);
    case "MONTHLY":
      return addMonths(d, -1);
    case "QUARTERLY":
      return addMonths(d, -3);
  }
}

function periodStartFor(freq: Frequency, periodEnd: Date): Date {
  switch (freq) {
    case "DAILY":
      return new Date(periodEnd);
    case "WEEKLY":
      return addDays(periodEnd, -6);
    case "MONTHLY":
      return startOfMonth(periodEnd);
    case "QUARTERLY":
      return startOfQuarter(periodEnd);
  }
}

/** Simple seeded pseudo-random so re-runs generate the same-looking history. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: T[], i: number): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[i % arr.length];
}

function findDept(departments: { id: string; name: string }[], keywords: string[]) {
  const lower = departments.map((d) => ({ ...d, l: d.name.toLowerCase() }));
  for (const kw of keywords) {
    const hit = lower.find((d) => d.l.includes(kw));
    if (hit) return hit;
  }
  return undefined;
}

interface KpiTemplate {
  name: string;
  description: string;
  unit: string;
  target: number;
  direction: "HIGHER_IS_BETTER" | "LOWER_IS_BETTER";
  frequency: Frequency;
  scope: "department" | "project" | "org";
  deptKeywords?: string[];
  ownerLevels?: string[];
  /** 'improving' trends toward the favorable side, 'declining' away from it, 'volatile' noisy/flat. */
  trend: "improving" | "declining" | "volatile";
  startValue: number;
}

const KPI_TEMPLATES: KpiTemplate[] = [
  { name: "Sprint Velocity", description: "Story points completed per sprint.", unit: "pts", target: 40, direction: "HIGHER_IS_BETTER", frequency: "WEEKLY", scope: "project", trend: "improving", startValue: 28 },
  { name: "Customer NPS", description: "Net Promoter Score from quarterly customer survey.", unit: "", target: 50, direction: "HIGHER_IS_BETTER", frequency: "QUARTERLY", scope: "org", trend: "improving", startValue: 34 },
  { name: "Uptime %", description: "Production service availability.", unit: "%", target: 99.9, direction: "HIGHER_IS_BETTER", frequency: "MONTHLY", deptKeywords: ["engineer", "tech", "it "], scope: "department", trend: "volatile", startValue: 99.5 },
  { name: "Budget Variance", description: "Deviation from planned budget.", unit: "%", target: 5, direction: "LOWER_IS_BETTER", frequency: "MONTHLY", deptKeywords: ["finance"], scope: "department", trend: "declining", startValue: 3 },
  { name: "Ticket Resolution Time", description: "Average time to close a support ticket.", unit: "hrs", target: 8, direction: "LOWER_IS_BETTER", frequency: "WEEKLY", deptKeywords: ["support", "customer", "operations"], scope: "department", trend: "improving", startValue: 14 },
  { name: "Employee Attrition Rate", description: "Voluntary attrition, trailing quarter.", unit: "%", target: 5, direction: "LOWER_IS_BETTER", frequency: "QUARTERLY", deptKeywords: ["hr", "people", "operations"], scope: "department", trend: "volatile", startValue: 6 },
  { name: "Code Review Turnaround", description: "Time from PR opened to first review.", unit: "hrs", target: 24, direction: "LOWER_IS_BETTER", frequency: "WEEKLY", deptKeywords: ["engineer", "tech"], scope: "department", trend: "improving", startValue: 40 },
  { name: "Deployment Frequency", description: "Production deploys per week.", unit: "/wk", target: 10, direction: "HIGHER_IS_BETTER", frequency: "WEEKLY", scope: "project", trend: "improving", startValue: 4 },
  { name: "Bug Escape Rate", description: "Bugs found in production per release.", unit: "%", target: 2, direction: "LOWER_IS_BETTER", frequency: "MONTHLY", scope: "project", trend: "declining", startValue: 1.5 },
  { name: "Customer Churn", description: "Monthly logo churn.", unit: "%", target: 3, direction: "LOWER_IS_BETTER", frequency: "MONTHLY", deptKeywords: ["customer", "success", "sales", "operations"], scope: "department", trend: "volatile", startValue: 4.2 },
  { name: "Task Completion Rate", description: "Tasks closed on or before due date.", unit: "%", target: 90, direction: "HIGHER_IS_BETTER", frequency: "WEEKLY", scope: "project", trend: "improving", startValue: 71 },
  { name: "Training Hours per Employee", description: "L&D hours completed per headcount.", unit: "hrs", target: 20, direction: "HIGHER_IS_BETTER", frequency: "QUARTERLY", deptKeywords: ["hr", "people", "operations"], scope: "department", trend: "improving", startValue: 11 },
  { name: "Server Response Time", description: "P95 API response latency.", unit: "ms", target: 200, direction: "LOWER_IS_BETTER", frequency: "DAILY", deptKeywords: ["engineer", "tech", "it "], scope: "department", trend: "improving", startValue: 340 },
  { name: "Marketing Qualified Leads", description: "MQLs generated per month.", unit: "leads", target: 150, direction: "HIGHER_IS_BETTER", frequency: "MONTHLY", deptKeywords: ["marketing", "sales"], scope: "department", trend: "volatile", startValue: 95 },
  { name: "Revenue Growth", description: "YoY revenue growth.", unit: "%", target: 15, direction: "HIGHER_IS_BETTER", frequency: "QUARTERLY", scope: "org", trend: "declining", startValue: 12 },
];

const WORKFLOWS: {
  name: string;
  description: string;
  isDefault: boolean;
  statuses: { key: string; label: string; color: string; isTerminal: boolean; isDelayFlag: boolean }[];
}[] = [
  {
    name: "Standard Delivery Pipeline",
    description: "Default status pipeline for delivery work.",
    isDefault: true,
    statuses: [
      { key: "backlog", label: "Backlog", color: "#6b7280", isTerminal: false, isDelayFlag: false },
      { key: "planned", label: "Planned", color: "#0ea5e9", isTerminal: false, isDelayFlag: false },
      { key: "in_progress", label: "In Progress", color: "#3b63f6", isTerminal: false, isDelayFlag: false },
      { key: "blocked", label: "Blocked", color: "#d63b3b", isTerminal: false, isDelayFlag: true },
      { key: "in_review", label: "In Review", color: "#c98a06", isTerminal: false, isDelayFlag: false },
      { key: "done", label: "Done", color: "#1fa463", isTerminal: true, isDelayFlag: false },
    ],
  },
  {
    name: "Bug Triage",
    description: "Pipeline for incoming defects, from report to resolution.",
    isDefault: false,
    statuses: [
      { key: "new", label: "New", color: "#6b7280", isTerminal: false, isDelayFlag: false },
      { key: "confirmed", label: "Confirmed", color: "#0ea5e9", isTerminal: false, isDelayFlag: false },
      { key: "in_progress", label: "In Progress", color: "#3b63f6", isTerminal: false, isDelayFlag: false },
      { key: "stalled", label: "Stalled", color: "#d63b3b", isTerminal: false, isDelayFlag: true },
      { key: "fix_in_review", label: "Fix in Review", color: "#c98a06", isTerminal: false, isDelayFlag: false },
      { key: "closed", label: "Closed", color: "#1fa463", isTerminal: true, isDelayFlag: false },
      { key: "wont_fix", label: "Won't Fix", color: "#8b5cf6", isTerminal: true, isDelayFlag: false },
    ],
  },
];

export default async function seedKpis(prisma: PrismaClient) {
  const rand = mulberry32(20260820);

  const [users, departments, projects] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true, email: true, level: true, departmentId: true, managerId: true, active: true } }),
    prisma.department.findMany({ select: { id: true, name: true } }),
    prisma.project.findMany({ select: { id: true, name: true, code: true, departmentId: true } }),
  ]);

  if (users.length === 0) {
    console.log("[seed-kpis] No users found — skipping (seed org data first).");
    return;
  }

  const activeUsers = users.filter((u) => u.active);

  // -------------------------------------------------------------------
  // Workflows
  // -------------------------------------------------------------------
  for (const wf of WORKFLOWS) {
    const existing = await prisma.workflow.findFirst({ where: { name: wf.name } });
    if (existing) {
      console.log(`[seed-kpis] Workflow "${wf.name}" already exists — skipping.`);
      continue;
    }
    if (wf.isDefault) {
      await prisma.workflow.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    }
    await prisma.workflow.create({
      data: {
        name: wf.name,
        description: wf.description,
        isDefault: wf.isDefault,
        statuses: {
          create: wf.statuses.map((s, i) => ({ ...s, order: i })),
        },
      },
    });
    console.log(`[seed-kpis] Created workflow "${wf.name}".`);
  }

  // -------------------------------------------------------------------
  // KPIs + KpiRecords
  // -------------------------------------------------------------------
  const today = new Date();
  let kpiCount = 0;
  let recordCount = 0;

  for (let ti = 0; ti < KPI_TEMPLATES.length; ti++) {
    const tpl = KPI_TEMPLATES[ti];

    let departmentId: string | null = null;
    let projectId: string | null = null;

    if (tpl.scope === "department") {
      const dept = tpl.deptKeywords ? findDept(departments, tpl.deptKeywords) : pick(departments, ti);
      departmentId = dept?.id ?? pick(departments, ti)?.id ?? null;
    } else if (tpl.scope === "project") {
      const proj = pick(projects, ti);
      if (proj) {
        projectId = proj.id;
        departmentId = proj.departmentId;
      } else if (departments.length > 0) {
        // No projects seeded yet — fall back to a department-scoped KPI instead of skipping.
        departmentId = pick(departments, ti)?.id ?? null;
      }
    }

    const scopedName = projectId
      ? `${tpl.name} — ${pick(projects, ti)?.code ?? ""}`.trim()
      : tpl.name;

    const already = await prisma.kpi.findFirst({ where: { name: scopedName } });
    if (already) {
      console.log(`[seed-kpis] KPI "${scopedName}" already exists — skipping.`);
      continue;
    }

    // Pick an owner: prefer someone senior in the matched department; for org-wide KPIs
    // prefer a CIO/Director; otherwise round-robin any active user.
    let ownerId: string | undefined;
    if (departmentId) {
      const deptUsers = activeUsers.filter((u) => u.departmentId === departmentId);
      const senior = deptUsers.find((u) => u.level === "HEAD_OF_DEPARTMENT" || u.level === "MANAGER");
      ownerId = (senior ?? deptUsers[0])?.id;
    } else if (tpl.scope === "org") {
      const exec = activeUsers.find((u) => u.level === "CIO" || u.level === "DIRECTOR");
      ownerId = exec?.id;
    }
    if (!ownerId) ownerId = pick(activeUsers, ti)?.id;
    if (!ownerId) {
      console.log(`[seed-kpis] No owner available for "${scopedName}" — skipping.`);
      continue;
    }

    const kpi = await prisma.kpi.create({
      data: {
        name: scopedName,
        description: tpl.description,
        unit: tpl.unit,
        target: tpl.target,
        direction: tpl.direction,
        frequency: tpl.frequency,
        departmentId,
        projectId,
        ownerId,
      },
    });
    kpiCount++;

    // History: 6-12 points walking backward from today.
    const numRecords = 6 + Math.floor(rand() * 7); // 6..12
    let periodEnd = today;
    let value = tpl.startValue;
    const favorable = tpl.direction === "HIGHER_IS_BETTER" ? 1 : -1;

    const points: { value: number; periodStart: Date; periodEnd: Date }[] = [];
    for (let i = 0; i < numRecords; i++) {
      const periodStart = periodStartFor(tpl.frequency, periodEnd);
      points.push({ value: Math.round(value * 100) / 100, periodStart, periodEnd });

      // Walk value backward in time — so "improving" means earlier points were worse.
      const noise = (rand() - 0.5) * tpl.startValue * 0.06;
      let step: number;
      if (tpl.trend === "improving") step = -(tpl.startValue * 0.035) * favorable + noise;
      else if (tpl.trend === "declining") step = (tpl.startValue * 0.035) * favorable + noise;
      else step = noise * 1.5;
      value = Math.max(0, value - step);
      periodEnd = stepBack(tpl.frequency, periodEnd);
    }
    points.reverse(); // oldest first

    for (const p of points) {
      await prisma.kpiRecord.create({
        data: {
          kpiId: kpi.id,
          value: p.value,
          periodStart: p.periodStart,
          periodEnd: p.periodEnd,
          updatedById: ownerId,
        },
      });
      recordCount++;
    }
  }

  console.log(`[seed-kpis] Created ${kpiCount} KPI(s) with ${recordCount} record(s).`);

  // -------------------------------------------------------------------
  // Scheduled Update Requests + Responses
  // -------------------------------------------------------------------
  const withManagers = users.filter((u) => u.managerId);
  if (withManagers.length === 0) {
    console.log("[seed-kpis] No management chain found — skipping scheduled update requests.");
    return;
  }

  const FREQS: ("DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY")[] = ["WEEKLY", "BIWEEKLY", "MONTHLY", "WEEKLY", "DAILY"];
  const TITLES = [
    "Weekly status update",
    "Project health check-in",
    "Sprint progress update",
    "Budget & spend update",
    "Risk & blocker review",
    "Delivery milestone update",
    "Team capacity update",
    "Customer-facing status",
    "Roadmap progress check",
    "Incident follow-up update",
    "Monthly performance summary",
    "Stakeholder readiness update",
  ];
  const QUESTIONS = [
    "What is the current status, and is anything at risk?",
    "What progress was made since the last update, and what's next?",
    "Are there any blockers that need escalation?",
    "How does actual spend compare to plan this period?",
    "What should stakeholders know before the next review?",
  ];

  let reqCount = 0;
  let respCount = 0;
  const desiredRequests = 13;

  for (let i = 0; i < desiredRequests; i++) {
    const requester = pick(withManagers, i);
    if (!requester?.managerId) continue;
    const requestedById = requester.managerId; // manager asks their report
    const requestedOfId = requester.id;

    const title = pick(TITLES, i)!;
    const already = await prisma.scheduledUpdateRequest.findFirst({
      where: { title, requestedById, requestedOfId },
    });
    if (already) continue;

    const frequency = pick(FREQS, i)!;
    const project = projects.length > 0 && i % 2 === 0 ? pick(projects, i) : undefined;

    // Spread nextDueAt across overdue and upcoming.
    const dueOffsetDays = [-6, -2, -1, 0, 1, 3, 5, 8, 14, -4, 2, -9, 6][i % 13];
    const nextDueAt = addDays(today, dueOffsetDays);

    const request = await prisma.scheduledUpdateRequest.create({
      data: {
        title,
        question: pick(QUESTIONS, i)!,
        frequency,
        active: true,
        nextDueAt,
        requestedById,
        requestedOfId,
        projectId: project?.id,
      },
    });
    reqCount++;

    // Log 0-4 prior responses for roughly two-thirds of requests, timestamped before today.
    if (i % 3 !== 2) {
      const numResponses = 2 + Math.floor(rand() * 3); // 2..4
      let respDate = addDays(today, dueOffsetDays - 7);
      for (let r = 0; r < numResponses; r++) {
        await prisma.updateResponse.create({
          data: {
            requestId: request.id,
            responderId: requestedOfId,
            message: pick(
              [
                "On track — no blockers this period.",
                "Slight delay due to a dependency, working through it.",
                "Good progress, ahead of the plan.",
                "Flagging a risk that may need your input soon.",
                "Steady progress, nothing new to escalate.",
              ],
              r + i
            )!,
            statusSnapshot: pick(["On Track", "At Risk", "On Track", "Delayed"], r + i),
            createdAt: respDate,
          },
        });
        respCount++;
        respDate = addDays(respDate, -7);
      }
    }
  }

  console.log(`[seed-kpis] Created ${reqCount} scheduled update request(s) with ${respCount} response(s).`);
}
