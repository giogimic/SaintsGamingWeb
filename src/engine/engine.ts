/**
 * Game Engine — main game loop and camera system
 */
import { inputManager } from "./input";
import { useGameStore, type Direction, type Position } from "./store";

// ─── Constants ───────────────────────────────────────────────────

const TILE_SIZE = 16;
const PLAYER_SPEED = 2; // tiles per second
const SPRINT_MULTIPLIER = 1.5;

// ─── Camera ──────────────────────────────────────────────────────

export class Camera {
  x = 0;
  y = 0;
  width = 0;
  height = 0;
  mapWidth = 0;
  mapHeight = 0;

  setSize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  setMapSize(mapWidth: number, mapHeight: number) {
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
  }

  /**
   * Follow a target position, keeping it centered on screen
   */
  follow(target: Position) {
    const targetPixelX = target.x * TILE_SIZE;
    const targetPixelY = target.y * TILE_SIZE;

    // Center camera on target
    this.x = targetPixelX - this.width / 2;
    this.y = targetPixelY - this.height / 2;

    // Clamp to map bounds
    this.x = Math.max(0, Math.min(this.x, this.mapWidth * TILE_SIZE - this.width));
    this.y = Math.max(0, Math.min(this.y, this.mapHeight * TILE_SIZE - this.height));
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX * TILE_SIZE - this.x,
      y: worldY * TILE_SIZE - this.y,
    };
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX + this.x) / TILE_SIZE,
      y: (screenY + this.y) / TILE_SIZE,
    };
  }
}

// ─── Collision System ────────────────────────────────────────────

export class CollisionSystem {
  /**
   * Check if a position is blocked by collision
   */
  isBlocked(x: number, y: number, collisionMap: boolean[][]): boolean {
    if (y < 0 || y >= collisionMap.length) return true;
    if (x < 0 || x >= collisionMap[0].length) return true;
    return collisionMap[y][x];
  }

  /**
   * Check if movement is valid
   */
  canMove(
    from: Position,
    direction: Direction,
    collisionMap: boolean[][]
  ): boolean {
    let newX = from.x;
    let newY = from.y;

    switch (direction) {
      case "up":
        newY--;
        break;
      case "down":
        newY++;
        break;
      case "left":
        newX--;
        break;
      case "right":
        newX++;
        break;
    }

    return !this.isBlocked(newX, newY, collisionMap);
  }

  /**
   * Get the position after moving in a direction
   */
  getNewPosition(from: Position, direction: Direction): Position {
    switch (direction) {
      case "up":
        return { x: from.x, y: from.y - 1 };
      case "down":
        return { x: from.x, y: from.y + 1 };
      case "left":
        return { x: from.x - 1, y: from.y };
      case "right":
        return { x: from.x + 1, y: from.y };
    }
  }
}

// ─── Game Engine ─────────────────────────────────────────────────

export class GameEngine {
  camera: Camera;
  collision: CollisionSystem;
  private animationFrameId: number | null = null;
  private lastTime = 0;
  private moveTimer = 0;

  constructor() {
    this.camera = new Camera();
    this.collision = new CollisionSystem();
  }

