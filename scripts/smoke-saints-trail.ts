/**
 * Offline integrity check for Saints Trail (custom_1) + optional clone.
 *
 * Usage:
 *   npm run smoke:saints-trail
 *   SMOKE_CLONE_SLUG=custom_2 npm run smoke:saints-trail
 */

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import {
  SAINTS_TRAIL_GAME_ID,
  SAINTS_TRAIL_MAP_ID,
  SAINTS_TRAIL_NPCS,
  SAINTS_TRAIL_QUEST_CHAIN,
  SAINTS_TRAIL_DIALOGUES,
} from "../src/server/saintsTrailQuests";
import { trailNamespace } from "../src/server/cloneSaintsTrail";

const prisma = new PrismaClient();
const fails: string[] = [];
const oks: string[] = [];

function ok(msg: string) {
  oks.push(msg);
  console.log(`  ✓ ${msg}`);
}
function fail(msg: string) {
  fails.push(msg);
  console.error(`  ✗ ${msg}`);
}

async function checkProfile(gameId: string, mapId: string, namespaced: boolean) {
  console.log(`\n[profile ${gameId}]`);
  const map = await prisma.worldMap.findUnique({ where: { id: mapId } });
  if (!map) {
    fail(`map missing: ${mapId}`);
    return;
  }
  if (map.gameId !== gameId) fail(`map.gameId=${map.gameId} expected ${gameId}`);
  else ok(`map ${mapId} gameId=${gameId}`);

  let npcs: Array<{ id: string }> = [];
  try {
    npcs = JSON.parse(map.npcsData || "[]");
  } catch {
    fail("npcsData invalid JSON");
  }

  for (const seed of SAINTS_TRAIL_NPCS) {
    const id = namespaced ? trailNamespace(gameId, seed.id) : seed.id;
    if (npcs.some((n) => n.id === id)) ok(`npc ${id}`);
    else fail(`npc missing ${id}`);
  }

  for (const npcId of Object.keys(SAINTS_TRAIL_DIALOGUES)) {
    const id = namespaced ? trailNamespace(gameId, npcId) : npcId;
    const tree = await prisma.npcDialogueTree.findUnique({ where: { npcId: id } });
    if (tree) ok(`dialogue ${id}`);
    else fail(`dialogue missing ${id}`);
  }

  for (const q of SAINTS_TRAIL_QUEST_CHAIN) {
    const slug = namespaced ? trailNamespace(gameId, q.slug) : q.slug;
    const row = await prisma.questTemplate.findUnique({
      where: { slug },
      include: { objectives: true },
    });
    if (!row) {
      fail(`quest missing ${slug}`);
      continue;
    }
    if (row.gameId !== gameId) fail(`quest ${slug} gameId=${row.gameId}`);
    else if (row.objectives.length !== q.objectives.length) {
      fail(`quest ${slug} objectives ${row.objectives.length}≠${q.objectives.length}`);
    } else ok(`quest ${slug} (${row.objectives.length} stages)`);
  }

  const gather = namespaced
    ? trailNamespace(gameId, "quest_tools_of_trade")
    : "quest_tools_of_trade";
  const g = await prisma.questTemplate.findUnique({
    where: { slug: gather },
    include: { objectives: true },
  });
  const gatherTypes = g?.objectives.map((o) => o.type) || [];
  if (gatherTypes.includes("GATHER")) ok(`gather quest ${gather} has GATHER`);
  else fail(`gather quest ${gather} missing GATHER objectives`);
}

async function checkSprites() {
  console.log("\n[sprites]");
  const root = path.join(process.cwd(), "public/game-assets/npc");
  for (const n of SAINTS_TRAIL_NPCS) {
    const file = path.join(root, `${n.sprite}.png`);
    if (fs.existsSync(file)) ok(`sprite ${n.sprite}.png`);
    else fail(`sprite missing ${n.sprite}.png`);
  }
}

async function main() {
  console.log("Saints Trail smoke…");
  await checkSprites();
  await checkProfile(SAINTS_TRAIL_GAME_ID, SAINTS_TRAIL_MAP_ID, false);

  const cloneSlug = process.env.SMOKE_CLONE_SLUG;
  if (cloneSlug) {
    await checkProfile(cloneSlug, `${cloneSlug.toUpperCase()}_TRAIL`, true);
  }

  console.log(`\n${oks.length} ok, ${fails.length} fail`);
  if (fails.length) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
