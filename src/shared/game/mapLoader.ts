import { prisma } from "../../web/lib/prisma";
import type { MapData, LogicTile } from "./types/map";
import {
  getCachedMap,
  setCachedMap,
  getCachedLogicTiles,
  setCachedLogicTiles,
  invalidateMapCache,
} from "./mapCache";

export function buildDemoSandboxGridFallback(): number[][] {
  const w = 30;
  const h = 30;
  const grid: number[][] = [];
  for (let y = 0; y < h; y++) {
    const row: number[] = [];
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

export async function loadLogicTiles(): Promise<Record<number, LogicTile>> {
  const cached = getCachedLogicTiles();
  if (cached) return cached;

  try {
    const tiles = await prisma.mapLogicTile.findMany();
    const result: Record<number, LogicTile> = {};
    for (const tile of tiles) {
      result[tile.id] = {
        id: tile.id,
        name: tile.name,
        color: tile.color,
        isSolid: tile.isSolid,
        interactable: tile.interactable,
        onInteractAction: tile.onInteractAction,
        onInteractPayload: tile.onInteractPayload,
        onStepAction: tile.onStepAction,
        onStepPayload: tile.onStepPayload,
      };
    }
    setCachedLogicTiles(result);
    return result;
  } catch (err: any) {
    console.error("[MapLoader] Error loading logic tiles:", err.message || err);
    setCachedLogicTiles({});
    return {};
  }
}

export async function loadMapData(mapId: string): Promise<MapData> {
  const cached = getCachedMap(mapId);
  if (cached) return cached;

  try {
    const worldMap = await prisma.worldMap.findUnique({ where: { id: mapId } });
    if (worldMap) {
      const grid = JSON.parse(worldMap.gridData || "[]");
      const npcs = JSON.parse(worldMap.npcsData || "[]");
      const rawGates = JSON.parse(worldMap.gatesData || "{}");
      const connections = rawGates.connections || undefined;
      const actualGates = rawGates.gates !== undefined ? rawGates.gates : rawGates;
      const encounters = JSON.parse(worldMap.encountersData || "[]");
      const height = Array.isArray(grid) ? grid.length : 20;
      const width = Array.isArray(grid?.[0]) ? grid[0].length : 20;

      const data: MapData = {
        id: worldMap.id,
        name: worldMap.name,
        grid,
        gates: actualGates,
        connections: connections,
        npcs,
        encountersData: encounters,
        tileLayers: JSON.parse(worldMap.tileLayersData || "[]"),
        tilesets: JSON.parse(worldMap.tilesetsData || "[]"),
        width,
        height,
      };
      setCachedMap(mapId, data);
      return data;
    }

    const gameMap = await prisma.gameMap.findUnique({ where: { id: mapId } });
    if (gameMap) {
      const grid = JSON.parse(gameMap.tilesetData || "[]");
      const npcs = JSON.parse(gameMap.npcs || "[]");
      const gates = JSON.parse(gameMap.gates || "{}");
      const encounters = JSON.parse(gameMap.encounters || "[]");

      const data: MapData = {
        id: gameMap.id,
        name: gameMap.name,
        grid,
        gates,
        npcs,
        encountersData: encounters,
        width: gameMap.width,
        height: gameMap.height,
      };
      setCachedMap(mapId, data);
      return data;
    }

    // Blank fallback map
    let grid = Array(20).fill(null).map(() => Array(20).fill(0));
    let npcs: any[] = [];
    let width = 20;
    let height = 20;

    if (mapId === "SAINTS_VILLAGE" || mapId === "DEMO_SANDBOX") {
      width = 30;
      height = 30;
      grid = buildDemoSandboxGridFallback();
      npcs = [{ id: "npc_guide_1", templateId: "Villager", name: "Guide", x: 15, y: 15, sprite: "npc_default", direction: "down" }];
    }

    const data: MapData = {
      id: mapId,
      name: mapId,
      grid,
      gates: {},
      npcs,
      encountersData: [{ speciesSlug: "rockitten", weight: 1, minLevel: 3, maxLevel: 5 }],
      width,
      height,
    };
    setCachedMap(mapId, data);
    return data;
  } catch (err: any) {
    console.error(`[MapLoader] Error loading map "${mapId}":`, err.message || err);
    const blankGrid = Array(24).fill(null).map(() => Array(24).fill(0));
    const fallback: MapData = {
      id: mapId,
      name: mapId,
      grid: blankGrid,
      gates: {},
      npcs: [],
      encountersData: [],
      width: 24,
      height: 24,
    };
    setCachedMap(mapId, fallback);
    return fallback;
  }
}

export async function saveMapData(mapId: string, data: Partial<MapData>): Promise<boolean> {
  try {
    const grid = data.grid || [];
    const height = Array.isArray(grid) ? grid.length || data.height || 24 : data.height || 24;
    const width = Array.isArray(grid?.[0]) ? grid[0].length : data.width || 24;

    await prisma.gameMap.upsert({
      where: { id: mapId },
      update: {
        name: data.name || mapId,
        width,
        height,
        tilesetData: JSON.stringify(data.grid || []),
        npcs: JSON.stringify(data.npcs || []),
        encounters: JSON.stringify(data.encountersData || []),
        gates: JSON.stringify(data.gates || {}),
      },
      create: {
        id: mapId,
        name: data.name || mapId,
        width,
        height,
        tilesetData: JSON.stringify(data.grid || []),
        npcs: JSON.stringify(data.npcs || []),
        encounters: JSON.stringify(data.encountersData || []),
        gates: JSON.stringify(data.gates || {}),
      },
    });

    invalidateMapCache(mapId);
    return true;
  } catch (err) {
    console.error(`[MapLoader] Failed to save map ${mapId}:`, err);
    return false;
  }
}
