import { describe, expect, it } from "vitest";
import { compositeCharacterLayers } from "./characterLayerCompositor";

describe("compositeCharacterLayers", () => {
  it("sorts layers by zOrder ascending", () => {
    const result = compositeCharacterLayers([
      { id: "hat", url: "hat.png", componentCategory: "hat", zOrderHint: 60 },
      { id: "face", url: "face.png", componentCategory: "face", zOrderHint: 20 },
      { id: "hair", url: "hair.png", componentCategory: "hair", zOrderHint: 30 },
    ]);

    expect(result.visibleLayers.map((l) => l.id)).toEqual(["face", "hair", "hat"]);
  });

  it("falls back to default z-order hints when none provided", () => {
    const result = compositeCharacterLayers([
      { id: "hat", url: "hat.png", componentCategory: "hat" },
      { id: "hair", url: "hair.png", componentCategory: "hair" },
    ]);

    // hat's default (60) > hair's default (30)
    expect(result.visibleLayers.map((l) => l.id)).toEqual(["hair", "hat"]);
  });

  it("hides layers listed in another layer's hidesComponents", () => {
    const result = compositeCharacterLayers([
      { id: "hair", url: "hair.png", componentCategory: "hair", zOrderHint: 30 },
      {
        id: "closed-helm",
        url: "helm.png",
        componentCategory: "hat",
        zOrderHint: 60,
        hidesComponents: ["hair", "head_accessory"],
      },
      { id: "head-acc", url: "acc.png", componentCategory: "head_accessory", zOrderHint: 55 },
    ]);

    expect(result.visibleLayers.map((l) => l.id)).toEqual(["closed-helm"]);
    const hair = result.allLayers.find((l) => l.id === "hair");
    expect(hair?.hiddenBy).toEqual(["closed-helm"]);
  });

  it("does not hide the layer that declares the exclusion itself", () => {
    const result = compositeCharacterLayers([
      { id: "helm", url: "helm.png", componentCategory: "hat", hidesComponents: ["hat"] },
    ]);

    expect(result.visibleLayers.map((l) => l.id)).toEqual(["helm"]);
  });

  it("flags baseBodyType mismatches without removing the layer", () => {
    const result = compositeCharacterLayers(
      [
        { id: "shirt", url: "shirt.png", componentCategory: "shirt", baseBodyType: "child" },
        { id: "pants", url: "pants.png", componentCategory: "pants", baseBodyType: "male" },
      ],
      { referenceBodyType: "male" }
    );

    expect(result.bodyTypeMismatches).toEqual(["shirt"]);
    expect(result.visibleLayers.map((l) => l.id)).toEqual(["pants", "shirt"]);
  });
});
