import { prisma } from '../src/web/lib/prisma';

async function main() {
  // Count all unique source paths for quaternius assets
  const assets = await prisma.gameAsset.findMany({
    where: { tags: { contains: 'quaternius' } },
    select: { id: true, source: true, metadata: true, type: true },
  });

  // Group by name (from metadata)
  const byName = new Map<string, typeof assets>();
  for (const a of assets) {
    const meta = a.metadata ? JSON.parse(a.metadata) : {};
    const name = meta.name || 'unknown';
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name)!.push(a);
  }

  // Show duplicates
  let dupeCount = 0;
  for (const [name, entries] of byName) {
    if (entries.length > 1) {
      dupeCount++;
      console.log(`DUPLICATE: "${name}" x${entries.length}`);
      for (const e of entries) {
        console.log(`  -> ${e.id} | ${e.source}`);
      }
    }
  }
  console.log(`\nTotal unique names: ${byName.size}`);
  console.log(`Duplicated names: ${dupeCount}`);
  console.log(`Total records: ${assets.length}`);
  
  // Count by type
  const typeCounts = new Map<string, number>();
  for (const [, entries] of byName) {
    // Use just the first entry for counting unique types
    const t = entries[0].type;
    typeCounts.set(t, (typeCounts.get(t) || 0) + 1);
  }
  console.log('\nUnique assets by type:');
  for (const [t, c] of typeCounts) {
    console.log(`  ${t}: ${c}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
