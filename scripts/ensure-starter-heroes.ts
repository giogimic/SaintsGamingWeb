/**
 * Upsert default starter heroes (incl. Spyder Tamer) without admin gate.
 * Safe for local/CI: `npx tsx scripts/ensure-starter-heroes.ts`
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaults = [
  {
    slug: "warrior",
    name: "Warrior",
    gameId: "saints",
    classId: "WARRIOR",
    spriteKey: "warrior",
    flavor: "Frontline champion. High HP, unstoppable in melee.",
    tag: "Beginner Friendly",
    tagColor: "#34d399",
    sortOrder: 1,
    isActive: true,
    startingMap: "DEMO_SANDBOX",
    startingX: 14,
    startingY: 15,
    startingInventory: '{"capture_script":10,"patch_kit":5}',
  },
  {
    slug: "paladin",
    name: "Paladin",
    gameId: "saints",
    classId: "WARRIOR",
    spriteKey: "knight",
    flavor: "Holy guardian. Superior defense, supports allies.",
    tag: "Defensive",
    tagColor: "#60a5fa",
    sortOrder: 2,
    isActive: true,
    startingMap: "DEMO_SANDBOX",
    startingX: 14,
    startingY: 15,
    startingInventory: '{"capture_script":10,"patch_kit":5}',
  },
  {
    slug: "mystic",
    name: "Mystic",
    gameId: "saints",
    classId: "MAGE",
    spriteKey: "magician",
    flavor: "Master of arcane arts. High burst, low defense.",
    tag: "Advanced",
    tagColor: "#a78bfa",
    sortOrder: 3,
    isActive: true,
    startingMap: "DEMO_SANDBOX",
    startingX: 14,
    startingY: 15,
    startingInventory: '{"capture_script":10,"patch_kit":5}',
  },
  {
    slug: "shadow",
    name: "Shadow",
    gameId: "saints",
    classId: "THIEF",
    spriteKey: "shadow",
    flavor: "Master of stealth. Quick strikes and critical hits.",
    tag: "Agile",
    tagColor: "#ec4899",
    sortOrder: 4,
    isActive: true,
    startingMap: "DEMO_SANDBOX",
    startingX: 14,
    startingY: 15,
    startingInventory: '{"capture_script":10,"patch_kit":5}',
  },
  {
    slug: "ranger",
    name: "Ranger",
    gameId: "saints",
    classId: "RANGER",
    spriteKey: "dragonrider",
    flavor: "Expert marksman. Ranged precision and field utility.",
    tag: "Tactical",
    tagColor: "#f59e0b",
    sortOrder: 5,
    isActive: true,
    startingMap: "DEMO_SANDBOX",
    startingX: 14,
    startingY: 15,
    startingInventory: '{"capture_script":10,"patch_kit":5}',
  },
  {
    slug: "monk",
    name: "Monk",
    gameId: "saints",
    classId: "WARRIOR",
    spriteKey: "catgirl",
    flavor: "Disciplined martial artist. Fast combos and self-healing.",
    tag: "Sustained",
    tagColor: "#10b981",
    sortOrder: 6,
    isActive: true,
    startingMap: "DEMO_SANDBOX",
    startingX: 14,
    startingY: 15,
    startingInventory: '{"capture_script":10,"patch_kit":5}',
  },
  {
    slug: "spyder_tamer",
    name: "Spyder Tamer",
    gameId: "saints",
    classId: "RANGER",
    spriteKey: "catgirl",
    flavor: "Starts in Azure Town — Saints campaign playtest bed.",
    tag: "Campaign",
    tagColor: "#cbb26a",
    sortOrder: 0,
    isActive: true,
    startingMap: "AZURE_TOWN",
    startingX: 25,
    startingY: 25,
    startingInventory: '{"film_standard":5,"patch_kit":5,"soul_camera":1}',
  },
];

async function main() {
  for (const h of defaults) {
    const gameId = (h as { gameId?: string }).gameId || "saints";
    const row = { ...h, gameId };
    await prisma.starterHero.upsert({
      where: { slug: h.slug },
      create: row,
      update: {
        gameId,
        name: h.name,
        classId: h.classId,
        spriteKey: h.spriteKey,
        flavor: h.flavor,
        tag: h.tag,
        tagColor: h.tagColor,
        sortOrder: h.sortOrder,
        isActive: h.isActive,
        startingMap: h.startingMap,
        startingX: h.startingX,
        startingY: h.startingY,
        startingInventory: h.startingInventory,
      },
    });
    console.log(`[ok] ${h.slug} → ${gameId}`);
  }
  await prisma.$disconnect();
  console.log(`[done] ${defaults.length} starter heroes`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
