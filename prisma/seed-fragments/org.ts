// Org module seed fragment — people, departments, teams.
// Imported and run by the master seed script. Idempotent (upsert-based on unique keys).
import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../src/lib/auth";

type Level = "CIO" | "DIRECTOR" | "HEAD_OF_DEPARTMENT" | "MANAGER" | "LEAD" | "STAFF";

interface DeptDef {
  key: string;
  name: string;
  description: string;
  color: string;
}

interface UserDef {
  key: string;
  email: string;
  name: string;
  title: string;
  level: Level;
  dept: string | null;
  manager: string | null;
  active?: boolean;
}

interface TeamDef {
  key: string;
  name: string;
  description: string;
  color: string;
  dept: string;
  lead: string;
  members: string[];
}

const AVATAR_COLORS = [
  "#3b63f6", "#8b5cf6", "#ec4899", "#f59e0b", "#16a34a", "#0ea5e9",
  "#ef4444", "#14b8a6", "#a855f7", "#f97316", "#22c55e", "#6366f1",
  "#eab308", "#06b6d4", "#d946ef", "#64748b",
];
function colorFor(i: number) {
  return AVATAR_COLORS[i % AVATAR_COLORS.length];
}

const DEPARTMENTS: DeptDef[] = [
  { key: "engineering", name: "Engineering", description: "Product engineering, platform, and quality.", color: "#3b63f6" },
  { key: "product", name: "Product", description: "Product strategy and management.", color: "#8b5cf6" },
  { key: "design", name: "Design", description: "Product design and design systems.", color: "#ec4899" },
  { key: "finance", name: "Finance", description: "Financial planning, accounting, and analysis.", color: "#16a34a" },
  { key: "sales", name: "Sales", description: "Enterprise and SMB revenue teams.", color: "#f59e0b" },
  { key: "operations", name: "Operations", description: "People, operations, and internal tooling.", color: "#0ea5e9" },
];

