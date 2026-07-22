/**
 * Tuxemon Data Import Script
 * 
 * Imports all YAML data from Tuxemon's mods/tuxemon/db/ directory
 * into the Saints Web Prisma database.
 * 
 * Usage: npx tsx scripts/import-tuxemon-data.ts
 */

import fs from "fs";
import path from "path";
import * as yaml from "js-yaml";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Path to Tuxemon database YAML files
const LOCAL_DB_DIR = path.join(process.cwd(), "tuxemon-db");
const TUXEMON_ROOT = path.resolve(
  process.env.TUXEMON_PATH || "C:/Users/Matth/OneDrive/Desktop/Tuxemon-0.5-rc1"
);
const DB_DIR = fs.existsSync(LOCAL_DB_DIR) 
  ? LOCAL_DB_DIR 
  : path.join(TUXEMON_ROOT, "mods", "tuxemon", "db");

// ─── Helpers ─────────────────────────────────────────────────────

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
      if (data) {
        results.push({ slug, data });
      }
    } catch (e) {
      console.warn(`  Failed to parse ${file}:`, e);
    }
  }
  return results;
}

function toJsonString(value: unknown): string {
  const str = JSON.stringify(value ?? null);
  return str.length > 190 ? str.slice(0, 190) : str;
}

// ─── 1. Import Elements ──────────────────────────────────────────

