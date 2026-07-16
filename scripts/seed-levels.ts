import { prisma } from "../lib/prisma";

const tiers = [
  { level: 1, name: "Newbie", xpRequired: 0, icon: "🥚" },
  { level: 2, name: "Regular", xpRequired: 50, icon: "🌱" },
  { level: 3, name: "Active Member", xpRequired: 150, icon: "🌿" },
  { level: 4, name: "Veteran", xpRequired: 500, icon: "⭐" },
  { level: 5, name: "Elite", xpRequired: 1000, icon: "🔥" },
  { level: 6, name: "Saint", xpRequired: 2500, icon: "👑" },
];

async function main() {
  console.log("Seeding Level Tiers...");
  for (const tier of tiers) {
    await prisma.levelTier.upsert({
      where: { level: tier.level },
      update: { name: tier.name, xpRequired: tier.xpRequired, icon: tier.icon },
      create: tier,
    });
  }
  console.log("Level Tiers seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
