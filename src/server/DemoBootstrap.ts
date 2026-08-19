import { prisma } from "@/web/lib/prisma";
import { invalidateMapCache } from "@/shared/game/mapCache";
import { FALLBACK_CREATURE_DEFS } from "@/shared/game/creatureCatalog";
import {
  DEMO_ENCOUNTERS,
  DEMO_LOGIC_TILES,
  DEMO_MAP_H,
  DEMO_MAP_ID,
  DEMO_MAP_NPCS,
  DEMO_MAP_W,
  DEFAULT_STUDIO_TILESETS,
  buildDemoSandboxGrid,
  buildLobbyGrid,
  buildTrainingGroundsGrid,
  buildCrystalCavernsGrid,
  buildSaintsHavenGrid,
  buildWildMeadowsGrid,
  buildQuarryMineGrid,
  buildTrainingArenaGrid,
  buildDungeonCryptsGrid,
  buildDefaultGroundLayer,
  fillZeroGidsInLayers,
  upgradeLegacyGroundGids,
  needsStudioTilesetBootstrap,
} from "./demoMapSeed";
import { SAINTS_TRAIL_GAME_ID, SAINTS_TRAIL_NPCS, SAINTS_TRAIL_QUEST_CHAIN, SAINTS_TRAIL_DIALOGUES } from "./saintsTrailQuests";
import { EXPANSION_QUESTS } from "./expansionQuests";
import { getSystemSetupStatus } from "@/shared/game/setup/setupDetection";

import { invalidateLogicTilesCache } from "@/shared/game/mapCache";

