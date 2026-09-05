
import { ProceduralGenerator } from '@/shared/game/voxel/proceduralGenerator';


export class EntitySpawner {
  private static instance: EntitySpawner;
  private tickInterval: NodeJS.Timeout | null = null;
  private proceduralGen: ProceduralGenerator;
  
  // Track currently active chunks (cx, cz) -> timestamp
  private activeChunks = new Map<string, number>();

  private constructor() {
    this.proceduralGen = new ProceduralGenerator(42); // Demo global seed
  }

  public static getInstance(): EntitySpawner {
    if (!EntitySpawner.instance) {
      EntitySpawner.instance = new EntitySpawner();
    }
    return EntitySpawner.instance;
  }

  public start() {
    if (this.tickInterval) return;
    
    // Tick every 10 seconds to evaluate ecosystem spawning
    this.tickInterval = setInterval(() => this.tick(), 10000);
    console.log("[EntitySpawner] Ecosystem spawner started.");
  }

  public stop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  /**
   * Called when a player moves or pings their location.
   * Keeps the chunk active in memory so entities can spawn.
   */
  public registerPlayerPresence(mapId: string, cx: number, cz: number) {
    const key = `${mapId}:${cx}:${cz}`;
    this.activeChunks.set(key, Date.now());
  }

  private async tick() {
    const now = Date.now();
    const activeThreshold = 30000; // Chunks stay active for 30 seconds after last player presence

    for (const [key, lastActive] of this.activeChunks.entries()) {
      if (now - lastActive > activeThreshold) {
        this.activeChunks.delete(key);
        // We could theoretically despawn ephemeral entities here
        continue;
      }

      const [mapId, cxStr, czStr] = key.split(':');
      const cx = parseInt(cxStr, 10);
      const cz = parseInt(czStr, 10);

      // Evaluate spawning for this chunk
      await this.evaluateSpawning(mapId, cx, cz);
    }
  }

  private async evaluateSpawning(mapId: string, cx: number, cz: number) {
    // 1. Get biome at chunk center
    const worldX = cx * 32 + 16;
    const worldZ = cz * 32 + 16;
    const biome = this.proceduralGen.getBiomeAt(worldX, worldZ);

    const { spawnableEntities } = biome.features;
    if (!spawnableEntities || spawnableEntities.length === 0) return;

    // 2. Roll for spawn event (e.g., 5% chance per tick per active chunk)
    if (Math.random() > 0.05) return;

    // 3. Select an entity
    let totalWeight = 0;
    for (const ent of spawnableEntities) totalWeight += ent.weight;
    
    let roll = Math.random() * totalWeight;
    let selectedEntity: any = null;
    for (const ent of spawnableEntities) {
      if (roll < ent.weight) {
        selectedEntity = ent;
        break;
      }
      roll -= ent.weight;
    }

    if (!selectedEntity) return;

    // 4. Instantiate entity (mock database insert for Demo)
    // Find a random spot in the chunk
    const lx = Math.floor(Math.random() * 32);
    const lz = Math.floor(Math.random() * 32);
    const spawnX = cx * 32 + lx;
    const spawnZ = cz * 32 + lz;

    // We don't have the exact chunk data here on the server loop to know the exact Y,
    // so we spawn them slightly above base terrain and let gravity resolve it, or 
    // query the procedural generator for the base surface height.
    const spawnY = biome.terrain.baseHeight + 5; 

    const groupSize = 1 + Math.floor(Math.random() * selectedEntity.maxGroupSize);

    for (let i = 0; i < groupSize; i++) {
      try {
        // In the full MMO architecture, the Node.js server signals the Go MMO backend to instantiate the AI.
        // We do not save ephemeral mobs to the Prisma database to save database IO.
        // RealtimeService.getInstance().publishEvent('SPAWN_ENTITY', { type: selectedEntity.entityId, x: spawnX, z: spawnZ });
      } catch (e) {
        console.error("[EntitySpawner] Failed to spawn entity:", e);
      }
    }
    
    console.log(`[EntitySpawner] Spawned ${groupSize} ${selectedEntity.entityId} in ${mapId} at ${spawnX}, ${spawnZ}`);
  }
}
