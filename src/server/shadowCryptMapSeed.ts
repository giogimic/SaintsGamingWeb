/**
 * Saints Gaming — Shadow Crypt Dungeon Map Seed (Studio Master Plan Phase 10)
 * Authoritative subterranean dungeon map with atmospheric lighting, ambient audio, and hostile spawns.
 */

export const SHADOW_CRYPT_MAP_ID = "DUNGEON_SHADOW_CRYPT";
export const SHADOW_CRYPT_W = 24;
export const SHADOW_CRYPT_H = 24;

export interface DungeonSpawnPoint {
  id: string;
  entityId: string;
  x: number;
  y: number;
  respawnSec: number;
}

export interface ShadowCryptMapData {
  id: string;
  name: string;
  width: number;
  height: number;
  biome: string;
  weatherType: string;
  lightingPreset: string;
  ambientAudioTrack: string;
  recommendedLevel: number;
  spawnPoint: { x: number; y: number };
  spawns: DungeonSpawnPoint[];
  logicGrid: number[][];
  tileLayers: Array<{ name: string; grid: number[][]; opacity?: number }>;
}

function generateCryptLogicGrid(): number[][] {
  const grid: number[][] = [];
  for (let y = 0; y < SHADOW_CRYPT_H; y++) {
    const row: number[] = [];
    for (let x = 0; x < SHADOW_CRYPT_W; x++) {
      // Outer perimeter is solid wall (1)
      if (x === 0 || x === SHADOW_CRYPT_W - 1 || y === 0 || y === SHADOW_CRYPT_H - 1) {
        row.push(1);
      }
      // Crypt columns / pillars
      else if ((x === 6 || x === 17) && (y === 6 || y === 12 || y === 18)) {
        row.push(1);
      }
      // Open walkable dungeon floor (0)
      else {
        row.push(0);
      }
    }
    grid.push(row);
  }
  return grid;
}

function generateCryptVisualTileGrid(fillGid: number = 3001): number[][] {
  const grid: number[][] = [];
  for (let y = 0; y < SHADOW_CRYPT_H; y++) {
    const row: number[] = [];
    for (let x = 0; x < SHADOW_CRYPT_W; x++) {
      row.push(fillGid);
    }
    grid.push(row);
  }
  return grid;
}

export const SHADOW_CRYPT_MAP: ShadowCryptMapData = {
  id: SHADOW_CRYPT_MAP_ID,
  name: "Shadow Crypt - Inner Sanctum",
  width: SHADOW_CRYPT_W,
  height: SHADOW_CRYPT_H,
  biome: "DUNGEON",
  weatherType: "FOG",
  lightingPreset: "DUNGEON",
  ambientAudioTrack: "/audio/ambience/dungeon_drips.mp3",
  recommendedLevel: 10,
  spawnPoint: { x: 12, y: 2 },
  spawns: [
    {
      id: "spawn_skel_left",
      entityId: "monster_skeleton_warrior",
      x: 6,
      y: 9,
      respawnSec: 45,
    },
    {
      id: "spawn_skel_right",
      entityId: "monster_skeleton_warrior",
      x: 17,
      y: 9,
      respawnSec: 45,
    },
    {
      id: "spawn_skel_hall",
      entityId: "monster_skeleton_warrior",
      x: 12,
      y: 14,
      respawnSec: 45,
    },
    {
      id: "spawn_boss_crypt_lord",
      entityId: "monster_crypt_lord",
      x: 12,
      y: 20,
      respawnSec: 300,
    },
  ],
  logicGrid: generateCryptLogicGrid(),
  tileLayers: [
    {
      name: "Dungeon Ground",
      grid: generateCryptVisualTileGrid(3001), // Interior Stone Floor
      opacity: 1.0,
    },
  ],
};
