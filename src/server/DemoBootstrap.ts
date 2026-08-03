import { PrismaClient } from "@prisma/client";
import { FALLBACK_CREATURE_DEFS } from "@/shared/game/creatureCatalog";
import {
  DEMO_ENCOUNTERS,
  DEMO_LOGIC_TILES,
  DEMO_MAP_H,
  DEMO_MAP_ID,
  DEMO_MAP_NPCS,
  DEMO_MAP_W,
  DEMO_NPC_DIALOGUES,
  buildDemoSandboxGrid,
} from "./demoMapSeed";
import { DEMO_QUEST_CHAIN } from "./demoQuests";

const prisma = new PrismaClient();

const mapLoader = require("../engine/map-loader.js");

const VANCE_TREE = {
  node_start: {
    text: "Out here, nature yields only to those with the right edge. Take this kit — chop, dig, craft film, bond a companion, then clear the north bramble for Aethervale.",
    options: [
      {
        label: "Take the Starter Toolbelt (start Q1)",
        nextNode: "node_tools_done",
        action: "GRANT_DEMO_TOOLS",
      },
      {
        label: "Where do I get film to capture souls?",
        nextNode: "node_film",
      },
      {
        label: "Report progress / turn in",
        nextNode: "node_report",
        action: "DEMO_QUEST_REPORT",
      },
      {
        label: "Open the Professor's Lab",
        nextNode: "node_lab",
        action: "OPEN_LAB",
      },
      { label: "Goodbye.", nextNode: "exit" },
    ],
  },
  node_tools_done: {
    text: "Rook Hatchet and Crude Pickaxe are yours — Q1 is live. Southeast: chop THREE Wood Logs first, then mine THREE Copper Ore. Come back and choose Report progress when both are done.",
    options: [
      { label: "Open the Lab", nextNode: "exit", action: "OPEN_LAB" },
      { label: "Thanks, Warden.", nextNode: "exit" },
    ],
  },
  node_film: {
    text: "We don't bottle beasts in crystals anymore. You expose Standard Film with a Soul Camera — buy film at the merchant, or craft it from Crystal Dust and Wood Logs.",
    options: [
      {
        label: "Grant me a starter film pack",
        nextNode: "node_film_done",
        action: "GRANT_DEMO_FILM",
      },
      { label: "Back", nextNode: "node_start" },
    ],
  },
  node_film_done: {
    text: "Soul Camera and Standard Film — don't waste the exposures. Weaken the wildling first.",
    options: [{ label: "Understood.", nextNode: "exit" }],
  },
  node_report: {
    text: "Good. Keep gathering, crafting, bonding, and clearing that bramble when you're ready.",
    options: [{ label: "Understood.", nextNode: "exit" }],
  },
  node_lab: {
    text: "The Grove Sanctuary trial is open. Choose Solar, Bio, or Hydro — one companion for the road.",
    options: [
      { label: "Enter Lab", nextNode: "exit", action: "OPEN_LAB" },
      { label: "Later", nextNode: "exit" },
    ],
  },
};

function creatureToDb(def: (typeof FALLBACK_CREATURE_DEFS)[0]) {
  return {
    slug: def.slug,
    name: def.name,
    dexNumber: def.dexNumber,
    typePrimary: def.typePrimary,
    typeSecondary: def.typeSecondary || "None",
    spriteOverworld: def.spriteOverworld,
    spriteBattle: def.spriteBattle || null,
    spriteBack: def.spriteBack || null,
    baseHp: def.baseHp,
    physicalPower: def.physicalPower,
    physicalDefense: def.physicalDefense,
    abilityPower: def.abilityPower,
    abilityDefense: def.abilityDefense,
    combatTempo: def.combatTempo,
    catchRate: def.catchRate,
    starterLevel: def.starterLevel,
    passivesJson: JSON.stringify(def.passives || []),
    worldSkillName: def.worldSkillName || "",
    worldSkillDescription: def.worldSkillDescription || "",
    abilitiesJson: JSON.stringify(def.abilities || []),
    flavor: def.flavor || "",
    tag: def.tag || "Standard",
    tagColor: def.tagColor || "#34d399",
    stage: def.stage || "basic",
    isStarter: !!def.isStarter,
    isWildSpawn: !!def.isWildSpawn,
    isActive: def.isActive !== false,
    sortOrder: def.sortOrder || 0,
  };
}

