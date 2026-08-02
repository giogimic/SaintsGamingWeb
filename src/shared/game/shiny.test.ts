import { describe, expect, it } from "vitest";
import {
  resolveCreatureSprites,
  resolveShinyChancePercent,
  rollShiny,
  shinyInstanceTags,
  SHINY_TAG,
} from "./shiny";

const baseDef = {
  shinyEnabled: true,
  shinyUseGlobalChance: true,
  shinyChancePercent: 25,
  spriteOverworld: "ow",
  spriteBattle: "battle",
  spriteBack: "back",
  shinySpriteOverworld: "shiny-ow",
  shinySpriteBattle: null as string | null,
  shinySpriteBack: null as string | null,
};

describe("shiny resolve", () => {
  it("uses global chance when synced", () => {
    expect(resolveShinyChancePercent(baseDef, 0.5)).toBe(0.5);
  });

  it("uses per-species chance when not synced", () => {
    expect(
      resolveShinyChancePercent({ ...baseDef, shinyUseGlobalChance: false }, 0.5)
    ).toBe(25);
  });

  it("returns 0 when shiny disabled", () => {
    expect(resolveShinyChancePercent({ ...baseDef, shinyEnabled: false }, 50)).toBe(0);
  });

  it("rolls with provided rng", () => {
    expect(rollShiny({ ...baseDef, shinyUseGlobalChance: false }, 0, () => 0.1)).toBe(true);
    expect(rollShiny({ ...baseDef, shinyUseGlobalChance: false }, 0, () => 0.9)).toBe(false);
  });

  it("falls back shiny sprites to default look", () => {
    const sprites = resolveCreatureSprites(baseDef, true);
    expect(sprites.spriteOverworld).toBe("shiny-ow");
    expect(sprites.spriteBattle).toBe("battle");
  });

  it("tags shiny instances", () => {
    expect(shinyInstanceTags(true)).toContain(SHINY_TAG);
    expect(shinyInstanceTags(false)).not.toContain(SHINY_TAG);
  });
});
