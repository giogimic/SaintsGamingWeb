import { describe, expect, it } from "vitest";
import { resolveEntitySpriteUrl } from "./creatureCatalog";

describe("resolveEntitySpriteUrl player fallbacks", () => {
  it("maps legacy hero_male / hero_female to adventurer", () => {
    expect(resolveEntitySpriteUrl("hero_male", { kind: "player" })).toBe(
      "/game-assets/npc/adventurer.png"
    );
    expect(resolveEntitySpriteUrl("hero_female", { kind: "player" })).toBe(
      "/game-assets/npc/adventurer.png"
    );
  });

  it("keeps real starter walk sheets", () => {
    expect(resolveEntitySpriteUrl("warrior", { kind: "player" })).toBe(
      "/game-assets/npc/warrior.png"
    );
    expect(resolveEntitySpriteUrl("adventurer", { kind: "player" })).toBe(
      "/game-assets/npc/adventurer.png"
    );
  });

  it("uses explicit fallback for empty keys", () => {
    expect(
      resolveEntitySpriteUrl("", {
        kind: "player",
        fallback: "/game-assets/npc/adventurer.png",
      })
    ).toBe("/game-assets/npc/adventurer.png");
  });
});
