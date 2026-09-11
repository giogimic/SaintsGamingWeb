import { PrismaClient } from '@prisma/client';
import { RegionArtifact, RegionCoordinate } from '@/shared/game/voxel/WorldBakeContracts';

const prisma = new PrismaClient();

/**
 * Maps a Prisma WorldRegion record to the RegionArtifact contract.
 */
function mapToArtifact(record: any): RegionArtifact {
  return {
    coordinates: {
      mapId: record.mapId,
      regionX: record.regionX,
      regionZ: record.regionZ,
    },
    generator: {
      generatorId: 'saints-core', // Default until metadata table expansion
      version: record.version,
      configHash: '',
    },
    status: record.status as any,
    voxelData: record.artifact?.voxelData ? new Uint8Array(record.artifact.voxelData) : null,
    checksum: record.artifactChecksum || undefined,
    createdAt: record.createdAt.getTime(),
    updatedAt: record.updatedAt.getTime(),
  };
}

export class VoxelRegionRepository {
  /**
   * Upserts a WorldRegion payload.
   */
  static async saveRegion(artifact: RegionArtifact): Promise<void> {
    const { mapId, regionX, regionZ } = artifact.coordinates;

    // 1. Ensure the immutable artifact exists if we have data
    if (artifact.voxelData && artifact.checksum) {
      await prisma.worldRegionArtifact.upsert({
        where: { checksum: artifact.checksum },
        create: {
          checksum: artifact.checksum,
          voxelData: Buffer.from(artifact.voxelData),
        },
        update: {
          // Immutable, so we don't update voxelData if it already exists
        },
      });
    }

    // 2. Upsert the draft pointer
    await prisma.worldRegion.upsert({
      where: {
        mapId_regionX_regionZ: {
          mapId,
          regionX,
          regionZ,
        },
      },
      create: {
        mapId,
        regionX,
        regionZ,
        version: artifact.generator.version,
        status: artifact.status,
        artifactChecksum: artifact.checksum,
      },
      update: {
        version: artifact.generator.version,
        status: artifact.status,
        artifactChecksum: artifact.checksum,
      },
    });
  }

  /**
   * Fetches a specific WorldRegion.
   */
  static async getRegion(coords: RegionCoordinate): Promise<RegionArtifact | null> {
    const record = await prisma.worldRegion.findUnique({
      where: {
        mapId_regionX_regionZ: {
          mapId: coords.mapId,
          regionX: coords.regionX,
          regionZ: coords.regionZ,
        },
      },
      include: {
        artifact: true,
      }
    });

    if (!record) return null;
    return mapToArtifact(record);
  }

  /**
   * Fetches all WorldRegions for a given map.
   */
  static async getRegionsForMap(mapId: string): Promise<RegionArtifact[]> {
    const records = await prisma.worldRegion.findMany({
      where: { mapId },
      include: {
        artifact: true,
      },
      orderBy: [
        { regionZ: 'asc' },
        { regionX: 'asc' }
      ]
    });

    return records.map(mapToArtifact);
  }

  /**
   * Deletes a specific WorldRegion.
   */
  static async deleteRegion(coords: RegionCoordinate): Promise<void> {
    await prisma.worldRegion.delete({
      where: {
        mapId_regionX_regionZ: {
          mapId: coords.mapId,
          regionX: coords.regionX,
          regionZ: coords.regionZ,
        },
      },
    });
  }

  /**
   * Deletes all WorldRegions for a given map.
   */
  static async deleteAllRegionsForMap(mapId: string): Promise<void> {
    await prisma.worldRegion.deleteMany({
      where: { mapId },
    });
  }

  /**
   * Fetches the raw artifact data for a list of checksums.
   * Useful when loading published worlds purely from content-hashes.
   */
  static async getRegionArtifactsByChecksums(checksums: string[]): Promise<Record<string, Uint8Array>> {
    const artifacts = await prisma.worldRegionArtifact.findMany({
      where: {
        checksum: { in: checksums }
      }
    });

    const result: Record<string, Uint8Array> = {};
    for (const artifact of artifacts) {
      result[artifact.checksum] = new Uint8Array(artifact.voxelData);
    }
    return result;
  }
}
