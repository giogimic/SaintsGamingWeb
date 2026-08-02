/**
 * Tuxemon Data Import Script
 *
 * Imports YAML from tuxemon-db/ into current Prisma models
 * (CreatureTemplate, AbilityDictionary, CreatureElement, …).
 *
 * Usage: npx tsx scripts/import-tuxemon-data.ts
 */

import fs from "fs";
import path from "path";
import * as yaml from "js-yaml";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LOCAL_DB_DIR = path.join(process.cwd(), "tuxemon-db");
const TUXEMON_ROOT = path.resolve(
  process.env.TUXEMON_PATH || "C:/Users/Matth/OneDrive/Desktop/Tuxemon-0.5-rc1"
);
const DB_DIR = fs.existsSync(LOCAL_DB_DIR)
  ? LOCAL_DB_DIR
  : path.join(TUXEMON_ROOT, "mods", "tuxemon", "db");

function readYamlFiles(dir: string): Array<{ slug: string; data: Record<string, unknown> }> {
  const results: Array<{ slug: string; data: Record<string, unknown> }> = [];
  if (!fs.existsSync(dir)) {
    console.warn(`  Directory not found: ${dir}`);
    return results;
  }
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".yaml"));
  for (const file of files) {
    const slug = path.basename(file, ".yaml");
    const content = fs.readFileSync(path.join(dir, file), "utf-8");
    try {
      const data = yaml.load(content) as Record<string, unknown>;
      if (data) results.push({ slug, data });
    } catch (e) {
      console.warn(`  Failed to parse ${file}:`, e);
    }
  }
  return results;
}

function toJsonString(value: unknown): string {
  return JSON.stringify(value ?? null);
}

async function importElements() {
  console.log("\n=== Importing Elements → CreatureElement / ElementEffectiveness ===");
  const elements = readYamlFiles(path.join(DB_DIR, "element"));
  let count = 0;

  for (const { slug, data } of elements) {
    await prisma.creatureElement.upsert({
      where: { slug },
      update: {
        name: (data.slug as string) || slug,
        icon: (data.icon as string) || null,
      },
      create: {
        slug,
        name: (data.slug as string) || slug,
        icon: (data.icon as string) || null,
      },
    });

    const types = (data.types as Array<{ against: string; multiplier: number }>) || [];
    for (const t of types) {
      await prisma.elementEffectiveness.upsert({
        where: {
          attackElement_defendElement: {
            attackElement: slug,
            defendElement: t.against,
          },
        },
        update: { multiplier: t.multiplier },
        create: {
          attackElement: slug,
          defendElement: t.against,
          multiplier: t.multiplier,
        },
      });
    }
    count++;
  }
  console.log(`  Imported ${count} elements with type effectiveness`);
}

async function importTechniques() {
  console.log("\n=== Importing Techniques → AbilityDictionary ===");
  const techniques = readYamlFiles(path.join(DB_DIR, "technique"));
  let count = 0;

  for (const { slug, data } of techniques) {
    const types = (data.types as string[]) || [];
    const effects = (data.effects as unknown[]) || [];

    await prisma.abilityDictionary.upsert({
      where: { slug },
      update: {
        name: slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        type: types[0] || "normal",
        power: data.power != null ? Math.round((data.power as number) * 100) : null,
        accuracy: data.accuracy != null ? (data.accuracy as number) * 100 : null,
        cooldown: (data.recharge as number) || null,
        effects: toJsonString(effects),
        animation:
          ((data.visuals as Record<string, unknown>)?.animation as string) || null,
        description: null,
        isCapture: false,
        target: data.target ? toJsonString(data.target) : null,
      },
      create: {
        slug,
        name: slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        type: types[0] || "normal",
        power: data.power != null ? Math.round((data.power as number) * 100) : null,
        accuracy: data.accuracy != null ? (data.accuracy as number) * 100 : null,
        cooldown: (data.recharge as number) || null,
        effects: toJsonString(effects),
        animation:
          ((data.visuals as Record<string, unknown>)?.animation as string) || null,
        description: null,
        isCapture: false,
        target: data.target ? toJsonString(data.target) : null,
      },
    });
    count++;
  }
  console.log(`  Imported ${count} techniques`);
}