const USERS: UserDef[] = [
  // CIO
  { key: "cio", email: "cio@taskengine.io", name: "Alex Chen", title: "Chief Information Officer", level: "CIO", dept: null, manager: null },

  // Directors -> CIO
  { key: "dir_eng", email: "director.tech@taskengine.io", name: "Priya Raman", title: "Director of Engineering & Technology", level: "DIRECTOR", dept: "engineering", manager: "cio" },
  { key: "dir_product", email: "jordan.reyes@taskengine.io", name: "Jordan Reyes", title: "Director of Product", level: "DIRECTOR", dept: "product", manager: "cio" },
  { key: "dir_design", email: "morgan.lee@taskengine.io", name: "Morgan Lee", title: "Director of Design", level: "DIRECTOR", dept: "design", manager: "cio" },
  { key: "dir_finance", email: "elena.wachter@taskengine.io", name: "Elena Wachter", title: "Director of Finance", level: "DIRECTOR", dept: "finance", manager: "cio" },
  { key: "dir_sales", email: "marcus.oyelaran@taskengine.io", name: "Marcus Oyelaran", title: "Director of Sales", level: "DIRECTOR", dept: "sales", manager: "cio" },
  { key: "dir_ops", email: "nadia.farouk@taskengine.io", name: "Nadia Farouk", title: "Director of Operations", level: "DIRECTOR", dept: "operations", manager: "cio" },

  // Heads of Department -> Director
  { key: "hod_eng_platform", email: "sam.okafor@taskengine.io", name: "Samuel Okafor", title: "Head of Platform Engineering", level: "HEAD_OF_DEPARTMENT", dept: "engineering", manager: "dir_eng" },
  { key: "hod_eng_product", email: "wei.zhang@taskengine.io", name: "Wei Zhang", title: "Head of Product Engineering", level: "HEAD_OF_DEPARTMENT", dept: "engineering", manager: "dir_eng" },
  { key: "hod_product", email: "fatima.hassan@taskengine.io", name: "Fatima Hassan", title: "Head of Product Management", level: "HEAD_OF_DEPARTMENT", dept: "product", manager: "dir_product" },
  { key: "hod_design", email: "liam.oconnor@taskengine.io", name: "Liam O'Connor", title: "Head of Design", level: "HEAD_OF_DEPARTMENT", dept: "design", manager: "dir_design" },
  { key: "hod_finance", email: "grace.kim@taskengine.io", name: "Grace Kim", title: "Head of Finance Operations", level: "HEAD_OF_DEPARTMENT", dept: "finance", manager: "dir_finance" },
  { key: "hod_sales_ent", email: "derek.brandt@taskengine.io", name: "Derek Brandt", title: "Head of Enterprise Sales", level: "HEAD_OF_DEPARTMENT", dept: "sales", manager: "dir_sales" },
  { key: "hod_sales_smb", email: "aisha.bello@taskengine.io", name: "Aisha Bello", title: "Head of SMB Sales", level: "HEAD_OF_DEPARTMENT", dept: "sales", manager: "dir_sales" },
  { key: "hod_ops", email: "thomas.nguyen@taskengine.io", name: "Thomas Nguyen", title: "Head of Operations", level: "HEAD_OF_DEPARTMENT", dept: "operations", manager: "dir_ops" },

  // Managers -> Head of Department
  { key: "mgr_eng_platform", email: "manager.eng@taskengine.io", name: "Daniel Ortiz", title: "Engineering Manager, Platform", level: "MANAGER", dept: "engineering", manager: "hod_eng_platform" },
  { key: "mgr_eng_product", email: "sophia.martins@taskengine.io", name: "Sophia Martins", title: "Engineering Manager, Product", level: "MANAGER", dept: "engineering", manager: "hod_eng_product" },
  { key: "mgr_eng_qa", email: "ravi.subramaniam@taskengine.io", name: "Ravi Subramaniam", title: "QA & Reliability Manager", level: "MANAGER", dept: "engineering", manager: "hod_eng_platform" },
  { key: "mgr_product", email: "chloe.dubois@taskengine.io", name: "Chloe Dubois", title: "Product Manager", level: "MANAGER", dept: "product", manager: "hod_product" },
  { key: "mgr_design", email: "noah.kessler@taskengine.io", name: "Noah Kessler", title: "Design Manager", level: "MANAGER", dept: "design", manager: "hod_design" },
  { key: "mgr_finance", email: "yuki.tanaka@taskengine.io", name: "Yuki Tanaka", title: "Finance Manager", level: "MANAGER", dept: "finance", manager: "hod_finance" },
  { key: "mgr_sales_ent", email: "isabella.rossi@taskengine.io", name: "Isabella Rossi", title: "Enterprise Sales Manager", level: "MANAGER", dept: "sales", manager: "hod_sales_ent" },
  { key: "mgr_sales_smb", email: "kwame.mensah@taskengine.io", name: "Kwame Mensah", title: "SMB Sales Manager", level: "MANAGER", dept: "sales", manager: "hod_sales_smb" },
  { key: "mgr_ops", email: "olivia.svensson@taskengine.io", name: "Olivia Svensson", title: "Operations Manager", level: "MANAGER", dept: "operations", manager: "hod_ops" },

  // Leads -> Manager
  { key: "lead_eng_platform", email: "ethan.brooks@taskengine.io", name: "Ethan Brooks", title: "Tech Lead, Platform", level: "LEAD", dept: "engineering", manager: "mgr_eng_platform" },
  { key: "lead_eng_product", email: "mia.fischer@taskengine.io", name: "Mia Fischer", title: "Tech Lead, Product Engineering", level: "LEAD", dept: "engineering", manager: "mgr_eng_product" },
  { key: "lead_eng_qa", email: "victor.hansen@taskengine.io", name: "Victor Hansen", title: "QA Lead", level: "LEAD", dept: "engineering", manager: "mgr_eng_qa" },
  { key: "lead_product", email: "hannah.cohen@taskengine.io", name: "Hannah Cohen", title: "Product Lead", level: "LEAD", dept: "product", manager: "mgr_product" },
  { key: "lead_design", email: "lucas.moreau@taskengine.io", name: "Lucas Moreau", title: "Design Lead", level: "LEAD", dept: "design", manager: "mgr_design" },
  { key: "lead_finance", email: "amara.chukwu@taskengine.io", name: "Amara Chukwu", title: "Finance Lead", level: "LEAD", dept: "finance", manager: "mgr_finance" },
  { key: "lead_sales_ent", email: "benjamin.foster@taskengine.io", name: "Benjamin Foster", title: "Enterprise Sales Lead", level: "LEAD", dept: "sales", manager: "mgr_sales_ent" },
  { key: "lead_sales_smb", email: "priyanka.das@taskengine.io", name: "Priyanka Das", title: "SMB Sales Lead", level: "LEAD", dept: "sales", manager: "mgr_sales_smb" },
  { key: "lead_ops", email: "gabriel.silva@taskengine.io", name: "Gabriel Silva", title: "Operations Lead", level: "LEAD", dept: "operations", manager: "mgr_ops" },

  // Staff -> Lead
  { key: "staff_eng1", email: "staff.eng1@taskengine.io", name: "Ken Ishikawa", title: "Software Engineer", level: "STAFF", dept: "engineering", manager: "lead_eng_platform" },
  { key: "staff_eng2", email: "staff.eng2@taskengine.io", name: "Zara Ahmed", title: "Software Engineer", level: "STAFF", dept: "engineering", manager: "lead_eng_platform" },
  { key: "staff_eng3", email: "staff.eng3@taskengine.io", name: "Leo Fontaine", title: "Software Engineer II", level: "STAFF", dept: "engineering", manager: "lead_eng_product" },
  { key: "staff_eng4", email: "staff.eng4@taskengine.io", name: "Nina Petrova", title: "Backend Engineer", level: "STAFF", dept: "engineering", manager: "lead_eng_product", active: false },
  { key: "staff_qa1", email: "staff.qa1@taskengine.io", name: "Oscar Lindqvist", title: "QA Engineer", level: "STAFF", dept: "engineering", manager: "lead_eng_qa" },
  { key: "staff_product1", email: "staff.product1@taskengine.io", name: "Ava Thompson", title: "Product Analyst", level: "STAFF", dept: "product", manager: "lead_product" },
  { key: "staff_product2", email: "staff.product2@taskengine.io", name: "Ibrahim Suleiman", title: "Associate Product Manager", level: "STAFF", dept: "product", manager: "lead_product" },
  { key: "staff_design1", email: "staff.design1@taskengine.io", name: "Clara Jensen", title: "Product Designer", level: "STAFF", dept: "design", manager: "lead_design" },
  { key: "staff_finance1", email: "staff.finance1@taskengine.io", name: "Diego Alvarez", title: "Financial Analyst", level: "STAFF", dept: "finance", manager: "lead_finance" },
  { key: "staff_sales1", email: "staff.sales1@taskengine.io", name: "Freya Larsen", title: "Account Executive", level: "STAFF", dept: "sales", manager: "lead_sales_ent" },
  { key: "staff_sales2", email: "staff.sales2@taskengine.io", name: "Malik Johnson", title: "Sales Development Rep", level: "STAFF", dept: "sales", manager: "lead_sales_smb", active: false },
  { key: "staff_ops1", email: "staff.ops1@taskengine.io", name: "Ingrid Bergstrom", title: "Operations Analyst", level: "STAFF", dept: "operations", manager: "lead_ops" },
];

