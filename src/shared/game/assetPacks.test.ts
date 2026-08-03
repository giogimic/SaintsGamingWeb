import { describe, expect, it } from "vitest";
import { inferAssetPack, packTag } from "./assetPacks";

describe("inferAssetPack", () => {
  it("classifies LPC overworld NPCs", () => {
    expect(inferAssetPack("/game-assets/npc/37707_female.png")).toBe("lpc");
    expect(inferAssetPack("npc/adventurer_beige.png")).toBe("lpc");
  });

  it("classifies Tuxemon monsters and tilesets", () => {
    expect(inferAssetPack("/game-assets/monster/battle/rockitten-sheet.png")).toBe("tuxemon");
    expect(inferAssetPack("/game-assets/tilesets/core_outdoor.png")).toBe("tuxemon");
    expect(inferAssetPack("/game-assets/creatures/lumkit-ow.png")).toBe("tuxemon");
  });

  it("classifies Studio registry leftovers", () => {
    expect(inferAssetPack("/game-assets/ui/icons/sword.png")).toBe("studio");
    expect(inferAssetPack("/game-assets/items/nu_phone.png")).toBe("studio");
  });

  it("builds pack tags", () => {
    expect(packTag("lpc")).toBe("pack:lpc");
  });
});
