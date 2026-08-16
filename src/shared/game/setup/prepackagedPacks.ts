/**
 * Prepackaged World Asset & Starter Map Pack Management Engine
 * Defines importable starter packs (Community Starter, Blank Canvas, Retro Arenas)
 * and the importer engine for fresh install onboarding.
 */

import {
  DEMO_MAP_ID,
  DEMO_MAP_W,
  DEMO_MAP_H,
  DEFAULT_STUDIO_TILESETS,
  buildDemoSandboxGrid,
  buildLobbyGrid,
  buildSaintsHavenGrid,
  buildWildMeadowsGrid,
  buildQuarryMineGrid,
  buildTrainingArenaGrid,
  buildCrystalCavernsGrid,
  buildDungeonCryptsGrid,
  buildDefaultGroundLayer,
  DEMO_ENCOUNTERS,
  DEMO_MAP_NPCS,
} from '../../../server/demoMapSeed';
import { SAINTS_TRAIL_GAME_ID, SAINTS_TRAIL_NPCS } from '../../../server/saintsTrailQuests';
import { FALLBACK_CREATURE_DEFS } from '../creatureCatalog';
import { invalidateMapCache } from '../mapCache';
import { SETUP_SETTING_KEYS } from './setupDetection';

export interface StarterPackMeta {
  id: string;
  name: string;
  tagline: string;
  description: string;
  recommended: boolean;
  badge?: string;
  features: string[];
  mapCount: number;
  creatureCount: number;
  theme: string;
}

export interface StarterPackManifest extends StarterPackMeta {
  maps: Array<{
    id: string;
    name: string;
    gameId: string;
    width: number;
    height: number;
    grid: number[][];
    gates?: any[];
    npcs?: any[];
    encounters?: any[];
    biome?: string;
    weatherType?: string;
    lightingPreset?: string;
    description?: string;
  }>;
  creatures: Array<any>;
  items: Array<{ slug: string; name: string; category: string; stackable?: boolean }>;
  recipes: Array<{
    slug: string;
    outputItemSlug: string;
    outputQuantity: number;
    skillSlug: string;
    levelReq: number;
    xpReward: number;
    ingredients: Array<{ itemSlug: string; qty: number }>;
    timeMs: number;
  }>;
}

/**
 * Available Starter Packs Catalog
 */
export const AVAILABLE_STARTER_PACKS: StarterPackMeta[] = [
  {
    id: 'saints-community-starter',
    name: 'Saints Official Starter Realm',
    tagline: 'Complete 8-Map MMO Ecosystem with Quests, Gathering & Arenas',
    description: 'The definitive Saints Gaming world. Includes the Central Haven hub, Wild Meadows, Quarry Mines, Training Arena, Vance starter quest chain, gathering tools, film crafting, and 20+ wild creatures.',
    recommended: true,
    badge: 'Recommended',
    features: [
      '8 Interconnected World Maps (Haven, Meadows, Quarry, Arena, Dungeons)',
      'Warden Vance Tutorial & Companion Questlines',
      'Crafting Recipes for Standard Film & Starter Tools',
      'Pre-populated Wild Encounter Tables and Companion Species',
      'Full Visual Tileset Layers & Babylon Lighting Presets',
    ],
    mapCount: 8,
    creatureCount: FALLBACK_CREATURE_DEFS.length,
    theme: 'High Fantasy MMO & Creature Battler',
  },
  {
    id: 'blank-canvas',
    name: 'Blank Canvas (Clean Realm)',
    tagline: 'Pristine 0-Map World for Custom Level Design',
    description: 'Start with an empty world. Installs only the essential logic tile catalog and item blueprints, launching directly into Studio so you can build your first custom map from scratch.',
    recommended: false,
    badge: 'Custom Builder',
    features: [
      '0 Pre-seeded Maps — Complete creative control',
      'Core Engine Logic Tiles & Interaction Palette',
      'Essential Item Blueprints (Tools, Resources)',
      'Immediate Launch into Studio First-Map Creator',
    ],
    mapCount: 0,
    creatureCount: 0,
    theme: 'Custom / Sandbox',
  },
];

