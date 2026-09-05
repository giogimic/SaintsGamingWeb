import { VoxelWorld } from '../../shared/game/voxel/VoxelWorldDoc';
import { VoxelChunk, CHUNK_SIZE_X, CHUNK_SIZE_Z } from '../../shared/game/voxel/VoxelChunk';
import { VoxelController } from '../VoxelController';
import { ProceduralGenerator } from '../../shared/game/voxel/proceduralGenerator';

export class ChunkStreamer {
  private loadedChunks = new Set<string>();
  private pendingChunks = new Set<string>();
  
  public renderRadius = 3; // Default 3 chunks (radius)
  
  private currentCx = 0;
  private currentCz = 0;
  private mapSlug: string;
  private voxelController: VoxelController;
  private proceduralGenerator: ProceduralGenerator;

  constructor(mapSlug: string, voxelController: VoxelController) {
    this.mapSlug = mapSlug;
    this.voxelController = voxelController;
    // We could pass seed from the map data, but using a default seed for now
    this.proceduralGenerator = new ProceduralGenerator(42); 
  }

  public setRenderRadius(radius: number) {
    this.renderRadius = radius;
    this.updateStreaming(this.currentCx, this.currentCz, true);
  }

  /**
   * Called every frame or periodically with the player/camera's chunk coordinates.
   */
  public updateStreaming(cx: number, cz: number, force = false) {
    if (this.currentCx === cx && this.currentCz === cz && !force) return;
    
    this.currentCx = cx;
    this.currentCz = cz;

    const minCx = cx - this.renderRadius;
    const maxCx = cx + this.renderRadius;
    const minCz = cz - this.renderRadius;
    const maxCz = cz + this.renderRadius;

    const neededChunks = new Set<string>();

    for (let x = minCx; x <= maxCx; x++) {
      for (let z = minCz; z <= maxCz; z++) {
        neededChunks.add(`${x}_${z}`);
      }
    }

    // Unload chunks outside of radius + buffer (e.g., radius + 1)
    const unloadRadius = this.renderRadius + 1;
    const unloadMinCx = cx - unloadRadius;
    const unloadMaxCx = cx + unloadRadius;
    const unloadMinCz = cz - unloadRadius;
    const unloadMaxCz = cz + unloadRadius;

    for (const key of this.loadedChunks) {
      const [kx, kz] = key.split('_').map(Number);
      if (kx < unloadMinCx || kx > unloadMaxCx || kz < unloadMinCz || kz > unloadMaxCz) {
        this.unloadChunk(kx, kz);
      }
    }

    // Load needed chunks that are not loaded or pending
    let needsFetch = false;
    for (const key of neededChunks) {
      if (!this.loadedChunks.has(key) && !this.pendingChunks.has(key)) {
        needsFetch = true;
        break; // If any chunk needs fetching, we'll fetch the whole radius via API
      }
    }

    if (needsFetch) {
      this.fetchChunks(cx, cz);
    }
  }

  private unloadChunk(cx: number, cz: number) {
    const key = `${cx}_${cz}`;
    this.loadedChunks.delete(key);
    this.pendingChunks.delete(key);
    
    const world = this.voxelController.voxelWorld;
    if (!world) return;

    // A chunk could have multiple heights (cy), but for now we assume cy=0 or we dispose all matching cx/cz
    const cy = 0; // TODO: handle multiple heights
    const chunkKey = `${cx}_${cy}_${cz}`;
    
    // Dispose mesh
    this.voxelController.voxelMesher?.disposeChunkMesh(chunkKey);
    // Remove from world
    world.chunks.delete(chunkKey);
  }

