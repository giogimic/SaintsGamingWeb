/**
 * Seed Dynamic Starter Content CLI
 * Usage: npx tsx scripts/seed-starter-content.ts
 */
import { bootstrapDynamicStarterContent } from "../src/server/starterContentBootstrap";
import { importStarterPackToDb } from "../src/shared/game/setup/prepackagedPacks";
import { prisma } from "../src/web/lib/prisma";
import { DEFAULT_PLAYABLE_CLASSES } from "../src/shared/game/classCatalog";
import { classDataToDb } from "../src/shared/game/classDefMap";
import { ensureDefaultGameConfig } from "../src/server/classDefs";

async function main() {
  // ── Seed Base Character Classes (Warrior, Mage, Ranger, Paladin, Priest) ──
  console.log("=== SEEDING BASE CHARACTER CLASSES ===");
  try {
    const gameConfig = await ensureDefaultGameConfig();
    let classCount = 0;
    for (const classDef of DEFAULT_PLAYABLE_CLASSES) {
      const payload = classDataToDb(classDef, gameConfig.id);
      await prisma.characterClass.upsert({
        where: { gameId_slug: { gameId: gameConfig.id, slug: classDef.slug } },
        create: payload,
        update: payload,
      });
      classCount++;
    }
    console.log(`[✓] Seeded ${classCount} base character classes.`);
  } catch (err: any) {
    console.error("[!] Failed to seed classes:", err.message);
  }

  // ── Seed Dynamic RPG Content ──
  console.log("=== SEEDING DYNAMIC STARTER RPG CONTENT ===");
  const res = await bootstrapDynamicStarterContent("saints", "default");
  if (!res.success) {
    console.error("Failed RPG Seeding:", res.error);
    process.exit(1);
  }
  console.log("=== SEEDING LOGIC TILES & BASE SETUP ===");
  const setupRes = await importStarterPackToDb(prisma, "blank-canvas");
  if (!setupRes.success) {
    console.error("Failed Base Setup Seeding:", setupRes.message);
    process.exit(1);
  }
  console.log("=== COMPLETED SUCCESSFULLY ===");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
