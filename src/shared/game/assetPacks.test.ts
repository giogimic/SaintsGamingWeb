import { describe, expect, it } from "vitest";
import { inferAssetPack, packTag } from "./assetPacks";

describe("inferAssetPack", () => {
  it("classifies legacy Saints official pack assets as legacy", () => {
    expect(inferAssetPack("/assets/packs/starter_realm.png")).toBe("legacy");
    expect(inferAssetPack("/game-assets/tilesets/Terrain_by_George.png")).toBe("legacy");
  });

  it("classifies LPC overworld NPCs", () => {
    expect(inferAssetPack("/game-assets/npc/37707_female.png")).toBe("lpc");
    expect(inferAssetPack("npc/adventurer_beige.png")).toBe("lpc");
  });

  it("classifies Legacy monsters and tilesets", () => {
    expect(inferAssetPack("/game-assets/monster/battle/rockitten-sheet.png")).toBe("legacy");
    expect(inferAssetPack("/game-assets/tilesets/core_outdoor.png")).toBe("legacy");
    expect(inferAssetPack("/game-assets/creatures/lumkit-ow.png")).toBe("legacy");
  });

  it("classifies Studio registry leftovers as legacy", () => {
    expect(inferAssetPack("/game-assets/ui/icons/sword.png")).toBe("legacy");
    expect(inferAssetPack("/game-assets/items/nu_phone.png")).toBe("legacy");
  });

  it("builds pack tags", () => {
    expect(packTag("lpc")).toBe("pack:lpc");
    expect(packTag("legacy")).toBe("pack:legacy");
  });
});

