/**
 * Seed AZURE_TOWN with a talkable guide NPC + starter Spyder quest.
 * Usage: npx tsx scripts/seed-azure-campaign-guide.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const NPC_ID = "npc_azure_guide";
const QUEST_SLUG = "quest_azure_welcome";

const GUIDE_TREE = {
  node_start: {
    text: "Welcome to Azure Town, tamer. Spyder's trail begins here. Will you take your first charge?",
    options: [
      {
        label: "I'm ready.",
        nextNode: "accepted",
        action: "ACCEPT_QUEST",
        questSlug: QUEST_SLUG,
      },
      { label: "Just looking around.", nextNode: "exit" },
    ],
  },
  accepted: {
    text: "Good. Speak with the townsfolk, then meet me again when you have greeted three locals — for now, just explore the plaza and return.",
    options: [{ label: "Understood.", nextNode: "exit" }],
  },
};

async function main() {
  const map = await prisma.worldMap.findUnique({ where: { id: "AZURE_TOWN" } });
  if (!map) {
    console.error("AZURE_TOWN missing — run npm run migrate:campaign first");
    process.exit(1);
  }

  let npcs: any[] = [];
  try {
    npcs = JSON.parse(map.npcsData || "[]");
  } catch {
    npcs = [];
  }

  const entry = {
    id: NPC_ID,
    name: "Azure Guide",
    x: 25,
    y: 24,
    sprite: "professor",
    direction: "down",
    dialogue: ["Welcome to Azure Town."],
  };

  const idx = npcs.findIndex((n) => n.id === NPC_ID);
  if (idx >= 0) npcs[idx] = entry;
  else npcs.push(entry);

  await prisma.worldMap.update({
    where: { id: "AZURE_TOWN" },
    data: { npcsData: JSON.stringify(npcs), version: { increment: 1 } },
  });

  await prisma.gameMap.upsert({
    where: { id: "AZURE_TOWN" },
    create: {
      id: "AZURE_TOWN",
      name: map.name,
      width: 50,
      height: 50,
      tilesetData: map.gridData,
      gates: map.gatesData,
      npcs: JSON.stringify(npcs),
      encounters: map.encountersData,
    },
    update: { npcs: JSON.stringify(npcs) },
  });

  await prisma.npcDialogueTree.upsert({
    where: { npcId: NPC_ID },
    create: {
      npcId: NPC_ID,
      name: "Azure Guide",
      data: JSON.stringify(GUIDE_TREE),
    },
    update: {
      name: "Azure Guide",
      data: JSON.stringify(GUIDE_TREE),
    },
  });

  const existing = await prisma.questTemplate.findUnique({ where: { slug: QUEST_SLUG } });
  if (!existing) {
    const quest = await prisma.questTemplate.create({
      data: {
        slug: QUEST_SLUG,
        title: "Azure Welcome",
        description: "Meet the Azure Guide and begin your Spyder journey.",
        rewards: JSON.stringify({ items: [{ slug: "film_standard", qty: 2 }] }),
      },
    });
    await prisma.questObjective.create({
      data: {
        questId: quest.id,
        stage: 1,
        type: "TALK",
        targetSlug: NPC_ID,
        requiredQty: 1,
        description: "Talk to the Azure Guide again after accepting",
      },
    });
    console.log("Created quest", QUEST_SLUG);
  } else {
    console.log("Quest already exists", QUEST_SLUG);
  }

  console.log(`Seeded ${NPC_ID} on AZURE_TOWN (${npcs.length} NPCs total)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
