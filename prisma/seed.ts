// Master seed script — orchestrates every module's seed fragment in dependency order.
// Each fragment is idempotent, so this is safe to re-run at any time:
//   npx tsx prisma/seed.ts

import { PrismaClient } from "@prisma/client";
import seedOrg from "./seed-fragments/org";
import seedProjects from "./seed-fragments/projects";
import seedKpis from "./seed-fragments/kpis";
import seedLeave from "./seed-fragments/leave";
import seedDocuments from "./seed-fragments/documents";

const prisma = new PrismaClient();

async function main() {
  console.log("→ Seeding organization (users, departments, teams)…");
  await seedOrg(prisma);

  console.log("→ Seeding projects & tasks (delegation chains, blockers)…");
  await seedProjects(prisma);

  console.log("→ Seeding workflows, KPIs & scheduled update requests…");
  await seedKpis(prisma);

  console.log("→ Seeding leave requests & coverage scenarios…");
  await seedLeave(prisma);

  console.log("→ Seeding documents, comments, activity & notifications…");
  await seedDocuments(prisma);

  console.log("✓ Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
