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
    if (!region.artifactChecksum) {
      // If a map has regions that haven't finished generating or saving, publish must fail.
      ctx.errors.push(
        `Map ${region.mapId} has a region (${region.regionX}, ${region.regionZ}) with no artifactChecksum. (Status: ${region.status})`
      );
      continue;
    }

    const key = `${region.mapId}_${region.regionX}_${region.regionZ}`;
    ctx.manifest.atlas[key] = region.artifactChecksum;
    ctx.requiredRegions.add(key);
  }
}