const TEAMS: TeamDef[] = [
  { key: "team_platform_eng", name: "Platform Engineering", description: "Core platform, infra, and internal tooling.", color: "#3b63f6", dept: "engineering", lead: "mgr_eng_platform", members: ["mgr_eng_platform", "lead_eng_platform", "staff_eng1", "staff_eng2"] },
  { key: "team_product_eng", name: "Product Engineering", description: "Customer-facing product surfaces.", color: "#5c85ff", dept: "engineering", lead: "mgr_eng_product", members: ["mgr_eng_product", "lead_eng_product", "staff_eng3", "staff_eng4"] },
  { key: "team_qa", name: "QA & Reliability", description: "Quality assurance and site reliability.", color: "#14b8a6", dept: "engineering", lead: "mgr_eng_qa", members: ["mgr_eng_qa", "lead_eng_qa", "staff_qa1"] },
  { key: "team_product", name: "Product Management", description: "Roadmap, discovery, and product analytics.", color: "#8b5cf6", dept: "product", lead: "mgr_product", members: ["mgr_product", "lead_product", "staff_product1", "staff_product2"] },
  { key: "team_design", name: "Design Systems", description: "Product design and the shared design system.", color: "#ec4899", dept: "design", lead: "mgr_design", members: ["mgr_design", "lead_design", "staff_design1"] },
  { key: "team_finance", name: "Finance Operations", description: "FP&A, accounting, and reporting.", color: "#16a34a", dept: "finance", lead: "mgr_finance", members: ["mgr_finance", "lead_finance", "staff_finance1"] },
  { key: "team_sales_ent", name: "Enterprise Sales", description: "Strategic and enterprise accounts.", color: "#f59e0b", dept: "sales", lead: "mgr_sales_ent", members: ["mgr_sales_ent", "lead_sales_ent", "staff_sales1"] },
  { key: "team_sales_smb", name: "SMB Sales", description: "Small and mid-market accounts.", color: "#eab308", dept: "sales", lead: "mgr_sales_smb", members: ["mgr_sales_smb", "lead_sales_smb", "staff_sales2"] },
  { key: "team_ops", name: "People & Operations", description: "People ops, workplace, and internal systems.", color: "#0ea5e9", dept: "operations", lead: "mgr_ops", members: ["mgr_ops", "lead_ops", "staff_ops1"] },
];

