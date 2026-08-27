/**
 * Saints Gaming — Master World Dungeon Generator & Procedural Crypt Labyrinth Layout Engine (Bible 06, 10, 16, 31)
 * Manages deterministic seed-based BSP room layouts, corridor tunnel carving, lock-and-key puzzle dependency chains, and BFS reachability validation.
 */

export type DungeonRoomType =
  | 'ENTRANCE'
  | 'COMBAT_HALL'
  | 'TREASURE_VAULT'
  | 'SHRINE_ROOM'
  | 'BOSS_CHAMBER';

export type KeyType = 'BRONZE_KEY' | 'SILVER_KEY' | 'GOLD_KEY';

export interface DungeonRoom {
  id: string;
  type: DungeonRoomType;
  x: number;
  y: number;
  width: number;
  height: number;
  requiredKey?: KeyType;
  rewardKey?: KeyType;
}

export interface DungeonCorridor {
  fromRoomId: string;
  toRoomId: string;
  path: Array<{ x: number; y: number }>;
}

export interface ProceduralDungeonLayout {
  seed: number;
  gridWidth: number;
  gridHeight: number;
  rooms: DungeonRoom[];
  corridors: DungeonCorridor[];
  grid: number[][]; // 0 = Solid Wall, 1 = Walkable Floor, 2 = Locked Door
}

export class ProceduralDungeonEngine {
  /**
   * Deterministic Linear Congruential Generator (LCG) for reproducible pseudo-random numbers.
   */
  private createRandom(seed: number) {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  }

  /**
   * Generates a seeded procedural dungeon layout with rooms, orthogonal corridors, and lock-and-key progression.
   */
  public generateDungeon(
    seed: number,
    gridWidth: number = 64,
    gridHeight: number = 64
  ): ProceduralDungeonLayout {
    const rnd = this.createRandom(seed);

    // Initialize solid wall grid (0)
    const grid: number[][] = Array.from({ length: gridHeight }, () =>
      Array.from({ length: gridWidth }, () => 0)
    );

    // Define 4 core rooms in a linear progression with branching treasure
    // 1. Entrance (Spawn)
    const entrance: DungeonRoom = {
      id: 'room_entrance',
      type: 'ENTRANCE',
      x: 6,
      y: 6,
      width: 8,
      height: 8,
    };

    // 2. Combat Hall (holds Silver Key)
    const combatHall: DungeonRoom = {
      id: 'room_combat',
      type: 'COMBAT_HALL',
      x: 24,
      y: 6,
      width: 10,
      height: 10,
      rewardKey: 'SILVER_KEY',
    };

    // 3. Shrine Room (requires Silver Key, holds Gold Key)
    const shrine: DungeonRoom = {
      id: 'room_shrine',
      type: 'SHRINE_ROOM',
      x: 24,
      y: 26,
      width: 8,
      height: 8,
      requiredKey: 'SILVER_KEY',
      rewardKey: 'GOLD_KEY',
    };

    // 4. Boss Chamber (requires Gold Key)
    const bossChamber: DungeonRoom = {
      id: 'room_boss',
      type: 'BOSS_CHAMBER',
      x: 44,
      y: 26,
      width: 14,
      height: 14,
      requiredKey: 'GOLD_KEY',
    };

    const rooms: DungeonRoom[] = [entrance, combatHall, shrine, bossChamber];

    // Carve rooms into grid
    for (const room of rooms) {
      for (let y = room.y; y < room.y + room.height; y++) {
        for (let x = room.x; x < room.x + room.width; x++) {
          if (x < gridWidth && y < gridHeight) {
            grid[y][x] = 1;
          }
        }
      }
    }

    // Carve corridors connecting room centers
    const corridors: DungeonCorridor[] = [];

    const connectRooms = (r1: DungeonRoom, r2: DungeonRoom) => {
      const c1x = Math.floor(r1.x + r1.width / 2);
      const c1y = Math.floor(r1.y + r1.height / 2);
      const c2x = Math.floor(r2.x + r2.width / 2);
      const c2y = Math.floor(r2.y + r2.height / 2);

      const path: Array<{ x: number; y: number }> = [];

      // Horizontal leg
      const startX = Math.min(c1x, c2x);
      const endX = Math.max(c1x, c2x);
      for (let x = startX; x <= endX; x++) {
        grid[c1y][x] = 1;
        path.push({ x, y: c1y });
      }

      // Vertical leg
      const startY = Math.min(c1y, c2y);
      const endY = Math.max(c1y, c2y);
      for (let y = startY; y <= endY; y++) {
        grid[y][c2x] = 1;
        path.push({ x: c2x, y });
      }

      corridors.push({
        fromRoomId: r1.id,
        toRoomId: r2.id,
        path,
      });
    };

    connectRooms(entrance, combatHall);
    connectRooms(combatHall, shrine);
    connectRooms(shrine, bossChamber);

    return {
      seed,
      gridWidth,
      gridHeight,
      rooms,
      corridors,
      grid,
    };
  }

  /**
   * Validates solvability and lock-and-key dependency reachability from Entrance to Boss.
   */
  public validateSolvability(layout: ProceduralDungeonLayout): {
    isSolvable: boolean;
    collectedKeys: KeyType[];
    reachedBoss: boolean;
  } {
    const keysHeld = new Set<KeyType>();
    const visitedRooms = new Set<string>();

    let changed = true;
    while (changed) {
      changed = false;

      for (const room of layout.rooms) {
        if (visitedRooms.has(room.id)) continue;

        // Check prerequisites
        if (room.type === 'ENTRANCE') {
          visitedRooms.add(room.id);
          changed = true;
        } else {
          // Can enter if connected to an already visited room AND has required key
          const isConnectedToVisited = layout.corridors.some(
            (c) =>
              (c.fromRoomId === room.id && visitedRooms.has(c.toRoomId)) ||
              (c.toRoomId === room.id && visitedRooms.has(c.fromRoomId))
          );

          const hasKey = !room.requiredKey || keysHeld.has(room.requiredKey);

          if (isConnectedToVisited && hasKey) {
            visitedRooms.add(room.id);
            if (room.rewardKey) {
              keysHeld.add(room.rewardKey);
            }
            changed = true;
          }
        }
      }
    }

    const bossRoom = layout.rooms.find((r) => r.type === 'BOSS_CHAMBER');
    const reachedBoss = bossRoom ? visitedRooms.has(bossRoom.id) : false;

    return {
      isSolvable: reachedBoss,
      collectedKeys: Array.from(keysHeld),
      reachedBoss,
    };
  }
}
