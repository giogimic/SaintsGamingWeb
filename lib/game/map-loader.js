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

const prisma = new PrismaClient({ log: ['error'] });

// In-memory cache: mapId -> { grid, gates, npcs, dimensions }
const mapCache = {};
// Logic tiles cache: tileId -> { isSolid, interactable, ... }
let logicTilesCache = null;

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
    const saintsMap = await prisma.saintsMap.findUnique({ where: { slug: mapId } });
    if (saintsMap) {
      const grid = JSON.parse(saintsMap.collisionData || '[]');
      const npcs = JSON.parse(saintsMap.npcData || '[]');
      const gates = JSON.parse(saintsMap.triggerData || '{}');

      const data = {
        id: saintsMap.slug,
        name: saintsMap.name,
        grid,
        gates,
        npcs,
        width: saintsMap.width,
        height: saintsMap.height,
      };
      mapCache[mapId] = data;
      console.log(`[MapLoader] Loaded SaintsMap "${mapId}" (${data.width}x${data.height})`);
      return data;
    }
    
    // Fallback if map not found (create empty fallback in memory)
    console.warn(`[MapLoader] Map "${mapId}" not found in DB. Falling back to blank map.`);
    const grid = Array(20).fill(null).map(() => Array(20).fill(0));
    mapCache[mapId] = { id: mapId, name: 'Unknown', grid, gates: {}, npcs: [], width: 20, height: 20 };
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

/**
 * Invalidate a cached map (e.g., after a dev editor save).
 * 
 * @param {string} mapId 
 */
function invalidateMap(mapId) {
  delete mapCache[mapId];
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
  invalidateMap,
  initialize,
  shutdown,
};