/**
 * Builds the manifest for the Official Community Starter Pack.
 */
export function getCommunityStarterPackManifest(): StarterPackManifest {
  const havenGrid = buildSaintsHavenGrid();
  const meadowsGrid = buildWildMeadowsGrid();
  const quarryGrid = buildQuarryMineGrid();
  const arenaGrid = buildTrainingArenaGrid();
  const demoGrid = buildDemoSandboxGrid();
  const lobbyGrid = buildLobbyGrid(64, 64);
  const cryptsGrid = buildDungeonCryptsGrid();
  const cavernsGrid = buildCrystalCavernsGrid();

  return {
    ...AVAILABLE_STARTER_PACKS[0],
    maps: [
      {
        id: 'SAINTS_HAVEN',
        name: 'Saints Haven',
        gameId: SAINTS_TRAIL_GAME_ID,
        width: 40,
        height: 40,
        grid: havenGrid,
        gates: [
          { id: 'gate_north', position: { x: 20, y: 1 }, targetMapId: 'WILD_MEADOWS', spawnPoint: { x: 18, y: 33 }, category: 'ATLAS_NORTH' },
          { id: 'gate_east', position: { x: 38, y: 20 }, targetMapId: 'QUARRY_MINE', spawnPoint: { x: 2, y: 16 }, category: 'ATLAS_EAST' },
          { id: 'gate_south', position: { x: 20, y: 38 }, targetMapId: 'TRAINING_ARENA', spawnPoint: { x: 15, y: 2 }, category: 'ATLAS_SOUTH' },
          { id: 'gate_west', position: { x: 1, y: 20 }, targetMapId: 'DUNGEON_CRYPTS', spawnPoint: { x: 16, y: 28 }, category: 'DUNGEON' },
          { id: 'gate_portal', position: { x: 20, y: 15 }, targetMapId: 'DEMO_SANDBOX', spawnPoint: { x: 14, y: 15 }, category: 'PORTAL' },
        ],
        npcs: [
          { id: 'haven_vance', name: 'Warden Vance', x: 20, y: 18, sprite: 'adventurer', dialogue: ['Welcome to Saints Haven! Explore the 4 realms via the cardinal gates.'] },
          { id: 'haven_oakwood', name: 'Prof. Oakwood', x: 16, y: 20, sprite: 'alchemist', dialogue: ['Choose your starter companion at the lab, then venture north into the Wild Meadows.'] },
        ],
        encounters: [],
        biome: 'town',
        weatherType: 'clear',
        lightingPreset: 'day',
        description: 'The grand central hub of Saints Realm.',
      },
      {
        id: 'WILD_MEADOWS',
        name: 'Wild Meadows',
        gameId: SAINTS_TRAIL_GAME_ID,
        width: 36,
        height: 36,
        grid: meadowsGrid,
        gates: [
          { id: 'gate_south', position: { x: 18, y: 34 }, targetMapId: 'SAINTS_HAVEN', spawnPoint: { x: 20, y: 2 }, category: 'ATLAS_SOUTH' },
        ],
        npcs: [
          { id: 'meadow_ranger', name: 'Ranger Lyra', x: 18, y: 30, sprite: 'heroine', dialogue: ['Tall grass is teeming with wild souls. Use standard film and weaken them before capturing!'] },
        ],
        encounters: [
          { speciesSlug: 'nutria', weight: 35, minLevel: 1, maxLevel: 4 },
          { speciesSlug: 'flowrunt', weight: 30, minLevel: 1, maxLevel: 4 },
          { speciesSlug: 'squidoodle', weight: 20, minLevel: 3, maxLevel: 6 },
          { speciesSlug: 'rockitten', weight: 15, minLevel: 5, maxLevel: 8 },
        ],
        biome: 'forest',
        weatherType: 'rain_gentle',
        lightingPreset: 'day',
        description: 'Lush grasslands and ancient groves rich with diverse wild companion species.',
      },
      {
        id: 'QUARRY_MINE',
        name: 'Quarry Mine',
        gameId: SAINTS_TRAIL_GAME_ID,
        width: 32,
        height: 32,
        grid: quarryGrid,
        gates: [
          { id: 'gate_west', position: { x: 1, y: 16 }, targetMapId: 'SAINTS_HAVEN', spawnPoint: { x: 37, y: 20 }, category: 'ATLAS_WEST' },
          { id: 'gate_shaft', position: { x: 30, y: 16 }, targetMapId: 'CRYSTAL_CAVERNS', spawnPoint: { x: 12, y: 6 }, category: 'MINE' },
        ],
        npcs: [
          { id: 'quarry_foreman', name: 'Foreman Stone', x: 6, y: 16, sprite: 'warrior', dialogue: ['Strike the copper and iron veins with your pickaxe. Watch out for rock spiders!'] },
        ],
        encounters: [
          { speciesSlug: 'rockitten', weight: 80, minLevel: 4, maxLevel: 9 },
        ],
        biome: 'cave',
        weatherType: 'clear',
        lightingPreset: 'cave',
        description: 'A bustling canyon quarry with rich mineral veins.',
      },
      {
        id: 'TRAINING_ARENA',
        name: 'Training Arena',
        gameId: SAINTS_TRAIL_GAME_ID,
        width: 30,
        height: 30,
        grid: arenaGrid,
        gates: [
          { id: 'gate_north', position: { x: 15, y: 1 }, targetMapId: 'SAINTS_HAVEN', spawnPoint: { x: 20, y: 37 }, category: 'ATLAS_NORTH' },
        ],
        npcs: [
          { id: 'arena_master', name: 'Grandmaster Jax', x: 15, y: 8, sprite: 'dragonrider', dialogue: ['Step into the ring to test your Armor Class (AC) and d20 weapon strikes!'] },
        ],
        encounters: [],
        biome: 'desert',
        weatherType: 'clear',
        lightingPreset: 'day',
        description: 'A sun-baked arena for practicing d20 combat rolls.',
      },
      {
        id: DEMO_MAP_ID,
        name: 'Saints Trail Sandbox',
        gameId: SAINTS_TRAIL_GAME_ID,
        width: DEMO_MAP_W,
        height: DEMO_MAP_H,
        grid: demoGrid,
        gates: [],
        npcs: [...SAINTS_TRAIL_NPCS, ...DEMO_MAP_NPCS],
        encounters: DEMO_ENCOUNTERS,
        biome: 'forest',
        weatherType: 'clear',
        lightingPreset: 'day',
        description: 'Foundational starter sandbox map.',
      },
      {
        id: 'LOBBY',
        name: 'Saints Gaming Lobby',
        gameId: SAINTS_TRAIL_GAME_ID,
        width: 64,
        height: 64,
        grid: lobbyGrid,
        gates: [],
        npcs: [],
        encounters: [],
        biome: 'town',
        weatherType: 'clear',
        lightingPreset: 'day',
        description: 'Grand multiplayer lobby.',
      },
      {
        id: 'DUNGEON_CRYPTS',
        name: 'Dungeon Crypts',
        gameId: SAINTS_TRAIL_GAME_ID,
        width: 32,
        height: 32,
        grid: cryptsGrid,
        gates: [
          { id: 'gate_exit', position: { x: 16, y: 30 }, targetMapId: 'SAINTS_HAVEN', spawnPoint: { x: 2, y: 20 }, category: 'ATLAS_EAST' },
        ],
        npcs: [
          { id: 'crypt_guardian', name: 'Crypt Guardian', x: 16, y: 10, sprite: 'paladin', dialogue: ['Dark creatures lurk in the catacombs below. Steel your heart!'] },
        ],
        encounters: [],
        biome: 'dungeon',
        weatherType: 'clear',
        lightingPreset: 'dungeon',
        description: 'Ancient underground crypts teeming with heroic boss challenges.',
      },
      {
        id: 'CRYSTAL_CAVERNS',
        name: 'Crystal Caverns',
        gameId: SAINTS_TRAIL_GAME_ID,
        width: 28,
        height: 28,
        grid: cavernsGrid,
        gates: [
          { id: 'gate_surface', position: { x: 12, y: 4 }, targetMapId: 'QUARRY_MINE', spawnPoint: { x: 28, y: 16 }, category: 'MINE' },
        ],
        npcs: [
          { id: 'cavern_geomancer', name: 'Geomancer Jade', x: 14, y: 14, sprite: 'mage', dialogue: ['Resonant crystal dust glows in the deep shafts. Gather it for high-grade soul film!'] },
        ],
        encounters: [
          { speciesSlug: 'squidoodle', weight: 50, minLevel: 6, maxLevel: 12 },
        ],
        biome: 'cave',
        weatherType: 'clear',
        lightingPreset: 'cave',
        description: 'Luminescent subterranean caverns rich in crystal geodes.',
      },
    ],
    creatures: FALLBACK_CREATURE_DEFS,
    items: [
      { slug: 'film_standard', name: 'Standard Film', category: 'CONSUMABLE' },
      { slug: 'film_fine', name: 'Fine Grain Film', category: 'CONSUMABLE' },
      { slug: 'soul_camera', name: 'Soul Camera', category: 'TOOL', stackable: false },
      { slug: 'crystal_dust', name: 'Crystal Dust', category: 'RESOURCE' },
      { slug: 'wood_log', name: 'Wood Log', category: 'RESOURCE' },
      { slug: 'ore_copper', name: 'Copper Ore', category: 'RESOURCE' },
      { slug: 'axe_bronze', name: 'Rook Hatchet', category: 'TOOL', stackable: false },
      { slug: 'pickaxe_bronze', name: 'Crude Pickaxe', category: 'TOOL', stackable: false },
    ],
    recipes: [
      {
        slug: 'craft_film_standard',
        outputItemSlug: 'film_standard',
        outputQuantity: 1,
        skillSlug: 'crafting',
        levelReq: 1,
        xpReward: 20,
        ingredients: [
          { itemSlug: 'crystal_dust', qty: 2 },
          { itemSlug: 'wood_log', qty: 1 },
        ],
        timeMs: 2000,
      },
      {
        slug: 'craft_binding_crystal',
        outputItemSlug: 'film_standard',
        outputQuantity: 1,
        skillSlug: 'crafting',
        levelReq: 1,
        xpReward: 20,
        ingredients: [
          { itemSlug: 'crystal_dust', qty: 2 },
          { itemSlug: 'wood_log', qty: 1 },
        ],
        timeMs: 2000,
      },
    ],
  };
}

