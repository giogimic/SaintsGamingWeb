/**
 * Seed curated Spyder campaign NPCs + quest chain into WorldMap / dialogue / QuestTemplate.
 * Does not require Tuxemon TMX (use import-map-npcs-from-tmx.ts when TUXEMON_PATH is set).
 *
 * Usage: npx tsx scripts/seed-campaign-npcs.ts
 * Alias: npm run seed:campaign-npcs  |  npm run seed:azure
 */

import { PrismaClient } from "@prisma/client";
import {
  CAMPAIGN_NPC_SEEDS,
  CARLOS_DIALOGUE_TREE,
  LEATHER_GYM_ATTENDANT_DIALOGUE_TREE,
  LEATHER_NURSE_DIALOGUE_TREE,
  LEATHER_SCOOP_CLERK_DIALOGUE_TREE,
  SCOOP_CLERK_DIALOGUE_TREE,
  SCOOP_NURSE_DIALOGUE_TREE,
  SPYDER_QUEST_CHAIN,
} from "../src/server/spyderQuests";
import { AZURE_GUIDE_NPC_ID, AZURE_GUIDE_TREE } from "../src/server/spyderGuideDialogue";
import { seedAmbientDialogue } from "./seed-ambient-dialogue";

const prisma = new PrismaClient();

function dialogueTreeFor(npc: {
  id: string;
  name: string;
  greeting: string;
  questSlug?: string;
}) {
  if (npc.id === AZURE_GUIDE_NPC_ID) {
    return AZURE_GUIDE_TREE;
  }
  if (npc.id === "npc_cotton_tunnel_carlos") {
    return CARLOS_DIALOGUE_TREE;
  }
  if (npc.id === "npc_cotton_scoop_clerk") {
    return SCOOP_CLERK_DIALOGUE_TREE;
  }
  if (npc.id === "npc_cotton_scoop_nurse") {
    return SCOOP_NURSE_DIALOGUE_TREE;
  }
  if (npc.id === "npc_leather_center_nurse") {
    return LEATHER_NURSE_DIALOGUE_TREE;
  }
  if (npc.id === "npc_leather_scoop_clerk") {
    return LEATHER_SCOOP_CLERK_DIALOGUE_TREE;
  }
  if (npc.id === "npc_leather_gym_attendant") {
    return LEATHER_GYM_ATTENDANT_DIALOGUE_TREE;
  }
  if (npc.questSlug) {
    return {
      node_start: {
        text: npc.greeting,
        options: [
          {
            label: "I'm ready.",
            nextNode: "accepted",
            action: "ACCEPT_QUEST",
            questSlug: npc.questSlug,
          },
          { label: "Just looking around.", nextNode: "exit" },
        ],
      },
      accepted: {
        text: "Good. Speak with the townsfolk around the plaza. When you're ready for wilds, take the east road out of town to Route 1 — tall grass waits there.",
        options: [{ label: "Understood.", nextNode: "exit" }],
      },
    };
  }
  return {
    node_start: {
      text: npc.greeting,
      options: [{ label: "Farewell.", nextNode: "exit" }],
    },
  };
}