async function seedLogicTiles() {
  for (const tile of DEMO_LOGIC_TILES) {
    await prisma.mapLogicTile.upsert({
      where: { id: tile.id },
      create: {
        id: tile.id,
        name: tile.name,
        color: tile.color,
        isSolid: tile.isSolid,
        interactable: tile.interactable,
        onInteractAction: tile.onInteractAction,
        onInteractPayload: tile.onInteractPayload,
        onStepAction: tile.onStepAction,
        onStepPayload: tile.onStepPayload,
      },
      update: {
        name: tile.name,
        color: tile.color,
        isSolid: tile.isSolid,
        interactable: tile.interactable,
        onInteractAction: tile.onInteractAction,
        onInteractPayload: tile.onInteractPayload,
        onStepAction: tile.onStepAction,
        onStepPayload: tile.onStepPayload,
      },
    });
  }
  if (typeof mapLoader.invalidateLogicTiles === "function") {
    mapLoader.invalidateLogicTiles();
  }
  console.log(`[DemoBootstrap] MapLogicTile × ${DEMO_LOGIC_TILES.length}`);
}

async function seedDemoMap() {
  const grid = buildDemoSandboxGrid();
  const npcs = DEMO_MAP_NPCS;
  const encounters = DEMO_ENCOUNTERS;
  const gridJson = JSON.stringify(grid);
  const npcsJson = JSON.stringify(npcs);
  const encountersJson = JSON.stringify(encounters);

  await prisma.worldMap.upsert({
    where: { id: DEMO_MAP_ID },
    create: {
      id: DEMO_MAP_ID,
      name: "Demo Sandbox",
      gridData: gridJson,
      gatesData: "{}",
      npcsData: npcsJson,
      encountersData: encountersJson,
    },
    update: {
      name: "Demo Sandbox",
      gridData: gridJson,
      npcsData: npcsJson,
      encountersData: encountersJson,
      version: { increment: 1 },
    },
  });

  await prisma.gameMap.upsert({
    where: { id: DEMO_MAP_ID },
    create: {
      id: DEMO_MAP_ID,
      name: "Demo Sandbox",
      width: DEMO_MAP_W,
      height: DEMO_MAP_H,
      tilesetData: gridJson,
      npcs: npcsJson,
      encounters: encountersJson,
      gates: "{}",
    },
    update: {
      name: "Demo Sandbox",
      width: DEMO_MAP_W,
      height: DEMO_MAP_H,
      tilesetData: gridJson,
      npcs: npcsJson,
      encounters: encountersJson,
    },
  });

  if (typeof mapLoader.invalidateMap === "function") {
    mapLoader.invalidateMap(DEMO_MAP_ID);
  }
  console.log("[DemoBootstrap] DEMO_SANDBOX map rewritten");

  // Drop legacy SAINTS_VILLAGE sandbox — it stranded players off DEMO_SANDBOX.
  const saintsId = "SAINTS_VILLAGE";
  await prisma.worldMap.deleteMany({ where: { id: saintsId } });
  await prisma.gameMap.deleteMany({ where: { id: saintsId } });
  if (typeof mapLoader.invalidateMap === "function") {
    mapLoader.invalidateMap(saintsId);
  }
  console.log("[DemoBootstrap] SAINTS_VILLAGE removed (use DEMO_SANDBOX)");
}

