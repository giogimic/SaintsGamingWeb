/**
 * Saints Gaming — Dynamic Starter Content Bootstrap (Bible 35 / Studio Plan)
 *
 * Populates rich, dynamic data-driven definitions across Dungeons, Mounts, Shops,
 * Professions, Recipes, World Events, and Simulation Presets.
 * All content is data-driven, editable in Studio, and consumable by live gameplay systems.
 */

import { prisma } from "@/web/lib/prisma";

export async function bootstrapDynamicStarterContent(gameId: string = "saints", profileId: string = "default") {
  console.log("[StarterContentBootstrap] Seeding dynamic RPG definitions…");

  try {
    // ── 1. MOUNTS ──────────────────────────────────────────────────────────
    const starterMounts = [
      {
        slug: "swift_stallion",
        name: "Swift Stallion",
        description: "A loyal steed bred for traversing expansive overland trails.",
        speedMultiplier: 1.6,
        canFly: false,
        canSwim: false,
        acquisitionData: JSON.stringify({ source: "SHOP", vendor: "stable_master", cost: 1500 }),
        restrictionsData: JSON.stringify({
          kind: "PLAYER_STAT",
          statKey: "level",
          op: "GTE",
          expectedValue: 5,
        }),
        visualData: JSON.stringify({ assetId: "mount_horse_brown", scale: 1.2 }),
        collectionCategory: "mount",
      },
      {
        slug: "azure_griffin",
        name: "Azure Griffin",
        description: "A magnificent feathered beast capable of soaring above treacherous terrain.",
        speedMultiplier: 2.0,
        canFly: true,
        canSwim: false,
        acquisitionData: JSON.stringify({ source: "QUEST", questSlug: "flight_of_the_griffin" }),
        restrictionsData: JSON.stringify({
          kind: "PLAYER_STAT",
          statKey: "level",
          op: "GTE",
          expectedValue: 20,
        }),
        visualData: JSON.stringify({ assetId: "mount_griffin_blue", scale: 1.4 }),
        collectionCategory: "mount",
      },
      {
        slug: "river_turtle",
        name: "River Turtle",
        description: "An amphibious companion that glides effortlessly across deep lakes and rivers.",
        speedMultiplier: 1.35,
        canFly: false,
        canSwim: true,
        acquisitionData: JSON.stringify({ source: "REPUTATION", factionSlug: "fishermens_cove", requiredRep: 500 }),
        restrictionsData: JSON.stringify({
          kind: "HAS_ITEM",
          itemId: "aquatic_charm",
          quantity: 1,
        }),
        visualData: JSON.stringify({ assetId: "mount_turtle_green", scale: 1.1 }),
        collectionCategory: "mount",
      },
    ];

    for (const m of starterMounts) {
      await prisma.mountTemplate.upsert({
        where: { slug: m.slug },
        create: { ...m, gameId, profileId },
        update: { ...m, gameId, profileId },
      });
    }

    // ── 2. DUNGEONS ────────────────────────────────────────────────────────
    const starterDungeons = [
      {
        slug: "crypt_of_the_forgotten",
        name: "Crypt of the Forgotten",
        description: "An ancient underground vault overrun by restless spirits and skeletal guardians.",
        entryLevelReq: 5,
        maxPartySize: 4,
        rewardLootPoolId: "crypt_boss_loot",
        mapReferences: JSON.stringify(["crypt_entrance", "crypt_hall_of_bones", "crypt_boss_sanctum"]),
        clearConditions: JSON.stringify({
          kind: "PLAYER_STAT",
          statKey: "level",
          op: "GTE",
          expectedValue: 5,
        }),
      },
      {
        slug: "sunken_sanctuary",
        name: "Sunken Sanctuary",
        description: "A submerged temple filled with aquatic sirens and crystalline treasure chests.",
        entryLevelReq: 15,
        maxPartySize: 4,
        rewardLootPoolId: "sunken_boss_loot",
        mapReferences: JSON.stringify(["sunken_temple_foyer", "sunken_abyssal_depths"]),
        clearConditions: JSON.stringify({
          kind: "HAS_ITEM",
          itemId: "water_breathing_potion",
          quantity: 1,
        }),
      },
    ];

    for (const d of starterDungeons) {
      await prisma.dungeonTemplate.upsert({
        where: { slug: d.slug },
        create: { ...d, gameId, profileId },
        update: { ...d, gameId, profileId },
      });
    }

    // ── 3. SHOPS ───────────────────────────────────────────────────────────
    const starterShops = [
      {
        slug: "alchemist_emporium",
        name: "Alchemist's Emporium",
        description: "Stocked with restorative potions, elixirs, and raw herbal remedies.",
        currency: "gold",
        refreshInterval: 300,
        itemsSoldData: JSON.stringify([
          { itemId: "health_potion_minor", price: 25, stock: 50, restockSec: 300 },
          { itemId: "mana_potion_minor", price: 30, stock: 50, restockSec: 300 },
          { itemId: "antidote", price: 40, stock: 20, restockSec: 600 },
          { itemId: "water_breathing_potion", price: 150, stock: 5, restockSec: 1800 },
        ]),
      },
      {
        slug: "armory_of_the_saint",
        name: "Armory of the Saint",
        description: "Hardened steel weapons, sturdy shields, and protective breastplates.",
        currency: "gold",
        refreshInterval: 600,
        itemsSoldData: JSON.stringify([
          { itemId: "iron_sword", price: 120, stock: 10 },
          { itemId: "iron_shield", price: 90, stock: 10 },
          { itemId: "leather_armor", price: 150, stock: 5 },
          { itemId: "steel_greatsword", price: 450, stock: 3 },
        ]),
      },
    ];

    for (const s of starterShops) {
      await prisma.shopTemplate.upsert({
        where: { slug: s.slug },
        create: { ...s, gameId, profileId },
        update: { ...s, gameId, profileId },
      });
    }

    // ── 4. PROFESSIONS & RECIPES ───────────────────────────────────────────
    const starterProfessions = [
      {
        slug: "mining",
        name: "Mining",
        description: "Extracting ores, gemstones, and minerals from mountain veins.",
        iconAssetId: "icon_pickaxe",
        xpCurve: "STANDARD",
        maxLevel: 100,
      },
      {
        slug: "blacksmithing",
        name: "Blacksmithing",
        description: "Smelting metals and forging weapons, armor, and specialized tools.",
        iconAssetId: "icon_hammer",
        xpCurve: "STANDARD",
        maxLevel: 100,
      },
    ];

    for (const p of starterProfessions) {
      await prisma.professionTemplate.upsert({
        where: { slug: p.slug },
        create: { ...p, gameId, profileId },
        update: { ...p, gameId, profileId },
      });
    }

    const starterRecipes = [
      {
        slug: "smelt_copper_bar",
        outputItemSlug: "copper_bar",
        outputQuantity: 1,
        skillSlug: "blacksmithing",
        levelReq: 1,
        xpReward: 15,
        ingredients: JSON.stringify([{ itemId: "copper_ore", quantity: 3 }]),
        timeMs: 2000,
      },
      {
        slug: "forge_iron_blade",
        outputItemSlug: "iron_sword",
        outputQuantity: 1,
        skillSlug: "blacksmithing",
        levelReq: 10,
        xpReward: 65,
        ingredients: JSON.stringify([
          { itemId: "iron_bar", quantity: 4 },
          { itemId: "leather_strip", quantity: 2 },
        ]),
        timeMs: 5000,
      },
    ];

    for (const r of starterRecipes) {
      await prisma.craftingRecipe.upsert({
        where: { slug: r.slug },
        create: { ...r, gameId, profileId },
        update: { ...r, gameId, profileId },
      });
    }

    // ── 5. WORLD EVENTS ────────────────────────────────────────────────────
    const starterEvents = [
      {
        slug: "harvest_festival",
        name: "Autumn Harvest Festival",
        description: "A realm-wide celebration with double profession gathering yields and joyous ambiance.",
        isActive: false,
        scheduleCron: "0 12 * * 5", // Friday noon
        durationSeconds: 7200, // 2 hours
        mutationsData: JSON.stringify({
          gatheringYieldMult: 2.0,
          weather: "SUNNY_GOLDEN",
          ambientMusic: "festival_theme",
        }),
      },
      {
        slug: "celestial_convergence",
        name: "Celestial Convergence",
        description: "Cosmic alignment grants increased spell power and spawns rare starry wisps.",
        isActive: false,
        scheduleCron: "0 22 * * 6", // Saturday night
        durationSeconds: 3600,
        mutationsData: JSON.stringify({
          magicPowerMult: 1.5,
          spawnRateMult: 1.75,
          weather: "AURORA_BOREALIS",
          timeOfDay: "NIGHT",
        }),
      },
    ];

    for (const e of starterEvents) {
      await prisma.worldEventTemplate.upsert({
        where: { slug: e.slug },
        create: { ...e, gameId, profileId },
        update: { ...e, gameId, profileId },
      });
    }

    console.log("[StarterContentBootstrap] All dynamic starter content successfully seeded!");
    return { success: true };
  } catch (err: any) {
    console.error("[StarterContentBootstrap] Failed to seed starter content:", err);
    return { success: false, error: err.message };
  }
}
