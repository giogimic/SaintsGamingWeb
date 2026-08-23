/**
 * Ensure Studio world profiles exist (GameConfig rows).
 * Usage: npx tsx scripts/ensure-world-profiles.ts
 */
import { PrismaClient } from "@prisma/client";
import { WORLD_PROFILES, DEFAULT_WORLD_PROFILE_ID } from "../src/shared/game/worldProfiles";

const prisma = new PrismaClient();

async function main() {
  for (const p of WORLD_PROFILES) {
    await prisma.gameConfig.upsert({
      where: { slug: p.id },
      create: {
        slug: p.id,
        name: p.name,
        description: p.description,
        isActive: p.id === DEFAULT_WORLD_PROFILE_ID,
      },
      update: {
        name: p.name,
        description: p.description,
      },
    });
    console.log(`[ok] ${p.id} (${p.name})`);
  }

  // Tag Spyder quests with saints gameId if column exists
  try {
    const updated = await prisma.questTemplate.updateMany({
      where: { slug: { startsWith: "quest_" } },
      data: { gameId: "saints" },
    });
    console.log(`[ok] tagged ${updated.count} quests → saints`);
  } catch (e) {
    console.warn("[skip] quest gameId tag (run prisma db push first)", e);
  }

  // Tag starter heroes
  try {
    await prisma.starterHero.updateMany({
      data: { gameId: "saints" },
    });
    console.log("[ok] tagged starter heroes");
  } catch (e) {
    console.warn("[skip] hero gameId tag", e);
  }

  await prisma.$disconnect();
  console.log("[done] world profiles ready");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
