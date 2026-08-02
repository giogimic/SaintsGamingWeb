/**
 * Bridge Tuxemon CreatureTemplate rows → Studio CreatureDef catalog.
 *
 * Usage: npx tsx scripts/sync-tuxemon-to-creature-defs.ts [--wild] [--limit N]
 *
 * Defaults: upsert all templates as inactive wild-capable defs with
 * shinyUseGlobalChance=true. Pass --wild to mark isWildSpawn=true.
 */

import { PrismaClient } from "@prisma/client";
import { creatureDataToDb } from "../src/shared/game/creatureDefMap";
import type { CreatureDefData } from "../src/shared/game/creatureCatalog";
import { mapTuxemonTypeToSaints } from "../src/shared/game/tuxemonElementMap";

const prisma = new PrismaClient();

function mapType(tux: string | undefined): string {
  return mapTuxemonTypeToSaints(tux);
}

function titleName(slug: string, speciesName: string): string {
  if (speciesName && speciesName !== "unknown" && !speciesName.includes("_")) {
    return speciesName.charAt(0).toUpperCase() + speciesName.slice(1);
  }
  return slug
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function main() {
  const args = process.argv.slice(2);
  const markWild = args.includes("--wild");
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) || 0 : 0;

  const templates = await prisma.creatureTemplate.findMany({
    include: { stats: true, learnedAbilities: true },
    orderBy: { dexNumber: "asc" },
    ...(limit > 0 ? { take: limit } : {}),
  });

  console.log(`Syncing ${templates.length} CreatureTemplate → CreatureDef…`);
  let upserted = 0;

  for (const t of templates) {
    let types: string[] = [];
    try {
      types = JSON.parse(t.types || "[]");
    } catch {
      types = [];
    }

    const abilities =
      t.learnedAbilities
        .filter((a) => a.levelLearned <= 5)
        .slice(0, 4)
        .map((a) => ({ abilitySlug: a.abilitySlug, currentCooldown: 0 })) || [];
    if (abilities.length === 0) {
      abilities.push({ abilitySlug: "ram", currentCooldown: 0 });
    }

    const stats = t.stats;
    const def: CreatureDefData = {
      slug: t.slug,
      name: titleName(t.slug, t.speciesName),
      dexNumber: t.dexNumber,
      typePrimary: mapType(types[0]),
      typeSecondary: mapType(types[1]) || "None",
      spriteOverworld: t.spriteOverworld || t.spriteFront || "daemon_data",
      spriteBattle: t.spriteFront || null,
      spriteBack: t.spriteBack || null,
      shinyEnabled: true,
      shinyUseGlobalChance: true,
      shinyChancePercent: 0.5,
      shinySpriteOverworld: null,
      shinySpriteBattle: null,
      shinySpriteBack: null,
      baseHp: stats?.hp ?? 100,
      physicalPower: stats?.physicalPower ?? 10,
      physicalDefense: stats?.physicalDefense ?? 10,
      abilityPower: stats?.abilityPower ?? 10,
      abilityDefense: stats?.abilityDefense ?? 10,
      combatTempo: stats?.combatTempo ?? 100,
      catchRate: t.catchRate > 10 ? t.catchRate / 100 : t.catchRate || 1,
      starterLevel: 5,
      passives: [],
      worldSkillName: "",
      worldSkillDescription: "",
      abilities,
      flavor: `Imported from Tuxemon (${t.slug}).`,
      tag: "Tuxemon",
      tagColor: "#cbb26a",
      stage: t.stage || "basic",
      isStarter: false,
      isWildSpawn: markWild,
      isActive: true,
      sortOrder: t.dexNumber || 0,
    };

    // Never overwrite curated Saints demo starters / MPV wild
    if (["agnite", "budaye", "dollfin", "rockitten"].includes(t.slug)) {
      console.log(`  skip curated starter/wild: ${t.slug}`);
      continue;
    }

    await prisma.creatureDef.upsert({
      where: { slug: t.slug },
      create: creatureDataToDb(def),
      update: creatureDataToDb(def),
    });
    upserted++;
    if (upserted % 50 === 0) console.log(`  … ${upserted}`);
  }

  console.log(`Done. Upserted ${upserted} CreatureDef rows.`);
  console.log("Tip: run `npx tsx scripts/restore-curated-creatures.ts` if curated starters were overwritten.");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