const VANCE_TREE = {
  node_start: {
    text: "Out here, nature yields only to those with the right edge. Take this kit — chop, dig, craft film, bond a companion, then clear the north bramble for Aethervale.",
    options: [
      {
        label: "Take the Starter Toolbelt",
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
    text: "Rook Hatchet and Crude Pickaxe are yours. Finish the plaza Trail first — after you spar the Tutor, gather unlocks southeast (THREE Wood Logs, then THREE Copper Ore). Report progress here when both are done.",
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
    // Shared across world profiles until Studio scopes a species
    gameId: null as string | null,
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
  invalidateLogicTilesCache();
  console.log(`[DemoBootstrap] MapLogicTile × ${DEMO_LOGIC_TILES.length}`);
}

async function seedDemoMap() {
  const forceMap = process.env.FORCE_DEMO_MAP === "1";
  const grid = buildDemoSandboxGrid();
  const encounters = DEMO_ENCOUNTERS;
  const gridJson = JSON.stringify(grid);
  const encountersJson = JSON.stringify(encounters);
  const existing = await prisma.worldMap.findUnique({ where: { id: DEMO_MAP_ID } });

  // Merge Trail NPCs into npcsData (create-missing); preserve Studio placements.
  let npcs: Array<Record<string, unknown>> = [];
  if (existing?.npcsData && !forceMap) {
    try {
      npcs = JSON.parse(existing.npcsData || "[]");
    } catch {
      npcs = [];
    }
  }
  const seeds = [...SAINTS_TRAIL_NPCS, ...DEMO_MAP_NPCS];
  for (const seed of seeds) {
    if (!npcs.some((n) => n.id === seed.id)) npcs.push({ ...seed });
  }
  const npcsJson = JSON.stringify(npcs);

  // Studio visual paint needs tileLayers + tilesets. Legacy DEMO rows often have [].
  // Nearly-empty Ground (all zeros / a few brush tests) still renders black in Babylon.
  const needsRich = !existing || needsStudioTilesetBootstrap(
    existing.tileLayersData,
    existing.tilesetsData
  );
  let tileLayersJson = JSON.stringify([buildDefaultGroundLayer(grid)]);
  if (needsRich && existing?.tileLayersData) {
    try {
      const parsed = JSON.parse(existing.tileLayersData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Preserve painted GIDs; upgrade legacy stair fill / fill zeros with grass.
        const upgraded = upgradeLegacyGroundGids(fillZeroGidsInLayers(parsed));
        tileLayersJson = JSON.stringify(upgraded);
      }
    } catch {
      // keep default ground
    }
  }
  const tilesetsJson = JSON.stringify(DEFAULT_STUDIO_TILESETS);

  if (!existing) {
    // If other maps exist in the database (i.e. author created custom maps and deleted DEMO_SANDBOX),
    // do not force-recreate DEMO_SANDBOX unless FORCE_DEMO_MAP is explicitly enabled.
    const totalMapsCount = await prisma.worldMap.count();
    if (totalMapsCount > 0 && !forceMap) {
      console.log("[DemoBootstrap] Custom maps exist; skipping DEMO_SANDBOX recreate.");
      return;
    }

    await prisma.worldMap.create({
      data: {
        id: DEMO_MAP_ID,
        gameId: SAINTS_TRAIL_GAME_ID,
        name: "Saints Trail Sandbox",
        gridData: gridJson,
        gatesData: "{}",
        npcsData: npcsJson,
        encountersData: encountersJson,
        tileLayersData: tileLayersJson,
        tilesetsData: tilesetsJson,
      },
    });
  } else if (forceMap) {
    await prisma.worldMap.update({
      where: { id: DEMO_MAP_ID },
      data: {
        gameId: SAINTS_TRAIL_GAME_ID,
        name: "Saints Trail Sandbox",
        gridData: gridJson,
        npcsData: npcsJson,
        encountersData: encountersJson,
        tileLayersData: tileLayersJson,
        tilesetsData: tilesetsJson,
        version: { increment: 1 },
      },
    });
  } else if (needsRich) {
    // Backfill visual layers/tilesets only — never clobber an existing Studio paint.
    await prisma.worldMap.update({
      where: { id: DEMO_MAP_ID },
      data: {
        gameId: SAINTS_TRAIL_GAME_ID,
        npcsData: npcsJson,
        tileLayersData: tileLayersJson,
        tilesetsData: tilesetsJson,
        version: { increment: 1 },
      },
    });
  } else {
    // Heal empty / missing logic grid (meta width fell back to 24 while Ground is 30×30).
    let healGrid = false;
    try {
      const parsed = JSON.parse(existing.gridData || "[]");
      healGrid = !Array.isArray(parsed) || parsed.length === 0;
    } catch {
      healGrid = true;
    }
    await prisma.worldMap.update({
      where: { id: DEMO_MAP_ID },
      data: {
        gameId: SAINTS_TRAIL_GAME_ID,
        npcsData: npcsJson,
        ...(healGrid ? { gridData: gridJson } : {}),
        version: { increment: 1 },
      },
    });
    if (healGrid) {
      await prisma.gameMap.updateMany({
        where: { id: DEMO_MAP_ID },
        data: {
          width: DEMO_MAP_W,
          height: DEMO_MAP_H,
          tilesetData: gridJson,
        },
      });
      console.log(
        `[DemoBootstrap] Healed DEMO_SANDBOX empty logic grid → ${DEMO_MAP_W}x${DEMO_MAP_H}`
      );
    }
  }

  await prisma.gameMap.upsert({
    where: { id: DEMO_MAP_ID },
    create: {
      id: DEMO_MAP_ID,
      name: "Saints Trail Sandbox",
      width: DEMO_MAP_W,
      height: DEMO_MAP_H,
      tilesetData: gridJson,
      npcs: npcsJson,
      encounters: encountersJson,
      gates: "{}",
    },
    update: forceMap
      ? {
          name: "Saints Trail Sandbox",
          width: DEMO_MAP_W,
          height: DEMO_MAP_H,
          tilesetData: gridJson,
          npcs: npcsJson,
          encounters: encountersJson,
        }
      : { npcs: npcsJson },
  });

  if (typeof invalidateMapCache === "function") {
    invalidateMapCache(DEMO_MAP_ID);
  }
  console.log(
    `[DemoBootstrap] DEMO_SANDBOX ready (gameId=${SAINTS_TRAIL_GAME_ID}, forceMap=${forceMap}, tilesetBootstrap=${needsRich})`
  );
}

async function seedLobbyMap() {
  const LOBBY_MAP_ID = "LOBBY";
  const forceMap = process.env.FORCE_DEMO_MAP === "1";
  const existing = await prisma.worldMap.findUnique({ where: { id: LOBBY_MAP_ID } });

  const grid = buildLobbyGrid(64, 64);
  const gridJson = JSON.stringify(grid);
  const npcsJson = "[]";
  const encountersJson = "[]";
  const tileLayersJson = JSON.stringify([buildDefaultGroundLayer(grid)]);
  const tilesetsJson = JSON.stringify(DEFAULT_STUDIO_TILESETS);

  if (!existing || forceMap) {
    const data = {
      gameId: SAINTS_TRAIL_GAME_ID,
      name: "Saints Gaming Lobby",
      gridData: gridJson,
      gatesData: "{}",
      npcsData: npcsJson,
      encountersData: encountersJson,
      tileLayersData: tileLayersJson,
      tilesetsData: tilesetsJson,
    };

    if (!existing) {
      await prisma.worldMap.create({ data: { id: LOBBY_MAP_ID, ...data } });
    } else {
      await prisma.worldMap.update({ where: { id: LOBBY_MAP_ID }, data });
    }

    await prisma.gameMap.upsert({
      where: { id: LOBBY_MAP_ID },
      create: {
        id: LOBBY_MAP_ID,
        name: data.name,
        width: 64,
        height: 64,
        tilesetData: gridJson,
        npcs: npcsJson,
        encounters: encountersJson,
        gates: "{}",
      },
      update: {
        name: data.name,
        width: 64,
        height: 64,
        tilesetData: gridJson,
        npcs: npcsJson,
        encounters: encountersJson,
      },
    });

    if (typeof invalidateMapCache === "function") {
      invalidateMapCache(LOBBY_MAP_ID);
    }
    console.log(`[DemoBootstrap] LOBBY map ready (forceMap=${forceMap})`);
  } else {
    console.log(`[DemoBootstrap] LOBBY map already exists`);
  }
}

async function seedExpansionMaps() {
  const force = process.env.FORCE_DEMO_MAP === "1";

  // 1. SAINTS_HAVEN — Central 40x40 Hub & Portal Gateway
  const havenGrid = buildSaintsHavenGrid();
  const existingHaven = await prisma.worldMap.findUnique({ where: { id: "SAINTS_HAVEN" } });
  if (!existingHaven || force) {
    const havenData = {
      gameId: SAINTS_TRAIL_GAME_ID,
      name: "Saints Haven",
      gridData: JSON.stringify(havenGrid),
      gatesData: JSON.stringify([
        { id: "gate_north", position: { x: 20, y: 1 }, targetMapId: "WILD_MEADOWS", spawnPoint: { x: 18, y: 33 }, category: "ATLAS_NORTH" },
        { id: "gate_east", position: { x: 38, y: 20 }, targetMapId: "QUARRY_MINE", spawnPoint: { x: 2, y: 16 }, category: "ATLAS_EAST" },
        { id: "gate_south", position: { x: 20, y: 38 }, targetMapId: "TRAINING_ARENA", spawnPoint: { x: 15, y: 2 }, category: "ATLAS_SOUTH" },
        { id: "gate_west", position: { x: 1, y: 20 }, targetMapId: "DUNGEON_CRYPTS", spawnPoint: { x: 16, y: 28 }, category: "DUNGEON" },
        { id: "gate_portal", position: { x: 20, y: 15 }, targetMapId: "DEMO_SANDBOX", spawnPoint: { x: 14, y: 15 }, category: "PORTAL" },
      ]),
      npcsData: JSON.stringify([
        { id: "haven_vance", name: "Warden Vance", x: 20, y: 18, sprite: "adventurer", dialogue: ["Welcome to Saints Haven! Explore the 4 realms via the cardinal gates."] },
        { id: "haven_oakwood", name: "Prof. Oakwood", x: 16, y: 20, sprite: "alchemist", dialogue: ["Choose your starter companion at the lab, then venture north into the Wild Meadows."] },
      ]),
      encountersData: JSON.stringify([]),
      tileLayersData: JSON.stringify([buildDefaultGroundLayer(havenGrid)]),
      tilesetsData: JSON.stringify(DEFAULT_STUDIO_TILESETS),
      biome: "town",
      weatherType: "clear",
      recommendedLevel: 1,
      lightingPreset: "day",
      description: "The grand central hub of Saints Realm. Connects to all four cardinal territories.",
    };
    if (!existingHaven) {
      await prisma.worldMap.create({ data: { id: "SAINTS_HAVEN", ...havenData } });
    } else {
      await prisma.worldMap.update({ where: { id: "SAINTS_HAVEN" }, data: havenData });
    }
  }

  // 2. WILD_MEADOWS — 36x36 Wildlife & Gathering Zone
  const meadowsGrid = buildWildMeadowsGrid();
  const existingMeadows = await prisma.worldMap.findUnique({ where: { id: "WILD_MEADOWS" } });
  if (!existingMeadows || force) {
    const meadowsData = {
      gameId: SAINTS_TRAIL_GAME_ID,
      name: "Wild Meadows",
      gridData: JSON.stringify(meadowsGrid),
      gatesData: JSON.stringify([
        { id: "gate_south", position: { x: 18, y: 34 }, targetMapId: "SAINTS_HAVEN", spawnPoint: { x: 20, y: 2 }, category: "ATLAS_SOUTH" },
      ]),
      npcsData: JSON.stringify([
        { id: "meadow_ranger", name: "Ranger Lyra", x: 18, y: 30, sprite: "heroine", dialogue: ["Tall grass is teeming with wild souls. Use standard film and weaken them before capturing!"] },
      ]),
      encountersData: JSON.stringify([
        { speciesSlug: "nutria", weight: 35, minLevel: 1, maxLevel: 4 },
        { speciesSlug: "flowrunt", weight: 30, minLevel: 1, maxLevel: 4 },
        { speciesSlug: "squidoodle", weight: 20, minLevel: 3, maxLevel: 6 },
        { speciesSlug: "rockitten", weight: 15, minLevel: 5, maxLevel: 8 },
      ]),
      tileLayersData: JSON.stringify([buildDefaultGroundLayer(meadowsGrid)]),
      tilesetsData: JSON.stringify(DEFAULT_STUDIO_TILESETS),
      biome: "forest",
      weatherType: "rain_gentle",
      recommendedLevel: 1,
      lightingPreset: "day",
      description: "Lush grasslands and ancient groves rich with diverse wild companion species.",
    };
    if (!existingMeadows) {
      await prisma.worldMap.create({ data: { id: "WILD_MEADOWS", ...meadowsData } });
    } else {
      await prisma.worldMap.update({ where: { id: "WILD_MEADOWS" }, data: meadowsData });
    }
  }

  // 3. QUARRY_MINE — 32x32 Industrial Mining & Hero Spawner Zone
  const quarryGrid = buildQuarryMineGrid();
  const existingQuarry = await prisma.worldMap.findUnique({ where: { id: "QUARRY_MINE" } });
  if (!existingQuarry || force) {
    const quarryData = {
      gameId: SAINTS_TRAIL_GAME_ID,
      name: "Quarry Mine",
      gridData: JSON.stringify(quarryGrid),
      gatesData: JSON.stringify([
        { id: "gate_west", position: { x: 1, y: 16 }, targetMapId: "SAINTS_HAVEN", spawnPoint: { x: 37, y: 20 }, category: "ATLAS_WEST" },
        { id: "gate_shaft", position: { x: 30, y: 16 }, targetMapId: "CRYSTAL_CAVERNS", spawnPoint: { x: 12, y: 6 }, category: "MINE" },
      ]),
      npcsData: JSON.stringify([
        { id: "quarry_foreman", name: "Foreman Stone", x: 6, y: 16, sprite: "warrior", dialogue: ["Strike the copper and iron veins with your pickaxe. Watch out for rock spiders in the north shafts!"] },
      ]),
      encountersData: JSON.stringify([
        { speciesSlug: "rockitten", weight: 80, minLevel: 4, maxLevel: 9 },
      ]),
      tileLayersData: JSON.stringify([buildDefaultGroundLayer(quarryGrid)]),
      tilesetsData: JSON.stringify(DEFAULT_STUDIO_TILESETS),
      biome: "cave",
      weatherType: "clear",
      recommendedLevel: 3,
      lightingPreset: "cave",
      description: "A bustling canyon quarry with rich mineral veins and cavern passages.",
    };
    if (!existingQuarry) {
      await prisma.worldMap.create({ data: { id: "QUARRY_MINE", ...quarryData } });
    } else {
      await prisma.worldMap.update({ where: { id: "QUARRY_MINE" }, data: quarryData });
    }
  }

  // 4. TRAINING_ARENA — 30x30 Hero Battles & Dueling Colosseum
  const arenaGrid = buildTrainingArenaGrid();
  const existingArena = await prisma.worldMap.findUnique({ where: { id: "TRAINING_ARENA" } });
  if (!existingArena || force) {
    const arenaData = {
      gameId: SAINTS_TRAIL_GAME_ID,
      name: "Training Arena",
      gridData: JSON.stringify(arenaGrid),
      gatesData: JSON.stringify([
        { id: "gate_north", position: { x: 15, y: 1 }, targetMapId: "SAINTS_HAVEN", spawnPoint: { x: 20, y: 37 }, category: "ATLAS_NORTH" },
      ]),
      npcsData: JSON.stringify([
        { id: "arena_master", name: "Grandmaster Jax", x: 15, y: 8, sprite: "dragonrider", dialogue: ["Step into the ring to test your Armor Class (AC) and d20 weapon strikes!"] },
      ]),
      encountersData: JSON.stringify([]),
      tileLayersData: JSON.stringify([buildDefaultGroundLayer(arenaGrid)]),
      tilesetsData: JSON.stringify(DEFAULT_STUDIO_TILESETS),
      biome: "desert",
      weatherType: "clear",
      recommendedLevel: 2,
      lightingPreset: "day",
      description: "A sun-baked arena for practicing d20 combat rolls and companion sparring.",
    };
    if (!existingArena) {
      await prisma.worldMap.create({ data: { id: "TRAINING_ARENA", ...arenaData } });
    } else {
      await prisma.worldMap.update({ where: { id: "TRAINING_ARENA" }, data: arenaData });
    }
  }

  // 5. DUNGEON_CRYPTS — 32x32 Shadow Crypts & Boss Chamber
  const cryptsGrid = buildDungeonCryptsGrid();
  const existingCrypts = await prisma.worldMap.findUnique({ where: { id: "DUNGEON_CRYPTS" } });
  if (!existingCrypts || force) {
    const cryptsData = {
      gameId: SAINTS_TRAIL_GAME_ID,
      name: "Dungeon Crypts",
      gridData: JSON.stringify(cryptsGrid),
      gatesData: JSON.stringify([
        { id: "gate_exit", position: { x: 16, y: 29 }, targetMapId: "SAINTS_HAVEN", spawnPoint: { x: 2, y: 20 }, category: "DUNGEON" },
      ]),
      npcsData: JSON.stringify([]),
      encountersData: JSON.stringify([
        { speciesSlug: "rockitten", weight: 50, minLevel: 6, maxLevel: 12 },
        { speciesSlug: "squidoodle", weight: 50, minLevel: 6, maxLevel: 12 },
      ]),
      tileLayersData: JSON.stringify([buildDefaultGroundLayer(cryptsGrid)]),
      tilesetsData: JSON.stringify(DEFAULT_STUDIO_TILESETS),
      biome: "dungeon",
      weatherType: "clear",
      recommendedLevel: 5,
      lightingPreset: "night",
      description: "Ancient subterranean crypts harboring high-tier boss monsters and relic rewards.",
      entryRequirements: JSON.stringify({ minLevel: 5 }),
    };
    if (!existingCrypts) {
      await prisma.worldMap.create({ data: { id: "DUNGEON_CRYPTS", ...cryptsData } });
    } else {
      await prisma.worldMap.update({ where: { id: "DUNGEON_CRYPTS" }, data: cryptsData });
    }
  }

  // Legacy expansion maps
  const tgGrid = buildTrainingGroundsGrid();
  const ccGrid = buildCrystalCavernsGrid();
  const existingTg = await prisma.worldMap.findUnique({ where: { id: "TRAINING_GROUNDS" } });
  if (!existingTg) {
    await prisma.worldMap.create({
      data: {
        id: "TRAINING_GROUNDS",
        gameId: SAINTS_TRAIL_GAME_ID,
        name: "Training Grounds",
        gridData: JSON.stringify(tgGrid),
        gatesData: JSON.stringify({ 1: { targetMapId: "DEMO_SANDBOX", spawnPoint: { x: 15, y: 15 } } }),
        npcsData: JSON.stringify([{ id: "npc_tutor_1", name: "Combat Tutor", x: 10, y: 10, sprite: "disciple" }]),
        encountersData: JSON.stringify([{ speciesSlug: "rockitten", weight: 1, minLevel: 1, maxLevel: 3 }]),
        tileLayersData: JSON.stringify([buildDefaultGroundLayer(tgGrid)]),
        tilesetsData: JSON.stringify(DEFAULT_STUDIO_TILESETS),
        biome: "town",
        weatherType: "clear",
        recommendedLevel: 1,
        lightingPreset: "day",
        description: "An open arena where aspiring fighters hone their craft.",
      },
    });
  }

  const existingCc = await prisma.worldMap.findUnique({ where: { id: "CRYSTAL_CAVERNS" } });
  if (!existingCc) {
    await prisma.worldMap.create({
      data: {
        id: "CRYSTAL_CAVERNS",
        gameId: SAINTS_TRAIL_GAME_ID,
        name: "Crystal Caverns",
        gridData: JSON.stringify(ccGrid),
        gatesData: JSON.stringify({ 1: { targetMapId: "DEMO_SANDBOX", spawnPoint: { x: 20, y: 20 } } }),
        npcsData: JSON.stringify([]),
        encountersData: JSON.stringify([{ speciesSlug: "rockitten", weight: 1, minLevel: 3, maxLevel: 8 }]),
        tileLayersData: JSON.stringify([buildDefaultGroundLayer(ccGrid)]),
        tilesetsData: JSON.stringify(DEFAULT_STUDIO_TILESETS),
        biome: "cave",
        weatherType: "clear",
        recommendedLevel: 5,
        lightingPreset: "cave",
        description: "Ancient tunnels rich with ore. Bramble and shadow creatures guard the depths.",
        entryRequirements: JSON.stringify({ minLevel: 3 }),
      },
    });
  }
}

async function seedDemoQuests() {
  const force = process.env.FORCE_TRAIL_SEED === "1" || process.env.FORCE_QUEST_SEED === "1";
  let created = 0;
  for (const q of SAINTS_TRAIL_QUEST_CHAIN) {
    const existing = await prisma.questTemplate.findUnique({
      where: { slug: q.slug },
    });

    if (existing && !force) {
      if ((existing as { gameId?: string }).gameId !== SAINTS_TRAIL_GAME_ID) {
        await prisma.questTemplate.update({
          where: { id: existing.id },
          data: { gameId: SAINTS_TRAIL_GAME_ID },
        });
      }
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
    } else {
      const row = await prisma.questTemplate.create({
        data: {
          slug: q.slug,
          gameId: SAINTS_TRAIL_GAME_ID,
          title: q.title,
          description: q.description,
          rewards: q.rewards,
        },
      });
      questId = row.id;
      created++;
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

  for (const q of EXPANSION_QUESTS) {
    const existing = await prisma.questTemplate.findUnique({
      where: { slug: q.slug },
    });
    const rewardsJson = JSON.stringify(q.rewards);
    if (!existing) {
      const row = await prisma.questTemplate.create({
        data: {
          slug: q.slug,
          gameId: q.gameId,
          title: q.title,
          description: q.description,
          rewards: rewardsJson,
        },
      });
      for (const obj of q.objectives) {
        await prisma.questObjective.create({
          data: {
            questId: row.id,
            stage: obj.stage,
            type: obj.type,
            targetSlug: obj.targetSlug,
            requiredQty: obj.requiredQty,
            description: obj.description,
          },
        });
      }
      created++;
    }
  }

  console.log(
    `[DemoBootstrap] Saints Trail + Expansion quests seeded (new=${created}, force=${force})`
  );
}

/**
 * Ensure MapLogicTile defs + DEMO_SANDBOX exist.
 * Safe for boot AND for map API lazy-heal when production DB was never seeded
 * (boot seed skipped / failed → empty /api/maps → Studio/lobby grass-only).
 * Concurrent callers share one in-flight promise (stampede-proof).
 */
let foundationInflight: Promise<{
  logicTiles: boolean;
  demoMap: boolean;
  error?: string;
}> | null = null;

export async function ensureStudioMapFoundation(): Promise<{
  logicTiles: boolean;
  demoMap: boolean;
  error?: string;
}> {
  if (foundationInflight) return foundationInflight;
  foundationInflight = (async () => {
    let logicTiles = false;
    let demoMap = false;
    let errStr: string | undefined;

    try {
      await seedLogicTiles();
      logicTiles = true;
    } catch (e) {
      errStr = (e as Error).message;
      console.warn("[DemoBootstrap] Logic tiles seed skipped:", errStr);
    }

    const force = process.env.FORCE_DEMO_MAP === "1";

    // Demo maps should ONLY seed when explicitly requested via FORCE_DEMO_MAP=1 or explicit Setup Wizard import.
    // Fresh installs and "no maps just assets" installs must NEVER have demo maps forced into WorldMap.
    if (!force) {
      return { logicTiles, demoMap: false, error: undefined };
    }

    try {
      await seedDemoMap();
      await seedLobbyMap();
      await seedExpansionMaps();
      demoMap = true;
    } catch (e) {
      const msg = (e as Error).message;
      console.warn("[DemoBootstrap] DEMO_SANDBOX seed skipped:", msg);
      if (!errStr) errStr = msg;
    }
    return { logicTiles, demoMap, error: errStr };
  })().finally(() => {
    foundationInflight = null;
  });
  return foundationInflight;
}

/** Idempotent demo seed — safe to run on every server boot. */
export async function bootstrapDemoContent() {
  console.log("[DemoBootstrap] Seeding demo content…");

  const foundation = await ensureStudioMapFoundation();
  if (foundation.error) {
    console.warn(
      `[DemoBootstrap] Map foundation incomplete (logic=${foundation.logicTiles}, demo=${foundation.demoMap}): ${foundation.error}`
    );
  }

  try {
    for (const def of FALLBACK_CREATURE_DEFS) {
      const payload = creatureToDb(def);
      const { gameId: _gid, ...updatePayload } = payload;
      await prisma.creatureDef.upsert({
        where: { slug: def.slug },
        create: payload,
        // Don't clobber Studio gameId scoping on every boot
        update: updatePayload,
      });
    }
    console.log(`[DemoBootstrap] CreatureDef × ${FALLBACK_CREATURE_DEFS.length}`);
  } catch (e) {
    console.warn("[DemoBootstrap] CreatureDef seed skipped:", (e as Error).message);
  }

  try {
    const forceDialogue = process.env.FORCE_TRAIL_SEED === "1";
    for (const [npcId, def] of Object.entries(SAINTS_TRAIL_DIALOGUES)) {
      const existing = await prisma.npcDialogueTree.findUnique({ where: { npcId } });
      if (existing && !forceDialogue) continue;
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
    }
    // Keep legacy VANCE_TREE export in sync if trail entry missing
    const vance = await prisma.npcDialogueTree.findUnique({
      where: { npcId: "npc_warden_vance" },
    });
    if (!vance) {
      await prisma.npcDialogueTree.create({
        data: {
          npcId: "npc_warden_vance",
          name: "Warden Vance",
          data: JSON.stringify(VANCE_TREE),
        },
      });
    }
    console.log("[DemoBootstrap] Saints Trail dialogues ready");
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
