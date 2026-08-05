import { GameEngine } from "./GameEngine";
import { isPublicChannelInstanceId, pickPublicShardAssignment, toBaseMapId } from "@/shared/net/mapIds";
import { studioPieRoomId } from "@/shared/game/studioSession";
import { DEMO_MAP_ID, DEMO_VANCE_SPAWN, DEMO_WILD_SPOTS } from "./demoMapSeed";

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

  /**
   * CONTINUE #2 — per-account bramble clears (do not mutate shared DEMO grid).
   * Key: accountId/userId → Set of "x,y"
   */
  private clearedBrambleByAccount = new Map<string, Set<string>>();

  /** Demo Q4 bramble gate cells (demoMapSeed: y=10, x=12..16). */
  public static readonly DEMO_BRAMBLE_CELLS: ReadonlyArray<{ x: number; y: number }> = [
    { x: 12, y: 10 },
    { x: 13, y: 10 },
    { x: 14, y: 10 },
    { x: 15, y: 10 },
    { x: 16, y: 10 },
  ];

  constructor(private engine: GameEngine) {
    this.engine.events.on("resolveCollisions", () => this.resolveCollisions());
    this.engine.events.on("adminSaveMap", (data) => this.handleAdminSaveMap(data));
    this.engine.events.on("adminReloadMap", (data) => this.handleAdminReloadMap(data));
    this.engine.events.on(
      "studioSpawnNpc",
      (data: {
        mapId?: string;
        npc?: { id: string; name: string; x: number; y: number; sprite?: string };
      }) => {
        if (!data?.mapId || !data?.npc?.id) return;
        const n = this.spawnNpcLive(data.mapId, data.npc);
        console.log(
          `[WorldManager] studioSpawnNpc ${data.npc.id} on ${data.mapId} → ${n} instance(s)`
        );
      }
    );
    this.engine.events.on(
      "studioDespawnNpc",
      (data: { mapId?: string; npcId?: string }) => {
        if (!data?.mapId || !data?.npcId) return;
        const n = this.despawnNpcLive(data.mapId, data.npcId);
        console.log(
          `[WorldManager] studioDespawnNpc ${data.npcId} on ${data.mapId} → ${n} removed`
        );
      }
    );
  }

  private async handleAdminSaveMap(data: any) {
    if (!data.mapId) return;
    const success = await mapLoader.saveMapData(data.mapId, data);
    if (success) {
      console.log(`[WorldManager] Map ${data.mapId} saved to database and hot reloaded.`);
      this.broadcastMapReloaded(data.mapId);
    }
  }

  /** REST already wrote WorldMap — just invalidate server cache and notify clients. */
  private handleAdminReloadMap(data: { mapId?: string }) {
    if (!data?.mapId) return;
    mapLoader.invalidateMap(data.mapId);
    console.log(`[WorldManager] Map ${data.mapId} cache invalidated; broadcasting map_reloaded.`);
    this.broadcastMapReloaded(data.mapId);
  }

  /**
   * Notify only shards of this base map (public `_chN`, private, PIE) —
   * never a global `io.emit` that remounts unrelated clients.
   */
  private broadcastMapReloaded(mapId: string) {
    const base = toBaseMapId(String(mapId || ""));
    if (!base) return;
    let rooms = 0;
    for (const [instanceId, inst] of this.instances.entries()) {
      if (inst.mapId !== base) continue;
      this.engine.events.emit("networkBroadcast", {
        room: instanceId,
        event: "map_reloaded",
        data: { mapId: base },
      });
      rooms++;
    }
    if (rooms === 0) {
      // No warm instances — still useful for clients mid-join; scoped no-op is fine.
      console.log(`[WorldManager] map_reloaded skipped (no instances for ${base})`);
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
    const now = Date.now();
    for (const [key, expireTime] of this.depletedNodes.entries()) {
      if (now >= expireTime) {
        this.depletedNodes.delete(key);
        const [instanceId, xStr, yStr] = key.split('_');
        
        this.engine.events.emit("networkBroadcast", {
          room: instanceId,
          event: "node_respawned",
          data: { instanceId, x: parseInt(xStr), y: parseInt(yStr) }
        });
        console.log(`[WorldManager] Node respawned at ${xStr}, ${yStr}`);
      }
    }

    // We would loop through active instances and process NPC pathing
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
        const rawId = String(npc.id || npc.templateId || "villager");
        const sprite =
          npc.sprite ||
          npc.spriteKey ||
          npc.spriteId ||
          rawId.replace(/^npc_/, "");
        this.engine.events.emit("spawnCreature", {
          templateId: rawId.replace(/^npc_/, ""),
          entityType: "NPC",
          mapId: instanceId,
          x: npc.x,
          y: npc.y,
          spawnMode: "STATIC",
          name: npc.name || rawId,
          spriteKey: String(sprite).replace(/^\/game-assets\/npc\//, "").replace(/\.png$/, ""),
          dialogueNpcId: rawId.startsWith("npc_") ? rawId : `npc_${rawId.replace(/^npc_/, "")}`,
        });
      }
    }

    // Demo-only spawns (do not pollute Spyder campaign maps)
    const baseMap = String(mapId || "").split("#")[0].toUpperCase();
    if (baseMap === "DEMO_SANDBOX") {
      const hasVance = Array.isArray(mapData?.npcs)
        ? mapData.npcs.some(
            (n: { id?: string }) =>
              n.id === "npc_warden_vance" || n.id === "warden_vance"
          )
        : false;
      if (!hasVance) {
        this.engine.events.emit("spawnCreature", {
          templateId: "npc_warden_vance",
          entityType: "NPC",
          mapId: instanceId,
          x: DEMO_VANCE_SPAWN.x,
          y: DEMO_VANCE_SPAWN.y,
          spawnMode: "STATIC",
          name: "Warden Vance",
          spriteKey: "professor",
        });
      }

      for (const spot of DEMO_WILD_SPOTS) {
        this.engine.events.emit("spawnCreature", {
          templateId: "rockitten",
          entityType: "CREATURE",
          mapId: instanceId,
          x: spot.x,
          y: spot.y,
          spawnMode: "ROAMING",
        });
      }
    }

    return instance;
  }

  /**
   * Studio place-NPC: push a live STATIC NPC onto every warm instance of this
   * base map and refresh the map-loader cache so future joins see it too.
   */
  public spawnNpcLive(
    baseMapId: string,
    npc: { id: string; name: string; x: number; y: number; sprite?: string }
  ): number {
    const base = toBaseMapId(String(baseMapId || ""));
    if (!base || !npc?.id) return 0;

    mapLoader.invalidateMap(base);
    void mapLoader.loadMapData(base).catch((err: unknown) => {
      console.warn("[WorldManager] spawnNpcLive cache reload failed:", err);
    });

    const rawId = String(npc.id);
    const dialogueNpcId = rawId.startsWith("npc_") ? rawId : `npc_${rawId}`;
    const spriteKey = String(npc.sprite || rawId.replace(/^npc_/, ""))
      .replace(/^\/game-assets\/npc\//, "")
      .replace(/\.png$/, "");

    let spawned = 0;
    for (const [instanceId, inst] of this.instances.entries()) {
      if (inst.mapId !== base) continue;
      this.engine.events.emit("spawnCreature", {
        templateId: rawId.replace(/^npc_/, ""),
        entityType: "NPC",
        mapId: instanceId,
        x: Number(npc.x) || 0,
        y: Number(npc.y) || 0,
        spawnMode: "STATIC",
        name: npc.name || rawId,
        spriteKey,
        dialogueNpcId,
      });
      spawned++;
    }
    return spawned;
  }

  /**
   * Studio delete-NPC: despawn live entities matching the stable npc id on
   * every warm instance, then refresh map-loader cache.
   */
  public despawnNpcLive(baseMapId: string, npcId: string): number {
    const base = toBaseMapId(String(baseMapId || ""));
    const id = String(npcId || "");
    if (!base || !id) return 0;

    mapLoader.invalidateMap(base);
    void mapLoader.loadMapData(base).catch((err: unknown) => {
      console.warn("[WorldManager] despawnNpcLive cache reload failed:", err);
    });

    let removed = 0;
    for (const [instanceId, inst] of this.instances.entries()) {
      if (inst.mapId !== base) continue;
      this.engine.events.emit("despawnNpcById", {
        mapId: instanceId,
        npcId: id,
        callback: (n: number) => {
          removed += n || 0;
        },
      });
    }
    return removed;
  }

  public getInstance(instanceId: string): MapInstance | undefined {
    return this.instances.get(instanceId);
  }

  /** Resolve by instanceId or base mapId (client often sends DEMO_SANDBOX). */
  public resolveInstance(mapOrInstanceId: string): MapInstance | undefined {
    if (!mapOrInstanceId) return undefined;
    const direct = this.instances.get(mapOrInstanceId);
    if (direct) return direct;
    const base = toBaseMapId(mapOrInstanceId);
    for (const inst of this.instances.values()) {
      if (inst.instanceId === mapOrInstanceId) return inst;
      if (inst.mapId === base || inst.mapId === mapOrInstanceId) return inst;
    }
    return undefined;
  }

  /** Clear bramble for one account only — shared map grid/DB stay tile 11. */
  public clearBrambleForAccount(
    accountKeys: string[],
    baseMapId: string,
    x: number,
    y: number
  ): boolean {
    const map =
      typeof mapLoader.getMapDataSync === "function"
        ? mapLoader.getMapDataSync(baseMapId)
        : mapLoader.getCachedMap?.(baseMapId);
    const tile = map?.grid?.[y]?.[x];
    const already = accountKeys.some((k) => this.hasAccountClearedBramble(k, x, y));
    if (tile !== 11 && !already) return false;
    for (const key of accountKeys) {
      if (!key) continue;
      let set = this.clearedBrambleByAccount.get(key);
      if (!set) {
        set = new Set();
        this.clearedBrambleByAccount.set(key, set);
      }
      set.add(`${x},${y}`);
    }
    return true;
  }

  public hasAccountClearedBramble(accountKey: string, x: number, y: number): boolean {
    if (!accountKey) return false;
    return this.clearedBrambleByAccount.get(accountKey)?.has(`${x},${y}`) ?? false;
  }

  public listClearedBramble(accountKey: string): Array<{ x: number; y: number }> {
    const set = this.clearedBrambleByAccount.get(accountKey);
    if (!set) return [];
    const out: Array<{ x: number; y: number }> = [];
    for (const cell of set) {
      const [xs, ys] = cell.split(",");
      out.push({ x: parseInt(xs, 10), y: parseInt(ys, 10) });
    }
    return out;
  }

  /** Open the full demo bramble gate for this account (personal overlay). */
  public clearDemoBrambleGateForAccount(accountKeys: string[]): Array<{ x: number; y: number }> {
    const cells = WorldManager.DEMO_BRAMBLE_CELLS;
    for (const { x, y } of cells) {
      this.clearBrambleForAccount(accountKeys, DEMO_MAP_ID, x, y);
    }
    return [...cells];
  }

  /** @deprecated Shared-grid clear — must not wipe the demo map for other accounts. */
  public clearBrambleAt(baseMapId: string, x: number, y: number): boolean {
    const map =
      typeof mapLoader.getMapDataSync === "function"
        ? mapLoader.getMapDataSync(baseMapId)
        : mapLoader.getCachedMap?.(baseMapId);
    return map?.grid?.[y]?.[x] === 11;
  }

  public forceJoinInstance(instanceId: string, accountId: string): MapInstance | undefined {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.playerCount++;
      return instance;
    }
    return undefined;
  }

  public async joinMap(
    mapId: string,
    accountId: string,
    isPrivate: boolean = false,
    opts?: { pie?: boolean }
  ): Promise<MapInstance> {
    // Always shard against the base definition id — never DEMO_SANDBOX_ch1_ch1.
    // Retired sandboxes (SAINTS_VILLAGE) remap to the live demo map.
    let baseMapId = toBaseMapId(String(mapId || DEMO_MAP_ID)) || DEMO_MAP_ID;
    if (baseMapId === "SAINTS_VILLAGE") baseMapId = DEMO_MAP_ID;
    // Ensure WorldMap (incl. NPC sprite keys) is cached before first shard spawn.
    await mapLoader.loadMapData(baseMapId);

    if (opts?.pie) {
      // Bible 32 — Play-In-Editor private room (isolate from public DEMO shards).
      const instanceId = studioPieRoomId(accountId);
      let instance = this.instances.get(instanceId);
      if (!instance) {
        instance = this.createInstance(instanceId, baseMapId);
      }
      instance.playerCount++;
      return instance;
    }

    if (isPrivate) {
      // Private instances (e.g. player bases / Studio author) are isolated per account
      const instanceId = `${baseMapId}_${accountId}`;
      let instance = this.instances.get(instanceId);
      if (!instance) {
        instance = this.createInstance(instanceId, baseMapId);
      }
      instance.playerCount++;
      return instance;
    }

    // Public maps use dynamic sharding — ONLY `_chN` rooms.
    // Private (`MAP_<accountId>`) and PIE (`studio_pie_*`) must never be selected.
    const pick = pickPublicShardAssignment(
      baseMapId,
      Array.from(this.instances.values()).map((inst) => ({
        instanceId: inst.instanceId,
        mapId: inst.mapId,
        playerCount: inst.playerCount,
      })),
      MAX_PLAYERS_PER_SHARD
    );

    let availableShard: MapInstance | undefined;
    if (pick.action === "join") {
      availableShard = this.instances.get(pick.instanceId);
    }
    if (!availableShard) {
      const newInstanceId =
        pick.action === "create" ? pick.instanceId : `${baseMapId}_ch1`;
      availableShard = this.createInstance(newInstanceId, baseMapId);
    }

    availableShard.playerCount++;
    return availableShard;
  }

  public leaveInstance(instanceId: string, accountId: string) {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.playerCount = Math.max(0, instance.playerCount - 1);
      // Drop empty private/PIE rooms so they cannot be mistaken for public shards.
      // Keep empty public `_chN` rooms warm to avoid thrashing channel numbers.
      if (
        instance.playerCount === 0 &&
        !isPublicChannelInstanceId(instanceId)
      ) {
        this.instances.delete(instanceId);
      }
    }
  }

  // COLLISION AUTHORITY: 
  // The server completely owns collision data. Clients handle visuals, but the server verifies 
  // every movement against the loaded Map Definition to prevent walking through walls.
  // Optional accountId: personal bramble clears (CONTINUE #2) do not alter shared grid.
  public isWalkable(instanceId: string, x: number, y: number, accountId?: string): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;
    if (mapLoader.isWalkableSync(instance.mapId, x, y)) return true;
    if (accountId && this.hasAccountClearedBramble(accountId, x, y)) {
      const map =
        typeof mapLoader.getMapDataSync === "function"
          ? mapLoader.getMapDataSync(instance.mapId)
          : mapLoader.getCachedMap?.(instance.mapId);
      // Cleared bramble stays tile 11 on shared grid — treat as walkable for this account
      if (map?.grid?.[y]?.[x] === 11) return true;
    }
    return false;
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

  public setNodeDepleted(instanceId: string, x: number, y: number, respawnTimeMs: number) {
    const key = `${instanceId}_${x}_${y}`;
    this.depletedNodes.set(key, Date.now() + respawnTimeMs);
    
    this.engine.events.emit("networkBroadcast", {
      room: instanceId,
      event: "node_depleted",
      data: { instanceId, x, y, respawnTimeMs }
    });
  }

  private resolveCollisions() {
    // Spatial grid handles O(1) occupancy.
    // The GameEngine emits this event, and specific managers 
    // (like PlayerManager or NpcManager) check occupancy during their movement phase.
  }
}
