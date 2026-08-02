import { PrismaClient } from "@prisma/client";
import { FALLBACK_CREATURE_DEFS } from "@/shared/game/creatureCatalog";

const prisma = new PrismaClient();

const VANCE_TREE = {
  node_start: {
    text: "Out here, nature yields only to those with the right edge. Take this kit — you'll need to chop and dig if you want to craft anything worth carrying. Then claim a companion at the Lab.",
    options: [
      {
        label: "Take the Starter Toolbelt",
        nextNode: "node_tools_done",
        action: "GRANT_DEMO_TOOLS",
      },
      {
        label: "Where do I get film to capture souls?",
        nextNode: "node_film",
      },
      {
        label: "Open the Professor's Lab",
        nextNode: "node_lab",
        action: "OPEN_LAB",
      },
      { label: "Goodbye.", nextNode: "exit" },
    ],
  },
  node_tools_done: {
    text: "Rook Hatchet and Crude Pickaxe are yours. Chop pine, mine copper, then visit the merchant for Standard Film — or craft it. When you're ready, bond a starter in the Lab.",
    options: [
      { label: "Open the Lab", nextNode: "exit", action: "OPEN_LAB" },
      { label: "Thanks, Warden.", nextNode: "exit" },
    ],
  },
  node_film: {
    text: "We don't bottle beasts in crystals anymore. You expose Standard Film with a Soul Camera — buy film at the merchant, or craft it from Crystal Dust and Wood Logs. Better stock, cleaner soul bind.",
    options: [
      {
        label: "Grant me a starter film pack",
        nextNode: "node_film_done",
        action: "GRANT_DEMO_FILM",
      },
      { label: "Back", nextNode: "node_start" },
    ],
  },
  node_film_done: {
    text: "Soul Camera and Standard Film — don't waste the exposures. Weaken the wildling first.",
    options: [{ label: "Understood.", nextNode: "exit" }],
  },
  node_lab: {
    text: "The Grove Sanctuary trial is open. Choose Solar, Bio, or Hydro — one companion for the road.",
    options: [
      { label: "Enter Lab", nextNode: "exit", action: "OPEN_LAB" },
      { label: "Later", nextNode: "exit" },
    ],
  },
};

function creatureToDb(def: (typeof FALLBACK_CREATURE_DEFS)[0]) {
  return {
    slug: def.slug,
    name: def.name,
    dexNumber: def.dexNumber,
    typePrimary: def.typePrimary,
    typeSecondary: def.typeSecondary || "None",
    spriteOverworld: def.spriteOverworld,
    spriteBattle: def.spriteBattle || null,
    spriteBack: def.spriteBack || null,
    baseHp: def.baseHp,
    physicalPower: def.physicalPower,
    physicalDefense: def.physicalDefense,
    abilityPower: def.abilityPower,
    abilityDefense: def.abilityDefense,
    combatTempo: def.combatTempo,
    catchRate: def.catchRate,
    starterLevel: def.starterLevel,
    passivesJson: JSON.stringify(def.passives || []),
    worldSkillName: def.worldSkillName || "",
    worldSkillDescription: def.worldSkillDescription || "",
    abilitiesJson: JSON.stringify(def.abilities || []),
    flavor: def.flavor || "",
    tag: def.tag || "Standard",
    tagColor: def.tagColor || "#34d399",
    stage: def.stage || "basic",
    isStarter: !!def.isStarter,
    isWildSpawn: !!def.isWildSpawn,
    isActive: def.isActive !== false,
    sortOrder: def.sortOrder || 0,
  };
}

/** Idempotent demo seed — safe to run on every server boot. */
export async function bootstrapDemoContent() {
  console.log("[DemoBootstrap] Seeding demo content…");

  try {
    for (const def of FALLBACK_CREATURE_DEFS) {
      await prisma.creatureDef.upsert({
        where: { slug: def.slug },
        create: creatureToDb(def),
        update: creatureToDb(def),
      });
    }
    console.log(`[DemoBootstrap] CreatureDef × ${FALLBACK_CREATURE_DEFS.length}`);
  } catch (e) {
    console.warn("[DemoBootstrap] CreatureDef seed skipped:", (e as Error).message);
  }

  try {
    await prisma.npcDialogueTree.upsert({
      where: { npcId: "npc_warden_vance" },
      create: {
        npcId: "npc_warden_vance",
        name: "Warden Vance",
        data: JSON.stringify(VANCE_TREE),
      },
      update: {
        name: "Warden Vance",
        data: JSON.stringify(VANCE_TREE),
      },
    });
    console.log("[DemoBootstrap] Warden Vance dialogue ready");
  } catch (e) {
    console.warn("[DemoBootstrap] Dialogue seed skipped:", (e as Error).message);
  }

  try {
    for (const item of [
      { slug: "film_standard", name: "Standard Film", category: "CONSUMABLE" },
      { slug: "film_fine", name: "Fine Grain Film", category: "CONSUMABLE" },
      { slug: "soul_camera", name: "Soul Camera", category: "TOOL", stackable: false },
      { slug: "crystal_dust", name: "Crystal Dust", category: "RESOURCE" },
      { slug: "wood_log", name: "Wood Log", category: "RESOURCE" },
      { slug: "axe_bronze", name: "Rook Hatchet", category: "TOOL", stackable: false },
      { slug: "pickaxe_bronze", name: "Crude Pickaxe", category: "TOOL", stackable: false },
    ]) {
      await prisma.itemTemplate.upsert({
        where: { slug: item.slug },
        update: {},
        create: {
          slug: item.slug,
          name: item.name,
          category: item.category,
          stackable: item.stackable !== false,
        },
      });
    }

    await prisma.craftingRecipe.upsert({
      where: { slug: "craft_film_standard" },
      update: {},
      create: {
        slug: "craft_film_standard",
        outputItemSlug: "film_standard",
        outputQuantity: 1,
        skillSlug: "crafting",
        levelReq: 1,
        xpReward: 20,
        ingredients: JSON.stringify([
          { itemSlug: "crystal_dust", qty: 2 },
          { itemSlug: "wood_log", qty: 1 },
        ]),
        timeMs: 2000,
      },
    });
    // Keep legacy recipe slug working
    await prisma.craftingRecipe.upsert({
      where: { slug: "craft_binding_crystal" },
      update: { outputItemSlug: "film_standard" },
      create: {
        slug: "craft_binding_crystal",
        outputItemSlug: "film_standard",
        outputQuantity: 1,
        skillSlug: "crafting",
        levelReq: 1,
        xpReward: 20,
        ingredients: JSON.stringify([
          { itemSlug: "crystal_dust", qty: 2 },
          { itemSlug: "wood_log", qty: 1 },
        ]),
        timeMs: 2000,
      },
    });
    console.log("[DemoBootstrap] Film items + craft recipes ready");
  } catch (e) {
    console.warn("[DemoBootstrap] Item/recipe seed skipped:", (e as Error).message);
  }

  console.log("[DemoBootstrap] Done");
}

export { VANCE_TREE };
