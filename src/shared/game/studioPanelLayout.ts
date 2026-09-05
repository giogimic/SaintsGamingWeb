/**
 * Studio floating-dock layout persistence (bible 16 §4 / §11).
 * Persists geometry + collapse only — `isOpen` stays mode-driven (Walk closes docks).
 */

import type { FloatingPanelState, PanelId } from "@/web/components/the-lobby/editor/editor-store";

export const STUDIO_PANEL_LAYOUT_KEY = "sg.studio.panelLayout.v1";

export type PanelLayoutSlice = {
  x: number;
  y: number;
  width: number;
  height: number;
  isCollapsed: boolean;
};

export type PanelLayoutMap = Partial<Record<PanelId, PanelLayoutSlice>>;

const MIN_W = 220;
const MIN_H = 120;

export function clampPanelLayout(
  slice: PanelLayoutSlice,
  viewportWidth: number,
  viewportHeight: number
): PanelLayoutSlice {
  const vw = Math.max(320, viewportWidth || 1280);
  const vh = Math.max(240, viewportHeight || 720);
  const width = Math.max(MIN_W, Math.min(slice.width, vw - 16));
  const height = Math.max(MIN_H, Math.min(slice.height, vh - 16));
  const x = Math.max(0, Math.min(slice.x, vw - 80));
  const y = Math.max(0, Math.min(slice.y, vh - 40));
  return {
    x,
    y,
    width,
    height,
    isCollapsed: !!slice.isCollapsed,
  };
}

export function extractPanelLayouts(
  panels: Record<PanelId, FloatingPanelState>
): PanelLayoutMap {
  const out: PanelLayoutMap = {};
  (Object.keys(panels) as PanelId[]).forEach((id) => {
    const p = panels[id];
    out[id] = {
      x: p.x,
      y: p.y,
      width: p.width,
      height: p.height,
      isCollapsed: p.isCollapsed,
    };
  });
  return out;
}

/** Merge saved geometry into panel records without touching isOpen / zIndex / title. */
export function mergePanelLayouts(
  panels: Record<PanelId, FloatingPanelState>,
  saved: PanelLayoutMap | null | undefined,
  viewportWidth?: number,
  viewportHeight?: number
): Record<PanelId, FloatingPanelState> {
  if (!saved) return panels;
  const vw = viewportWidth ?? (typeof window !== "undefined" ? window.innerWidth : 1280);
  const vh = viewportHeight ?? (typeof window !== "undefined" ? window.innerHeight : 720);
  const serapht = { ...panels };
  (Object.keys(serapht) as PanelId[]).forEach((id) => {
    const slice = saved[id];
    if (!slice) return;
    if (
      typeof slice.x !== "number" ||
      typeof slice.y !== "number" ||
      typeof slice.width !== "number" ||
      typeof slice.height !== "number"
    ) {
      return;
    }
    const clamped = clampPanelLayout(
      {
        x: slice.x,
        y: slice.y,
        width: slice.width,
        height: slice.height,
        isCollapsed: !!slice.isCollapsed,
      },
      vw,
      vh
    );
    serapht[id] = {
      ...serapht[id],
      x: clamped.x,
      y: clamped.y,
      width: clamped.width,
      height: clamped.height,
      isCollapsed: clamped.isCollapsed,
    };
  });
  return serapht;
}

export function loadPanelLayoutsFromStorage(
  storage: Pick<Storage, "getItem"> | null = typeof window !== "undefined" ? window.localStorage : null
): PanelLayoutMap | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(STUDIO_PANEL_LAYOUT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PanelLayoutMap;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function savePanelLayoutsToStorage(
  panels: Record<PanelId, FloatingPanelState>,
  storage: Pick<Storage, "setItem"> | null = typeof window !== "undefined" ? window.localStorage : null
): void {
  if (!storage) return;
  try {
    storage.setItem(STUDIO_PANEL_LAYOUT_KEY, JSON.stringify(extractPanelLayouts(panels)));
  } catch {
    // quota / private mode — ignore
  }
}
