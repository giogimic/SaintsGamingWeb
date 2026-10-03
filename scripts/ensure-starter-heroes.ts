/**
 * Upsert default starter heroes (incl. Spyder Tamer) without admin gate.
 * Safe for local/CI: `npx tsx scripts/ensure-starter-heroes.ts`
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaults = [
  {
    slug: "champion_3d",
    name: "Saint Champion (3D)",
    gameId: "saints",
    classId: "WARRIOR",
    spriteKey: "warrior",
    assetProfileId: "quaternius_base_male",
    visualData: JSON.stringify({
      worldModel: {
        type: "3D Model",
        assetId: "quaternius_base_male",
        modelUrl: "/uploads/Superhero_Male_FullBody.glb",
        scale: 0.85
      },
      modularAttachments: [
        {
          assetId: "builtin-piece-peasant_male",
          label: "Peasant Attire",
          category: "clothing",
          type: "3D Model",
          attachmentMode: "SKINNED",
          isModular: true,
          availableInCharacterCreation: true,
          defaultVisible: true
        }
      ]
    }),
    flavor: "Frontline warrior built on the standard male humanoid foundation.",
    tag: "3D Archetype",
    tagColor: "#f59e0b",
    sortOrder: 1,
    isActive: true,
    startingMap: "DEMO_SANDBOX",
    startingX: 14,
    startingY: 15,
    startingInventory: '{"capture_script":10,"patch_kit":5}',
  },
  {
    slug: "vanguard_3d",
    name: "Saint Vanguard (3D)",
    gameId: "saints",
    classId: "RANGER",
    spriteKey: "dragonrider",
    assetProfileId: "quaternius_base_female",
    visualData: JSON.stringify({
      worldModel: {
        type: "3D Model",
        assetId: "quaternius_base_female",
        modelUrl: "/uploads/Superhero_Female_FullBody.glb",
        scale: 0.85
      },
      modularAttachments: [
        {
          assetId: "builtin-piece-ranger_female",
          label: "Ranger Attire",
          category: "clothing",
          type: "3D Model",
          attachmentMode: "SKINNED",
          isModular: true,
          availableInCharacterCreation: true,
          defaultVisible: true
        }
      ]
    }),
    flavor: "Agile marksman built on the standard female humanoid foundation.",
    tag: "3D Archetype",
    tagColor: "#eab308",
    sortOrder: 2,
    isActive: true,
    startingMap: "DEMO_SANDBOX",
    startingX: 14,
    startingY: 15,
    startingInventory: '{"capture_script":10,"patch_kit":5}',
  },
  {
    slug: "warrior",
    name: "Warrior",
    gameId: "saints",
    classId: "WARRIOR",
    spriteKey: "warrior",
    assetProfileId: "warrior",
    visualData: "[]",
    flavor: "Frontline champion. High HP, unstoppable in melee.",
    tag: "Beginner Friendly",
    tagColor: "#34d399",
    sortOrder: 3,
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
    const { spriteKey, ...cleanHero } = h as any;
    const assetProfileId = cleanHero.assetProfileId || spriteKey;
    const visualData = cleanHero.visualData || "[]";
    const row = {
      slug: cleanHero.slug,
      gameId,
      name: cleanHero.name,
      classId: cleanHero.classId,
      assetProfileId,
      visualData,
      flavor: cleanHero.flavor,
      tag: cleanHero.tag,
      tagColor: cleanHero.tagColor,
      sortOrder: cleanHero.sortOrder,
      isActive: cleanHero.isActive,
      startingMap: cleanHero.startingMap,
      startingX: cleanHero.startingX,
      startingY: cleanHero.startingY,
      startingInventory: cleanHero.startingInventory,
    };
    await prisma.starterHero.upsert({
      where: { slug: h.slug },
      create: row,
      update: {
        gameId,
        name: cleanHero.name,
        classId: cleanHero.classId,
        assetProfileId,
        visualData,
        flavor: cleanHero.flavor,
        tag: cleanHero.tag,
        tagColor: cleanHero.tagColor,
        sortOrder: cleanHero.sortOrder,
        isActive: cleanHero.isActive,
        startingMap: cleanHero.startingMap,
        startingX: cleanHero.startingX,
        startingY: cleanHero.startingY,
        startingInventory: cleanHero.startingInventory,
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