  private async fetchChunks(cx: number, cz: number) {
    // We fetch a radius around the cx, cz
    const url = `/api/maps/${this.mapSlug}/chunks?cx=${cx}&cz=${cz}&radius=${this.renderRadius}`;
    
    // Mark them as pending
    const minCx = cx - this.renderRadius;
    const maxCx = cx + this.renderRadius;
    const minCz = cz - this.renderRadius;
    const maxCz = cz + this.renderRadius;
    
    for (let x = minCx; x <= maxCx; x++) {
      for (let z = minCz; z <= maxCz; z++) {
        this.pendingChunks.add(`${x}_${z}`);
      }
    }

    try {
      // Fire an event for UI to show "Generating..."
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('map-streaming-start'));
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch chunks');
      
      const json = await res.json();
      
      const world = this.voxelController.voxelWorld;
      if (!world) return;

      const overrideChunks = new Map<string, any>();
      if (json.chunks) {
        for (const c of json.chunks) {
          overrideChunks.set(`${c.cx}_${c.cz}`, c);
        }
      }

      for (let x = minCx; x <= maxCx; x++) {
        for (let z = minCz; z <= maxCz; z++) {
          const key = `${x}_${z}`;
          this.pendingChunks.delete(key);
          this.loadedChunks.add(key);

          const cy = 0;
          const chunkKey = `${x}_${cy}_${z}`;
          
          // Generate base procedural chunk
          const baseChunk = this.proceduralGenerator.generateChunk(x, z, cy);
          world.chunks.set(chunkKey, baseChunk);

          // Apply overrides from database if they exist
          const override = overrideChunks.get(key);
          if (override && override.data) {
            const dataArray = new Uint32Array(override.data);
            baseChunk.data.set(dataArray);
          }

          // Tell mesher to mesh this chunk
          const result = this.voxelController.voxelMesher?.meshChunk(world, baseChunk);
          if (result && (this.voxelController as any).engine.rootNode) {
            result.mesh.parent = (this.voxelController as any).engine.rootNode;
          }
        }
      }
    } catch (e) {
      console.error("[ChunkStreamer] fetch error:", e);
    } finally {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('map-streaming-end'));
      }
    }
  }

  public forceRefreshAll() {
    // Clear all and re-fetch
    for (const key of this.loadedChunks) {
      const [cx, cz] = key.split('_').map(Number);
      this.unloadChunk(cx, cz);
    }
    this.loadedChunks.clear();
    this.pendingChunks.clear();
    this.updateStreaming(this.currentCx, this.currentCz, true);
  }

  /**
   * Forces a specific chunk to load immediately, bypassing camera radius.
   * Useful when the brush tool hits an unloaded boundary.
   */
  public async forceLoadChunk(cx: number, cz: number) {
    const key = `${cx}_${cz}`;
    if (this.loadedChunks.has(key) || this.pendingChunks.has(key)) return;
    
    this.pendingChunks.add(key);

    try {
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('map-streaming-start'));
      const res = await fetch(`/api/maps/${this.mapSlug}/chunks?cx=${cx}&cz=${cz}&radius=0`);
      if (!res.ok) throw new Error('Failed to fetch chunk');
      
      const json = await res.json();
      const world = this.voxelController.voxelWorld;
      if (!world) return;

      this.pendingChunks.delete(key);
      this.loadedChunks.add(key);

      const cy = 0;
      const chunkKey = `${cx}_${cy}_${cz}`;
      const baseChunk = this.proceduralGenerator.generateChunk(cx, cz, cy);
      world.chunks.set(chunkKey, baseChunk);

      if (json.chunks && json.chunks.length > 0) {
        const override = json.chunks.find((c: any) => c.cx === cx && c.cz === cz);
        if (override && override.data) {
           const dataArray = new Uint32Array(override.data);
           baseChunk.data.set(dataArray);
        }
      }

      const result = this.voxelController.voxelMesher?.meshChunk(world, baseChunk);
      if (result && (this.voxelController as any).engine.rootNode) {
        result.mesh.parent = (this.voxelController as any).engine.rootNode;
      }
    } catch (e) {
      this.pendingChunks.delete(key);
      console.error("[ChunkStreamer] forceLoadChunk error:", e);
    } finally {
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('map-streaming-end'));
    }
  }

  public async saveDirtyChunks() {
    const world = this.voxelController.voxelWorld;
    if (!world) return;

    const dirtyChunks = [];
    for (const chunk of world.chunks.values()) {
      if (chunk.isDirty) {
        dirtyChunks.push({
          cx: chunk.cx,
          cy: chunk.cy,
          cz: chunk.cz,
          data: Array.from(chunk.data)
        });
      }
    }

    if (dirtyChunks.length === 0) return;

    try {
      const res = await fetch(`/api/maps/${this.mapSlug}/chunks`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ chunks: dirtyChunks })
      });

      if (res.ok) {
        for (const chunk of world.chunks.values()) {
          if (chunk.isDirty) chunk.isDirty = false;
        }
      }
    } catch (e) {
      console.error("[ChunkStreamer] Failed to save dirty chunks:", e);
    }
  }
}
