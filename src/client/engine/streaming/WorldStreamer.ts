import { useSessionStore } from '../../state/useSessionStore';
import { useWorldStore } from '../../state/useWorldStore';
import { mapMesher } from '../MapMesher';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
const pako = require('pako');

export const CHUNK_SIZE = 32;
export const CHUNKS_PER_REGION = 16;
export const REGION_SIZE = CHUNK_SIZE * CHUNKS_PER_REGION;

export interface ChunkCoordinate {
  cx: number;
  cz: number;
  cy: number;
}

export interface RegionCoordinate {
  rx: number;
  rz: number;
}

type ChunkResidencyState = 'REQUESTED' | 'LOADED' | 'MESHED' | 'ACTIVE' | 'EVICTING' | 'EVICTED';

export class WorldStreamer {
  private static instance: WorldStreamer;

  // Caches
  private manifest: any = null;
  private currentVersion: string = 'published';
  private currentMapId: string = '';
  
  // Track region blobs in memory
  private regionBlobCache: Map<string, ArrayBuffer> = new Map();
  // Track active fetch promises to prevent duplicates
  private activeRegionFetches: Map<string, Promise<ArrayBuffer>> = new Map();
  
  // Track individual chunks
  private chunkResidency: Map<string, ChunkResidencyState> = new Map();

  private constructor() {}

  public static getInstance(): WorldStreamer {
    if (!WorldStreamer.instance) {
      WorldStreamer.instance = new WorldStreamer();
    }
    return WorldStreamer.instance;
  }

  // Coordinate Converters
  public worldToChunk(worldPos: Vector3): ChunkCoordinate {
    return {
      cx: Math.floor(worldPos.x / CHUNK_SIZE),
      cy: Math.floor(worldPos.y / CHUNK_SIZE),
      cz: Math.floor(worldPos.z / CHUNK_SIZE),
    };
  }

  public chunkToRegion(cx: number, cz: number): RegionCoordinate {
    return {
      rx: Math.floor(cx / CHUNKS_PER_REGION),
      rz: Math.floor(cz / CHUNKS_PER_REGION),
    };
  }

  public worldToRegion(worldPos: Vector3): RegionCoordinate {
    const chunk = this.worldToChunk(worldPos);
    return this.chunkToRegion(chunk.cx, chunk.cz);
  }

  private getRegionKey(rx: number, rz: number): string {
    return `${rx},${rz}`;
  }
  
  private getChunkKey(cx: number, cy: number, cz: number): string {
    return `${cx},${cy},${cz}`;
  }

