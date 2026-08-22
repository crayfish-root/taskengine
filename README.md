# TaskEngine

A single, org-wide task and project management system: the place everyone — from the CIO down to individual contributors — goes to see what's being worked on, who owns it, what's blocked, and who's behind.

Built as a Next.js (App Router) + TypeScript + Prisma/Postgres application with a restrained, high-clarity interface: quiet chrome, real data given the most visual weight, one accent color used deliberately.

## Getting started

```bash
npm install
cp .env.example .env
docker compose up -d   # local Postgres — matches production, no dev/prod drift
npm run db:push          # apply the schema
npm run db:seed          # populate a realistic 45-person org with projects, tasks, KPIs, leave, etc.
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with any of the demo accounts below (password for all: `password123`).

| Role | Email |
|---|---|
| CIO | `cio@taskengine.io` |
| Director | `director.tech@taskengine.io` |
| Manager | `manager.eng@taskengine.io` |
| Staff | `staff.eng1@taskengine.io` |

The full seeded org spans 6 departments and the full delegation chain (CIO → Director → Head of Department → Manager → Lead → Staff); every `@taskengine.io` account uses the same password. Browse `/org/users` once logged in to find a specific person.

Other useful scripts: `npm run db:studio` (Prisma Studio, browse the raw data), `npm run build` (production build), `npm run lint`.

## What it does

**Org hierarchy & delegation** — a real multi-level reporting structure (CIO → Director → Head of Department → Manager → Lead → Staff), a collapsible org chart, and task delegation that records who handed work to whom, how many hops deep, and the full chain back to the original owner.

**Projects & tasks** — projects with owners, departments, teams, target dates, and status; tasks with subtasks, multiple assignees, priorities, due dates, and a full status-change history. Kanban board and list views, quick inline status updates from anywhere a task appears.

**Blockers** — logged against a task or project with severity, owner, and resolution tracking, plus an org-wide blockers register.

**KPIs** — targets, direction (higher/lower-is-better), and a time series of readings per KPI, scoped to a person, team, department, or project, with trend charts.

**Scheduled update requests** — ask anyone (typically a direct or indirect report) for a status update on a cadence (daily/weekly/monthly/quarterly); requests surface as due/overdue and responses are logged with a timestamp.

**Workflows** — configurable status pipelines (default "Standard Delivery Pipeline" plus examples like "Bug Triage") that projects can be assigned to.

**Leave & workload** — leave requests and approvals, a leave calendar, an 8-week workload heatmap across the org (or filtered by department/team), and auto-assign suggestions that surface coverage options when someone with active task assignments goes on leave.

**Documents** — files attached to tasks or projects (or unattached, in a shared library), with search and filtering.

**Notifications & activity** — an in-app notification feed (assignments, delegations, status changes, blockers, update requests, leave) and a full activity log per entity and org-wide.

**Dashboards** — a role-aware personal landing page (your open/overdue/upcoming work, delegated-by-you/to-you, an org rollup if you manage people), team dashboards, per-project analytics (burn-up, blocker history, delegation depth), and an org-wide delays & risk register merging at-risk projects, overdue tasks, and high-severity blockers.

## Architecture

- **Next.js 16 (App Router, Turbopack)**, React 19, TypeScript.
- **Prisma + Postgres** for data — see `prisma/schema.prisma` for the full model (users, departments, teams, projects, tasks, assignments, blockers, KPIs, workflows, scheduled updates, leave, documents, comments, notifications, activity log).
- **Custom auth**: bcrypt-hashed passwords, signed JWT session cookie (see `src/lib/auth.ts`) — no third-party auth dependency.
- A small shared **design system** under `src/components/ui/` (cards, badges, tabs, modals, avatars, status pills, etc.) that every feature module builds on, so the whole app reads as one product rather than six.
- `prisma/seed-fragments/*.ts` — one idempotent seed module per feature area, composed by `prisma/seed.ts`.

## Demo data

The seed produces a coherent, interconnected dataset: ~45 people across 6 departments, 15 projects, ~400 tasks (with real delegation chains derived from the actual manager relationships), blockers, KPIs with trending history, scheduled update requests with responses, leave requests (including a few active "on leave right now" cases so the workload heatmap and auto-assign suggestions have something to show), documents, comments, and notifications. Re-running `npm run db:seed` is safe — every fragment is idempotent.
