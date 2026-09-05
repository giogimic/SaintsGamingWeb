import { ChunkKey, WORLD_CHUNK_SIZE } from './types/map';

export interface StreamTarget {
  x: number; // world x
  z: number; // world z
  dirX: number; // -1, 0, 1
  dirZ: number; // -1, 0, 1
}

export interface StreamRequest {
  key: ChunkKey;
  priorityScore: number;
  isMapTransition: boolean;
}

export class ChunkStreamingQueue {
  private requests: Map<string, StreamRequest> = new Map();
  private maxConcurrentFetches = 4;
  private activeFetches = 0;

  public requestChunk(key: ChunkKey, isMapTransition = false) {
    const id = this.getHash(key);
    if (!this.requests.has(id)) {
      this.requests.set(id, { key, priorityScore: 999999, isMapTransition });
    } else {
      const existing = this.requests.get(id)!;
      existing.isMapTransition = existing.isMapTransition || isMapTransition;
    }
  }

  public cancelChunk(key: ChunkKey) {
    const id = this.getHash(key);
    this.requests.delete(id);
  }

  public updatePriorities(target: StreamTarget) {
    for (const req of this.requests.values()) {
      req.priorityScore = this.calculatePriority(req.key, target, req.isMapTransition);
    }
  }

  public getSeraphtRequests(count: number): StreamRequest[] {
    const sorted = Array.from(this.requests.values()).sort((a, b) => a.priorityScore - b.priorityScore);
    return sorted.slice(0, count);
  }

  public markFetchStarted() {
    this.activeFetches++;
  }

  public markFetchComplete(key: ChunkKey) {
    this.activeFetches--;
    this.cancelChunk(key);
  }

  public getActiveFetches() {
    return this.activeFetches;
  }

  public canFetchMore() {
    return this.activeFetches < this.maxConcurrentFetches;
  }

  private calculatePriority(key: ChunkKey, target: StreamTarget, isTransition: boolean): number {
    const chunkWorldX = key.chunkX * WORLD_CHUNK_SIZE;
    const chunkWorldZ = key.chunkZ * WORLD_CHUNK_SIZE;
    
    // Distance to center of chunk
    const dx = (chunkWorldX + WORLD_CHUNK_SIZE / 2) - target.x;
    const dz = (chunkWorldZ + WORLD_CHUNK_SIZE / 2) - target.z;
    const distanceSq = dx * dx + dz * dz;

    // Movement direction bias
    // Dot product to see if we are moving towards the chunk
    // Normalize target dir if needed, but assuming small integers
    const dot = (dx * target.dirX + dz * target.dirZ);
    // If dot > 0, we are moving towards it (lower multiplier = better priority)
    let bias = dot > 0 ? 0.6 : 1.4;

    // If it's a map transition, prioritize it highly
    if (isTransition) {
      bias *= 0.1; 
    }

    // Proximity to camera visibility (simple heuristics for now)
    return distanceSq * bias;
  }

  private getHash(key: ChunkKey): string {
    return `${key.mapId}_v${key.mapVersion}_${key.chunkX}_${key.chunkZ}`;
  }
}

// Global singleton queue
export const globalStreamingQueue = new ChunkStreamingQueue();