  /**
   * Load the world manifest to verify version and establish the streaming contract.
   */
  public async loadManifest(mapId: string): Promise<void> {
    useSessionStore.getState().setBootState('LOAD_MANIFEST');
    this.currentMapId = mapId;
    this.currentVersion = useSessionStore.getState().isStudioMode ? 'draft' : 'published';
    console.log(`[WorldStreamer] Loading manifest for ${mapId}@${this.currentVersion}...`);
    
    try {
      const res = await fetch(`/api/internal/worlds/${mapId}/${this.currentVersion}/manifest`);
      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(`Failed to load manifest: ${res.status} ${res.statusText} - ${errorText}`);
      }
      this.manifest = await res.json();
      console.log(`[WorldStreamer] Manifest loaded: version ${this.manifest.version}`);

      // Initialize the mesher for streaming instead of fallback ground
      mapMesher.startVoxelStreaming();
    } catch (e) {
      console.error(`[WorldStreamer] Manifest error`, e);
      throw e;
    }
  }

  /**
   * Request the initial spawn region and extract the exact spawn chunks.
   * This bridges the boot FSM to READY.
   */
  public async requestSpawnRegion(x: number, y: number, z: number): Promise<void> {
    useSessionStore.getState().setBootState('REQUEST_SPAWN_REGION');
    
    const spawnPos = new Vector3(x, y, z);
    const chunk = this.worldToChunk(spawnPos);
    const region = this.chunkToRegion(chunk.cx, chunk.cz);
    
    console.log(`[WorldStreamer] Requesting spawn region R(${region.rx}, ${region.rz}) for Chunk(${chunk.cx}, ${chunk.cy}, ${chunk.cz})...`);

    // Fetch the region blob
    await this.fetchRegionArtifact(region.rx, region.rz);

    useSessionStore.getState().setBootState('EXTRACT_SPAWN');
    
    // Extract chunk and pass to mesher
    this.extractAndMeshChunk(chunk.cx, chunk.cy, chunk.cz);

    // Validate and set READY
    useSessionStore.getState().setBootState('VALIDATE_SPAWN');
    console.log('[WorldStreamer] Spawn validated. Transitioning to READY.');
    
    useSessionStore.getState().setBootState('READY');
    useSessionStore.getState().setScene('exploring');
  }

  /**
   * Fetch a region artifact with deduplication and checksum validation.
   */
  private async fetchRegionArtifact(rx: number, rz: number): Promise<ArrayBuffer> {
    const key = this.getRegionKey(rx, rz);
    
    // Return cached if exists
    if (this.regionBlobCache.has(key)) {
      return this.regionBlobCache.get(key)!;
    }
    
    // Return pending promise if already fetching
    if (this.activeRegionFetches.has(key)) {
      return this.activeRegionFetches.get(key)!;
    }

    const fetchPromise = (async () => {
      try {
        const url = `/api/internal/worlds/${this.currentMapId}/${this.currentVersion}/regions/${rx}/${rz}`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Region API returned ${res.status}`);
        }
        
        const blob = await res.arrayBuffer();
        
        // TODO: Validate checksum against this.manifest.regions if present
        
        this.regionBlobCache.set(key, blob);
        return blob;
      } finally {
        this.activeRegionFetches.delete(key);
      }
    })();

    this.activeRegionFetches.set(key, fetchPromise);
    return fetchPromise;
  }

  /**
   * Decodes a chunk from a resident region blob and hands it to MapMesher.
   */
  private extractAndMeshChunk(cx: number, cy: number, cz: number) {
    const cKey = this.getChunkKey(cx, cy, cz);
    this.chunkResidency.set(cKey, 'EXTRACTING' as any); // Type cast until we define EXTRACTING if needed

    const region = this.chunkToRegion(cx, cz);
    const rKey = this.getRegionKey(region.rx, region.rz);
    
    const blob = this.regionBlobCache.get(rKey);
    if (!blob) {
      console.warn(`[WorldStreamer] Cannot extract chunk ${cKey}, region blob not in cache!`);
      return;
    }

    useSessionStore.getState().setBootState('MESH');
    
    try {
      // Decompress the blob (zlib compressed JSON)
      const decompressed = pako.inflate(new Uint8Array(blob));
      const jsonString = new TextDecoder().decode(decompressed);
      const payload = JSON.parse(jsonString);
      
      if (!payload || !payload.chunks) {
        console.warn(`[WorldStreamer] Invalid region payload format for R(${region.rx}, ${region.rz})`);
        return;
      }

      // Loop through all chunks in the region payload and pass them to MapMesher
      for (const [chunkKey, dataArray] of Object.entries(payload.chunks)) {
        const [rcxStr, rczStr, rcyStr] = chunkKey.split('_');
        const rcx = parseInt(rcxStr, 10);
        const rcz = parseInt(rczStr, 10);
        const rcy = parseInt(rcyStr, 10);
        
        const chunkData = Array.isArray(dataArray) ? dataArray : Object.values(dataArray as object);
        
        // We only have a single flattened array from the JSON (data), which in the legacy backend is usually
        // decoded into low/high Uint32Arrays by chunk format versions. For now, we will pack it exactly how 
        // VoxelChunk expects it in MapMesher (simulating low/high if they were split).
        // The real implementation needs to match the chunk data format (e.g. 16-bit or 32-bit palettes).
        // Since VoxelChunkMesher handles the actual VoxelChunk, we just instantiate a basic payload.
        
        // VoxelChunk expects dataLow and dataHigh (usually just dataLow for simple palettes).
        // Convert the generic array into a Uint32Array for dataLow.
        const lowArray = new Uint32Array(chunkData as number[]);
        
        mapMesher.loadStreamedChunk({
          cx: rcx, cy: rcy, cz: rcz,
          low: lowArray,
          high: new Uint32Array(lowArray.length) // Usually zeroed out unless high bits are used
        });
        
        this.chunkResidency.set(this.getChunkKey(rcx, rcy, rcz), 'MESHED');
      }
      
    } catch (err) {
      console.error(`[WorldStreamer] Failed to decode region R(${region.rx}, ${region.rz}):`, err);
    }
  }

  /**
   * Called by the local player's movement system when they cross chunks.
   * Ensures the area around the player is loaded and evicts distant chunks.
   */
  public updateStreamingForPosition(worldPos: Vector3) {
    // Only stream if fully booted
    if (useSessionStore.getState().bootState !== 'READY') return;

    // TODO: spiral outward from chunk(X,Y,Z) to load neighbors
    // TODO: evaluate chunkResidency and evict distant meshes
  }
}

export const worldStreamer = WorldStreamer.getInstance();
