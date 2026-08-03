/**
 * Seed GameAsset rows from public/game-assets (Studio Asset Manager / Sprite Browser).
 * Idempotent upsert by stable id. Safe to re-run.
 *
 * - NPC 48×128 sheets get SpriteSheetSlicer walk frames in metadata
 * - Docs §7 gameplay flags: solid / interactable / decorative
 *
 * Usage: npx tsx scripts/seed-game-assets-from-public.ts
 */
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { SpriteSheetSlicer } from '../src/engine/assets/SpriteSheetSlicer';
import { inferAssetPack, packTag } from '../src/shared/game/assetPacks';

const prisma = new PrismaClient();
const ROOT = path.join(process.cwd(), 'public', 'game-assets');

type Row = {
  id: string;
  type: string;
  source: string;
  tags: string;
  categories: string;
  metadata: string;
  fileSize: number;
};

function stableId(source: string): string {
  return `ga_${crypto.createHash('sha1').update(source).digest('hex').slice(0, 20)}`;
}

function walkPngs(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkPngs(full, out);
    else if (entry.name.toLowerCase().endsWith('.png')) out.push(full);
  }
  return out;
}

/** Read PNG IHDR width/height without extra deps. */
function pngSize(full: string): { w: number; h: number } | null {
  try {
    const fd = fs.openSync(full, 'r');
    const buf = Buffer.alloc(24);
    fs.readSync(fd, buf, 0, 24, 0);
    fs.closeSync(fd);
    if (buf[0] !== 0x89 || buf.toString('ascii', 1, 4) !== 'PNG') return null;
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  } catch {
    return null;
  }
}

function classify(rel: string): {
  type: string;
  tags: string[];
  categories: string[];
  solid: boolean;
  interactable: boolean;
  decorative: boolean;
} {
  const lower = rel.toLowerCase();
  const pack = inferAssetPack(rel);
  const packTags = [packTag(pack)];

  if (lower.includes('/tilesets/') || lower.startsWith('tilesets/')) {
    return {
      type: 'TILESET',
      tags: ['tileset', ...packTags],
      categories: ['tilesets'],
      solid: true,
      interactable: false,
      decorative: false,
    };
  }
  if (lower.includes('/npc/') || lower.startsWith('npc/')) {
    return {
      type: 'SPRITE',
      tags: ['npc', 'overworld', ...packTags],
      categories: ['npcs'],
      solid: false,
      interactable: true,
      decorative: false,
    };
  }
  if (lower.includes('/monster/') || lower.includes('/creatures/') || lower.includes('/world-monsters/')) {
    return {
      type: 'MONSTER',
      tags: ['monster', ...packTags],
      categories: ['monsters'],
      solid: false,
      interactable: true,
      decorative: false,
    };
  }
  if (lower.includes('/items/')) {
    return {
      type: 'ITEM_ICON',
      tags: ['item', ...packTags],
      categories: ['items'],
      solid: false,
      interactable: false,
      decorative: true,
    };
  }
  if (lower.includes('/ui/')) {
    return {
      type: 'UI_ELEMENT',
      tags: ['ui', ...packTags],
      categories: ['ui'],
      solid: false,
      interactable: false,
      decorative: true,
    };
  }
  if (lower.includes('/atlases/')) {
    return {
      type: 'SPRITE',
      tags: ['atlas', ...packTags],
      categories: ['atlases'],
      solid: false,
      interactable: false,
      decorative: true,
    };
  }
  return {
    type: 'SPRITE',
    tags: ['misc', ...packTags],
    categories: ['misc'],
    solid: false,
    interactable: false,
    decorative: true,
  };
}

function buildMetadata(
  rel: string,
  source: string,
  full: string,
  flags: { solid: boolean; interactable: boolean; decorative: boolean }
): Record<string, unknown> {
  const name = path.basename(rel, '.png');
  const meta: Record<string, unknown> = {
    name,
    solid: flags.solid,
    interactable: flags.interactable,
    decorative: flags.decorative,
  };

  const lower = rel.toLowerCase();
  const size = pngSize(full);
  // Classic LPC/Tuxemon NPC sheet: 3×4 of 16×32 → 48×128
  if ((lower.includes('/npc/') || lower.startsWith('npc/')) && size && size.w === 48 && size.h === 128) {
    meta.frames = SpriteSheetSlicer.sliceNpcSheet(source);
    meta.sheetLayout = 'npc_3x4_16x32';
  } else if (
    (lower.includes('/world-monsters/') || lower.includes('/creatures/')) &&
    size &&
    size.w === 48 &&
    (size.h === 64 || size.h === 48)
  ) {
    const fh = size.h === 64 ? 16 : 12;
    meta.frames = SpriteSheetSlicer.sliceMonsterOverworldSheet(source, 16, fh);
    meta.sheetLayout = `monster_3x4_16x${fh}`;
  }

  return meta;
}

async function main() {
  if (!fs.existsSync(ROOT)) {
    console.error('Missing public/game-assets');
    process.exit(1);
  }

  const files = walkPngs(ROOT);
  console.log(`Found ${files.length} PNGs under public/game-assets`);

  const rows: Row[] = files.map((full) => {
    const rel = path.relative(ROOT, full).replace(/\\/g, '/');
    const source = `/game-assets/${rel}`;
    const { type, tags, categories, solid, interactable, decorative } = classify(rel);
    const stat = fs.statSync(full);
    const metadata = buildMetadata(rel, source, full, { solid, interactable, decorative });
    return {
      id: stableId(source),
      type,
      source,
      tags: JSON.stringify(tags),
      categories: JSON.stringify(categories),
      metadata: JSON.stringify(metadata),
      fileSize: stat.size,
    };
  });

  let upserted = 0;
  let withFrames = 0;
  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    await Promise.all(
      chunk.map((row) => {
        try {
          const meta = JSON.parse(row.metadata);
          if (Array.isArray(meta.frames) && meta.frames.length) withFrames += 1;
        } catch {
          /* ignore */
        }
        return prisma.gameAsset.upsert({
          where: { id: row.id },
          create: {
            id: row.id,
            gameId: null,
            type: row.type,
            source: row.source,
            tags: row.tags,
            categories: row.categories,
            metadata: row.metadata,
            fileSize: row.fileSize,
            isActive: true,
          },
          update: {
            type: row.type,
            source: row.source,
            tags: row.tags,
            categories: row.categories,
            metadata: row.metadata,
            fileSize: row.fileSize,
            isActive: true,
          },
        });
      })
    );
    upserted += chunk.length;
    console.log(`… ${upserted}/${rows.length}`);
  }

  console.log(`Done. Upserted ${upserted} GameAsset rows (${withFrames} with walk frames).`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
