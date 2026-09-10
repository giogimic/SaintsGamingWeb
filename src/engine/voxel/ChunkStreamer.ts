import { VoxelWorld } from '../../shared/game/voxel/VoxelWorldDoc';
import { VoxelChunk, CHUNK_SIZE_X, CHUNK_SIZE_Z } from '../../shared/game/voxel/VoxelChunk';
import { VoxelController } from '../VoxelController';
import { VOXEL_MAT_ATLAS_PORTAL, VOXEL_MAT_STONE, packVoxel, VoxelShape, VoxelOrientation, VoxelPhysics, VOXEL_WORD_AIR_LOW, VOXEL_WORD_AIR_HIGH } from '../../shared/game/voxel/VoxelWord';
import { useGameStore } from '../../web/components/the-lobby/store';

export class ChunkStreamer {
  private loadedChunks = new Set<string>();
  private pendingChunks = new Set<string>();
  private queuedChunks = new Set<string>();
  private unsubStore: () => void;
  
  public visibleRadius = 8;
  public preloadRadius = 10;
  public evictRadius = 12;
  
  private currentCx = Infinity;
  private currentCz = Infinity;
  private mapSlug: string;
  private voxelController: VoxelController;

  constructor(mapSlug: string, voxelController: VoxelController) {
    this.mapSlug = mapSlug;
    this.voxelController = voxelController;

    if (typeof window !== 'undefined') {
      window.addEventListener('voxel_chunk_data', this.onChunkData);
    }
    
    this.unsubStore = useGameStore.subscribe(
      (state) => state.connectionStatus,
      (status) => {
        if (status === 'connected') {
          this.flushQueuedChunks();
        } else if (status === 'disconnected') {
          this.reconcilePendingChunks();
        }
      }
    );
  }

  public destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('voxel_chunk_data', this.onChunkData);
    }
    this.unsubStore();
  }

  private onChunkData = (e: any) => {
    const data = e.detail;
    if (!data || data.cx === undefined || data.cz === undefined || !data.data) return;

    const { cx, cy, cz, data: buffer } = data;
    const key = `${cx}_${cz}`;
    const chunkKey = VoxelChunk.getChunkKey(cx, cz, cy);

    const world = this.voxelController.voxelWorld;
    if (!world) return;

    this.pendingChunks.delete(key);
    this.loadedChunks.add(key);
    
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
      console.debug(`[Diagnostic] ChunkStreamer received chunk: ${key}`);
    }

    const baseChunk = VoxelChunk.deserializePaletteRLEBinary(new Uint8Array(buffer));

    // Apply physical portal shrines based on gates
    const gates = (this.voxelController.engine as any).currentRawMapData?.gatesData?.gates || [];
    this.applyPortalShrines(baseChunk, gates);

    world.chunks.set(chunkKey, baseChunk);
    
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
      console.debug(`[Diagnostic] ChunkStreamer decoded & inserted chunk: ${key}`);
    }

    // Tell mesher to mesh this chunk only if within visible radius
    if (Math.abs(cx - this.currentCx) <= this.visibleRadius && Math.abs(cz - this.currentCz) <= this.visibleRadius) {
      const result = this.voxelController.voxelMesher?.meshChunk(world, baseChunk);
      if (result && (this.voxelController as any).engine.rootNode) {
        result.mesh.parent = (this.voxelController as any).engine.rootNode;
        if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
          console.debug(`[Diagnostic] ChunkStreamer meshed & visible: ${key}`);
        }
      }
    }
  };

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

    // Load needed chunks that are not loaded or pending or queued
    let needsFetch = false;
    for (const key of neededChunks) {
      if (!this.loadedChunks.has(key) && !this.pendingChunks.has(key) && !this.queuedChunks.has(key)) {
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
    this.queuedChunks.delete(key);
    
    const world = this.voxelController.voxelWorld;
    if (!world) return;

    // A chunk could have multiple heights (cy), but for now we assume cy=0 or we dispose all matching cx/cz
    const cy = 0; // TODO: handle multiple heights
    const chunkKey = VoxelChunk.getChunkKey(cx, cz, cy);
    
    // Dispose mesh
    this.voxelController.voxelMesher?.disposeChunkMesh(chunkKey);
    // Remove from world
    world.chunks.delete(chunkKey);
  }

  private fetchChunks(cx: number, cz: number) {
    // We no longer fetch via REST - we emit a websocket event for the chunks we need.
    const minCx = cx - this.preloadRadius;
    const maxCx = cx + this.preloadRadius;
    const minCz = cz - this.preloadRadius;
    const maxCz = cz + this.preloadRadius;
    
    let requestedAny = false;

    for (let x = minCx; x <= maxCx; x++) {
      for (let z = minCz; z <= maxCz; z++) {
        const key = `${x}_${z}`;
        if (!this.pendingChunks.has(key) && !this.loadedChunks.has(key) && !this.queuedChunks.has(key)) {
          this.queueOrSendChunk(x, z, key);
          requestedAny = true;
        }
      }
    }

    if (requestedAny && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('map-streaming-start'));
      // The map-streaming-end event will be handled by the UI or batching if needed, 
      // but for now socket responses are fast enough to just show it briefly.
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('map-streaming-end'));
      }, 500);
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
    this.queuedChunks.clear();
    this.updateStreaming(this.currentCx, this.currentCz, true);
  }

  private queueOrSendChunk(cx: number, cz: number, key: string) {
    const store = useGameStore.getState();
    if (store.connectionStatus === 'connected' && store.emitSocketEvent) {
      this.pendingChunks.add(key);
      if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
        console.debug(`[Diagnostic] ChunkStreamer sent request: ${key}`);
      }
      store.emitSocketEvent('request_chunk', { cx, cy: 0, cz });
    } else {
      this.queuedChunks.add(key);
      if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
        console.debug(`[Diagnostic] ChunkStreamer queued request: ${key}`);
      }
    }
  }

  private flushQueuedChunks() {
    if (this.queuedChunks.size === 0) return;
    const store = useGameStore.getState();
    if (store.connectionStatus !== 'connected' || !store.emitSocketEvent) return;

    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
      console.debug(`[Diagnostic] ChunkStreamer flushing ${this.queuedChunks.size} queued chunks`);
    }

    const toRequest = Array.from(this.queuedChunks);
    this.queuedChunks.clear();

    for (const key of toRequest) {
      const [cx, cz] = key.split('_').map(Number);
      this.pendingChunks.add(key);
      store.emitSocketEvent('request_chunk', { cx, cy: 0, cz });
    }
  }

  private reconcilePendingChunks() {
    if (this.pendingChunks.size === 0) return;
    
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
      console.debug(`[Diagnostic] ChunkStreamer reconciling ${this.pendingChunks.size} pending chunks to queued due to disconnect`);
    }

    for (const key of this.pendingChunks) {
      this.queuedChunks.add(key);
    }
    this.pendingChunks.clear();
  }

  /**
   * Forces a specific chunk to load immediately, bypassing camera radius.
   * Useful when the brush tool hits an unloaded boundary.
   */
  public forceLoadChunk(cx: number, cz: number) {
    const key = `${cx}_${cz}`;
    if (this.loadedChunks.has(key) || this.pendingChunks.has(key) || this.queuedChunks.has(key)) return;
    
    this.queueOrSendChunk(cx, cz, key);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('map-streaming-start'));
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('map-streaming-end'));
      }, 500);
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
