/**
 * Canonical DEMO_SANDBOX layout aligned with MapLogicTile ids:
 * 0 walkable, 1 wall, 2 tall grass, 5 tree, 6 ore, 7 shop, 9 craft, 11 bramble
 */

export const DEMO_MAP_ID = "DEMO_SANDBOX";
export const DEMO_MAP_W = 30;
export const DEMO_MAP_H = 30;

/**
 * Default Tuxemon/George tilesets for Studio visual paint.
 * DEMO_SANDBOX historically shipped logic-grid only (tileLayers=[], tilesets=[]),
 * which left TilesetPicker empty and made PR #18 paint overlays a no-op.
 * Keep in sync with WorldBuilderPanel / createBlankWorldProfile.
 */
export type StudioTilesetMeta = {
  firstgid: number;
  imageSource: string;
  columns: number;
  tilewidth: number;
  tileheight: number;
};

export const DEFAULT_STUDIO_TILESETS: StudioTilesetMeta[] = [
  { firstgid: 1, imageSource: "Terrain_by_George.png", columns: 15, tilewidth: 16, tileheight: 16 },
  { firstgid: 1000, imageSource: "Furniture_and_Fittings_by_George.png", columns: 10, tilewidth: 16, tileheight: 16 },
  { firstgid: 2000, imageSource: "Interior_Walls_by_George.png", columns: 10, tilewidth: 16, tileheight: 16 },
  { firstgid: 3000, imageSource: "Interior_Floors_by_George.png", columns: 10, tilewidth: 16, tileheight: 16 },
  { firstgid: 4000, imageSource: "Vegetation_and_Outdoor_Fittings_by_George.png", columns: 15, tilewidth: 16, tileheight: 16 },
];

/** Empty Ground visual layer sized to a logic grid (GID 0 = transparent / unset). */
export function buildEmptyGroundLayer(grid: number[][]): { name: string; grid: number[][] } {
  const h = grid.length || DEMO_MAP_H;
  const w = grid[0]?.length || DEMO_MAP_W;
  return {
    name: "Ground",
    grid: Array.from({ length: h }, () => Array.from({ length: w }, () => 0)),
  };
}

/** True when Studio cannot paint visuals (no layers and/or no tilesets). */
export function needsStudioTilesetBootstrap(
  tileLayersData: string | null | undefined,
  tilesetsData: string | null | undefined
): boolean {
  let layers: unknown[] = [];
  let tilesets: unknown[] = [];
  try {
    layers = JSON.parse(tileLayersData || "[]");
  } catch {
    layers = [];
  }
  try {
    tilesets = JSON.parse(tilesetsData || "[]");
  } catch {
    tilesets = [];
  }
  return !Array.isArray(layers) || layers.length === 0 || !Array.isArray(tilesets) || tilesets.length === 0;
}

/** Logic tile definitions (same as scripts/seed-tiles + bramble). */
export const DEMO_LOGIC_TILES = [
  { id: 0, name: "Walkable", color: "bg-emerald-900", isSolid: false, interactable: false, onInteractAction: null as string | null, onInteractPayload: null as string | null, onStepAction: null as string | null, onStepPayload: null as string | null },
  { id: 1, name: "Solid Wall", color: "bg-red-600", isSolid: true, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: null, onStepPayload: null },
  { id: 2, name: "Tall Grass", color: "bg-green-500", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "ENCOUNTER", onStepPayload: '{"chance":0.5}' },
  { id: 3, name: "Gate A", color: "bg-amber-500", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: null, onStepPayload: null },
  { id: 4, name: "Gate B", color: "bg-amber-600", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: null, onStepPayload: null },
  { id: 5, name: "Wood Tree", color: "bg-amber-800", isSolid: true, interactable: true, onInteractAction: "HARVEST_WOOD", onInteractPayload: '{"xp":25,"resource":"wood"}', onStepAction: null, onStepPayload: null },
  { id: 6, name: "Ore Rock", color: "bg-[#8d6e63]", isSolid: true, interactable: true, onInteractAction: "HARVEST_ORE", onInteractPayload: '{"xp":25,"resource":"ore"}', onStepAction: null, onStepPayload: null },
  { id: 7, name: "Shop Tile", color: "bg-yellow-400", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "OPEN_SHOP", onStepPayload: null },
  { id: 8, name: "Clinic Tile", color: "bg-pink-500", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "CLINIC_HEAL", onStepPayload: null },
  { id: 9, name: "Crafting Table", color: "bg-gray-500", isSolid: true, interactable: true, onInteractAction: "OPEN_CRAFTING", onInteractPayload: null, onStepAction: null, onStepPayload: null },
  { id: 10, name: "Fishing", color: "bg-sky-600", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "FISHING", onStepPayload: null },
  { id: 11, name: "Bramble Wall", color: "bg-lime-800", isSolid: true, interactable: true, onInteractAction: "CLEAR_BRAMBLE", onInteractPayload: '{"requiresTool":"axe_bronze"}', onStepAction: null, onStepPayload: null },
  { id: 12, name: "Base Hub", color: "bg-indigo-800", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "OPEN_BASE", onStepPayload: null },
];

export function buildDemoSandboxGrid(): number[][] {
  const w = DEMO_MAP_W;
  const h = DEMO_MAP_H;
  const grid: number[][] = [];

  for (let y = 0; y < h; y++) {
    const row: number[] = [];
    for (let x = 0; x < w; x++) {
      let tile = 0; // walkable ground everywhere by default

      // Outer border wall
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
        tile = 1;
      }
      // Shop + craft west of spawn
      else if (x === 11 && y === 14) tile = 7;
      else if (x === 11 && y === 15) tile = 9;
      // Early tall grass near plaza (TB smoke before Q4 north unlock)
      else if (x >= 16 && x <= 18 && y >= 12 && y <= 14) tile = 2;
      // Tall grass north (encounters) — behind bramble line
      else if (x >= 10 && x <= 20 && y >= 2 && y <= 8) tile = 2;
      // Bramble barrier blocking north grass from plaza (clear in Q4)
      else if (y === 10 && x >= 12 && x <= 16) tile = 11;
      // Gathering SE
      else if (x >= 20 && y >= 18 && x <= 27 && y <= 27) {
        tile = (x + y) % 2 === 0 ? 5 : 6;
      }

      row.push(tile);
    }
    grid.push(row);
  }
  return grid;
}

export const DEMO_MAP_NPCS = [
  {
    id: "npc_guide_1",
    name: "Guide",
    x: 18,
    y: 16,
    sprite: "adventurer",
    direction: "down",
    dialogue: [
      "Start with the Trail Greeter in the plaza — accept Saints Trail. Vance's toolbelt comes after you spar the Tutor.",
    ],
  },
];

/** Vance stands on the clear path north of spawn plaza. */
export const DEMO_VANCE_SPAWN = { x: 14, y: 12 };

export const DEMO_WILD_SPOTS = [
  { x: 17, y: 16 },
  { x: 22, y: 16 },
  { x: 12, y: 18 },
];

export const DEMO_ENCOUNTERS = [
  { speciesSlug: "rockitten", weight: 1, minLevel: 3, maxLevel: 5 },
];
