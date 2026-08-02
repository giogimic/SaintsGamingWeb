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
    classId: "THIEF",
    spriteKey: "rogue",
    flavor: "Swift and lethal. Strike before you're seen.",
    tag: "Skill Cap",
    tagColor: "#f472b6",
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
    classId: "RANGER",
    spriteKey: "ninja",
    flavor: "Agile hunter. Precision strikes from distance.",
    tag: "Mobile",
    tagColor: "#fbbf24",
    sortOrder: 5,
    isActive: true,
    startingMap: "DEMO_SANDBOX",
    startingX: 14,
    startingY: 15,
    startingInventory: '{"capture_script":10,"patch_kit":5}',
  },
  {
    slug: "priest",
    name: "Priest",
    classId: "PRIEST",
    spriteKey: "disciple",
    flavor: "Devoted healer. Wisdom and vitality over raw attack.",
    tag: "Support",
    tagColor: "#e2d5b3",
    sortOrder: 6,
    isActive: true,
    startingMap: "DEMO_SANDBOX",
    startingX: 14,
    startingY: 15,
    startingInventory: '{"capture_script":10,"patch_kit":5}',
  },
  {
    slug: "monk",
    name: "Monk",
    classId: "WARRIOR",
    spriteKey: "monk",
    flavor: "Inner strength fighter. Balanced offense and utility.",
    tag: "Balanced",
    tagColor: "#fb923c",
    sortOrder: 7,
    isActive: true,
    startingMap: "DEMO_SANDBOX",
    startingX: 14,
    startingY: 15,
    startingInventory: '{"capture_script":10,"patch_kit":5}',
  },
  {
    slug: "spyder_tamer",
    name: "Spyder Tamer",
    classId: "RANGER",
    spriteKey: "catgirl",
    flavor: "Starts in Azure Town — Tuxemon Spyder campaign playtest bed.",
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
    await prisma.starterHero.upsert({
      where: { slug: h.slug },
      create: h,
      update: {
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
    console.log(`[ok] ${h.slug}`);
  }
  await prisma.$disconnect();
  console.log(`[done] ${defaults.length} starter heroes`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