async function seedDemoQuests() {
  for (const q of DEMO_QUEST_CHAIN) {
    const existing = await prisma.questTemplate.findUnique({
      where: { slug: q.slug },
      include: { objectives: true },
    });

    let questId: string;
    if (existing) {
      await prisma.questTemplate.update({
        where: { id: existing.id },
        data: {
          title: q.title,
          description: q.description,
          rewards: q.rewards,
        },
      });
      await prisma.questObjective.deleteMany({ where: { questId: existing.id } });
      questId = existing.id;
    } else {
      const created = await prisma.questTemplate.create({
        data: {
          slug: q.slug,
          title: q.title,
          description: q.description,
          rewards: q.rewards,
        },
      });
      questId = created.id;
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
  console.log(`[DemoBootstrap] Demo quests × ${DEMO_QUEST_CHAIN.length}`);
}

/** Idempotent demo seed — safe to run on every server boot. */
export async function bootstrapDemoContent() {
  console.log("[DemoBootstrap] Seeding demo content…");

  try {
    await seedLogicTiles();
  } catch (e) {
    console.warn("[DemoBootstrap] Logic tiles seed skipped:", (e as Error).message);
  }

  try {
    await seedDemoMap();
  } catch (e) {
    console.warn("[DemoBootstrap] DEMO_SANDBOX seed skipped:", (e as Error).message);
  }

  try {
    for (const def of FALLBACK_CREATURE_DEFS) {
      await prisma.creatureDef.upsert({
        where: { slug: def.slug },
        create: creatureToDb(def),
        update: creatureToDb(def),
      });
    }
    console.log(`[DemoBootstrap] CreatureDef × ${FALLBACK_CREATURE_DEFS.length}`);
  } catch (e) {
    console.warn("[DemoBootstrap] CreatureDef seed skipped:", (e as Error).message);
  }

  try {
    await prisma.npcDialogueTree.upsert({
      where: { npcId: "npc_warden_vance" },
      create: {
        npcId: "npc_warden_vance",
        name: "Warden Vance",
        data: JSON.stringify(VANCE_TREE),
      },
      update: {
        name: "Warden Vance",
        data: JSON.stringify(VANCE_TREE),
      },
    });
    for (const [npcId, entry] of Object.entries(DEMO_NPC_DIALOGUES)) {
      await prisma.npcDialogueTree.upsert({
        where: { npcId },
        create: {
          npcId,
          name: entry.name,
          data: JSON.stringify(entry.tree),
        },
        update: {
          name: entry.name,
          data: JSON.stringify(entry.tree),
        },
      });
    }
    console.log(
      `[DemoBootstrap] Dialogue trees ready (Vance + ${Object.keys(DEMO_NPC_DIALOGUES).length} custom NPCs)`
    );
  } catch (e) {
    console.warn("[DemoBootstrap] Dialogue seed skipped:", (e as Error).message);
  }

  try {
    for (const item of [
      { slug: "film_standard", name: "Standard Film", category: "CONSUMABLE" },
      { slug: "film_fine", name: "Fine Grain Film", category: "CONSUMABLE" },
      { slug: "soul_camera", name: "Soul Camera", category: "TOOL", stackable: false },
      { slug: "crystal_dust", name: "Crystal Dust", category: "RESOURCE" },
      { slug: "wood_log", name: "Wood Log", category: "RESOURCE" },
      { slug: "ore_copper", name: "Copper Ore", category: "RESOURCE" },
      { slug: "axe_bronze", name: "Rook Hatchet", category: "TOOL", stackable: false },
      { slug: "pickaxe_bronze", name: "Crude Pickaxe", category: "TOOL", stackable: false },
    ]) {
      await prisma.itemTemplate.upsert({
        where: { slug: item.slug },
        update: { name: item.name, category: item.category },
        create: {
          slug: item.slug,
          name: item.name,
          category: item.category,
          stackable: item.stackable !== false,
        },
      });
    }

    await prisma.craftingRecipe.upsert({
      where: { slug: "craft_film_standard" },
      update: {},
      create: {
        slug: "craft_film_standard",
        outputItemSlug: "film_standard",
        outputQuantity: 1,
        skillSlug: "crafting",
        levelReq: 1,
        xpReward: 20,
        ingredients: JSON.stringify([
          { itemSlug: "crystal_dust", qty: 2 },
          { itemSlug: "wood_log", qty: 1 },
        ]),
        timeMs: 2000,
      },
    });
    await prisma.craftingRecipe.upsert({
      where: { slug: "craft_binding_crystal" },
      update: { outputItemSlug: "film_standard" },
      create: {
        slug: "craft_binding_crystal",
        outputItemSlug: "film_standard",
        outputQuantity: 1,
        skillSlug: "crafting",
        levelReq: 1,
        xpReward: 20,
        ingredients: JSON.stringify([
          { itemSlug: "crystal_dust", qty: 2 },
          { itemSlug: "wood_log", qty: 1 },
        ]),
        timeMs: 2000,
      },
    });
    console.log("[DemoBootstrap] Film items + craft recipes ready");
  } catch (e) {
    console.warn("[DemoBootstrap] Item/recipe seed skipped:", (e as Error).message);
  }

  try {
    await seedDemoQuests();
  } catch (e) {
    console.warn("[DemoBootstrap] Quest seed skipped:", (e as Error).message);
  }

  console.log("[DemoBootstrap] Done");
}

export { VANCE_TREE };