async function upsertMapNpcs(
  mapId: string,
  seeds: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    sprite: string;
    greeting: string;
    questSlug?: string;
  }>
) {
  const map = await prisma.worldMap.findUnique({ where: { id: mapId } });
  if (!map) {
    console.log(`  skip ${mapId} (WorldMap missing — run migrate:campaign)`);
    return 0;
  }

  let npcs: any[] = [];
  try {
    npcs = JSON.parse(map.npcsData || "[]");
  } catch {
    npcs = [];
  }

  // Drop campaign NPCs that now live on a different map (e.g. Scoop clerk moved indoors)
  const idsOnThisMap = new Set(seeds.map((s) => s.id));
  const campaignIdsElsewhere = new Set<string>();
  for (const [otherMap, otherSeeds] of Object.entries(CAMPAIGN_NPC_SEEDS)) {
    if (otherMap === mapId) continue;
    for (const s of otherSeeds) campaignIdsElsewhere.add(s.id);
  }
  npcs = npcs.filter(
    (n) => !campaignIdsElsewhere.has(n.id) || idsOnThisMap.has(n.id)
  );

  for (const seed of seeds) {
    const entry = {
      id: seed.id,
      name: seed.name,
      x: seed.x,
      y: seed.y,
      sprite: seed.sprite,
      direction: "down",
      dialogue: [seed.greeting],
    };
    const idx = npcs.findIndex((n) => n.id === seed.id);
    if (idx >= 0) npcs[idx] = { ...npcs[idx], ...entry };
    else npcs.push(entry);

    await prisma.npcDialogueTree.upsert({
      where: { npcId: seed.id },
      create: {
        npcId: seed.id,
        name: seed.name,
        data: JSON.stringify(dialogueTreeFor(seed)),
      },
      update: {
        name: seed.name,
        data: JSON.stringify(dialogueTreeFor(seed)),
      },
    });
  }

  await prisma.worldMap.update({
    where: { id: mapId },
    data: { npcsData: JSON.stringify(npcs), version: { increment: 1 } },
  });

  await prisma.gameMap.upsert({
    where: { id: mapId },
    create: {
      id: mapId,
      name: map.name,
      width: 50,
      height: 50,
      tilesetData: map.gridData,
      gates: map.gatesData,
      npcs: JSON.stringify(npcs),
      encounters: map.encountersData,
    },
    update: { npcs: JSON.stringify(npcs) },
  });

  console.log(`  ${mapId}: ${seeds.length} seeded (${npcs.length} NPCs total)`);
  return seeds.length;
}

async function upsertQuestChain() {
  // Default: create missing quests only (Studio edits win).
  // FORCE_QUEST_SEED=1 overwrites title/rewards/objectives from code.
  const force = process.env.FORCE_QUEST_SEED === "1";

  for (const q of SPYDER_QUEST_CHAIN) {
    const existing = await prisma.questTemplate.findUnique({
      where: { slug: q.slug },
      include: { objectives: true },
    });

    let questId: string;
    if (existing) {
      if (!force) {
        // Still stamp world profile if missing/wrong
        if ((existing as { gameId?: string }).gameId !== "tuxemon") {
          await prisma.questTemplate.update({
            where: { id: existing.id },
            data: { gameId: "tuxemon" },
          });
        }
        console.log(`  quest keep ${q.slug} (Studio authority; FORCE_QUEST_SEED=1 to overwrite)`);
        continue;
      }
      await prisma.questObjective.deleteMany({ where: { questId: existing.id } });
      await prisma.questTemplate.update({
        where: { id: existing.id },
        data: {
          gameId: "tuxemon",
          title: q.title,
          description: q.description,
          rewards: q.rewards,
        },
      });
      questId = existing.id;
      console.log(`  quest force-upsert ${q.slug}`);
    } else {
      const created = await prisma.questTemplate.create({
        data: {
          slug: q.slug,
          gameId: "tuxemon",
          title: q.title,
          description: q.description,
          rewards: q.rewards,
        },
      });
      questId = created.id;
      console.log(`  quest create ${q.slug}`);
    }

    for (const obj of q.objectives) {
      await prisma.questObjective.create({
        data: {
          questId,
          stage: obj.stage,
          type: obj.type,
          targetSlug: obj.targetSlug,
          requiredQty: obj.requiredQty,
          description: obj.description,
        },
      });
    }
  }
}

async function main() {
  console.log("Seeding campaign NPCs…");
  let total = 0;
  for (const [mapId, seeds] of Object.entries(CAMPAIGN_NPC_SEEDS)) {
    total += await upsertMapNpcs(mapId, [...seeds]);
  }

  console.log("Upserting Spyder quest chain…");
  await upsertQuestChain();

  console.log("Ambient dialogue + wall prune…");
  await seedAmbientDialogue();

  console.log(`Done. ${total} NPC placements across ${Object.keys(CAMPAIGN_NPC_SEEDS).length} maps.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
