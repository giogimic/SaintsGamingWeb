import { describe, expect, it } from "vitest";
import {
  clampPanelLayout,
  extractPanelLayouts,
  mergePanelLayouts,
  type PanelLayoutMap,
} from "./studioPanelLayout";
import type { FloatingPanelState, PanelId } from "@/web/components/the-lobby/editor/editor-store";

function panel(partial: Partial<FloatingPanelState> & { id: PanelId }): FloatingPanelState {
  return {
    title: partial.id,
    isOpen: false,
    isCollapsed: false,
    x: 20,
    y: 20,
    width: 320,
    height: 400,
    zIndex: 10,
    ...partial,
  };
}

describe("studioPanelLayout", () => {
  it("clamps off-screen positions into the viewport", () => {
    const c = clampPanelLayout(
      { x: 5000, y: 4000, width: 320, height: 400, isCollapsed: false },
      1280,
      720
    );
    expect(c.x).toBeLessThanOrEqual(1280 - 80);
    expect(c.y).toBeLessThanOrEqual(720 - 40);
    expect(c.width).toBe(320);
  });

  it("merges saved geometry without changing isOpen", () => {
    const panels = {
      build: panel({ id: "build", isOpen: true, x: 20, y: 20 }),
      properties: panel({ id: "properties", isOpen: false, x: 1550, y: 20 }),
    } as Record<PanelId, FloatingPanelState>;

    const saved: PanelLayoutMap = {
      build: { x: 80, y: 120, width: 360, height: 500, isCollapsed: true },
    };

    const merged = mergePanelLayouts(panels, saved, 1280, 720);
    expect(merged.build.isOpen).toBe(true);
    expect(merged.build.x).toBe(80);
    expect(merged.build.y).toBe(120);
    expect(merged.build.isCollapsed).toBe(true);
    expect(merged.properties.x).toBe(1550);
  });

  it("extracts only layout fields", () => {
    const panels = {
      build: panel({ id: "build", isOpen: true, x: 42, y: 64, width: 300, height: 280, isCollapsed: true }),
    } as Record<PanelId, FloatingPanelState>;
    const extracted = extractPanelLayouts(panels);
    expect(extracted.build).toEqual({
      x: 42,
      y: 64,
      width: 300,
      height: 280,
      isCollapsed: true,
    });
  });
});
