import { GameEngine } from "./GameEngine";

// Using require for legacy JS modules (they can be converted to TS later)
const mapLoader = require("../engine/map-loader.js");
const spatialGrid = require("../engine/spatial-grid.js");

export interface MapInstance {
  instanceId: string; // e.g. "SAINTS_VILLAGE_ch1"
  mapId: string;      // e.g. "SAINTS_VILLAGE" (Map Definition)
  playerCount: number;
}

const MAX_PLAYERS_PER_SHARD = 50;

export class WorldManager {
  // World -> Instances (e.g. Map Definition -> Lobby Channel 1, Player Base, etc.)
  private instances = new Map<string, MapInstance>();
  
  // Phase 7: Track depleted nodes to prevent gathering while on cooldown
  // Key: instanceId_x_y -> expirationTimestamp
  private depletedNodes = new Map<string, number>();

  constructor(private engine: GameEngine) {
    this.engine.events.on("resolveCollisions", () => this.resolveCollisions());
    this.engine.events.on("adminSaveMap", (data) => this.handleAdminSaveMap(data));
  }

  private async handleAdminSaveMap(data: any) {
    if (!data.mapId) return;
    const success = await mapLoader.saveMapData(data.mapId, data);
    if (success) {
      console.log(`[WorldManager] Map ${data.mapId} saved to database and hot reloaded.`);
      // Optionally broadcast to all players in map to reload
      this.engine.events.emit("networkBroadcast", {
        room: data.mapId,
        event: "map_reloaded",
        data: { mapId: data.mapId }
      });
    }
  }

  public async initialize() {
    await mapLoader.initialize();
    this.startAiLoop();
  }

  private startAiLoop() {
    // Phase 6: Finite State Machine for NPC AI
    // Ticks at 1Hz to save server performance
    setInterval(() => this.processAiTick(), 1000);
    console.log("[WorldManager] 1Hz NPC AI Loop started.");
  }

  private processAiTick() {
    // We would loop through active instances and process NPC pathing
    // For now, this is a stub for the architecture.
    for (const [instanceId, instance] of this.instances.entries()) {
      if (instance.playerCount > 0) {
        this.engine.events.emit("aiTick", { instanceId, mapId: instance.mapId });
      }
    }
  }

  public async loadMap(mapId: string) {
    // Loads the Map Definition (collision grid, blocked areas, triggers)
    await mapLoader.loadMapData(mapId);
  }

  public createInstance(instanceId: string, mapId: string): MapInstance {
    const instance: MapInstance = { instanceId, mapId, playerCount: 0 };
    this.instances.set(instanceId, instance);

    // Phase 6: Spawn NPCs for this instance
    const mapData = mapLoader.getCachedMap(mapId);
    if (mapData && mapData.npcs) {
      for (const npc of mapData.npcs) {
        this.engine.events.emit("spawnCreature", {
          templateId: npc.id || npc.templateId || "Villager",
          entityType: "NPC",
          mapId: instanceId, // Spawning specifically into this shard/instance
          x: npc.x,
          y: npc.y,
          spawnMode: "STATIC"
        });
      }
    }

    return instance;
  }

  public getInstance(instanceId: string): MapInstance | undefined {
    return this.instances.get(instanceId);
  }

