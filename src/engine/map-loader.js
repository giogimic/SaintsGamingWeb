/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Server-Side Map Loader
 * 
 * Loads map collision grids and logic tiles from the database (Prisma).
 * Used by game-server.js for authoritative movement validation.
 * 
 * Caches maps in memory for O(1) tile lookups during physics ticks.
 */

const { PrismaClient } = require('@prisma/client');

/** Reuse Next/server singleton when present (avoids a second pool beside web/lib/prisma). */
function getPrisma() {
  const g = globalThis;
  if (g.prisma) return g.prisma;
  const client = new PrismaClient({ log: ['error'] });
  if (process.env.NODE_ENV !== 'production') g.prisma = client;
  return client;
}

const prisma = getPrisma();

// In-memory cache: mapId -> { grid, gates, npcs, dimensions }
const mapCache = {};
// Logic tiles cache: tileId -> { isSolid, interactable, ... }
let logicTilesCache = null;

/** Canonical DEMO_SANDBOX layout (keep in sync with src/server/demoMapSeed.ts). */
function buildDemoSandboxGridFallback() {
  const w = 30;
  const h = 30;
  const grid = [];
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      let tile = 0;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) tile = 1;
      else if (x === 11 && y === 14) tile = 7;
      else if (x === 11 && y === 15) tile = 9;
      else if (x >= 16 && x <= 18 && y >= 12 && y <= 14) tile = 2;
      else if (x >= 10 && x <= 20 && y >= 2 && y <= 8) tile = 2;
      else if (y === 10 && x >= 12 && x <= 16) tile = 11;
      else if (x >= 20 && y >= 18 && x <= 27 && y <= 27) tile = (x + y) % 2 === 0 ? 5 : 6;
      row.push(tile);
    }
    grid.push(row);
  }
  return grid;
}

/**
 * Load a map's collision data from the database.
 * Uses the unified SaintsMap table.
 * 
 * @param {string} mapId - The map identifier (SaintsMap.slug)
 * @returns {Promise<object>} The parsed map data with grid, gates, npcs, dimensions
 */
