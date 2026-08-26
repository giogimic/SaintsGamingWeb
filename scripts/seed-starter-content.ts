/**
 * Seed Dynamic Starter Content CLI
 * Usage: npx tsx scripts/seed-starter-content.ts
 */
import { bootstrapDynamicStarterContent } from "../src/server/starterContentBootstrap";
import { prisma } from "../src/web/lib/prisma";

async function main() {
  console.log("=== SEEDING DYNAMIC STARTER RPG CONTENT ===");
  const res = await bootstrapDynamicStarterContent("saints", "default");
  if (!res.success) {
    console.error("Failed:", res.error);
    process.exit(1);
  }
  console.log("=== COMPLETED SUCCESSFULLY ===");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
