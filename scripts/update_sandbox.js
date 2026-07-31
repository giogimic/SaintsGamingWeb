const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const width = 30;
  const height = 30;
  const grid = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      let tile = 1; // Basic grass
      
      // Trees (3) on top left
      if (x >= 2 && x <= 6 && y >= 2 && y <= 6) tile = 3;
      // Rocks (4) on bottom left
      else if (x >= 2 && x <= 6 && y >= 24 && y <= 28) tile = 4;
      // Water (10) on top right
      else if (x > 20 && y < 10) tile = 10;
      // Combat area on bottom right (Encounter)
      else if (x > 20 && y > 20) tile = (x + y) % 2 === 0 ? 5 : 6;
      // Solid buildings/fences
      else if (x >= 12 && x <= 16 && y >= 12 && y <= 16) tile = 18;
      
      row.push(tile);
    }
    grid.push(row);
  }
  const npcs = [{ id: "npc_guide_1", templateId: "Villager", name: "Guide", x: 14, y: 14, sprite: "npc_default", direction: "down" }];
  
  await prisma.gameMap.upsert({
    where: { id: 'SAINTS_VILLAGE' },
    update: {
      tilesetData: JSON.stringify(grid),
      npcs: JSON.stringify(npcs)
    },
    create: {
      id: 'SAINTS_VILLAGE',
      name: "Saints Village Sandbox",
      width,
      height,
      tilesetData: JSON.stringify(grid),
      npcs: JSON.stringify(npcs),
    }
  });

  console.log("Successfully updated SAINTS_VILLAGE map!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
