/**
 * Seed Saints Trail (custom_1 / DEMO_SANDBOX): NPCs, dialogue trees, quests.
 * Studio-authoritative: create-missing only unless FORCE_TRAIL_SEED=1.
 *
 * Usage: npm run seed:saints-trail
 */

import { PrismaClient } from "@prisma/client";
import {
  SAINTS_TRAIL_DIALOGUES,
  SAINTS_TRAIL_GAME_ID,
  SAINTS_TRAIL_MAP_ID,
  SAINTS_TRAIL_NPCS,
  SAINTS_TRAIL_QUEST_CHAIN,
} from "../src/server/saintsTrailQuests";

const prisma = new PrismaClient();
const force = process.env.FORCE_TRAIL_SEED === "1";

async function mergeTrailNpcs() {
  const world = await prisma.worldMap.findUnique({ where: { id: SAINTS_TRAIL_MAP_ID } });
  if (!world) {
    console.warn(`[trail] map ${SAINTS_TRAIL_MAP_ID} missing — run server once for DemoBootstrap first`);
    return;
  }

  let npcs: Array<Record<string, unknown>> = [];
  try {
    npcs = JSON.parse(world.npcsData || "[]");
  } catch {
    npcs = [];
  }

  let added = 0;
  for (const seed of SAINTS_TRAIL_NPCS) {
    const idx = npcs.findIndex((n) => n.id === seed.id);
    if (idx >= 0) {
      if (force) {
        npcs[idx] = { ...seed };
        console.log(`  npc force ${seed.id}`);
      } else {
        console.log(`  npc keep ${seed.id}`);
      }
      continue;
    }
    npcs.push({ ...seed });
    added++;
    console.log(`  npc create ${seed.id}`);
  }

  await prisma.worldMap.update({
    where: { id: SAINTS_TRAIL_MAP_ID },
    data: {
      gameId: SAINTS_TRAIL_GAME_ID,
      npcsData: JSON.stringify(npcs),
      version: { increment: 1 },
    },
  });

  await prisma.gameMap.upsert({
    where: { id: SAINTS_TRAIL_MAP_ID },
    create: {
      id: SAINTS_TRAIL_MAP_ID,
      name: world.name,
      width: 30,
      height: 30,
      tilesetData: world.gridData,
      gates: world.gatesData,
      npcs: JSON.stringify(npcs),
      encounters: world.encountersData,
    },
    update: { npcs: JSON.stringify(npcs) },
  });

  console.log(`[trail] NPCs merged (+${added}), gameId=${SAINTS_TRAIL_GAME_ID}`);
}

async function upsertDialogues() {
  for (const [npcId, def] of Object.entries(SAINTS_TRAIL_DIALOGUES)) {
    const existing = await prisma.npcDialogueTree.findUnique({ where: { npcId } });
    if (existing && !force) {
      console.log(`  dialogue keep ${npcId}`);
      continue;
    }
    await prisma.npcDialogueTree.upsert({
      where: { npcId },
      create: {
        npcId,
        name: def.name,
        data: JSON.stringify(def.tree),
      },
      update: {
        name: def.name,
        data: JSON.stringify(def.tree),
      },
    });
    console.log(`  dialogue ${existing ? "force" : "create"} ${npcId}`);
  }

}

async function upsertQuests() {
  for (const q of SAINTS_TRAIL_QUEST_CHAIN) {
    const existing = await prisma.questTemplate.findUnique({ where: { slug: q.slug } });
    if (existing && !force) {
      if ((existing as { gameId?: string }).gameId !== SAINTS_TRAIL_GAME_ID) {
        await prisma.questTemplate.update({
          where: { id: existing.id },
          data: { gameId: SAINTS_TRAIL_GAME_ID },
        });
      }
      console.log(`  quest keep ${q.slug}`);
      continue;
    }

    let questId: string;
    if (existing) {
      await prisma.questObjective.deleteMany({ where: { questId: existing.id } });
      await prisma.questTemplate.update({
        where: { id: existing.id },
        data: {
          gameId: SAINTS_TRAIL_GAME_ID,
          title: q.title,
          description: q.description,
          rewards: q.rewards,
        },
      });
      questId = existing.id;
      console.log(`  quest force ${q.slug}`);
    } else {
      const created = await prisma.questTemplate.create({
        data: {
          slug: q.slug,
          gameId: SAINTS_TRAIL_GAME_ID,
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
  console.log(`Seeding Saints Trail (force=${force})…`);
  await mergeTrailNpcs();
  console.log("Dialogues…");
  await upsertDialogues();
  console.log("Quests…");
  await upsertQuests();
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
