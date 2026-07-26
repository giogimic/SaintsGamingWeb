export interface ChunkCoord {
  x: number;
  y: number;
}

export interface MapChunkData {
  chunkX: number;
  chunkY: number;
  size: number;
  tiles: number[][];
}

export class MapChunkLoader {
  private chunkCache: Map<string, MapChunkData> = new Map();
  private chunkSize: number = 32;

  async loadMap(mapId: string): Promise<any> {
    const res = await fetch(`/api/maps/${encodeURIComponent(mapId)}`);
    if (!res.ok) throw new Error(`Failed to load map: ${mapId}`);
    return res.json();
  }

  getVisibleChunks(cameraX: number, cameraZ: number, viewportWidth: number, viewportHeight: number): ChunkCoord[] {
    const startChunkX = Math.floor((cameraX - viewportWidth / 2) / this.chunkSize);
    const endChunkX = Math.ceil((cameraX + viewportWidth / 2) / this.chunkSize);
    const startChunkY = Math.floor((cameraZ - viewportHeight / 2) / this.chunkSize);
    const endChunkY = Math.ceil((cameraZ + viewportHeight / 2) / this.chunkSize);

    const chunks: ChunkCoord[] = [];
    for (let cx = startChunkX; cx <= endChunkX; cx++) {
      for (let cy = startChunkY; cy <= endChunkY; cy++) {
        chunks.push({ x: cx, y: cy });
      }
    }
    return chunks;
  }

  unloadDistantChunks(visibleChunks: ChunkCoord[], mapId: string): void {
    const visibleKeys = new Set(visibleChunks.map((c) => `${mapId}_${c.x}_${c.y}`));
    for (const key of this.chunkCache.keys()) {
      if (!visibleKeys.has(key) && key.startsWith(mapId)) {
        this.chunkCache.delete(key);
      }
    }
  }
}
