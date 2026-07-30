const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const mapId = 'DEMO_SANDBOX';
  const width = 30;
  const height = 30;
  
  // 1 = Grass, 3 = Dirt, 10 = Tall Grass, 6 = Stone, 18 = Path
  const grid = [];
  const collision = [];
  
  for (let y = 0; y < height; y++) {
    const row = [];
    const colRow = [];
    for (let x = 0; x < width; x++) {
      let tile = 1; // Default Grass
      
      // Top Left: Combat Area (Dirt)
      if (x < 10 && y < 10) {
        tile = 3;
      }
      // Top Right: Creature Area (Tall Grass)
      else if (x > 20 && y < 10) {
        tile = 10;
      }
      // Bottom Right: Gathering Area (Ore Rock and Wood Tree)
      else if (x > 20 && y > 20) {
        // Mix trees (5) and rocks (6) instead of plain stone
        tile = (x + y) % 2 === 0 ? 5 : 6;
      }
      // Center: Spawn/Town Path
      else if (x >= 12 && x <= 16 && y >= 12 && y <= 16) {
        tile = 18;
      }
      
      row.push(tile);
      colRow.push(false);
    }
    grid.push(row);
    collision.push(colRow);
  }

  // Phase 5 Interactions setup
  const npcs = [
    {
      id: "npc_guide_1",
      name: "Guide",
      x: 14,
      y: 14,
      sprite: "npc_default",
      direction: "down",
      dialogue: ["Hello World! Welcome to the Demo Sandbox."],
      isTrainer: false
    }
  ];

  await prisma.gameMap.upsert({
    where: { id: mapId },
    update: {
      name: "Demo Sandbox",
      width,
      height,
      tilesetData: JSON.stringify(grid),
      npcs: JSON.stringify(npcs),
      encounters: JSON.stringify([]),
      gates: JSON.stringify({})
    },
    create: {
      id: mapId,
      name: "Demo Sandbox",
      width,
      height,
      tilesetData: JSON.stringify(grid),
      npcs: JSON.stringify(npcs),
      encounters: JSON.stringify([]),
      gates: JSON.stringify({})
    }
  });

  console.log(`Successfully seeded ${mapId}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
