import { PrismaClient } from '@prisma/client';
import { VoxelWorldDocV3 } from '@/shared/game/voxel/VoxelWorldDoc';
import { VoxelRegionRepository } from '../repositories/VoxelRegionRepository';
import { RegionArtifact } from '@/shared/game/voxel/WorldBakeContracts';
import zlib from 'zlib';

const prisma = new PrismaClient();

const CHUNKS_PER_REGION = 8; // Default region size (8x8)

export class VoxelStorageService {
  /**
   * Fetches the world document, preferring the new WorldRegion artifacts.
   * If regions don't exist, falls back to the legacy `WorldMap.voxelData` column.
   */
  static async getVoxelDoc(mapId: string): Promise<VoxelWorldDocV3 | null> {
    const map = await prisma.worldMap.findUnique({
      where: { id: mapId },
      select: { 
        id: true, 
        name: true, 
        gameId: true,
        publishedVersion: true 
      }
    });

    if (!map) return null;

    // 1. Try to load new WorldRegions first
    const regions = await VoxelRegionRepository.getRegionsForMap(mapId);
    
    if (regions.length > 0) {
      // Assemble regions into a legacy VoxelWorldDocV3 for compatibility
      return this.assembleDocFromRegions(map, regions);
    }



    return null;
  }

  /**
   * Fetches the world document exclusively from a set of explicit WorldRegionArtifact checksums.
   * This is used by the runtime when loading a Published version, completely bypassing Draft region pointers.
   */
  static async getVoxelDocFromArtifacts(mapId: string, checksums: string[]): Promise<VoxelWorldDocV3 | null> {
    const map = await prisma.worldMap.findUnique({
      where: { id: mapId },
      select: { id: true, name: true, gameId: true }
    });
    if (!map) return null;

    const artifacts = await VoxelRegionRepository.getRegionArtifactsByChecksums(checksums);
    
    // We map these back to RegionArtifact interface structure for assembleDocFromRegions
    const regions: RegionArtifact[] = Object.values(artifacts).map(voxelData => ({
      coordinates: { mapId, regionX: 0, regionZ: 0 }, // not strictly needed by assemble
      generator: { generatorId: '', version: 1, configHash: '' },
      status: 'COMPLETED',
      voxelData,
      createdAt: 0,
      updatedAt: 0,
    }));

    if (regions.length > 0) {
      return this.assembleDocFromRegions(map, regions);
    }

    return null;
  }

  /**
   * Saves a full VoxelWorldDocV3, writing to both legacy (temporarily) 
   * and the new WorldRegion format based on chunks.
   */
  static async saveVoxelDoc(doc: VoxelWorldDocV3): Promise<void> {
    // 2. Write to the new WorldRegion system
    await this.splitAndSaveRegions(doc);
  }

  /**
   * Internal Helper: Assembles a legacy VoxelWorldDocV3 from RegionArtifacts.
   */
  private static assembleDocFromRegions(map: any, regions: RegionArtifact[]): VoxelWorldDocV3 {
    // Basic structural fallback. In reality, a proper Manifest would dictate dimensions and palette.
    // Since Phase 1B is bridging, we reconstruct a basic doc.
    const chunks: Record<string, number[]> = {};
    
    // Inflate binary regions and extract chunks
    for (const region of regions) {
      if (!region.voxelData) continue;
      
      try {
        const decompressed = zlib.inflateSync(Buffer.from(region.voxelData));
        const payload = JSON.parse(decompressed.toString('utf-8'));
        
        if (payload.chunks) {
          Object.assign(chunks, payload.chunks);
        }
      } catch (err) {
        console.error(`[VoxelStorageService] Failed to inflate region artifact ${region.coordinates.regionX},${region.coordinates.regionZ}`, err);
      }
    }

    return {
      formatVersion: 3,
      id: map.id,
      name: map.name,
      gameId: map.gameId || 'saints',
      version: 1,
      blockSizePx: 64,
      dimensions: { widthChunks: 2, depthChunks: 2, heightChunks: 1 },
      palette: [], // Needs to be loaded from manifest eventually
      chunks,
      publishedVersion: map.publishedVersion
    };
  }

  /**
   * Internal Helper: Splits a VoxelWorldDocV3 into RegionArtifacts and persists them.
   */
  private static async splitAndSaveRegions(doc: VoxelWorldDocV3): Promise<void> {
    const regionPayloads = new Map<string, any>(); // key: `${rx}_${rz}` -> data

    // Group chunks by region coordinates
    for (const [chunkKey, data] of Object.entries(doc.chunks)) {
      const [cxStr, czStr, cyStr] = chunkKey.split('_');
      const cx = parseInt(cxStr, 10);
      const cz = parseInt(czStr, 10);

      const rx = Math.floor(cx / CHUNKS_PER_REGION);
      const rz = Math.floor(cz / CHUNKS_PER_REGION);
      const rKey = `${rx}_${rz}`;

      if (!regionPayloads.has(rKey)) {
        regionPayloads.set(rKey, { chunks: {} });
      }
      
      regionPayloads.get(rKey).chunks[chunkKey] = data;
    }

    // Save each region
    const promises = Array.from(regionPayloads.entries()).map(([rKey, payload]) => {
      const [rxStr, rzStr] = rKey.split('_');
      
      const artifact: RegionArtifact = {
        coordinates: {
          mapId: doc.id,
          regionX: parseInt(rxStr, 10),
          regionZ: parseInt(rzStr, 10),
        },
        generator: {
          generatorId: 'legacy-bridge',
          version: 1,
          configHash: 'legacy'
        },
        status: 'COMPLETED',
        // Compress region chunk arrays using zlib deflate
        voxelData: new Uint8Array(zlib.deflateSync(Buffer.from(JSON.stringify(payload), 'utf-8'))),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      return VoxelRegionRepository.saveRegion(artifact);
    });

    await Promise.all(promises);
  }
}
