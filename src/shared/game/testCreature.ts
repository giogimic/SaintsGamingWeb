/**
 * @deprecated Prefer creatureCatalog FALLBACK_CREATURE_DEFS / CreatureDef DB.
 * Kept as thin re-exports so older imports keep working during migration.
 */

import {
  getFallbackCreature,
  creatureAssetUrl,
  FALLBACK_CREATURE_DEFS,
} from "./creatureCatalog";

const rockitten = getFallbackCreature("rockitten")!;

export const TEST_CREATURE_SLUG = rockitten.slug;

export const TEST_CREATURE = {
  slug: rockitten.slug,
  name: rockitten.name,
  overworldSprite: rockitten.spriteOverworld,
  battleSheet: rockitten.spriteBattle || rockitten.spriteOverworld,
  level: rockitten.starterLevel,
  maxHp: rockitten.baseHp,
  stats: {
    physicalPower: rockitten.physicalPower,
    physicalDefense: rockitten.physicalDefense,
    abilityPower: rockitten.abilityPower,
    abilityDefense: rockitten.abilityDefense,
    combatTempo: rockitten.combatTempo,
  },
  abilities: rockitten.abilities,
  description: rockitten.flavor,
} as const;

export function testCreatureSpriteUrl(kind: "overworld" | "battle" = "overworld"): string {
  return creatureAssetUrl(kind === "battle" ? TEST_CREATURE.battleSheet : TEST_CREATURE.overworldSprite);
}

export const ALL_TEST_CREATURES = FALLBACK_CREATURE_DEFS;
