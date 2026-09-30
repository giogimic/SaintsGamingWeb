const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- PURGING NON-BRUTE BUNDLED / CANONICAL ASSETS ---');

  const deletedAssets = await prisma.gameAsset.deleteMany({
    where: {
      OR: [
        { id: { startsWith: 'builtin-model-', not: 'builtin-model-brute' } },
        { id: { startsWith: 'builtin-piece-', not: { startsWith: 'builtin-piece-brute' } } },
        { id: 'builtin-model-citizen' },
        { id: 'builtin-model-adventurer' },
        { id: 'builtin-model-golem' },
        { id: 'builtin-model-shadow_golem' },
        { id: 'builtin-model-stylized_girl' },
        { id: { startsWith: 'stylized_girl_' } },
        { id: { startsWith: 'builtin-piece-stylized_girl' } },
        { id: { startsWith: 'builtin-piece-citizen' } },
        { id: { startsWith: 'builtin-piece-adventurer' } },
      ]
    }
  });
  console.log('Deleted non-brute GameAssets:', deletedAssets.count);

  const deletedProfiles = await prisma.characterModelProfile.deleteMany({
    where: {
      slug: { not: 'brute' }
    }
  });
  console.log('Deleted non-brute CharacterModelProfiles:', deletedProfiles.count);

  const remainingAssets = await prisma.gameAsset.findMany({ select: { id: true, source: true } });
  console.log('Remaining GameAssets:', remainingAssets.length);
  remainingAssets.forEach(a => console.log('  ', a.id, '->', a.source));

  const remainingProfiles = await prisma.characterModelProfile.findMany({ select: { id: true, slug: true } });
  console.log('Remaining CharacterModelProfiles:', remainingProfiles.length);
  remainingProfiles.forEach(p => console.log('  ', p.id, p.slug));
}

main().catch(console.error).finally(() => prisma.$disconnect());
