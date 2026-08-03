/**
 * Seed GameAsset rows from public/game-assets (Studio Asset Manager / Sprite Browser).
 * Idempotent upsert by stable id. Safe to re-run.
 *
 * Usage: npx tsx scripts/seed-game-assets-from-public.ts
 */
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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

function classify(rel: string): { type: string; tags: string[]; categories: string[] } {
  const lower = rel.toLowerCase();
  if (lower.includes('/tilesets/') || lower.startsWith('tilesets/')) {
    return { type: 'TILESET', tags: ['tileset'], categories: ['tilesets'] };
  }
  if (lower.includes('/npc/') || lower.startsWith('npc/')) {
    return { type: 'SPRITE', tags: ['npc', 'overworld'], categories: ['npcs'] };
  }
  if (lower.includes('/monster/') || lower.includes('/creatures/') || lower.includes('/world-monsters/')) {
    return { type: 'MONSTER', tags: ['monster'], categories: ['monsters'] };
  }
  if (lower.includes('/items/')) {
    return { type: 'ITEM_ICON', tags: ['item'], categories: ['items'] };
  }
  if (lower.includes('/ui/')) {
    return { type: 'UI_ELEMENT', tags: ['ui'], categories: ['ui'] };
  }
  if (lower.includes('/atlases/')) {
    return { type: 'SPRITE', tags: ['atlas'], categories: ['atlases'] };
  }
  return { type: 'SPRITE', tags: ['misc'], categories: ['misc'] };
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
    const { type, tags, categories } = classify(rel);
    const stat = fs.statSync(full);
    return {
      id: stableId(source),
      type,
      source,
      tags: JSON.stringify(tags),
      categories: JSON.stringify(categories),
      metadata: JSON.stringify({ name: path.basename(rel, '.png') }),
      fileSize: stat.size,
    };
  });

  let upserted = 0;
  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    await Promise.all(
      chunk.map((row) =>
        prisma.gameAsset.upsert({
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
        })
      )
    );
    upserted += chunk.length;
    console.log(`… ${upserted}/${rows.length}`);
  }

  const total = await prisma.gameAsset.count();
  console.log(`Done. GameAsset rows: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
