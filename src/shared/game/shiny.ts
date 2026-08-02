/**
 * Shiny spawn resolution — global chance + per-creature override.
 */

import type { CreatureDefData } from "./creatureCatalog";
import { DEFAULT_GLOBAL_SHINY_CHANCE_PERCENT } from "./classCatalog";

export const SHINY_TAG = "shiny";

export function resolveShinyChancePercent(
  def: Pick<CreatureDefData, "shinyEnabled" | "shinyUseGlobalChance" | "shinyChancePercent">,
  globalChancePercent: number = DEFAULT_GLOBAL_SHINY_CHANCE_PERCENT
): number {
  if (def.shinyEnabled === false) return 0;
  if (def.shinyUseGlobalChance !== false) {
    return Math.max(0, Math.min(100, globalChancePercent));
  }
  return Math.max(0, Math.min(100, def.shinyChancePercent ?? 0));
}

/** Roll whether an encounter instance is shiny. */
export function rollShiny(
  def: Pick<CreatureDefData, "shinyEnabled" | "shinyUseGlobalChance" | "shinyChancePercent">,
  globalChancePercent: number = DEFAULT_GLOBAL_SHINY_CHANCE_PERCENT,
  rng: () => number = Math.random
): boolean {
  const chance = resolveShinyChancePercent(def, globalChancePercent);
  if (chance <= 0) return false;
  return rng() * 100 < chance;
}

export function resolveCreatureSprites(
  def: Pick<
    CreatureDefData,
    | "spriteOverworld"
    | "spriteBattle"
    | "spriteBack"
    | "shinySpriteOverworld"
    | "shinySpriteBattle"
    | "shinySpriteBack"
  >,
  isShiny: boolean
) {
  if (!isShiny) {
    return {
      spriteOverworld: def.spriteOverworld,
      spriteBattle: def.spriteBattle || def.spriteOverworld,
      spriteBack: def.spriteBack || null,
    };
  }
  return {
    spriteOverworld: def.shinySpriteOverworld || def.spriteOverworld,
    spriteBattle: def.shinySpriteBattle || def.spriteBattle || def.spriteOverworld,
    spriteBack: def.shinySpriteBack || def.spriteBack || null,
  };
}

export function shinyInstanceTags(isShiny: boolean, extra: string[] = []): string[] {
  const tags = [...extra];
  if (isShiny && !tags.includes(SHINY_TAG)) tags.push(SHINY_TAG);
  return tags;
}
