const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const chars = await prisma.character.findMany({ where: { name: 'Zephyr52' } });
  for (const c of chars) {
    let meta = {};
    if (c.metadata) {
       try { meta = typeof c.metadata === 'string' ? JSON.parse(c.metadata) : c.metadata; } catch(e) {}
    }
    meta.lastMapId = 'STARTING_MEADOW';
    await prisma.character.update({
      where: { id: c.id },
      data: { metadata: JSON.stringify(meta) }
    });
    console.log('Updated', c.name);
  }
}
main().finally(() => prisma.$disconnect());
