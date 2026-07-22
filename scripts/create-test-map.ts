/**
 * Create a test map so the game has something to load on startup
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const width = 20;
  const height = 15;

  // Create a simple test map with grass, paths, trees, water, and tall grass
  const ground: number[][] = [];
  const collision: boolean[][] = [];

  for (let y = 0; y < height; y++) {
    ground[y] = [];
    collision[y] = [];
    for (let x = 0; x < width; x++) {
      // Default: grass
      ground[y][x] = 1;
      collision[y][x] = false;

      // Border trees
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        ground[y][x] = 9; // tree leaves
        collision[y][x] = true;
      }

      // Path through middle
      if (y === 7 && x > 0 && x < width - 1) {
        ground[y][x] = 3; // dirt path
      }
      if (x === 10 && y > 0 && y < height - 1) {
        ground[y][x] = 3; // dirt path
      }

      // Water pond
      if (x >= 14 && x <= 17 && y >= 2 && y <= 4) {
        ground[y][x] = 4; // water
        collision[y][x] = true;
      }

      // Tall grass (encounter zone)
      if (x >= 3 && x <= 7 && y >= 2 && y <= 5) {
        ground[y][x] = 10; // tall grass
      }

      // Some scattered trees
      if ((x === 5 && y === 9) || (x === 15 && y === 10) || (x === 3 && y === 12)) {
        ground[y][x] = 8; // tree trunk
        collision[y][x] = true;
      }
      if ((x === 5 && y === 8) || (x === 15 && y === 9) || (x === 3 && y === 11)) {
        ground[y][x] = 9; // tree leaves
        collision[y][x] = true;
      }
    }
  }

  // NPCs
  const npcs = [
    {
      id: "npc_professor",
      name: "Prof. Tux",
      x: 10,
      y: 6,
      sprite: "npc_professor",
      direction: "down",
      dialogue: [
        "Welcome to the world of Tuxemon!",
        "These creatures live all around us.",
        "Your journey begins now. Head into the tall grass to find your first Tuxemon!",
        "Good luck, trainer!",
      ],
      isTrainer: false,
    },
    {
      id: "npc_trainer_bob",
      name: "Trainer Bob",
      x: 12,
      y: 7,
      sprite: "npc_trainer",
      direction: "left",
      dialogue: [
        "Hey! I'm Trainer Bob.",
        "I've been catching Tuxemon all day!",
        "The tall grass to the west is full of wild ones.",
      ],
      isTrainer: true,
    },
  ];

  // Gates (transitions to other maps)
  const gates = [
    {
      x: 10,
      y: 0,
      width: 1,
      height: 1,
      targetMap: "test_map_north",
      targetX: 10,
      targetY: 13,
    },
  ];

  await prisma.tuxemonMap.upsert({
    where: { slug: "test_map" },
    update: {
      name: "Saints Village",
      width,
      height,
      tileSize: 16,
      tilesetData: JSON.stringify(ground),
      collisionData: JSON.stringify(collision),
      npcData: JSON.stringify(npcs),
      triggerData: JSON.stringify(gates),
      encounterZone: "default_encounter",
      music: "theme_town",
      environment: "park",
      isIndoors: false,
      version: { increment: 1 },
    },
    create: {
      slug: "test_map",
      name: "Saints Village",
      width,
      height,
      tileSize: 16,
      tilesetData: JSON.stringify(ground),
      collisionData: JSON.stringify(collision),
      npcData: JSON.stringify(npcs),
      triggerData: JSON.stringify(gates),
      encounterZone: "default_encounter",
      music: "theme_town",
      environment: "park",
      isIndoors: false,
    },
  });

  console.log("✅ Test map 'Saints Village' created!");
  console.log(`   Size: ${width}x${height}`);
  console.log(`   NPCs: ${npcs.length}`);
  console.log(`   Gates: ${gates.length}`);
  console.log(`   Encounter zone: default_encounter`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());