async function importElements() {
  console.log("\n=== Importing Elements ===");
  const elements = readYamlFiles(path.join(DB_DIR, "element"));
  let count = 0;

  for (const { slug, data } of elements) {
    // Upsert element
    await prisma.tuxemonElement.upsert({
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

    // Upsert type effectiveness
    const types = (data.types as Array<{ against: string; multiplier: number }>) || [];
    for (const t of types) {
      await prisma.tuxemonTypeEffectiveness.upsert({
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

// ─── 2. Import Techniques ────────────────────────────────────────

async function importTechniques() {
  console.log("\n=== Importing Techniques ===");
  const techniques = readYamlFiles(path.join(DB_DIR, "technique"));
  let count = 0;

  for (const { slug, data } of techniques) {
    const types = (data.types as string[]) || [];
    const effects = (data.effects as unknown[]) || [];
    const tags = (data.tags as string[]) || [];

    await prisma.tuxemonTechnique.upsert({
      where: { slug },
      update: {
        name: slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        type: types[0] || "normal",
        power: data.power != null ? Math.round((data.power as number) * 100) : null,
        accuracy: data.accuracy != null ? (data.accuracy as number) * 100 : null,
        ppCost: (data.recharge as number) || null,
        effects: toJsonString(effects),
        animation: (data.visuals as Record<string, unknown>)?.animation as string || null,
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
        ppCost: (data.recharge as number) || null,
        effects: toJsonString(effects),
        animation: (data.visuals as Record<string, unknown>)?.animation as string || null,
        description: null,
        isCapture: false,
        target: data.target ? toJsonString(data.target) : null,
      },
    });
    count++;
  }
  console.log(`  Imported ${count} techniques`);
}

// ─── 3. Import Items ─────────────────────────────────────────────

async function importItems() {
  console.log("\n=== Importing Items ===");
  const items = readYamlFiles(path.join(DB_DIR, "item"));
  let count = 0;

  for (const { slug, data } of items) {
    await prisma.tuxemonItem.upsert({
      where: { slug },
      update: {
        name: (data.name as string) || slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        category: (data.category as string) || "misc",
        description: (data.description as string) || null,
        effects: toJsonString(data.effects || data.use || {}),
        price: (data.price as number) || null,
        sprite: (data.icon as string) || null,
        usableInBattle: (data.usable_in as string) === "combat" || (data.usable_in as string) === "both",
        usableInField: (data.usable_in as string) === "field" || (data.usable_in as string) === "both" || !(data.usable_in as string),
      },
      create: {
        slug,
        name: (data.name as string) || slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        category: (data.category as string) || "misc",
        description: (data.description as string) || null,
        effects: toJsonString(data.effects || data.use || {}),
        price: (data.price as number) || null,
        sprite: (data.icon as string) || null,
        usableInBattle: (data.usable_in as string) === "combat" || (data.usable_in as string) === "both",
        usableInField: (data.usable_in as string) === "field" || (data.usable_in as string) === "both" || !(data.usable_in as string),
      },
    });
    count++;
  }
  console.log(`  Imported ${count} items`);
}

// ─── 4. Import Monsters ──────────────────────────────────────────

async function importMonsters() {
  console.log("\n=== Importing Monsters ===");
  const monsters = readYamlFiles(path.join(DB_DIR, "monster"));
  let count = 0;

  for (const { slug, data } of monsters) {
    const types = (data.types as string[]) || [];
    const tags = (data.tags as string[]) || [];
    const terrains = (data.terrains as string[]) || [];
    const genderWeights = (data.gender_weights as Record<string, number>) || {};
    const sounds = (data.sounds as Record<string, unknown>) || {};

    // Determine sprite paths
    const spriteBase = `/tuxemon-assets/sprites/${slug}`;

    const species = await prisma.tuxemonSpecies.upsert({
      where: { slug },
      update: {
        txmnId: (data.txmn_id as number) || count + 1,
        species: (data.species as string) || "unknown",
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
        spriteFront: `${spriteBase}_front.png`,
        spriteBack: `${spriteBase}_back.png`,
        spriteOverworld: `/tuxemon-assets/sprites_obj/${slug}.png`,
      },
      create: {
        slug,
        txmnId: (data.txmn_id as number) || count + 1,
        species: (data.species as string) || "unknown",
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
        spriteFront: `${spriteBase}_front.png`,
        spriteBack: `${spriteBase}_back.png`,
        spriteOverworld: `/tuxemon-assets/sprites_obj/${slug}.png`,
      },
    });

    // Delete existing moveset and evolutions for clean re-import
    await prisma.tuxemonMove.deleteMany({ where: { speciesId: species.id } });
    await prisma.tuxemonEvolution.deleteMany({ where: { speciesId: species.id } });

    // Import moveset (deduplicate by techniqueSlug)
    const moveset = (data.moveset as Array<{
      level_learned: number;
      technique: string;
      learning_method?: string;
    }>) || [];
    const seenMoves = new Set<string>();
    for (const move of moveset) {
      if (seenMoves.has(move.technique)) continue;
      seenMoves.add(move.technique);
      await prisma.tuxemonMove.create({
        data: {
          speciesId: species.id,
          techniqueSlug: move.technique,
          levelLearned: move.level_learned || 1,
          learningMethod: move.learning_method || "level_up",
        },
      });
    }

    // Import evolutions
    const evolutions = (data.evolutions as Array<{
      at_level?: number;
      monster_slug: string;
      item?: string | Record<string, unknown>;
    }>) || [];
    for (const evo of evolutions) {
      // item can be a string slug or an object like {booster_tech: 0.2}
      let itemRequired: string | null = null;
      if (evo.item) {
        itemRequired = typeof evo.item === "string" ? evo.item : toJsonString(evo.item);
      }
      await prisma.tuxemonEvolution.create({
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

// ─── 5. Import Encounters ────────────────────────────────────────

async function importEncounters() {
  console.log("\n=== Importing Encounters ===");
  const encounters = readYamlFiles(path.join(DB_DIR, "encounter"));
  let count = 0;

  for (const { slug, data } of encounters) {
    await prisma.tuxemonEncounter.upsert({
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

// ─── 6. Import Status Effects ────────────────────────────────────

async function importStatusEffects() {
  console.log("\n=== Importing Status Effects ===");
  const statuses = readYamlFiles(path.join(DB_DIR, "status"));
  let count = 0;

  for (const { slug, data } of statuses) {
    await prisma.tuxemonStatus.upsert({
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

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║   Tuxemon Data Import → Saints Web Database     ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log(`\nTuxemon source: ${TUXEMON_ROOT}`);
  console.log(`DB directory: ${DB_DIR}`);

  if (!fs.existsSync(DB_DIR)) {
    console.error(`\nERROR: Tuxemon DB directory not found at ${DB_DIR}`);
    console.error("Set TUXEMON_PATH env var to the Tuxemon root directory.");
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
    console.log("\n╔══════════════════════════════════════════════════╗");
    console.log(`║   Import complete in ${elapsed}s`);
    console.log("╚══════════════════════════════════════════════════╝");

    // Print summary
    const speciesCount = await prisma.tuxemonSpecies.count();
    const techniqueCount = await prisma.tuxemonTechnique.count();
    const elementCount = await prisma.tuxemonElement.count();
    const itemCount = await prisma.tuxemonItem.count();
    const encounterCount = await prisma.tuxemonEncounter.count();
    const statusCount = await prisma.tuxemonStatus.count();
    const effectivenessCount = await prisma.tuxemonTypeEffectiveness.count();

    console.log("\n  Database Summary:");
    console.log(`    Species:        ${speciesCount}`);
    console.log(`    Techniques:     ${techniqueCount}`);
    console.log(`    Elements:       ${elementCount}`);
    console.log(`    Type matchups:  ${effectivenessCount}`);
    console.log(`    Items:          ${itemCount}`);
    console.log(`    Encounters:     ${encounterCount}`);
    console.log(`    Status effects: ${statusCount}`);
  } catch (error) {
    console.error("\nImport failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();