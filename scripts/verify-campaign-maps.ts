import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const worldCount = await prisma.worldMap.count({ where: { gameId: "tuxemon" } });
  const gameMapCount = await prisma.gameMap.count();
  const azure = await prisma.worldMap.findUnique({ where: { id: "AZURE_TOWN" } });
  if (!azure) throw new Error("AZURE_TOWN missing");
  const grid = JSON.parse(azure.gridData || "[]");
  const npcs = JSON.parse(azure.npcsData || "[]");
  console.log(
    JSON.stringify(
      {
        worldCount,
        gameMapCount,
        azure: {
          id: azure.id,
          name: azure.name,
          gameId: azure.gameId,
          version: azure.version,
          grid: `${grid.length}x${grid[0]?.length ?? 0}`,
          npcs: npcs.length,
        },
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
