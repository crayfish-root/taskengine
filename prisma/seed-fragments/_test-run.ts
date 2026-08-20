import { PrismaClient } from "@prisma/client";
import seedOrg from "./org";

async function main() {
  const prisma = new PrismaClient();
  await seedOrg(prisma);
  const userCount = await prisma.user.count();
  const deptCount = await prisma.department.count();
  const teamCount = await prisma.team.count();
  const membershipCount = await prisma.teamMembership.count();
  console.log(JSON.stringify({ userCount, deptCount, teamCount, membershipCount }));

  const cio = await prisma.user.findUnique({ where: { email: "cio@taskengine.io" } });
  const staff = await prisma.user.findUnique({ where: { email: "staff.eng1@taskengine.io" }, include: { manager: { include: { manager: { include: { manager: { include: { manager: { include: { manager: true } } } } } } } } } });
  console.log("cio ok:", !!cio, cio?.level, cio?.managerId);
  console.log("staff chain:", staff?.name, "->", staff?.manager?.name, "->", staff?.manager?.manager?.name, "->", staff?.manager?.manager?.manager?.name, "->", staff?.manager?.manager?.manager?.manager?.name, "->", staff?.manager?.manager?.manager?.manager?.manager?.name);

  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