/**
 * Imports a starter pack manifest into the database using Prisma.
 */
export async function importStarterPackToDb(
  prismaClient: any,
  packId: string
): Promise<{ success: boolean; importedMaps: number; importedCreatures: number; message: string }> {
  if (packId === 'blank-canvas') {
    // Blank canvas: do not insert any maps, just mark setup progress
    await prismaClient.siteSetting.upsert({
      where: { key: SETUP_SETTING_KEYS.STARTER_PACK_IMPORTED },
      create: { key: SETUP_SETTING_KEYS.STARTER_PACK_IMPORTED, value: 'blank-canvas' },
      update: { value: 'blank-canvas' },
    });
    return {
      success: true,
      importedMaps: 0,
      importedCreatures: 0,
      message: 'Blank canvas ready for custom Studio map creation.',
    };
  }

  const manifest = getCommunityStarterPackManifest();

  // 1. Insert Items & Recipes
  for (const item of manifest.items) {
    await prismaClient.itemTemplate.upsert({
      where: { slug: item.slug },
      update: { name: item.name, category: item.category },
      create: {
        slug: item.slug,
        name: item.name,
        category: item.category,
        stackable: item.stackable !== false,
      },
    }).catch((e: any) => console.warn(`[PackImport] Item ${item.slug} skip:`, e.message));
  }

  for (const recipe of manifest.recipes) {
    await prismaClient.craftingRecipe.upsert({
      where: { slug: recipe.slug },
      update: {
        outputItemSlug: recipe.outputItemSlug,
        outputQuantity: recipe.outputQuantity,
        ingredients: JSON.stringify(recipe.ingredients),
      },
      create: {
        slug: recipe.slug,
        outputItemSlug: recipe.outputItemSlug,
        outputQuantity: recipe.outputQuantity,
        skillSlug: recipe.skillSlug,
        levelReq: recipe.levelReq,
        xpReward: recipe.xpReward,
        ingredients: JSON.stringify(recipe.ingredients),
        timeMs: recipe.timeMs,
      },
    }).catch((e: any) => console.warn(`[PackImport] Recipe ${recipe.slug} skip:`, e.message));
  }

  // 2. Insert Maps
  let importedMapCount = 0;
  for (const mapDef of manifest.maps) {
    const gridJson = JSON.stringify(mapDef.grid);
    const npcsJson = JSON.stringify(mapDef.npcs || []);
    const encountersJson = JSON.stringify(mapDef.encounters || []);
    const gatesJson = JSON.stringify(mapDef.gates || []);
    const tileLayersJson = JSON.stringify([buildDefaultGroundLayer(mapDef.grid)]);
    const tilesetsJson = JSON.stringify(DEFAULT_STUDIO_TILESETS);

    await prismaClient.worldMap.upsert({
      where: { id: mapDef.id },
      create: {
        id: mapDef.id,
        gameId: mapDef.gameId,
        name: mapDef.name,
        gridData: gridJson,
        gatesData: gatesJson,
        npcsData: npcsJson,
        encountersData: encountersJson,
        tileLayersData: tileLayersJson,
        tilesetsData: tilesetsJson,
        biome: mapDef.biome || 'town',
        weatherType: mapDef.weatherType || 'clear',
        lightingPreset: mapDef.lightingPreset || 'day',
        description: mapDef.description || '',
      },
      update: {
        name: mapDef.name,
        gridData: gridJson,
        gatesData: gatesJson,
        npcsData: npcsJson,
        encountersData: encountersJson,
        tileLayersData: tileLayersJson,
        tilesetsData: tilesetsJson,
      },
    });

    await prismaClient.gameMap.upsert({
      where: { id: mapDef.id },
      create: {
        id: mapDef.id,
        name: mapDef.name,
        width: mapDef.width,
        height: mapDef.height,
        tilesetData: gridJson,
        npcs: npcsJson,
        encounters: encountersJson,
        gates: gatesJson,
      },
      update: {
        name: mapDef.name,
        width: mapDef.width,
        height: mapDef.height,
        tilesetData: gridJson,
        npcs: npcsJson,
        encounters: encountersJson,
        gates: gatesJson,
      },
    });

    invalidateMapCache(mapDef.id);
    importedMapCount++;
  }

  // Set default map
  await prismaClient.siteSetting.upsert({
    where: { key: SETUP_SETTING_KEYS.DEFAULT_MAP_ID },
    create: { key: SETUP_SETTING_KEYS.DEFAULT_MAP_ID, value: 'SAINTS_HAVEN' },
    update: { value: 'SAINTS_HAVEN' },
  });

  await prismaClient.siteSetting.upsert({
    where: { key: SETUP_SETTING_KEYS.STARTER_PACK_IMPORTED },
    create: { key: SETUP_SETTING_KEYS.STARTER_PACK_IMPORTED, value: packId },
    update: { value: packId },
  });

  return {
    success: true,
    importedMaps: importedMapCount,
    importedCreatures: manifest.creatures.length,
    message: `Successfully imported ${importedMapCount} maps and starter assets.`,
  };
}
