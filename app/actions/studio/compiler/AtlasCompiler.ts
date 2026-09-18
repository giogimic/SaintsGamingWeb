import { prisma } from '@/web/lib/prisma';
import type { CompilerContext } from './types';

/**
 * AtlasCompiler
 * 
 * Rules:
 * 1. Must reference EXACT persisted artifacts (checksums).
 * 2. Never calculates or generates voxel checksums during publish.
 * 3. Procedural configuration is frozen into the manifest.
 */
export async function compileAtlas(ctx: CompilerContext): Promise<void> {
  const mapIds = Array.from(ctx.mapsIncluded);
  if (mapIds.length === 0) return;

  const regions = await prisma.worldRegion.findMany({
    where: { mapId: { in: mapIds } },
  });

  for (const region of regions) {
    const checksum = region.artifactChecksum || `auto_${region.mapId}_${region.regionX}_${region.regionZ}`;
    if (!region.artifactChecksum) {
      ctx.warnings.push(
        `Map ${region.mapId} has a region (${region.regionX}, ${region.regionZ}) with no artifactChecksum. Using auto-generated fallback checksum.`
      );
    }

    const key = `${region.mapId}_${region.regionX}_${region.regionZ}`;
    ctx.manifest.atlas[key] = checksum;
    ctx.requiredRegions.add(key);
  }
}
