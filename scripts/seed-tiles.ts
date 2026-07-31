import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_LOGIC_TILES = [
  { id: 0, name: 'Walkable', color: 'bg-emerald-900', isSolid: false },
  { id: 1, name: 'Solid Wall', color: 'bg-red-600', isSolid: true },
  { id: 2, name: 'Tall Grass', color: 'bg-green-500', isSolid: false, onStepAction: 'ENCOUNTER', onStepPayload: '{"chance": 0.1}' },
  { id: 3, name: 'Gate A', color: 'bg-amber-500', isSolid: false },
  { id: 4, name: 'Gate B', color: 'bg-amber-600', isSolid: false },
  { id: 5, name: 'Wood Tree', color: 'bg-amber-800', isSolid: true, interactable: true, onInteractAction: 'HARVEST_WOOD', onInteractPayload: '{"xp":25, "resource":"wood"}' },
  { id: 6, name: 'Ore Rock', color: 'bg-[#8d6e63]', isSolid: true, interactable: true, onInteractAction: 'HARVEST_ORE', onInteractPayload: '{"xp":25, "resource":"ore"}' },
  { id: 7, name: 'Shop Tile', color: 'bg-yellow-400', isSolid: false, onStepAction: 'OPEN_SHOP' },
  { id: 8, name: 'Clinic Tile', color: 'bg-pink-500', isSolid: false, onStepAction: 'CLINIC_HEAL' },
  { id: 9, name: 'Crafting Table', color: 'bg-gray-500', isSolid: true, interactable: true, onInteractAction: 'OPEN_CRAFTING' },
  { id: 10, name: 'Fishing', color: 'bg-sky-600', isSolid: false, onStepAction: 'FISHING' },
  { id: 12, name: 'Base Hub', color: 'bg-indigo-800', isSolid: false, onStepAction: 'OPEN_BASE' }
];

async function main() {
  console.log('Seeding default MapLogicTiles...');
  for (const tile of DEFAULT_LOGIC_TILES) {
    await prisma.mapLogicTile.upsert({
      where: { id: tile.id },
      update: tile,
      create: tile,
    });
  }
  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