async function loadMapData(mapId) {
  if (mapCache[mapId]) {
    return mapCache[mapId];
  }

  try {
    // Primary: WorldMap (campaign migration target)
    const worldMap = await prisma.worldMap.findUnique({ where: { id: mapId } });
    if (worldMap) {
      const grid = JSON.parse(worldMap.gridData || '[]');
      const npcs = JSON.parse(worldMap.npcsData || '[]');
      const gates = JSON.parse(worldMap.gatesData || '{}');
      const encounters = JSON.parse(worldMap.encountersData || '[]');
      const height = Array.isArray(grid) ? grid.length : 20;
      const width = Array.isArray(grid?.[0]) ? grid[0].length : 20;

      const data = {
        id: worldMap.id,
        name: worldMap.name,
        grid,
        gates,
        npcs,
        encountersData: encounters,
        tileLayers: JSON.parse(worldMap.tileLayersData || '[]'),
        tilesets: JSON.parse(worldMap.tilesetsData || '[]'),
        width,
        height,
      };
      mapCache[mapId] = data;
      console.log(`[MapLoader] Loaded WorldMap "${mapId}" (${data.width}x${data.height})`);
      return data;
    }

    const gameMap = await prisma.gameMap.findUnique({ where: { id: mapId } });
    if (gameMap) {
      const grid = JSON.parse(gameMap.tilesetData || '[]');
      const npcs = JSON.parse(gameMap.npcs || '[]');
      const gates = JSON.parse(gameMap.gates || '{}');
      const encounters = JSON.parse(gameMap.encounters || '[]');

      const data = {
        id: gameMap.id,
        name: gameMap.name,
        grid,
        gates,
        npcs,
        encountersData: encounters,
        width: gameMap.width,
        height: gameMap.height,
      };
      mapCache[mapId] = data;
      console.log(`[MapLoader] Loaded GameMap "${mapId}" (${data.width}x${data.height})`);
      return data;
    }
    
    // Fallback if map not found (create empty fallback in memory)
    console.warn(`[MapLoader] Map "${mapId}" not found in DB. Falling back to blank map.`);
    let grid = Array(20).fill(null).map(() => Array(20).fill(0));
    let npcs = [];
    let width = 20;
    let height = 20;

    // Auto-seed walkable DEMO_SANDBOX / SAINTS_VILLAGE if missing from DB
    if (mapId === 'SAINTS_VILLAGE' || mapId === 'DEMO_SANDBOX') {
      width = 30;
      height = 30;
      grid = buildDemoSandboxGridFallback();
      npcs = [{ id: "npc_guide_1", templateId: "Villager", name: "Guide", x: 15, y: 15, sprite: "npc_default", direction: "down" }];
      const encounters = [{ speciesSlug: "rockitten", weight: 1, minLevel: 3, maxLevel: 5 }];

      prisma.gameMap.upsert({
        where: { id: mapId },
        update: {
          tilesetData: JSON.stringify(grid),
          npcs: JSON.stringify(npcs),
          encounters: JSON.stringify(encounters),
          width,
          height,
        },
        create: {
          id: mapId,
          name: mapId === 'DEMO_SANDBOX' ? 'Demo Sandbox' : 'Saints Village Sandbox',
          width,
          height,
          tilesetData: JSON.stringify(grid),
          npcs: JSON.stringify(npcs),
          encounters: JSON.stringify(encounters),
        }
      }).catch(err => console.error(`[MapLoader] Failed to auto-seed ${mapId}:`, err.message));
    }

    mapCache[mapId] = {
      id: mapId,
      name: mapId === 'DEMO_SANDBOX' ? 'Demo Sandbox' : (mapId === 'SAINTS_VILLAGE' ? 'Saints Village Sandbox' : 'Unknown'),
      grid,
      gates: {},
      npcs,
      encountersData: [{ speciesSlug: "rockitten", weight: 1, minLevel: 3, maxLevel: 5 }],
      width,
      height,
    };
    return mapCache[mapId];

  } catch (err) {
    console.error(`[MapLoader] Error loading map "${mapId}":`, err.message);
    // Return a safe blank map so the server stays alive
    const blankGrid = Array(24).fill(null).map(() => Array(24).fill(0));
    const data = {
      id: mapId,
      name: mapId,
      grid: blankGrid,
      gates: {},
      npcs: [],
      width: 24,
      height: 24,
    };
    mapCache[mapId] = data;
    return data;
  }
}

/**
 * Load all logic tiles from the MapLogicTile table.
 * Cached on first call.
 * 
 * @returns {Promise<Record<number, object>>} Map of tileId -> tile properties
 */
async function loadLogicTiles() {
  if (logicTilesCache) return logicTilesCache;

  try {
    const tiles = await prisma.mapLogicTile.findMany();
    logicTilesCache = {};
    for (const tile of tiles) {
      logicTilesCache[tile.id] = {
        id: tile.id,
        name: tile.name,
        isSolid: tile.isSolid,
        interactable: tile.interactable,
        onInteractAction: tile.onInteractAction,
        onStepAction: tile.onStepAction,
      };
    }
    console.log(`[MapLoader] Loaded ${tiles.length} logic tiles from DB.`);
    return logicTilesCache;
  } catch (err) {
    console.error('[MapLoader] Error loading logic tiles:', err.message);
    logicTilesCache = {};
    return logicTilesCache;
  }
}

/**
 * Check if a tile at (x, y) on a given map is walkable.
 * 
 * @param {string} mapId - The map identifier
 * @param {number} x - Column (0-indexed)
 * @param {number} y - Row (0-indexed)
 * @returns {Promise<boolean>} True if walkable
 */
async function isWalkable(mapId, x, y) {
  const map = await loadMapData(mapId);
  const logicTiles = await loadLogicTiles();

  // Bounds check
  if (x < 0 || x >= map.width || y < 0 || y >= map.height) {
    return false;
  }

  // Get the tile ID from the collision grid
  const tileId = map.grid[y]?.[x];
  if (tileId === undefined || tileId === null) {
    return false;
  }

  // Check if the logic tile is solid
  const logicTile = logicTiles[tileId];
  if (logicTile?.isSolid) {
    return false;
  }

  return true;
}

