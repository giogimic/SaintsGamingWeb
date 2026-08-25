import { describe, it, expect } from "vitest";
import {
  detectSpriteFormat,
  getStandardSlices,
  inferComponentCategoryFromPath,
  parseCreditsText,
} from "./modularSpritePackage";

describe("lpcPackage utilities", () => {
  describe("detectSpriteFormat", () => {
    it("detects Universal LPC Full Character Sheets (832x1344)", () => {
      const detected = detectSpriteFormat(832, 1344);
      expect(detected.isRecognized).toBe(true);
      expect(detected.variant).toBe("universal-full");
      expect(detected.cols).toBe(13);
      expect(detected.rows).toBe(21);
      expect(detected.suggestedPresets).toContain("multi_frame_directional");
    });

    it("detects LPC 4-Direction Walk Cycle (576x256)", () => {
      const detected = detectSpriteFormat(576, 256);
      expect(detected.isRecognized).toBe(true);
      expect(detected.variant).toBe("directional_walk");
      expect(detected.cols).toBe(9);
      expect(detected.rows).toBe(4);
      expect(detected.suggestedPresets).toContain("directional_walk");
    });

    it("detects Saints 2.5D Walk Grid (96x128)", () => {
      const detected = detectSpriteFormat(96, 128);
      expect(detected.isRecognized).toBe(true);
      expect(detected.variant).toBe("directional_3x4");
      expect(detected.cols).toBe(3);
      expect(detected.rows).toBe(4);
      expect(detected.totalFrames).toBe(12);
    });

    it("detects 64x64 grid-aligned custom spritesheets", () => {
      const detected = detectSpriteFormat(256, 256);
      expect(detected.isRecognized).toBe(true);
      expect(detected.variant).toBe("custom-grid");
      expect(detected.frameWidth).toBe(64);
      expect(detected.cols).toBe(4);
      expect(detected.rows).toBe(4);
    });
  });

  describe("getStandardSlices", () => {
    it("generates full animation suite for multi_frame_directional", () => {
      const slices = getStandardSlices("multi_frame_directional", { prefix: "hero" });
      expect(slices.length).toBeGreaterThan(15);

      const walkSouth = slices.find((s) => s.facing === "S" && s.animationState === "walk");
      expect(walkSouth).toBeDefined();
      expect(walkSouth?.y).toBe(10 * 64); // Walk south is row 10 in LPC (offset 2 from row 8)
      expect(walkSouth?.animationFrames).toBe(9);

      const slashNorth = slices.find((s) => s.facing === "N" && s.animationState === "slash");
      expect(slashNorth).toBeDefined();
      expect(slashNorth?.y).toBe(12 * 64);
      expect(slashNorth?.animationFrames).toBe(6);

      const hurtSouth = slices.find((s) => s.animationState === "hurt");
      expect(hurtSouth).toBeDefined();
      expect(hurtSouth?.y).toBe(20 * 64);
    });

    it("generates 4-direction walk cycles for directional_walk", () => {
      const slices = getStandardSlices("directional_walk");
      expect(slices).toHaveLength(4);
      expect(slices.map((s) => s.facing)).toEqual(["N", "W", "S", "E"]);
      expect(slices[0].animationFrames).toBe(9);
    });

    it("generates 2.5D MMO 3x4 walk grid", () => {
      const slices = getStandardSlices("directional_3x4", { sheetWidth: 96, sheetHeight: 128 });
      expect(slices).toHaveLength(4);
      expect(slices.map((s) => s.facing)).toEqual(["S", "W", "E", "N"]);
      expect(slices[0].animationFrames).toBe(3);
    });

    it("generates 4 standing idles", () => {
      const slices = getStandardSlices("directional_idles", { sheetHeight: 1344 });
      expect(slices).toHaveLength(4);
      expect(slices.every((s) => s.animationState === "idle")).toBe(true);
    });
  });

  describe("parseCreditsText", () => {
    it("parses standard LPC generator credit lines", () => {
      const raw = `
        # Generator credits
        body/male/light.png by Johannes Sjölund (CC-BY-SA 3.0) - https://opengameart.org/content/lpc-character-bases
        hair/messy/blonde.png by Manuel Riecke (GPL 3.0) - https://opengameart.org/content/lpc-hair
      `;
      const credits = parseCreditsText(raw);
      expect(credits).toHaveLength(2);
      expect(credits[0].fileName).toBe("body/male/light.png");
      expect(credits[0].authors).toContain("Johannes Sjölund");
      expect(credits[0].licenses).toContain("CC-BY-SA 3.0");
      expect(credits[1].fileName).toBe("hair/messy/blonde.png");
      expect(credits[1].authors).toContain("Manuel Riecke");
    });
  });

  describe("inferComponentCategoryFromPath", () => {
    it("infers category, layer, and body type accurately", () => {
      const hair = inferComponentCategoryFromPath("hair/male/blonde_messy.png");
      expect(hair.category).toBe("hair");
      expect(hair.layer).toBe("head");
      expect(hair.baseBodyType).toBe("male");

      const armor = inferComponentCategoryFromPath("torso/armor/chestplate_female.png");
      expect(armor.category).toBe("jacket");
      expect(armor.layer).toBe("torso");
      expect(armor.baseBodyType).toBe("female");

      const boots = inferComponentCategoryFromPath("feet/boots/leather.png");
      expect(boots.category).toBe("shoes");
      expect(boots.layer).toBe("feet");
    });
  });
});
