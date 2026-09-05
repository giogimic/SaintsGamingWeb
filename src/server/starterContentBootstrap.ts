/**
 * Saints Gaming — Dynamic Starter Content Bootstrap (Bible 35 / Studio Plan)
 *
 * Populates rich, dynamic data-driven definitions across Dungeons, Mounts, Shops,
 * Professions, Recipes, World Events, and Simulation Presets.
 * All content is data-driven, editable in Studio, and consumable by live gameplay systems.
 */

import { prisma } from "@/web/lib/prisma";
import { getAllProfessionDefs } from "@/shared/game/professions/professionRegistry";
import { getSkillGuide } from "@/shared/game/skillGuideData";
import { getAllAbilityDefs } from "@/shared/game/combat/abilityRegistry";
import { seedElements } from "./seedElements";

export async function bootstrapDynamicStarterContent(gameId: string = "saints", profileId: string = "default") {
  console.log("[StarterContentBootstrap] Seeding dynamic RPG definitions…");

  try {
    await seedElements();
    
    // ── 0. ITEM TEMPLATES ──────────────────────────────────────────────────
    const starterItems = [
      {
        slug: "health_potion_minor",
        name: "Minor Health Potion",
        description: "Restores 50 Hit Points when consumed.",
        category: "CONSUMABLE",
        subCategory: "POTION",
        tier: 1,
        stackable: true,
        baseStats: JSON.stringify({ restoreHp: 50 }),
      },
      {
        slug: "mana_potion_minor",
        name: "Minor Mana Potion",
        description: "Restores 40 Mana points when consumed.",
        category: "CONSUMABLE",
        subCategory: "POTION",
        tier: 1,
        stackable: true,
        baseStats: JSON.stringify({ restoreMana: 40 }),
      },
      {
        slug: "antidote",
        name: "Herbal Antidote",
        description: "Cleanses minor poisons, venoms, and burn ailments.",
        category: "CONSUMABLE",
        subCategory: "ELIXIR",
        tier: 1,
        stackable: true,
        baseStats: JSON.stringify({ cleansePoison: true }),
      },
      {
        slug: "water_breathing_potion",
        name: "Elixir of the Tides",
        description: "Grants 30 minutes of water breathing for submerged exploration.",
        category: "CONSUMABLE",
        subCategory: "ELIXIR",
        tier: 2,
        stackable: true,
        baseStats: JSON.stringify({ waterBreathingDurationSec: 1800 }),
      },
      {
        slug: "aquatic_charm",
        name: "Aquatic Charm",
        description: "A glistening oceanic talisman enabling command of aquatic beasts.",
        category: "ACCESSORY",
        subCategory: "TALISMAN",
        tier: 2,
        stackable: false,
        baseStats: JSON.stringify({ swimSpeedMult: 1.25 }),
      },
      {
        slug: "copper_ore",
        name: "Copper Ore",
        description: "Raw mineral chunk extracted from surface rock formations.",
        category: "RESOURCE",
        subCategory: "ORE",
        tier: 1,
        stackable: true,
      },
      {
        slug: "copper_bar",
        name: "Copper Bar",
        description: "Refined copper ingot ready for blacksmithing and wire crafting.",
        category: "RESOURCE",
        subCategory: "INGOT",
        tier: 1,
        stackable: true,
      },
      {
        slug: "iron_ore",
        name: "Iron Ore",
        description: "Heavy mineral ore mined from subterranean deposits.",
        category: "RESOURCE",
        subCategory: "ORE",
        tier: 2,
        stackable: true,
      },
      {
        slug: "iron_bar",
        name: "Iron Bar",
        description: "Solid iron bar used in weapons, armor, and structural hinges.",
        category: "RESOURCE",
        subCategory: "INGOT",
        tier: 2,
        stackable: true,
      },
      {
        slug: "leather_strip",
        name: "Leather Strip",
        description: "Tanned hide strip used for armor bindings and hilt wraps.",
        category: "RESOURCE",
        subCategory: "LEATHER",
        tier: 1,
        stackable: true,
      },
      {
        slug: "iron_sword",
        name: "Iron Shortsword",
        description: "A standard-issue forged blade with reliable balance.",
        category: "WEAPON",
        subCategory: "SWORD",
        tier: 1,
        stackable: false,
        baseDurability: 100,
        baseStats: JSON.stringify({ attackPower: 12, attackSpeed: 1.0 }),
      },
      {
        slug: "iron_shield",
        name: "Iron Kite Shield",
        description: "A sturdy iron shield offering front-facing deflection.",
        category: "ARMOR",
        subCategory: "SHIELD",
        tier: 1,
        stackable: false,
        baseDurability: 120,
        baseStats: JSON.stringify({ armor: 8, blockChance: 0.15 }),
      },
      {
        slug: "leather_armor",
        name: "Reinforced Leather Vest",
        description: "Lightweight flexible armor favored by scouts and rangers.",
        category: "ARMOR",
        subCategory: "CHEST",
        tier: 1,
        stackable: false,
        baseDurability: 80,
        baseStats: JSON.stringify({ armor: 10, movementSpeedMult: 1.05 }),
      },
      {
        slug: "steel_greatsword",
        name: "Steel Greatsword",
        description: "A heavy two-handed blade delivering devastating sweeping slashes.",
        category: "WEAPON",
        subCategory: "SWORD",
        tier: 2,
        stackable: false,
        baseDurability: 180,
        baseStats: JSON.stringify({ attackPower: 35, attackSpeed: 0.8 }),
      },
    ];

    for (const item of starterItems) {
      await prisma.itemTemplate.upsert({
        where: { slug: item.slug },
        create: { ...item, gameId, profileId },
        update: { ...item, gameId, profileId },
      });
    }

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
        mapReferences: ["crypt_entrance", "crypt_hall_of_bones", "crypt_boss_sanctum"],
        clearConditions: JSON.stringify({
          kind: "PLAYER_STAT",
          statKey: "level",
          op: "GTE",
          expectedValue: 5,
        }),
      },
      {
        slug: "dungeon_shadow_crypt",
        name: "Shadow Crypt",
        description: "Subterranean crypt harboring skeletal sentinels and the formidable Crypt Lord.",
        entryLevelReq: 10,
        maxPartySize: 4,
        rewardLootPoolId: "shadow_crypt_boss_loot",
        mapReferences: ["DUNGEON_SHADOW_CRYPT"],
        clearConditions: JSON.stringify({
          kind: "DEFEAT_ENTITY",
          targetSlug: "monster_crypt_lord",
          requiredQty: 1,
        }),
      },
      {
        slug: "sunken_sanctuary",
        name: "Sunken Sanctuary",
        description: "A submerged temple filled with aquatic sirens and crystalline treasure chests.",
        entryLevelReq: 15,
        maxPartySize: 4,
        rewardLootPoolId: "sunken_boss_loot",
        mapReferences: ["sunken_temple_foyer", "sunken_abyssal_depths"],
        clearConditions: JSON.stringify({
          kind: "HAS_ITEM",
          itemId: "water_breathing_potion",
          quantity: 1,
        }),
      },
    ];

    for (const d of starterDungeons) {
      const { mapReferences, ...dungeonData } = d;
      await prisma.dungeonTemplate.upsert({
        where: { slug: d.slug },
        create: { 
          ...dungeonData, 
          gameId, 
          profileId,
          mapReferences: {
            create: mapReferences.map((ref, idx) => ({ mapSlug: ref, orderIndex: idx }))
          }
        },
        update: { 
          ...dungeonData, 
          gameId, 
          profileId,
          mapReferences: {
            deleteMany: {},
            create: mapReferences.map((ref, idx) => ({ mapSlug: ref, orderIndex: idx }))
          }
        },
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
        inventory: [
          { itemSlug: "health_potion_minor", price: 25, stock: 50, restockSec: 300 },
          { itemSlug: "mana_potion_minor", price: 30, stock: 50, restockSec: 300 },
          { itemSlug: "antidote", price: 40, stock: 20, restockSec: 600 },
          { itemSlug: "water_breathing_potion", price: 150, stock: 5, restockSec: 1800 },
        ],
      },
      {
        slug: "armory_of_the_saint",
        name: "Armory of the Saint",
        description: "Hardened steel weapons, sturdy shields, and protective breastplates.",
        currency: "gold",
        refreshInterval: 600,
        inventory: [
          { itemSlug: "iron_sword", price: 120, stock: 10, restockSec: null },
          { itemSlug: "iron_shield", price: 90, stock: 10, restockSec: null },
          { itemSlug: "leather_armor", price: 150, stock: 5, restockSec: null },
          { itemSlug: "steel_greatsword", price: 450, stock: 3, restockSec: null },
        ],
      },
    ];

    for (const s of starterShops) {
      const { inventory, ...shopData } = s;
      await prisma.shopTemplate.upsert({
        where: { slug: s.slug },
        create: { 
          ...shopData, 
          gameId, 
          profileId,
          inventory: {
            create: inventory
          }
        },
        update: { 
          ...shopData, 
          gameId, 
          profileId,
          inventory: {
            deleteMany: {},
            create: inventory
          }
        },
      });
    }

    // ── 4. PROFESSIONS & RECIPES ───────────────────────────────────────────
    const allDefs = getAllProfessionDefs();
    for (const def of allDefs) {
      const guide = getSkillGuide(def.id);
      await prisma.professionTemplate.upsert({
        where: { slug: def.id },
        create: {
          slug: def.id,
          name: def.name,
          description: def.description || guide?.summary || "",
          iconAssetId: def.iconName || guide?.iconName || "Zap",
          category: def.subCategory,
          themeColor: def.themeColor,
          tagline: def.tagline || guide?.tagline || "",
          stationTags: JSON.stringify(def.stationTags),
          xpCurve: "exponential",
          maxLevel: def.maxLevel || guide?.maxLevel || 99,
          trainingMethodsJson: JSON.stringify(guide?.trainingMethods || []),
          perksJson: JSON.stringify(guide?.perLevelPerks || []),
          milestonesJson: JSON.stringify(guide?.staticMilestones || []),
          battlepassTiersJson: JSON.stringify(guide?.battlepassTiers || []),
          gameId,
          profileId,
        },
        update: {
          name: def.name,
          description: def.description || guide?.summary || "",
          iconAssetId: def.iconName || guide?.iconName || "Zap",
          category: def.subCategory,
          themeColor: def.themeColor,
          tagline: def.tagline || guide?.tagline || "",
          stationTags: JSON.stringify(def.stationTags),
          maxLevel: def.maxLevel || guide?.maxLevel || 99,
          trainingMethodsJson: JSON.stringify(guide?.trainingMethods || []),
          perksJson: JSON.stringify(guide?.perLevelPerks || []),
          milestonesJson: JSON.stringify(guide?.staticMilestones || []),
          battlepassTiersJson: JSON.stringify(guide?.battlepassTiers || []),
          gameId,
          profileId,
        },
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
        ingredients: [{ itemSlug: "copper_ore", quantity: 3 }],
        timeMs: 2000,
      },
      {
        slug: "forge_iron_blade",
        outputItemSlug: "iron_sword",
        outputQuantity: 1,
        skillSlug: "blacksmithing",
        levelReq: 10,
        xpReward: 65,
        ingredients: [
          { itemSlug: "iron_bar", quantity: 4 },
          { itemSlug: "leather_strip", quantity: 2 },
        ],
        timeMs: 5000,
      },
    ];

    for (const r of starterRecipes) {
      const { ingredients, ...recipeData } = r;
      await prisma.craftingRecipe.upsert({
        where: { slug: r.slug },
        create: { 
          ...recipeData, 
          gameId, 
          profileId,
          ingredients: {
            create: ingredients
          }
        },
        update: { 
          ...recipeData, 
          gameId, 
          profileId,
          ingredients: {
            deleteMany: {},
            create: ingredients
          }
        },
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

    // ── 6. CREATURE DEFINITIONS (Beasts, Monsters, Mercenaries) ────────────
    const starterCreatures = [
      // Beasts (Capturable Companions)
      {
        slug: "beast_ember_fox",
        name: "Ember Fox",
        dexNumber: 1,
        typePrimary: "Fire",
        typeSecondary: "None",
        baseHp: 45,
        physicalPower: 52,
        physicalDefense: 40,
        abilityPower: 60,
        abilityDefense: 45,
        combatTempo: 110,
        catchRate: 0.45,
        starterLevel: 5,
        passivesJson: JSON.stringify([{ id: "flame_trail", name: "Flame Trail", description: "Burns attackers on hit" }]),
        worldSkillName: "Campfire Kindle",
        worldSkillDescription: "Ignites campfires and warms party members in blizzards.",
        abilitiesJson: JSON.stringify([{ abilityId: "ember_burst", unlockLevel: 1 }, { abilityId: "flame_charge", unlockLevel: 8 }]),
        flavor: "A nimble fiery companion with an ember-tipped tail.",
        tag: "BEAST",
        tagColor: "#f97316",
        stage: "BASIC",
        isStarter: true,
        isWildSpawn: true,
        isActive: true,
        sortOrder: 1,
        spriteOverworld: "/sprites/creatures/ember_fox.png",
      },
      {
        slug: "beast_aqua_otter",
        name: "Aqua Otter",
        dexNumber: 2,
        typePrimary: "Water",
        typeSecondary: "None",
        baseHp: 50,
        physicalPower: 48,
        physicalDefense: 55,
        abilityPower: 50,
        abilityDefense: 55,
        combatTempo: 95,
        catchRate: 0.45,
        starterLevel: 5,
        passivesJson: JSON.stringify([{ id: "swift_swim", name: "Swift Swim", description: "Increases evasion in rain" }]),
        worldSkillName: "Stream Fisher",
        worldSkillDescription: "Finds rare water items and assists in river crossing.",
        abilitiesJson: JSON.stringify([{ abilityId: "water_pulse", unlockLevel: 1 }, { abilityId: "tidal_wave", unlockLevel: 8 }]),
        flavor: "Playful aquatic mammal capable of water jet propulsion.",
        tag: "BEAST",
        tagColor: "#38bdf8",
        stage: "BASIC",
        isStarter: true,
        isWildSpawn: true,
        isActive: true,
        sortOrder: 2,
        spriteOverworld: "/sprites/creatures/aqua_otter.png",
      },
      {
        slug: "beast_verdant_sprout",
        name: "Verdant Sprout",
        dexNumber: 3,
        typePrimary: "Nature",
        typeSecondary: "Earth",
        baseHp: 55,
        physicalPower: 45,
        physicalDefense: 60,
        abilityPower: 45,
        abilityDefense: 60,
        combatTempo: 85,
        catchRate: 0.5,
        starterLevel: 5,
        passivesJson: JSON.stringify([{ id: "photosynthesis", name: "Photosynthesis", description: "Regenerates HP in sunlight" }]),
        worldSkillName: "Herbal Sense",
        worldSkillDescription: "Detects hidden foraging nodes across fields and forests.",
        abilitiesJson: JSON.stringify([{ abilityId: "seed_shot", unlockLevel: 1 }, { abilityId: "root_bind", unlockLevel: 8 }]),
        flavor: "A resilient nature creature that draws vitality from the earth.",
        tag: "BEAST",
        tagColor: "#22c55e",
        stage: "BASIC",
        isStarter: true,
        isWildSpawn: true,
        isActive: true,
        sortOrder: 3,
        spriteOverworld: "/sprites/creatures/verdant_sprout.png",
      },
      // Monsters (Hostile Enemies)
      {
        slug: "monster_abyssal_fiend",
        name: "Abyssal Fiend",
        dexNumber: 101,
        typePrimary: "Shadow",
        typeSecondary: "Fire",
        baseHp: 120,
        physicalPower: 65,
        physicalDefense: 45,
        abilityPower: 70,
        abilityDefense: 40,
        combatTempo: 105,
        catchRate: 0.0,
        starterLevel: 10,
        passivesJson: JSON.stringify([]),
        worldSkillName: "",
        worldSkillDescription: "",
        abilitiesJson: JSON.stringify([{ abilityId: "shadow_claw", unlockLevel: 1 }, { abilityId: "abyssal_flame", unlockLevel: 5 }]),
        flavor: "Hostile demon scouring dark ruins for unsuspecting prey.",
        tag: "MONSTER",
        tagColor: "#dc2626",
        stage: "ENEMY",
        isStarter: false,
        isWildSpawn: true,
        isActive: true,
        sortOrder: 101,
        spriteOverworld: "/sprites/monsters/abyssal_fiend.png",
      },
      {
        slug: "monster_skeleton_warrior",
        name: "Skeleton Warrior",
        dexNumber: 102,
        typePrimary: "Undead",
        typeSecondary: "None",
        baseHp: 160,
        physicalPower: 80,
        physicalDefense: 70,
        abilityPower: 20,
        abilityDefense: 35,
        combatTempo: 90,
        catchRate: 0.0,
        starterLevel: 15,
        passivesJson: JSON.stringify([]),
        worldSkillName: "",
        worldSkillDescription: "",
        abilitiesJson: JSON.stringify([{ abilityId: "bone_slash", unlockLevel: 1 }, { abilityId: "shield_bash", unlockLevel: 5 }]),
        flavor: "Ancient armed skeleton guarding subterranean crypts and tombs.",
        tag: "MONSTER",
        tagColor: "#94a3b8",
        stage: "ENEMY",
        isStarter: false,
        isWildSpawn: true,
        isActive: true,
        sortOrder: 102,
        spriteOverworld: "/sprites/monsters/skeleton_warrior.png",
      },
      {
        slug: "monster_crypt_lord",
        name: "Crypt Lord",
        dexNumber: 103,
        typePrimary: "Undead",
        typeSecondary: "Shadow",
        baseHp: 650,
        physicalPower: 120,
        physicalDefense: 110,
        abilityPower: 95,
        abilityDefense: 90,
        combatTempo: 115,
        catchRate: 0.0,
        starterLevel: 25,
        passivesJson: JSON.stringify([]),
        worldSkillName: "",
        worldSkillDescription: "",
        abilitiesJson: JSON.stringify([{ abilityId: "death_strike", unlockLevel: 1 }, { abilityId: "summon_skeletons", unlockLevel: 10 }]),
        flavor: "Formidable boss ruler of the subterranean shadow crypt.",
        tag: "BOSS",
        tagColor: "#7e22ce",
        stage: "BOSS",
        isStarter: false,
        isWildSpawn: false,
        isActive: true,
        sortOrder: 103,
        spriteOverworld: "/sprites/monsters/crypt_lord.png",
      },
      // Mercenaries (Recruitable Operatives)
      {
        slug: "merc_veteran_guard",
        name: "Veteran Guard",
        dexNumber: 201,
        typePrimary: "Martial",
        typeSecondary: "None",
        baseHp: 200,
        physicalPower: 75,
        physicalDefense: 85,
        abilityPower: 20,
        abilityDefense: 50,
        combatTempo: 95,
        catchRate: 0.0,
        starterLevel: 10,
        passivesJson: JSON.stringify([{ id: "taunt_aura", name: "Taunt Aura", description: "Redirects monster aggro to self" }]),
        worldSkillName: "Guard Post",
        worldSkillDescription: "Defends campsite areas against nocturnal wild attacks.",
        abilitiesJson: JSON.stringify([{ abilityId: "shield_wall", unlockLevel: 1 }, { abilityId: "cleave", unlockLevel: 5 }]),
        flavor: "Disciplined guard operative providing defensive frontline protection.",
        tag: "MERCENARY",
        tagColor: "#3b82f6",
        stage: "COMPANION",
        isStarter: false,
        isWildSpawn: false,
        isActive: true,
        sortOrder: 201,
        spriteOverworld: "/sprites/npcs/guard.png",
      },
      {
        slug: "merc_shadow_scout",
        name: "Shadow Scout",
        dexNumber: 202,
        typePrimary: "Agility",
        typeSecondary: "Shadow",
        baseHp: 140,
        physicalPower: 90,
        physicalDefense: 45,
        abilityPower: 40,
        abilityDefense: 45,
        combatTempo: 130,
        catchRate: 0.0,
        starterLevel: 12,
        passivesJson: JSON.stringify([{ id: "stealth_strike", name: "Stealth Strike", description: "Guaranteed critical strike on opener" }]),
        worldSkillName: "Tracking",
        worldSkillDescription: "Highlights rare monster locations on the mini-map.",
        abilitiesJson: JSON.stringify([{ abilityId: "poison_arrow", unlockLevel: 1 }, { abilityId: "smoke_bomb", unlockLevel: 5 }]),
        flavor: "Nimble marksman specializing in critical strikes and reconnaissance.",
        tag: "MERCENARY",
        tagColor: "#64748b",
        stage: "COMPANION",
        isStarter: false,
        isWildSpawn: false,
        isActive: true,
        sortOrder: 202,
        spriteOverworld: "/sprites/npcs/scout.png",
      },
      {
        slug: "merc_mystic_healer",
        name: "Mystic Healer",
        dexNumber: 203,
        typePrimary: "Holy",
        typeSecondary: "Magic",
        baseHp: 130,
        physicalPower: 30,
        physicalDefense: 40,
        abilityPower: 85,
        abilityDefense: 75,
        combatTempo: 100,
        catchRate: 0.0,
        starterLevel: 12,
        passivesJson: JSON.stringify([{ id: "restoration_aura", name: "Restoration Aura", description: "Passively heals party members over time" }]),
        worldSkillName: "Sanctuary",
        worldSkillDescription: "Cleanses all negative party debuffs when resting.",
        abilitiesJson: JSON.stringify([{ abilityId: "holy_light", unlockLevel: 1 }, { abilityId: "divine_blessing", unlockLevel: 5 }]),
        flavor: "Cleric devoted to restoring health and dispelling foul afflictions.",
        tag: "MERCENARY",
        tagColor: "#eab308",
        stage: "COMPANION",
        isStarter: false,
        isWildSpawn: false,
        isActive: true,
        sortOrder: 203,
        spriteOverworld: "/sprites/npcs/healer.png",
      },
    ];

    for (const c of starterCreatures) {
      await prisma.creatureDef.upsert({
        where: { slug: c.slug },
        create: { ...c, gameId },
        update: { ...c, gameId },
      });
    }

    // ── 7. QUEST TEMPLATES & OBJECTIVES ────────────────────────────────────
    const starterQuests = [
      {
        slug: "quest_the_saints_awakening",
        title: "The Saint's Awakening",
        description: "Embark on your journey: consult Elder Marcus, gather copper ore, and defeat wandering fiends.",
        levelReq: 1,
        isRepeatable: false,
        rewards: JSON.stringify({ xp: 250, gold: 100, items: [{ itemSlug: "health_potion_minor", quantity: 3 }] }),
        objectives: [
          { stage: 1, type: "TALK", targetSlug: "npc_elder_marcus", requiredQty: 1, description: "Speak with Elder Marcus in the village square" },
          { stage: 2, type: "GATHER", targetSlug: "copper_ore", requiredQty: 5, description: "Mine 5 Copper Ores from nearby surface veins" },
          { stage: 3, type: "DEFEAT", targetSlug: "monster_abyssal_fiend", requiredQty: 3, description: "Defeat 3 Abyssal Fiends encroaching on the valley" },
          { stage: 4, type: "TALK", targetSlug: "npc_elder_marcus", requiredQty: 1, description: "Return to Elder Marcus to claim your reward" },
        ],
      },
      {
        slug: "quest_beast_whisperer",
        title: "Beast Whisperer",
        description: "Form a bond with your first wild companion and learn creature battle fundamentals.",
        levelReq: 3,
        isRepeatable: false,
        rewards: JSON.stringify({ xp: 350, gold: 150, items: [{ itemSlug: "aquatic_charm", quantity: 1 }] }),
        objectives: [
          { stage: 1, type: "TALK", targetSlug: "npc_beastmaster_aria", requiredQty: 1, description: "Consult Beastmaster Aria" },
          { stage: 2, type: "CAPTURE", targetSlug: "beast_ember_fox", requiredQty: 1, description: "Capture an Ember Fox in the wilderness" },
          { stage: 3, type: "TALK", targetSlug: "npc_beastmaster_aria", requiredQty: 1, description: "Report your successful bond to Aria" },
        ],
      },
      {
        slug: "quest_shadow_crypt_purification",
        title: "Purification of the Shadow Crypt",
        description: "Infiltrate the subterranean crypt and destroy the Crypt Lord commanding the undead horde.",
        levelReq: 10,
        isRepeatable: true,
        rewards: JSON.stringify({ xp: 1200, gold: 500, items: [{ itemSlug: "iron_bar", quantity: 5 }] }),
        objectives: [
          { stage: 1, type: "ENTER_INSTANCE", targetSlug: "dungeon_shadow_crypt", requiredQty: 1, description: "Form a party and enter the Shadow Crypt instance" },
          { stage: 2, type: "DEFEAT", targetSlug: "monster_skeleton_warrior", requiredQty: 5, description: "Destroy 5 Skeleton Warriors in the crypt halls" },
          { stage: 3, type: "DEFEAT", targetSlug: "monster_crypt_lord", requiredQty: 1, description: "Slay the Crypt Lord in the inner sanctum" },
        ],
      },
    ];

    for (const q of starterQuests) {
      const { objectives, ...questData } = q;
      await prisma.questTemplate.upsert({
        where: { slug: q.slug },
        create: {
          ...questData,
          gameId,
          objectives: {
            create: objectives,
          },
        },
        update: {
          ...questData,
          gameId,
          objectives: {
            deleteMany: {},
            create: objectives,
          },
        },
      });
    }

    // ── 8. ABILITY DICTIONARY (Canonical) ────────────────────────────────
    const allAbilities = getAllAbilityDefs();

    for (const ab of allAbilities) {
      await prisma.abilityDictionary.upsert({
        where: { slug: ab.id },
        create: {
          slug: ab.id,
          name: ab.name,
          type: "skill",
          power: ab.effects.find(e => e.type === "damage") ? (ab.effects.find(e => e.type === "damage") as any).power : null,
          accuracy: (ab.accuracy ?? 100) / 100, // convert percentage to float
          cooldown: ab.cooldownMs ?? 0,
          manaCost: ab.manaCost ?? 0,
          staminaCost: ab.staminaCost ?? 0,
          isCapture: ab.isCapture ?? false,
          target: ab.target ?? "enemy",
          description: ab.description ?? "",
          domain: ab.domain ?? "both",
          style: ab.style ?? "MAGIC",
          tags: JSON.stringify(ab.tags ?? []),
          consumableItemId: `item_skillbook_${ab.id}`,
          effects: JSON.stringify(ab.effects ?? []),
          animation: ab.animationId ?? null,
        },
        update: {
          name: ab.name,
          type: "skill",
          power: ab.effects.find(e => e.type === "damage") ? (ab.effects.find(e => e.type === "damage") as any).power : null,
          accuracy: (ab.accuracy ?? 100) / 100,
          cooldown: ab.cooldownMs ?? 0,
          manaCost: ab.manaCost ?? 0,
          staminaCost: ab.staminaCost ?? 0,
          isCapture: ab.isCapture ?? false,
          target: ab.target ?? "enemy",
          description: ab.description ?? "",
          domain: ab.domain ?? "both",
          style: ab.style ?? "MAGIC",
          tags: JSON.stringify(ab.tags ?? []),
          effects: JSON.stringify(ab.effects ?? []),
          animation: ab.animationId ?? null,
        },
      });
    }

    console.log("[StarterContentBootstrap] All dynamic starter content successfully seeded!");
    return { success: true };
  } catch (err: any) {
    console.error("[StarterContentBootstrap] Failed to seed starter content:", err);
    return { success: false, error: err.message };
  }
}
