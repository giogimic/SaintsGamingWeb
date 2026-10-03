/**
 * Export the Quaternius GameAsset records from the local DB into a JSON manifest.
 * This manifest can be committed to git and used by the server entrypoint to
 * auto-seed the database without needing the raw source files or the heavy
 * ingestAsset pipeline.
 */
import { prisma } from '../src/web/lib/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
  // Grab every GameAsset that was ingested by the quaternius seed script
  // These all have the 'quaternius' tag
  const assets = await prisma.gameAsset.findMany({
    where: {
      tags: { contains: 'quaternius' },
    },
  });

  console.log(`Found ${assets.length} Quaternius assets in local DB`);

  // Build a clean manifest
  const manifest = assets.map((a) => {
    const meta = a.metadata ? JSON.parse(a.metadata) : {};
    return {
      id: a.id,
      type: a.type,
      source: a.source,
      atlasSource: a.atlasSource,
      atlasFrame: a.atlasFrame,
      tags: a.tags,
      categories: a.categories,
      metadata: a.metadata,
      customLabels: a.customLabels,
      isActive: a.isActive,
      usageCount: a.usageCount,
      fileSize: a.fileSize,
      cdnUrl: a.cdnUrl,
      // Extra readable fields for debugging
      _name: meta.name || 'unknown',
      _type: a.type,
    };
  });

  const outPath = path.join(__dirname, '..', 'prisma', 'quaternius-manifest.json');
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
  console.log(`Wrote manifest to ${outPath}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
