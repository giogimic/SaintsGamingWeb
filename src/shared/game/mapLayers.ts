/**
 * Conceptual map layer contract (bible 08 + 17).
 *
 * Runtime today still uses visual tileLayers (0–3) + Logic (−1) as collision
 * authority. This module names the long-term layer model so Studio UI, save
 * validators, and export filters share one vocabulary without breaking DEMO maps.
 */

export type MapLayerKind =
  | "terrain"
  | "collision"
  | "object"
  | "entity"
  | "spawn"
  | "logic"
  | "editor_overlay";

export type MapLayerContract = {
  kind: MapLayerKind;
  label: string;
  description: string;
  /** Included in player/runtime map payloads. */
  exportToRuntime: boolean;
  /**
   * How this layer maps onto the current WorldMap representation.
   * Additive — serializers may grow without renaming these keys.
   */
  legacyBinding:
    | "tileLayers_0_3"
    | "logic_grid_-1"
    | "npcsData"
    | "encountersData"
    | "future_objects"
    | "future_spawners"
    | "studio_only";
};

export const MAP_LAYER_CONTRACT: readonly MapLayerContract[] = [
  {
    kind: "terrain",
    label: "Terrain",
    description: "Visual ground only (grass, dirt, sand, stone, snow, water).",
    exportToRuntime: true,
    legacyBinding: "tileLayers_0_3",
  },
  {
    kind: "collision",
    label: "Collision",
    description: "Movement/physics (walkable, solid, one-way, hazard, climbable).",
    exportToRuntime: true,
    legacyBinding: "logic_grid_-1",
  },
  {
    kind: "object",
    label: "Object",
    description: "Placed interactive world objects (trees, doors, stations, decor).",
    exportToRuntime: true,
    legacyBinding: "future_objects",
  },
  {
    kind: "entity",
    label: "Entity",
    description: "Unique gameplay entities (NPCs, monsters, vendors, props).",
    exportToRuntime: true,
    legacyBinding: "npcsData",
  },
  {
    kind: "spawn",
    label: "Spawn",
    description: "Invisible spawning logic (pools, patrols, wave spawners).",
    exportToRuntime: true,
    legacyBinding: "future_spawners",
  },
  {
    kind: "logic",
    label: "Logic",
    description: "Triggers and regions (safe/PvP, music, weather, quest, teleport).",
    exportToRuntime: true,
    legacyBinding: "logic_grid_-1",
  },
  {
    kind: "editor_overlay",
    label: "Editor Overlay",
    description: "Studio-only visualization (radii, tint, nav helpers, grid).",
    exportToRuntime: false,
    legacyBinding: "studio_only",
  },
] as const;

export function getMapLayerContract(kind: MapLayerKind): MapLayerContract {
  const found = MAP_LAYER_CONTRACT.find((l) => l.kind === kind);
  if (!found) throw new Error(`Unknown map layer: ${kind}`);
  return found;
}

/** Layers safe to include in runtime / player map JSON. */
export function runtimeExportLayers(): MapLayerKind[] {
  return MAP_LAYER_CONTRACT.filter((l) => l.exportToRuntime).map((l) => l.kind);
}

/**
 * Strip editor-only overlay payloads before persist/export.
 * Additive: unknown keys pass through; only known overlay keys are dropped.
 */
export function stripEditorOverlaysFromMapPayload<T extends Record<string, unknown>>(
  payload: T
): T {
  const next = { ...payload };
  delete next.editorOverlays;
  delete next.editor_overlay;
  delete next.studioOverlays;
  return next;
}

/** Target additive save shape (bible 17) — not yet the on-disk WorldMap columns. */
export type StudioMapDocumentV1 = {
  mapId: string;
  terrain: unknown[];
  collision: unknown[];
  objects: unknown[];
  entities: unknown[];
  logic: unknown[];
  spawners: unknown[];
  encounters: unknown[];
};

export function emptyStudioMapDocument(mapId: string): StudioMapDocumentV1 {
  return {
    mapId,
    terrain: [],
    collision: [],
    objects: [],
    entities: [],
    logic: [],
    spawners: [],
    encounters: [],
  };
}
