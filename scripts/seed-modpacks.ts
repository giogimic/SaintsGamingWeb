import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const modpacks = [
    {
      name: "Dimensional Cobblemon",
      slug: "dimensional-cobblemon",
      game: "Minecraft",
      description: "A Cobblemon modpack focused on dimensional exploration and catching 'em all.",
      downloadUrl: "https://www.curseforge.com/minecraft/modpacks/dimensional-cobblemon",
      status: "Active",
    },
    {
      name: "Holy Crop",
      slug: "holy-crop",
      game: "Stardew Valley",
      description: "A Stardew Valley modpack to enhance farming and crop yields.",
      downloadUrl: "https://www.curseforge.com/stardewvalley/modpacks/holy-crop",
      status: "Active",
    },
    {
      name: "Saints Gaming Official",
      slug: "saints-gaming",
      game: "Minecraft",
      description: "The official Saints Gaming Minecraft modpack.",
      downloadUrl: "https://www.curseforge.com/minecraft/modpacks/saints-gaming",
      status: "Active",
    },
    {
      name: "Schedule1 Collection (si5t39)",
      slug: "schedule1-si5t39",
      game: "Unknown",
      description: "Unsupported NexusMods collection.",
      downloadUrl: "https://www.nexusmods.com/games/schedule1/collections/si5t39",
      status: "Inactive", // User marked as unsupported
    }
  ];

  for (const mp of modpacks) {
    await prisma.modpack.upsert({
      where: { slug: mp.slug },
      update: mp,
      create: mp,
    });
    console.log(`Upserted ${mp.name}`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
