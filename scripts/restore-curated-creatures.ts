import { PrismaClient } from "@prisma/client";
import { FALLBACK_CREATURE_DEFS } from "../src/shared/game/creatureCatalog";
import { creatureDataToDb } from "../src/shared/game/creatureDefMap";

const prisma = new PrismaClient();

async function main() {
  for (const def of FALLBACK_CREATURE_DEFS) {
    await prisma.creatureDef.upsert({
      where: { slug: def.slug },
      create: creatureDataToDb(def),
      update: creatureDataToDb(def),
    });
    console.log("restored", def.slug);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
