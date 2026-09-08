import { VoxelWorld } from '../../shared/game/voxel/VoxelWorldDoc';
import { VoxelChunk, CHUNK_SIZE_X, CHUNK_SIZE_Z } from '../../shared/game/voxel/VoxelChunk';
import { VoxelController } from '../VoxelController';
import { ProceduralGenerator } from '../../shared/game/voxel/proceduralGenerator';
import { VOXEL_MAT_ATLAS_PORTAL, VOXEL_MAT_STONE, packVoxel, VoxelShape, VoxelOrientation, VoxelPhysics, VOXEL_WORD_AIR_LOW, VOXEL_WORD_AIR_HIGH } from '../../shared/game/voxel/VoxelWord';

export class ChunkStreamer {
  private loadedChunks = new Set<string>();
  private pendingChunks = new Set<string>();
  
  public visibleRadius = 8;
  public preloadRadius = 10;
  public evictRadius = 12;
  
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
    this.visibleRadius = radius;
    this.preloadRadius = radius + 2;
    this.evictRadius = radius + 4;
    this.updateStreaming(this.currentCx, this.currentCz, true);
  }

  /**
   * Called every frame or periodically with the player/camera's chunk coordinates.
   */
  public updateStreaming(cx: number, cz: number, force = false) {
    if (this.currentCx === cx && this.currentCz === cz && !force) return;
    
    this.currentCx = cx;
    this.currentCz = cz;

    // Use preloadRadius to determine what we need to fetch
    const minCx = cx - this.preloadRadius;
    const maxCx = cx + this.preloadRadius;
    const minCz = cz - this.preloadRadius;
    const maxCz = cz + this.preloadRadius;

    const neededChunks = new Set<string>();

    for (let x = minCx; x <= maxCx; x++) {
      for (let z = minCz; z <= maxCz; z++) {
        // Only load if within circular radius roughly, or square is fine for now
        neededChunks.add(`${x}_${z}`);
      }
    }

    // Unload chunks outside of evictRadius
    const unloadMinCx = cx - this.evictRadius;
    const unloadMaxCx = cx + this.evictRadius;
    const unloadMinCz = cz - this.evictRadius;
    const unloadMaxCz = cz + this.evictRadius;

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
        break; 
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
    const url = `/api/maps/${this.mapSlug}/chunks?cx=${cx}&cz=${cz}&radius=${this.preloadRadius}`;
    
    // Mark them as pending
    const minCx = cx - this.preloadRadius;
    const maxCx = cx + this.preloadRadius;
    const minCz = cz - this.preloadRadius;
    const maxCz = cz + this.preloadRadius;
    
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
          if (override) {
            if (override.dataLow) {
              baseChunk.dataLow.set(new Uint32Array(override.dataLow));
            }
            if (override.dataHigh) {
              baseChunk.dataHigh.set(new Uint32Array(override.dataHigh));
            }
          }

          // Apply physical portal shrines based on gates
          const gates = (this.voxelController.engine as any).currentRawMapData?.gatesData?.gates || [];
          this.applyPortalShrines(baseChunk, gates);

          // Tell mesher to mesh this chunk only if within visible radius
          if (Math.abs(x - cx) <= this.visibleRadius && Math.abs(z - cz) <= this.visibleRadius) {
            const result = this.voxelController.voxelMesher?.meshChunk(world, baseChunk);
            if (result && (this.voxelController as any).engine.rootNode) {
              result.mesh.parent = (this.voxelController as any).engine.rootNode;
            }
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

      const gates = (this.voxelController.engine as any).currentRawMapData?.gatesData?.gates || [];
      this.applyPortalShrines(baseChunk, gates);

      if (json.chunks && json.chunks.length > 0) {
        const override = json.chunks.find((c: any) => c.cx === cx && c.cz === cz);
        if (override) {
          if (override.dataLow) {
            baseChunk.dataLow.set(new Uint32Array(override.dataLow));
          }
          if (override.dataHigh) {
            baseChunk.dataHigh.set(new Uint32Array(override.dataHigh));
          }
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

  private applyPortalShrines(chunk: VoxelChunk, gates: any[]) {
    for (const gate of gates) {
      if (gate.category === 'PORTAL' && gate.position) {
        const gx = Math.floor(gate.position.x);
        const gy = Math.floor(gate.position.z);
        const gz = Math.floor(gate.position.y);

        // Check if gate falls in this chunk
        const gateCx = Math.floor(gx / CHUNK_SIZE_X);
        const gateCz = Math.floor(gz / CHUNK_SIZE_Z);

        if (gateCx === chunk.cx && gateCz === chunk.cz) {
          const localX = gx - (chunk.cx * CHUNK_SIZE_X);
          const localZ = gz - (chunk.cz * CHUNK_SIZE_Z);

          // Build a small 3x3 platform
          for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
              const lx = localX + dx;
              const lz = localZ + dz;
              if (lx >= 0 && lx < CHUNK_SIZE_X && lz >= 0 && lz < CHUNK_SIZE_Z) {
                // The platform block
                const stoneWord = packVoxel(VOXEL_MAT_STONE, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);
                chunk.set(lx, gy - 1, lz, stoneWord.low, stoneWord.high);
                // Clear above
                chunk.set(lx, gy, lz, VOXEL_WORD_AIR_LOW, VOXEL_WORD_AIR_HIGH);
                chunk.set(lx, gy + 1, lz, VOXEL_WORD_AIR_LOW, VOXEL_WORD_AIR_HIGH);
                chunk.set(lx, gy + 2, lz, VOXEL_WORD_AIR_LOW, VOXEL_WORD_AIR_HIGH);
              }
            }
          }
          // The portal block
          const portalWord = packVoxel(VOXEL_MAT_ATLAS_PORTAL, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);
          chunk.set(localX, gy, localZ, portalWord.low, portalWord.high);
        }
      }
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
          dataLow: Array.from(chunk.dataLow),
          dataHigh: Array.from(chunk.dataHigh)
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
