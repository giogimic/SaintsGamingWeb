/**
 * Ensure Base Character Classes Exist
 * Lightweight idempotent script — safe to run on every update.
 * Seeds the 5 base classes (Warrior, Mage, Ranger, Paladin, Priest) if missing.
 * Usage: npx tsx scripts/ensure-base-classes.ts
 */
import { prisma } from "../src/web/lib/prisma";
import { DEFAULT_PLAYABLE_CLASSES } from "../src/shared/game/classCatalog";
import { classDataToDb } from "../src/shared/game/classDefMap";
import { ensureDefaultGameConfig } from "../src/server/classDefs";

async function main() {
  console.log("[*] Ensuring base character classes exist...");
  try {
    const gameConfig = await ensureDefaultGameConfig();
    let seeded = 0;
    let skipped = 0;

    for (const classDef of DEFAULT_PLAYABLE_CLASSES) {
      const existing = await prisma.characterClass.findUnique({
        where: { gameId_slug: { gameId: gameConfig.id, slug: classDef.slug } },
      });

      if (existing) {
        skipped++;
        continue;
      }

      const payload = classDataToDb(classDef, gameConfig.id);
      await prisma.characterClass.create({ data: payload });
      seeded++;
    }

    console.log(`[✓] Classes: ${seeded} seeded, ${skipped} already existed.`);
  } catch (err: any) {
    console.error("[!] Failed:", err.message);
    process.exit(1);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
