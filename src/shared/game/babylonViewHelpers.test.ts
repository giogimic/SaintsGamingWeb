import { describe, expect, it } from "vitest";
import {
  ENTITY_GROUND_CLEARANCE,
  cameraFocusMargin,
  clampCameraFocus,
  paintOverlayHeight,
} from "./babylonViewHelpers";

describe("cameraFocusMargin", () => {
  it("uses 5% of tile size with a small floor", () => {
    expect(cameraFocusMargin(1)).toBeCloseTo(0.05);
    expect(cameraFocusMargin(2)).toBeCloseTo(0.1);
    expect(cameraFocusMargin(0)).toBeCloseTo(0.05);
  });
});

describe("clampCameraFocus", () => {
  it("allows focus near the northern edge of DEMO-sized maps", () => {
    // Row 0 center on a 30×30 map with tileSize 1 sits at z = 14.5
    const north = clampCameraFocus(0, 14.5, 30, 30, 1);
    expect(north.z).toBeCloseTo(14.5);
    expect(north.z).toBeGreaterThan(14);
  });

  it("still clamps far outside the map", () => {
    const far = clampCameraFocus(0, 100, 30, 30, 1);
    expect(far.z).toBeLessThanOrEqual(15 - cameraFocusMargin(1) + 1e-9);
  });

  it("clamps tiny maps to the soft edge instead of flying off", () => {
    // 1×1 world: half-extent 0.5, margin 0.05 → focus stays in [-0.45, 0.45]
    expect(clampCameraFocus(3, 3, 1, 1, 1)).toEqual({ x: 0.45, z: 0.45 });
  });
});

describe("paintOverlayHeight", () => {
  it("stays inside the matching batched layer slot", () => {
    expect(paintOverlayHeight(0)).toBeCloseTo(0.011);
    expect(paintOverlayHeight(2)).toBeCloseTo(0.051);
    expect(paintOverlayHeight(-1)).toBeCloseTo(0.011);
    // Layer 0 overlay must not reach layer 1's plane (0.02).
    expect(paintOverlayHeight(0)).toBeLessThan(0.02);
  });
});

describe("ENTITY_GROUND_CLEARANCE", () => {
  it("keeps sprites clearly above flat ground quads", () => {
    expect(ENTITY_GROUND_CLEARANCE).toBeGreaterThan(0.85);
  });
});
