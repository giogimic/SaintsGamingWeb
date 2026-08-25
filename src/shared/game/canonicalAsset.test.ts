import { describe, it, expect } from "vitest";
import {
  buildCanonicalAssetData,
  projectUsableAssetToGameAssetData,
  formatCanonicalGameAsset,
} from "./canonicalAsset";
import { resolveSpriteDefinition } from "./spriteDefinitions";
import { getStandardSlices } from "./modularSpritePackage";

describe("Canonical Asset Convergence (Bible 35)", () => {
  it("generates deterministic GameAsset and UsableAsset records for sliced spritesheets", () => {
    const canonical = buildCanonicalAssetData({
      userId: "user_123",
      gameId: "saints",
      name: "Warrior Headgear Slice",
      type: "CHARACTER",
      sourceUrl: "/uploads/warrior_sheet.png",
      atlasSource: "/uploads/warrior_sheet.png",
      sourceRegion: { x: 0, y: 64, w: 64, h: 64 },
      importProfile: "character",
      slotRole: "hat",
      componentCategory: "hat",
      componentLayer: "head",
      variantFamily: "Iron Helm",
      isModularComponent: true,
      zOrderHint: 50,
      baseBodyType: "male",
      hidesComponents: ["hair"],
      facing: "S",
      animationState: "idle",
      animationFrames: 1,
    });

    // 1. UsableAsset verification
    expect(canonical.usableAssetData.name).toBe("Warrior Headgear Slice");
    expect(canonical.usableAssetData.type).toBe("CHARACTER");
    expect(canonical.usableAssetData.category).toBe("hat");
    expect(canonical.usableAssetData.width).toBe(64);
    expect(canonical.usableAssetData.height).toBe(64);
    expect(JSON.parse(canonical.usableAssetData.sourceRegion!)).toEqual({ x: 0, y: 64, w: 64, h: 64 });

    // 2. GameAsset verification
    expect(canonical.gameAssetData.source).toBe("/uploads/warrior_sheet.png");
    expect(canonical.gameAssetData.atlasSource).toBe("/uploads/warrior_sheet.png");
    expect(JSON.parse(canonical.gameAssetData.atlasFrame!)).toEqual({ x: 0, y: 64, width: 64, height: 64 });

    // 3. Tags & Categories
    const tags = JSON.parse(canonical.gameAssetData.tags);
    expect(tags).toContain("modular");
    expect(tags).toContain("sprite-component");
    expect(tags).toContain("component:hat");
    expect(tags).toContain("layer:head");
    expect(tags).toContain("variant:iron helm");
    expect(tags).toContain("body:male");

    // 4. Metadata
    const metadata = JSON.parse(canonical.gameAssetData.metadata);
    expect(metadata.isModularComponent).toBe(true);
    expect(metadata.componentCategory).toBe("hat");
    expect(metadata.componentLayer).toBe("head");
    expect(metadata.zOrderHint).toBe(50);
    expect(metadata.baseBodyType).toBe("male");
    expect(metadata.hidesComponents).toEqual(["hair"]);
  });

  it("projects existing UsableAsset directly into a canonical GameAsset record", () => {
    const usable = {
      id: "usable_456",
      sourceAssetId: "src_789",
      name: "Leather Boots",
      type: "CHARACTER",
      category: "shoes",
      tags: JSON.stringify(["lpc", "boots", "modular"]),
      width: 64,
      height: 64,
      sourceRegion: JSON.stringify({ x: 128, y: 256, w: 64, h: 64 }),
      facing: "S",
      animationState: "walk",
      animationFrames: 9,
      frameDurationMs: 100,
      gameId: "saints",
      cdnUrl: "/game-assets/npc/boots.png",
    };

    const sourceAsset = {
      id: "src_789",
      storagePath: "/game-assets/npc/boots.png",
      filename: "boots.png",
      fileSize: 10240,
      metadata: JSON.stringify({
        cat: "shoes",
        layer: "feet",
        variant: "Leather",
        z: 30,
        body: "male",
      }),
    };

    const gameAssetData = projectUsableAssetToGameAssetData(usable, sourceAsset);
    expect(gameAssetData.source).toBe("/game-assets/npc/boots.png");
    expect(gameAssetData.atlasSource).toBe("/game-assets/npc/boots.png");
    expect(JSON.parse(gameAssetData.atlasFrame!)).toEqual({ x: 128, y: 256, width: 64, height: 64 });

    const formatted = formatCanonicalGameAsset({
      ...gameAssetData,
      id: "game_123",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(formatted.isModularComponent).toBe(true);
    expect(formatted.componentCategory).toBe("shoes");
    expect(formatted.componentLayer).toBe("feet");
    expect(formatted.variantFamily).toBe("Leather");
    expect(formatted.zOrderHint).toBe(30);
    expect(formatted.baseBodyType).toBe("male");
    expect(formatted.atlasFrame).toEqual({ x: 128, y: 256, width: 64, height: 64 });
  });

  it("handles high-resolution (128x128) LPC spritesheets without row miscalculation", () => {
    const highResDef = resolveSpriteDefinition({
      width: 1664,
      height: 4992,
      spriteUrl: "/uploads/lpc_highres.png",
    });

    expect(highResDef.columns).toBe(13);
    expect(highResDef.frameWidth).toBe(128);
    expect(highResDef.frameHeight).toBe(128);
    expect(highResDef.rows).toBe(39); // 4992 / 128 = 39 (NOT 78)

    const standardDef = resolveSpriteDefinition({
      width: 832,
      height: 1344,
      spriteUrl: "/uploads/lpc_standard.png",
    });

    expect(standardDef.columns).toBe(13);
    expect(standardDef.frameWidth).toBe(64);
    expect(standardDef.frameHeight).toBe(64);
    expect(standardDef.rows).toBe(21); // 1344 / 64 = 21
  });

  it("safely defaults ambiguous/unknown assets to OBJECT and isPlayable: false", () => {
    const unknownAsset = buildCanonicalAssetData({
      sourceUrl: "/uploads/mystery_prop.png",
      width: 64,
      height: 64,
    });

    expect(unknownAsset.normalizedType).toBe("OBJECT");
    expect(unknownAsset.metadata.isPlayable).toBe(false);
    expect(unknownAsset.metadata.showInCharacterCreation).toBe(false);

    const tags = JSON.parse(unknownAsset.gameAssetData.tags);
    expect(tags).not.toContain("playable");
    expect(tags).not.toContain("character_creator");
  });

  it("generates 128px slice coordinates for 1664px sheets and 64px coordinates for 832px sheets", () => {
    // 1664px High-Res LPC Sheet
    const highResSlices = getStandardSlices("multi_frame_directional", {
      sheetWidth: 1664,
      sheetHeight: 4992,
    });

    const highResWalkSouth = highResSlices.find((s: any) => s.id === "slice_walk_s");
    expect(highResWalkSouth).toBeDefined();
    expect(highResWalkSouth!.y).toBe(10 * 128); // Row 10 @ 128px = 1280 (NOT 640)
    expect(highResWalkSouth!.w).toBe(9 * 128);  // 1152px
    expect(highResWalkSouth!.h).toBe(128);      // 128px

    // 832px Standard LPC Sheet
    const standardSlices = getStandardSlices("multi_frame_directional", {
      sheetWidth: 832,
      sheetHeight: 1344,
    });

    const standardWalkSouth = standardSlices.find((s: any) => s.id === "slice_walk_s");
    expect(standardWalkSouth).toBeDefined();
    expect(standardWalkSouth!.y).toBe(10 * 64); // Row 10 @ 64px = 640
    expect(standardWalkSouth!.w).toBe(9 * 64);  // 576px
    expect(standardWalkSouth!.h).toBe(64);      // 64px
  });
});
