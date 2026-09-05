import { ChunkKey, WORLD_CHUNK_SIZE, RenderedChunk } from '../shared/game/types/map';
import { globalStreamingQueue, StreamTarget } from '../shared/game/chunkStreaming';
import { BabylonEngine } from './BabylonEngine';

export class StreamingManager {
  private engine: BabylonEngine;
  private activeChunks = new Set<string>(); // Set of cache keys that are currently VISIBLE
  private pendingBuilds = new Set<string>(); // Chunks that are fetched but still building

  constructor(engine: BabylonEngine) {
    this.engine = engine;
  }

  public update(cameraX: number, cameraZ: number, dirX: number, dirZ: number) {
    const target: StreamTarget = { x: cameraX, z: cameraZ, dirX, dirZ };
    
    // 1. Queue nearby chunks based on camera position
    this.queueSurroundingChunks(cameraX, cameraZ);

    // 2. Update priorities in the queue based on new target
    globalStreamingQueue.updatePriorities(target);

    // 3. Process the queue (fetch/build)
    this.processQueue();
  }

  private queueSurroundingChunks(worldX: number, worldZ: number) {
    const mapWidthChunks = Math.ceil(this.engine.getMapWidth() / WORLD_CHUNK_SIZE);
    const mapHeightChunks = Math.ceil(this.engine.getMapHeight() / WORLD_CHUNK_SIZE);

    // Current chunk coords
    const centerCX = Math.floor(worldX / WORLD_CHUNK_SIZE);
    const centerCZ = Math.floor(worldZ / WORLD_CHUNK_SIZE);
    
    const mapId = this.engine.currentMapId;
    const mapVersion = 1; // TODO: Get from map data

    // 3x3 radius
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const cx = centerCX + dx;
        const cz = centerCZ + dz;
        
        // Out of bounds
        if (cx < 0 || cz < 0 || cx >= mapWidthChunks || cz >= mapHeightChunks) {
          continue;
        }

        const key: ChunkKey = { mapId, mapVersion, chunkX: cx, chunkZ: cz, worldTransform: { x: 0, z: 0 } };
        
        const cacheKey = `${mapId}_v${mapVersion}_${cx}_${cz}`;
        if (!this.activeChunks.has(cacheKey) && !this.pendingBuilds.has(cacheKey)) {
          // Must-Be-Ready transition logic: if the chunk is at the edge of the map, it is a transition chunk
          const isTransition = (cx === 0 || cx === mapWidthChunks - 1 || cz === 0 || cz === mapHeightChunks - 1); 
          globalStreamingQueue.requestChunk(key, isTransition);
        }
      }
    }
  }

  private processQueue() {
    // Get top priority requests
    while (globalStreamingQueue.canFetchMore()) {
      const requests = globalStreamingQueue.getSeraphtRequests(1);
      if (requests.length === 0) break;

      const req = requests[0];
      const cacheKey = `${req.key.mapId}_v${req.key.mapVersion}_${req.key.chunkX}_${req.key.chunkZ}`;
      
      // Mark as fetching
      globalStreamingQueue.markFetchStarted();
      this.pendingBuilds.add(cacheKey);

      // Async fetch and build
      this.fetchAndBuildChunk(req.key).then((chunkMeshes) => {
        globalStreamingQueue.markFetchComplete(req.key);
        this.pendingBuilds.delete(cacheKey);
        this.activeChunks.add(cacheKey);
        
        // Atomic Activation: It is now completely READY and VISIBLE.
        // Meshes are built disabled, we enable them in one go.
        if (chunkMeshes && Array.isArray(chunkMeshes)) {
          for (const mesh of chunkMeshes) {
            mesh.isVisible = true;
          }
        }
      }).catch(err => {
        globalStreamingQueue.markFetchComplete(req.key);
        this.pendingBuilds.delete(cacheKey);
        // Let the retry/backoff logic handle it
        console.error("Chunk fetch failed", err);
      });
    }
  }

  private async fetchAndBuildChunk(key: ChunkKey): Promise<any[]> {
    // In Phase 2, this fetches content and then builds geometry.
    // For now, this is a placeholder mimicking the async workflow.
    return new Promise((resolve) => setTimeout(() => resolve([]), Math.random() * 200 + 50));
  }
}