  /**
   * Start the game loop
   */
  start() {
    inputManager.attach();
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  /**
   * Stop the game loop
   */
  stop() {
    inputManager.detach();
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Main game loop
   */
  private loop = (currentTime: number) => {
    const deltaTime = (currentTime - this.lastTime) / 1000; // seconds
    this.lastTime = currentTime;

    // Update input state
    inputManager.update();

    // Update game logic
    this.update(deltaTime);

    // Continue loop
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  /**
   * Update game state
   */
  private update(deltaTime: number) {
    const store = useGameStore.getState();
    const { phase, player, currentMap } = store;

    // Only process movement in overworld phase
    if (phase !== "overworld" || !currentMap) return;

    // Handle movement
    const direction = inputManager.getDirection();
    if (direction) {
      // Update player direction
      store.setPlayer({ direction });

      // Calculate movement speed
      const speed = PLAYER_SPEED * (inputManager.isSprinting() ? SPRINT_MULTIPLIER : 1);
      this.moveTimer += deltaTime;

      // Move every 1/speed seconds
      if (this.moveTimer >= 1 / speed) {
        this.moveTimer = 0;

        // Check if movement is valid
        if (this.collision.canMove(player.position, direction, currentMap.collision)) {
          const newPos = this.collision.getNewPosition(player.position, direction);
          store.setPlayer({ position: newPos, moving: true });

          // Check for gates/transitions
          this.checkGates(newPos, currentMap);

          // Check for encounters
          this.checkEncounters(newPos, currentMap);
        }
      }
    } else {
      store.setPlayer({ moving: false });
      this.moveTimer = 0;
    }

    // Handle interact
    if (inputManager.isJustPressed("interact")) {
      this.handleInteract();
    }

    // Handle menu
    if (inputManager.isJustPressed("menu")) {
      store.setPhase("menu");
    }

    // Update camera to follow player
    this.camera.follow(player.position);
  }

  /**
   * Check if player stepped on a gate/transition
   */
  private checkGates(position: Position, map: { gates: Array<{ x: number; y: number; width: number; height: number; targetMap: string; targetX: number; targetY: number }> } | null) {
    if (!map) return;
    
    const gates = map.gates;
    for (const gate of gates) {
      if (
        position.x >= gate.x &&
        position.x < gate.x + gate.width &&
        position.y >= gate.y &&
        position.y < gate.y + gate.height
      ) {
        // Transition to new map
        void this.loadMap(gate.targetMap, gate.targetX, gate.targetY);
        break;
      }
    }
  }

  /**
   * Check for wild encounters
   */
  private checkEncounters(position: Position, map: { encounterZone?: string } | null) {
    if (!map) return;
    
    const encounterZone = map.encounterZone;
    if (!encounterZone) return;

    // Random encounter check (simplified — real implementation would use encounter tables)
    if (Math.random() < 0.05) {
      // 5% chance per step
      this.triggerWildEncounter(encounterZone);
    }
  }

  /**
   * Handle interact action (talk to NPC, etc.)
   */
  private handleInteract() {
    const store = useGameStore.getState();
    const { player, currentMap } = store;
    if (!currentMap) return;

    // Get position in front of player
    let targetX = player.position.x;
    let targetY = player.position.y;

    switch (player.direction) {
      case "up":
        targetY--;
        break;
      case "down":
        targetY++;
        break;
      case "left":
        targetX--;
        break;
      case "right":
        targetX++;
        break;
    }

    // Check for NPC at target position
    const npc = currentMap.npcs.find(
      (n) => n.x === targetX && n.y === targetY
    );

    if (npc) {
      if (npc.dialogue && npc.dialogue.length > 0) {
        store.startDialogue({
          npcId: npc.id,
          npcName: npc.name,
          lines: npc.dialogue,
          currentLine: 0,
        });
      }
    }
  }

  /**
   * Load a new map from /api/maps/[slug] (WorldMap / GameMap shape).
   * Returns true on success so callers can leave the loading screen.
   */
  async loadMap(slug: string, spawnX: number, spawnY: number): Promise<boolean> {
    const store = useGameStore.getState();

    const response = await fetch(`/api/maps/${encodeURIComponent(slug)}`);
    if (!response.ok) {
      console.error(`Failed to load map: ${slug}`);
      return false;
    }

    const mapData = await response.json();
    const map = this.normalizeApiMap(slug, mapData);
    if (!map) {
      console.error(`Failed to parse map payload: ${slug}`);
      return false;
    }

    store.setCurrentMap(map);
    store.setPlayer({ position: { x: spawnX, y: spawnY } });
    store.setPhase("overworld");
    this.camera.setMapSize(map.width, map.height);
    return true;
  }

  /** Adapt WorldMap/GameMap (and legacy SaintsMap) JSON into engine MapData. */
  private normalizeApiMap(
    slug: string,
    mapData: Record<string, unknown>
  ): Parameters<ReturnType<typeof useGameStore.getState>["setCurrentMap"]>[0] | null {
    const parseMaybeJson = <T,>(value: unknown, fallback: T): T => {
      if (typeof value === "string") {
        try {
          return JSON.parse(value) as T;
        } catch {
          return fallback;
        }
      }
      if (value == null) return fallback;
      return value as T;
    };

    // Preferred: WorldMap / GameMap → grid + npcs arrays
    let tiles = parseMaybeJson<number[][]>(mapData.grid ?? mapData.tilesetData, []);
    if (!Array.isArray(tiles) || tiles.length === 0) {
      // Legacy SaintsMap: tilesetData is the ground layer
      tiles = parseMaybeJson<number[][]>(mapData.tilesetData, []);
    }
    if (!Array.isArray(tiles) || tiles.length === 0 || !Array.isArray(tiles[0])) {
      return null;
    }

    const height = Number(mapData.height) || tiles.length;
    const width = Number(mapData.width) || tiles[0].length;
    const tileSize = Number(mapData.tileSize) || 16;

    let collision = parseMaybeJson<boolean[][]>(mapData.collisionData, []);
    if (!Array.isArray(collision) || collision.length === 0) {
      // Logic tiles: 1 wall, 5 tree, 6 ore, 9 craft, 11 bramble are solid
      const solid = new Set([1, 5, 6, 9, 11]);
      collision = tiles.map((row) => row.map((t) => solid.has(Number(t))));
    }

    const rawNpcs = parseMaybeJson<any[]>(mapData.npcs ?? mapData.npcData, []);
    const npcs = (Array.isArray(rawNpcs) ? rawNpcs : []).map((n) => ({
      id: String(n.id || n.templateId || "npc"),
      name: String(n.name || n.id || "NPC"),
      x: Number(n.x) || 0,
      y: Number(n.y) || 0,
      sprite: String(n.sprite || "adventurer"),
      direction: (String(n.direction || "down").toLowerCase() as
        | "up"
        | "down"
        | "left"
        | "right"),
      dialogue: Array.isArray(n.dialogue) ? n.dialogue : undefined,
      isTrainer: !!n.isTrainer,
      party: n.party,
    }));

    const rawGates = parseMaybeJson<any>(mapData.gates ?? mapData.triggerData, []);
    const gates = Array.isArray(rawGates)
      ? rawGates
      : Object.values(rawGates || {}).flatMap((g) => (Array.isArray(g) ? g : [g]));

    return {
      slug: String(mapData.slug || mapData.id || slug),
      name: String(mapData.name || slug),
      width,
      height,
      tileSize,
      tiles,
      collision,
      npcs,
      gates: gates as any[],
      encounterZone:
        typeof mapData.encounterZone === "string" ? mapData.encounterZone : undefined,
      music: typeof mapData.music === "string" ? mapData.music : undefined,
      environment:
        typeof mapData.environment === "string" ? mapData.environment : undefined,
    };
  }

  /**
   * Trigger a wild encounter
   */
  private async triggerWildEncounter(encounterZone: string) {
    const store = useGameStore.getState();
    
    // Fetch encounter data
    const response = await fetch(`/api/encounters/${encounterZone}`);
    if (!response.ok) return;

    const encounterData = await response.json();
    const data = JSON.parse(encounterData.data);

    // Pick a random monster from the encounter table
    const monsters = data.monsters || [];
    if (monsters.length === 0) return;

    const monsterData = monsters[Math.floor(Math.random() * monsters.length)];
    
    // Fetch monster species data
    const speciesResponse = await fetch(`/api/creatures/species/${monsterData.slug}`);
    if (!speciesResponse.ok) return;

    const species = await speciesResponse.json();

    // Create enemy monster
    const enemy = {
      id: `enemy-${Date.now()}`,
      speciesSlug: species.slug,
      name: species.slug.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
      level: monsterData.level || 5,
      currentHp: 50, // TODO: calculate from base stats
      maxHp: 50,
      types: JSON.parse(species.types),
      moves: [], // TODO: load from moveset
      spriteFront: species.spriteFront || `/game-assets/sprites/${species.slug}_front.png`,
      spriteBack: species.spriteBack || `/game-assets/sprites/${species.slug}_back.png`,
      status: null,
      xp: 0,
    };

    store.startBattle(enemy, true);
  }
}

export const gameEngine = new GameEngine();