export default async function seedOrg(prisma: PrismaClient) {
  // 1. Departments
  const deptIdByKey = new Map<string, string>();
  for (const d of DEPARTMENTS) {
    const dept = await prisma.department.upsert({
      where: { name: d.name },
      update: { description: d.description, color: d.color },
      create: { name: d.name, description: d.description, color: d.color },
    });
    deptIdByKey.set(d.key, dept.id);
  }

  // 2. Users (pass 1 — no managerId yet, so every referenced manager already exists by id later)
  const passwordHash = await hashPassword("password123");
  const userIdByKey = new Map<string, string>();
  for (const [i, u] of USERS.entries()) {
    const departmentId = u.dept ? deptIdByKey.get(u.dept) ?? null : null;
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        title: u.title,
        level: u.level,
        active: u.active ?? true,
        departmentId,
      },
      create: {
        email: u.email,
        name: u.name,
        title: u.title,
        level: u.level,
        active: u.active ?? true,
        passwordHash,
        avatarColor: colorFor(i),
        departmentId,
      },
    });
    userIdByKey.set(u.key, user.id);
  }

  // 3. Users (pass 2 — wire up managerId now that every id is known)
  for (const u of USERS) {
    if (!u.manager) continue;
    const id = userIdByKey.get(u.key)!;
    const managerId = userIdByKey.get(u.manager)!;
    await prisma.user.update({ where: { id }, data: { managerId } });
  }

  // 4. Teams + memberships
  for (const t of TEAMS) {
    const departmentId = deptIdByKey.get(t.dept)!;
    const leadId = userIdByKey.get(t.lead)!;
    const existing = await prisma.team.findFirst({ where: { name: t.name } });
    const team = existing
      ? await prisma.team.update({
          where: { id: existing.id },
          data: { description: t.description, color: t.color, departmentId, leadId },
        })
      : await prisma.team.create({
          data: { name: t.name, description: t.description, color: t.color, departmentId, leadId },
        });

    for (const memberKey of t.members) {
      const userId = userIdByKey.get(memberKey);
      if (!userId) continue;
      await prisma.teamMembership.upsert({
        where: { teamId_userId: { teamId: team.id, userId } },
        update: {},
        create: { teamId: team.id, userId },
      });
    }
  }
}