/**
 * Synchronous version of isWalkable — only works after the map is cached.
 * Use this inside the server tick loop for performance.
 * 
 * @param {string} mapId 
 * @param {number} x 
 * @param {number} y 
 * @returns {boolean}
 */
function isWalkableSync(mapId, x, y) {
  const map = mapCache[mapId];
  if (!map) return false;

  if (x < 0 || x >= map.width || y < 0 || y >= map.height) {
    return false;
  }

  const tileId = map.grid[y]?.[x];
  if (tileId === undefined || tileId === null) {
    return false;
  }

  const logicTile = logicTilesCache?.[tileId];
  if (logicTile?.isSolid) {
    return false;
  }

  return true;
}

/**
 * Get the dimensions of a cached map.
 * 
 * @param {string} mapId 
 * @returns {{ width: number, height: number } | null}
 */
function getMapDimensions(mapId) {
  const map = mapCache[mapId];
  if (!map) return { width: 0, height: 0 };
  return { width: map.width, height: map.height };
}

/**
 * Get the cached map data (grid, gates, npcs).
 * Returns null if not cached yet.
 * 
 * @param {string} mapId 
 * @returns {object | null}
 */
function getCachedMap(mapId) {
  return mapCache[mapId] || null;
}

/** Alias used by InventoryManager / gather handlers. */
function getMapDataSync(mapId) {
  return getCachedMap(mapId);
}

/**
 * Mutate a live cached tile (e.g. CLEAR_BRAMBLE). Returns false if map not cached.
 */
function setCachedTile(mapId, x, y, tileId) {
  const map = mapCache[mapId];
  if (!map || !map.grid || !map.grid[y] || map.grid[y][x] === undefined) return false;
  map.grid[y][x] = tileId;
  return true;
}

/**
 * Invalidate a cached map (e.g., after a dev editor save).
 * 
 * @param {string} mapId 
 */
function invalidateMap(mapId) {
  delete mapCache[mapId];
}

function invalidateLogicTiles() {
  logicTilesCache = null;
}

/**
 * Initialize the map loader — preload logic tiles.
 * Call this on server startup.
 */
async function initialize() {
  await loadLogicTiles();
  console.log('[MapLoader] Initialized. Logic tiles loaded.');
}

/**
 * Save map data to the database.
 * 
 * @param {string} mapId 
 * @param {object} data 
 * @returns {Promise<boolean>}
 */
async function saveMapData(mapId, data) {
  try {
    await prisma.gameMap.upsert({
      where: { id: mapId },
      update: {
        name: data.name,
        width: data.width,
        height: data.height,
        tilesetData: JSON.stringify(data.grid || []),
        npcs: JSON.stringify(data.npcs || []),
        encounters: JSON.stringify(data.encountersData || []),
        gates: JSON.stringify(data.gates || {})
      },
      create: {
        id: mapId,
        name: data.name || mapId,
        width: data.width || 24,
        height: data.height || 24,
        tilesetData: JSON.stringify(data.grid || []),
        npcs: JSON.stringify(data.npcs || []),
        encounters: JSON.stringify(data.encountersData || []),
        gates: JSON.stringify(data.gates || {})
      }
    });

    // Invalidate cache so it fetches fresh on next load
    invalidateMap(mapId);
    return true;
  } catch (err) {
    console.error(`[MapLoader] Failed to save map ${mapId}:`, err);
    return false;
  }
}

/**
 * Gracefully disconnect Prisma.
 */
async function shutdown() {
  await prisma.$disconnect();
}

module.exports = {
  loadMapData,
  loadLogicTiles,
  isWalkable,
  isWalkableSync,
  getMapDimensions,
  getCachedMap,
  getMapDataSync,
  setCachedTile,
  invalidateMap,
  invalidateLogicTiles,
  saveMapData,
  initialize,
  shutdown,
};
