/**
 * Single MPV test creature used for BOTH turn-based encounters and RT MMO combat.
 * Species: Tuxemon Rockitten (assets already in /game-assets).
 */

export const TEST_CREATURE_SLUG = "rockitten";

export const TEST_CREATURE = {
  slug: TEST_CREATURE_SLUG,
  name: "Rockitten",
  /** Overworld / TB portrait (single-frame NPC sheet). */
  overworldSprite: "npc/rockitten",
  /** Battle sheet path (for future frame animation). */
  battleSheet: "monster/battle/rockitten-sheet",
  level: 5,
  maxHp: 100,
  stats: {
    physicalPower: 12,
    physicalDefense: 14,
    abilityPower: 8,
    abilityDefense: 10,
    combatTempo: 90,
  },
  abilities: [{ abilitySlug: "ram", currentCooldown: 0 }],
  description:
    "A cute boulder-beast. Saints MPV uses Rockitten for capture battles and overworld RT fights.",
} as const;

export function testCreatureSpriteUrl(kind: "overworld" | "battle" = "overworld"): string {
  const key = kind === "battle" ? TEST_CREATURE.battleSheet : TEST_CREATURE.overworldSprite;
  return `/game-assets/${key}.png`;
}
