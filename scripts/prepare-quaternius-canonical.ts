/**
 * Deduplicate Quaternius assets, rename GLBs to stable human-readable names,
 * and generate a clean manifest for canonical sync.
 */
import { prisma } from '../src/web/lib/prisma';
import fs from 'fs';
import path from 'path';

const MODELS_DIR = path.join(__dirname, '..', 'public', 'models', 'quaternius');
const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function slugify(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}

async function main() {
  ensureDir(MODELS_DIR);

  const assets = await prisma.gameAsset.findMany({
    where: { tags: { contains: 'quaternius' } },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Total Quaternius DB records: ${assets.length}`);

  // Group by name, keeping only the newest (first due to desc order)
  const uniqueByName = new Map<string, typeof assets[0]>();
  for (const a of assets) {
    const meta = a.metadata ? JSON.parse(a.metadata) : {};
    const name = meta.name || a.id;
    if (!uniqueByName.has(name)) {
      uniqueByName.set(name, a);
    }
  }

  console.log(`Unique assets by name: ${uniqueByName.size}`);

  const manifest: any[] = [];
  let copied = 0;
  let missing = 0;

  for (const [name, asset] of uniqueByName) {
    const meta = asset.metadata ? JSON.parse(asset.metadata) : {};
    const slug = slugify(name);
    const stableFilename = `${slug}.glb`;
    const stablePath = `/models/quaternius/${stableFilename}`;
    const destPath = path.join(MODELS_DIR, stableFilename);

    // Find the source GLB file
    const sourcePath = asset.source.startsWith('/')
      ? path.join(__dirname, '..', 'public', asset.source)
      : path.join(UPLOADS_DIR, asset.source);

    if (fs.existsSync(sourcePath) && !fs.existsSync(destPath)) {
      fs.copyFileSync(sourcePath, destPath);
      copied++;
    } else if (!fs.existsSync(sourcePath) && !fs.existsSync(destPath)) {
      console.warn(`  MISSING: ${name} -> ${sourcePath}`);
      missing++;
      continue; // Skip assets where we can't find the file
    }

    // Update source to stable path
    manifest.push({
      id: `quat-${slug}`,
      type: asset.type,
      source: stablePath,
      atlasSource: null,
      atlasFrame: null,
      tags: asset.tags,
      categories: asset.categories,
      metadata: JSON.stringify({
        ...meta,
        // Remove old sourceAssetId/usableAssetId refs since they won't exist on the server
        sourceAssetId: undefined,
        usableAssetId: undefined,
      }),
      customLabels: asset.customLabels,
      isActive: true,
      usageCount: 0,
      fileSize: fs.existsSync(destPath) ? fs.statSync(destPath).size : (asset.fileSize || 0),
      cdnUrl: stablePath,
      _name: name,
    });
  }

  // Write clean manifest
  const outPath = path.join(__dirname, '..', 'prisma', 'quaternius-manifest.json');
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));

  console.log(`\nCopied ${copied} files to ${MODELS_DIR}`);
  console.log(`Missing source files: ${missing}`);
  console.log(`Manifest entries: ${manifest.length}`);
  console.log(`Wrote: ${outPath}`);

  // Show size
  const totalSize = manifest.reduce((acc, m) => acc + (m.fileSize || 0), 0);
  console.log(`Total models size: ${(totalSize / 1024 / 1024).toFixed(1)} MB`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