async function importItems() {
  console.log("\n=== Importing Items → GameItem ===");
  const items = readYamlFiles(path.join(DB_DIR, "item"));
  let count = 0;

  for (const { slug, data } of items) {
    await prisma.gameItem.upsert({
      where: { slug },
      update: {
        name:
          (data.name as string) ||
          slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        category: (data.category as string) || "misc",
        description: (data.description as string) || null,
        effects: toJsonString(data.effects || data.use || {}),
        price: (data.price as number) || null,
        sprite: (data.icon as string) || null,
        usableInBattle:
          (data.usable_in as string) === "combat" ||
          (data.usable_in as string) === "both",
        usableInField:
          (data.usable_in as string) === "field" ||
          (data.usable_in as string) === "both" ||
          !(data.usable_in as string),
      },
      create: {
        slug,
        name:
          (data.name as string) ||
          slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        category: (data.category as string) || "misc",
        description: (data.description as string) || null,
        effects: toJsonString(data.effects || data.use || {}),
        price: (data.price as number) || null,
        sprite: (data.icon as string) || null,
        usableInBattle:
          (data.usable_in as string) === "combat" ||
          (data.usable_in as string) === "both",
        usableInField:
          (data.usable_in as string) === "field" ||
          (data.usable_in as string) === "both" ||
          !(data.usable_in as string),
      },
    });
    count++;
  }
  console.log(`  Imported ${count} items`);
}

async function importMonsters() {
  console.log("\n=== Importing Monsters → CreatureTemplate ===");
  const monsters = readYamlFiles(path.join(DB_DIR, "monster"));
  let count = 0;

  for (const { slug, data } of monsters) {
    const types = (data.types as string[]) || [];
    const tags = (data.tags as string[]) || [];
    const terrains = (data.terrains as string[]) || [];
    const genderWeights = (data.gender_weights as Record<string, number>) || {};
    const sounds = (data.sounds as Record<string, unknown>) || {};
    const spriteBase = `/game-assets/monster/${slug}`;

    const species = await prisma.creatureTemplate.upsert({
      where: { slug },
      update: {
        dexNumber: (data.txmn_id as number) || count + 1,
        speciesName: (data.species as string) || slug,
        height: (data.height as number) || 0,
        weight: (data.weight as number) || 0,
        catchRate: (data.catch_rate as number) || 50,
        lowerCatchResistance: (data.lower_catch_resistance as number) || 1.0,
        upperCatchResistance: (data.upper_catch_resistance as number) || 1.0,
        stage: (data.stage as string) || "basic",
        shape: (data.shape as string) || "blob",
        types: toJsonString(types),
        tags: toJsonString(tags),
        terrains: toJsonString(terrains),
        genderWeights: toJsonString(genderWeights),
        sounds: toJsonString(sounds),
        spriteFront: `${spriteBase}-front.png`,
        spriteBack: `${spriteBase}-back.png`,
        spriteOverworld: `/game-assets/npc/${slug}.png`,
      },
      create: {
        slug,
        dexNumber: (data.txmn_id as number) || count + 1,
        speciesName: (data.species as string) || slug,
        height: (data.height as number) || 0,
        weight: (data.weight as number) || 0,
        catchRate: (data.catch_rate as number) || 50,
        lowerCatchResistance: (data.lower_catch_resistance as number) || 1.0,
        upperCatchResistance: (data.upper_catch_resistance as number) || 1.0,
        stage: (data.stage as string) || "basic",
        shape: (data.shape as string) || "blob",
        types: toJsonString(types),
        tags: toJsonString(tags),
        terrains: toJsonString(terrains),
        genderWeights: toJsonString(genderWeights),
        sounds: toJsonString(sounds),
        spriteFront: `${spriteBase}-front.png`,
        spriteBack: `${spriteBase}-back.png`,
        spriteOverworld: `/game-assets/npc/${slug}.png`,
      },
    });

    // Base stats from history / category if present
    const history = (data.history as Record<string, unknown>) || {};
    const hp = (history.hp as number) || (data.hp as number) || 50;
    const meleeAtk = (history.melee as number) || 10;
    const meleeDef = (history.armour as number) || 10;
    const rangedAtk = (history.ranged as number) || 10;
    const rangedDef = (history.dodge as number) || 10;
    const speed = (history.speed as number) || 10;

    await prisma.creatureBaseStats.upsert({
      where: { speciesId: species.id },
      update: {
        hp,
        physicalPower: meleeAtk,
        physicalDefense: meleeDef,
        abilityPower: rangedAtk,
        abilityDefense: rangedDef,
        combatTempo: speed,
      },
      create: {
        speciesId: species.id,
        hp,
        physicalPower: meleeAtk,
        physicalDefense: meleeDef,
        abilityPower: rangedAtk,
        abilityDefense: rangedDef,
        combatTempo: speed,
      },
    });

    await prisma.creatureLearnedAbility.deleteMany({ where: { speciesId: species.id } });
    await prisma.creatureEvolution.deleteMany({ where: { speciesId: species.id } });

    const moveset =
      (data.moveset as Array<{
        level_learned: number;
        technique: string;
        learning_method?: string;
      }>) || [];
    const seenMoves = new Set<string>();
    for (const move of moveset) {
      if (!move.technique || seenMoves.has(move.technique)) continue;
      seenMoves.add(move.technique);
      await prisma.creatureLearnedAbility.create({
        data: {
          speciesId: species.id,
          abilitySlug: move.technique,
          levelLearned: move.level_learned || 1,
          learningMethod: move.learning_method || "level_up",
        },
      });
    }

    const evolutions =
      (data.evolutions as Array<{
        at_level?: number;
        monster_slug: string;
        item?: string | Record<string, unknown>;
      }>) || [];
    for (const evo of evolutions) {
      if (!evo.monster_slug) continue;
      let itemRequired: string | null = null;
      if (evo.item) {
        itemRequired = typeof evo.item === "string" ? evo.item : toJsonString(evo.item);
      }
      await prisma.creatureEvolution.create({
        data: {
          speciesId: species.id,
          targetSlug: evo.monster_slug,
          atLevel: evo.at_level || null,
          itemRequired,
        },
      });
    }

    count++;
    if (count % 50 === 0) console.log(`  ... ${count} monsters imported`);
  }
  console.log(`  Imported ${count} monsters with movesets and evolutions`);
}