  public forceJoinInstance(instanceId: string, accountId: string): MapInstance | undefined {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.playerCount++;
      return instance;
    }
    return undefined;
  }

  public joinMap(mapId: string, accountId: string, isPrivate: boolean = false): MapInstance {
    if (isPrivate) {
      // Private instances (e.g. player bases) are isolated per account
      const instanceId = `${mapId}_${accountId}`;
      let instance = this.instances.get(instanceId);
      if (!instance) {
        instance = this.createInstance(instanceId, mapId);
      }
      instance.playerCount++;
      return instance;
    }

    // Public maps use dynamic sharding
    // Find an existing shard with space
    let availableShard: MapInstance | undefined;
    let maxShardNum = 0;

    for (const [id, instance] of this.instances.entries()) {
      if (instance.mapId === mapId && !id.includes("_acc")) {
        // Extract channel number (e.g., SAINTS_VILLAGE_ch1 -> 1)
        const match = id.match(/_ch(\d+)$/);
        if (match) {
          const shardNum = parseInt(match[1]);
          if (shardNum > maxShardNum) maxShardNum = shardNum;
        }

        if (instance.playerCount < MAX_PLAYERS_PER_SHARD) {
          availableShard = instance;
          break;
        }
      }
    }

    // If no available shard, create a new one
    if (!availableShard) {
      const newShardNum = maxShardNum + 1;
      const newInstanceId = `${mapId}_ch${newShardNum}`;
      availableShard = this.createInstance(newInstanceId, mapId);
    }

    availableShard.playerCount++;
    return availableShard;
  }

  public leaveInstance(instanceId: string, accountId: string) {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.playerCount = Math.max(0, instance.playerCount - 1);
      // Optional: Clean up empty instances to free memory (skip for now to avoid rapid thrashing)
    }
  }

  // COLLISION AUTHORITY: 
  // The server completely owns collision data. Clients handle visuals, but the server verifies 
  // every movement against the loaded Map Definition to prevent walking through walls.
  public isWalkable(instanceId: string, x: number, y: number): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;
    return mapLoader.isWalkableSync(instance.mapId, x, y);
  }

  public isOccupied(instanceId: string, x: number, y: number): boolean {
    return spatialGrid.isOccupied(instanceId, x, y);
  }

  public addEntity(instanceId: string, x: number, y: number, entityId: string) {
    spatialGrid.addEntity(instanceId, x, y, entityId);
  }

  public removeEntity(instanceId: string, x: number, y: number, entityId: string) {
    spatialGrid.removeEntity(instanceId, x, y, entityId);
  }

  public moveEntity(instanceId: string, oldX: number, oldY: number, newX: number, newY: number, entityId: string) {
    spatialGrid.moveEntity(instanceId, oldX, oldY, newX, newY, entityId);
  }

  // --- Phase 8: Line of Sight (Bresenham) ---
  public hasLineOfSight(instanceId: string, x0: number, y0: number, x1: number, y1: number): boolean {
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    let sx = (x0 < x1) ? 1 : -1;
    let sy = (y0 < y1) ? 1 : -1;
    let err = dx - dy;

    // To prevent infinite loops or long rays
    let maxDist = 20;

    while(true) {
      if (maxDist-- <= 0) return false;
      if (x0 === x1 && y0 === y1) return true;
      
      // If a tile is not walkable, LOS is blocked. (Ignore the starting tile itself to prevent self-blocking)
      // Actually, we should check if the current tile (except starting point) is an obstacle.
      if (!this.isWalkable(instanceId, x0, y0)) {
        return false;
      }

      let e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  }

  // --- Phase 7: Node Depletion Engine ---

  public isNodeDepleted(instanceId: string, x: number, y: number): boolean {
    const key = `${instanceId}_${x}_${y}`;
    const expiration = this.depletedNodes.get(key);
    if (expiration && Date.now() < expiration) {
      return true;
    }
    // Clean up expired ones lazily
    if (expiration) {
      this.depletedNodes.delete(key);
    }
    return false;
  }

  public depleteNode(instanceId: string, x: number, y: number, durationMs: number) {
    const key = `${instanceId}_${x}_${y}`;
    this.depletedNodes.set(key, Date.now() + durationMs);

    // Notify clients to show stump / empty rock
    this.engine.events.emit("networkBroadcast", {
      room: instanceId,
      event: "node_depleted",
      data: { x, y }
    });

    // Schedule respawn
    setTimeout(() => {
      this.depletedNodes.delete(key);
      this.engine.events.emit("networkBroadcast", {
        room: instanceId,
        event: "node_respawned",
        data: { x, y }
      });
    }, durationMs);
  }

  private resolveCollisions() {
    // Spatial grid handles O(1) occupancy.
    // The GameEngine emits this event, and specific managers 
    // (like PlayerManager or NpcManager) check occupancy during their movement phase.
  }
}