async function importEncounters() {
  console.log("\n=== Importing Encounters → EncounterTable ===");
  const encounters = readYamlFiles(path.join(DB_DIR, "encounter"));
  let count = 0;

  for (const { slug, data } of encounters) {
    await prisma.encounterTable.upsert({
      where: { slug },
      update: {
        mapName: (data.map_name as string) || slug,
        data: toJsonString(data),
      },
      create: {
        slug,
        mapName: (data.map_name as string) || slug,
        data: toJsonString(data),
      },
    });
    count++;
  }
  console.log(`  Imported ${count} encounter tables`);
}

async function importStatusEffects() {
  console.log("\n=== Importing Status → StatusEffectDictionary ===");
  const statuses = readYamlFiles(path.join(DB_DIR, "status"));
  let count = 0;

  for (const { slug, data } of statuses) {
    await prisma.statusEffectDictionary.upsert({
      where: { slug },
      update: {
        name: (data.name as string) || slug.replace(/_/g, " "),
        description: (data.description as string) || null,
        duration: data.duration != null ? String(data.duration) : null,
        effects: toJsonString(data.effects || data.bonuses || {}),
      },
      create: {
        slug,
        name: (data.name as string) || slug.replace(/_/g, " "),
        description: (data.description as string) || null,
        duration: data.duration != null ? String(data.duration) : null,
        effects: toJsonString(data.effects || data.bonuses || {}),
      },
    });
    count++;
  }
  console.log(`  Imported ${count} status effects`);
}

async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║   Tuxemon Data Import → Saints Web Database     ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log(`\nDB directory: ${DB_DIR}`);

  if (!fs.existsSync(DB_DIR)) {
    console.error(`\nERROR: Tuxemon DB directory not found at ${DB_DIR}`);
    process.exit(1);
  }

  const startTime = Date.now();

  try {
    await importElements();
    await importTechniques();
    await importItems();
    await importMonsters();
    await importEncounters();
    await importStatusEffects();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\nImport complete in ${elapsed}s`);

    console.log("\n  Database Summary:");
    console.log(`    Species:        ${await prisma.creatureTemplate.count()}`);
    console.log(`    Techniques:     ${await prisma.abilityDictionary.count()}`);
    console.log(`    Elements:       ${await prisma.creatureElement.count()}`);
    console.log(`    Type matchups:  ${await prisma.elementEffectiveness.count()}`);
    console.log(`    Items:          ${await prisma.gameItem.count()}`);
    console.log(`    Encounters:     ${await prisma.encounterTable.count()}`);
    console.log(`    Status effects: ${await prisma.statusEffectDictionary.count()}`);
  } catch (error) {
    console.error("\nImport failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
