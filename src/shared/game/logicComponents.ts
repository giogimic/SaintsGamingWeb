/**
 * Creator-facing logic components (bible 16 §6).
 * Maps to existing MapLogicTile actions — no new runtime systems.
 */

export type LogicComponentKind =
  | "solid"
  | "walkable"
  | "harvest_wood"
  | "harvest_ore"
  | "shop"
  | "heal"
  | "craft"
  | "encounter"
  | "bramble"
  | "fishing"
  | "base"
  | "monster_spawner"
  | "custom";

export type LogicComponentField = {
  key: string;
  label: string;
  type: "number" | "string" | "enum";
  /** Which payload object the field writes into. */
  bucket: "interact" | "step";
  defaultValue: string | number;
  /** For enum fields — dropdown options. */
  options?: Array<{ value: string; label: string }>;
};

export type LogicComponentPreset = {
  kind: LogicComponentKind;
  /** Doc-facing tag name. */
  tag: string;
  label: string;
  description: string;
  /** Existing DEMO / MapLogicTile id to paint immediately when available. */
  paintTileId?: number;
  name: string;
  color: string;
  isSolid: boolean;
  interactable: boolean;
  onInteractAction: string | null;
  onStepAction: string | null;
  fields: LogicComponentField[];
};

export const LOGIC_COMPONENT_PRESETS: LogicComponentPreset[] = [
  {
    kind: "walkable",
    tag: "walkable",
    label: "Walkable ground",
    description: "Open floor — no collision.",
    paintTileId: 0,
    name: "Walkable",
    color: "bg-emerald-900",
    isSolid: false,
    interactable: false,
    onInteractAction: null,
    onStepAction: null,
    fields: [],
  },
  {
    kind: "solid",
    tag: "solid",
    label: "Solid wall",
    description: "Blocks movement.",
    paintTileId: 1,
    name: "Solid Wall",
    color: "bg-red-600",
    isSolid: true,
    interactable: false,
    onInteractAction: null,
    onStepAction: null,
    fields: [],
  },
  {
    kind: "harvest_wood",
    tag: "harvestable",
    label: "Harvest wood",
    description: "Chop node (E / interact). Needs an axe in the fun-first loop.",
    paintTileId: 5,
    name: "Wood Tree",
    color: "bg-amber-800",
    isSolid: true,
    interactable: true,
    onInteractAction: "HARVEST_WOOD",
    onStepAction: null,
    fields: [
      { key: "xp", label: "XP", type: "number", bucket: "interact", defaultValue: 25 },
      { key: "resource", label: "Resource", type: "string", bucket: "interact", defaultValue: "wood" },
      { key: "lootPoolId", label: "Loot Pool ID", type: "string", bucket: "interact", defaultValue: "" },
      {
        key: "rarity", label: "Rarity", type: "enum", bucket: "interact", defaultValue: "common",
        options: [
          { value: "common", label: "Common" },
          { value: "uncommon", label: "Uncommon" },
          { value: "rare", label: "Rare" },
          { value: "epic", label: "Epic" },
          { value: "legendary", label: "Legendary" },
        ],
      },
      { key: "requiredLevel", label: "Required Level", type: "number", bucket: "interact", defaultValue: 1 },
      { key: "respawnMs", label: "Respawn (ms)", type: "number", bucket: "interact", defaultValue: 60000 },
      { key: "durability", label: "Durability (hits)", type: "number", bucket: "interact", defaultValue: 1 },
      { key: "requiredTool", label: "Required Tool", type: "string", bucket: "interact", defaultValue: "axe" },
    ],
  },
  {
    kind: "harvest_ore",
    tag: "harvestable",
    label: "Harvest ore",
    description: "Mine node (E / interact).",
    paintTileId: 6,
    name: "Ore Rock",
    color: "bg-[#8d6e63]",
    isSolid: true,
    interactable: true,
    onInteractAction: "HARVEST_ORE",
    onStepAction: null,
    fields: [
      { key: "xp", label: "XP", type: "number", bucket: "interact", defaultValue: 25 },
      { key: "resource", label: "Resource", type: "string", bucket: "interact", defaultValue: "ore" },
      { key: "lootPoolId", label: "Loot Pool ID", type: "string", bucket: "interact", defaultValue: "" },
      {
        key: "rarity", label: "Rarity", type: "enum", bucket: "interact", defaultValue: "common",
        options: [
          { value: "common", label: "Common" },
          { value: "uncommon", label: "Uncommon" },
          { value: "rare", label: "Rare" },
          { value: "epic", label: "Epic" },
          { value: "legendary", label: "Legendary" },
        ],
      },
      {
        key: "oreType", label: "Ore Type", type: "enum", bucket: "interact", defaultValue: "copper",
        options: [
          { value: "copper", label: "Copper" },
          { value: "iron", label: "Iron" },
          { value: "gold", label: "Gold" },
          { value: "mithril", label: "Mithril" },
          { value: "adamant", label: "Adamant" },
        ],
      },
      { key: "requiredLevel", label: "Required Level", type: "number", bucket: "interact", defaultValue: 1 },
      { key: "respawnMs", label: "Respawn (ms)", type: "number", bucket: "interact", defaultValue: 90000 },
      { key: "durability", label: "Durability (hits)", type: "number", bucket: "interact", defaultValue: 3 },
      { key: "requiredTool", label: "Required Tool", type: "string", bucket: "interact", defaultValue: "pickaxe" },
    ],
  },
  {
    kind: "shop",
    tag: "shop",
    label: "Shop",
    description: "Step on tile to open the shop overlay.",
    paintTileId: 7,
    name: "Shop Tile",
    color: "bg-yellow-400",
    isSolid: false,
    interactable: false,
    onInteractAction: null,
    onStepAction: "OPEN_SHOP",
    fields: [],
  },
  {
    kind: "heal",
    tag: "heal_station",
    label: "Clinic / heal",
    description: "Step on tile to heal party.",
    paintTileId: 8,
    name: "Clinic Tile",
    color: "bg-pink-500",
    isSolid: false,
    interactable: false,
    onInteractAction: null,
    onStepAction: "CLINIC_HEAL",
    fields: [],
  },
  {
    kind: "craft",
    tag: "crafting",
    label: "Crafting table",
    description: "Interact to open crafting.",
    paintTileId: 9,
    name: "Crafting Table",
    color: "bg-gray-500",
    isSolid: true,
    interactable: true,
    onInteractAction: "OPEN_CRAFTING",
    onStepAction: null,
    fields: [],
  },
  {
    kind: "encounter",
    tag: "encounter",
    label: "Tall grass / encounter",
    description: "Chance to start a turn-based encounter when stepped on.",
    paintTileId: 2,
    name: "Tall Grass",
    color: "bg-green-500",
    isSolid: false,
    interactable: false,
    onInteractAction: null,
    onStepAction: "ENCOUNTER",
    fields: [
      { key: "chance", label: "Chance (0–1)", type: "number", bucket: "step", defaultValue: 0.5 },
    ],
  },
  {
    kind: "bramble",
    tag: "harvestable",
    label: "Bramble wall",
    description: "Solid until cleared with the required tool.",
    paintTileId: 11,
    name: "Bramble Wall",
    color: "bg-lime-800",
    isSolid: true,
    interactable: true,
    onInteractAction: "CLEAR_BRAMBLE",
    onStepAction: null,
    fields: [
      {
        key: "requiresTool",
        label: "Requires tool",
        type: "string",
        bucket: "interact",
        defaultValue: "axe_bronze",
      },
    ],
  },
  {
    kind: "fishing",
    tag: "fishing",
    label: "Fishing spot",
    description: "Step to fish.",
    paintTileId: 10,
    name: "Fishing",
    color: "bg-sky-600",
    isSolid: false,
    interactable: false,
    onInteractAction: null,
    onStepAction: "FISHING",
    fields: [],
  },
  {
    kind: "base",
    tag: "base",
    label: "Base hub",
    description: "Step to open base overlay.",
    paintTileId: 12,
    name: "Base Hub",
    color: "bg-indigo-800",
    isSolid: false,
    interactable: false,
    onInteractAction: null,
    onStepAction: "OPEN_BASE",
    fields: [],
  },
  {
    kind: "monster_spawner",
    tag: "spawner",
    label: "Monster Spawner",
    description: "Area spawner for hostile roaming monsters. Monsters aggro and fight players in real-time combat.",
    paintTileId: 13,
    name: "Monster Spawner",
    color: "bg-rose-700",
    isSolid: false,
    interactable: false,
    onInteractAction: null,
    onStepAction: "MONSTER_SPAWN_ZONE",
    fields: [
      { key: "monsterPool", label: "Monster Pool (slugs)", type: "string", bucket: "step", defaultValue: "rockitten" },
      { key: "maxPopulation", label: "Max Population", type: "number", bucket: "step", defaultValue: 3 },
      { key: "wanderRadius", label: "Wander Radius", type: "number", bucket: "step", defaultValue: 5 },
      { key: "respawnDelayMs", label: "Respawn Delay (ms)", type: "number", bucket: "step", defaultValue: 30000 },
      { key: "aggroRadius", label: "Aggro Radius", type: "number", bucket: "step", defaultValue: 4 },
      { key: "level", label: "Monster Level", type: "number", bucket: "step", defaultValue: 1 },
      { key: "lootPoolId", label: "Loot Pool ID", type: "string", bucket: "step", defaultValue: "" },
      {
        key: "difficulty", label: "Difficulty", type: "enum", bucket: "step", defaultValue: "normal",
        options: [
          { value: "easy", label: "Easy" },
          { value: "normal", label: "Normal" },
          { value: "hard", label: "Hard" },
          { value: "elite", label: "Elite" },
          { value: "boss", label: "Boss" },
        ],
      },
    ],
  },
];

export function defaultFieldValues(preset: LogicComponentPreset): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const f of preset.fields) out[f.key] = f.defaultValue;
  return out;
}

export function buildPayloadsFromFields(
  preset: LogicComponentPreset,
  values: Record<string, string | number>
): {
  onInteractPayload: Record<string, unknown> | null;
  onStepPayload: Record<string, unknown> | null;
} {
  const interact: Record<string, unknown> = {};
  const step: Record<string, unknown> = {};
  for (const f of preset.fields) {
    const raw = values[f.key] ?? f.defaultValue;
    const val = f.type === "number" ? Number(raw) : String(raw);
    if (f.bucket === "interact") interact[f.key] = val;
    else step[f.key] = val;
  }
  return {
    onInteractPayload: Object.keys(interact).length ? interact : null,
    onStepPayload: Object.keys(step).length ? step : null,
  };
}

/** Studio / runtime warp gate with an explicit tile position. */
export type StudioWarpGate = {
  id: string;
  position: { x: number; y: number };
  targetMapId: string;
  spawnPoint: { x: number; y: number };
  errorMessage?: string;
};

/**
 * Normalize map.gates (array or Record) into position-bearing gates for WorldSimulation.
 * Legacy Record entries without positions are skipped (tile markers 3/4 alone are not warps).
 */
export function normalizeGates(gates: unknown): StudioWarpGate[] {
  if (!gates) return [];

  if (Array.isArray(gates)) {
    return gates
      .filter(
        (g): g is StudioWarpGate =>
          !!g &&
          typeof g === "object" &&
          typeof (g as StudioWarpGate).targetMapId === "string" &&
          typeof (g as StudioWarpGate).position?.x === "number" &&
          typeof (g as StudioWarpGate).position?.y === "number"
      )
      .map((g) => ({
        id: g.id || `gate_${g.position.x}_${g.position.y}`,
        position: { x: g.position.x, y: g.position.y },
        targetMapId: g.targetMapId,
        spawnPoint: g.spawnPoint || { x: 1, y: 1 },
        errorMessage: g.errorMessage,
      }));
  }

  if (typeof gates === "object") {
    const out: StudioWarpGate[] = [];
    for (const [key, raw] of Object.entries(gates as Record<string, unknown>)) {
      if (!raw || typeof raw !== "object") continue;
      const v = raw as Partial<StudioWarpGate> & { spawnPoint?: { x: number; y: number } };
      if (typeof v.targetMapId !== "string") continue;

      let x: number | undefined;
      let y: number | undefined;
      if (typeof v.position?.x === "number" && typeof v.position?.y === "number") {
        x = v.position.x;
        y = v.position.y;
      } else if (/^-?\d+,-?\d+$/.test(key)) {
        const [a, b] = key.split(",").map(Number);
        x = a;
        y = b;
      }
      if (x == null || y == null) continue;

      out.push({
        id: v.id || `gate_${x}_${y}`,
        position: { x, y },
        targetMapId: v.targetMapId,
        spawnPoint: v.spawnPoint || { x: 1, y: 1 },
        errorMessage: v.errorMessage,
      });
    }
    return out;
  }

  return [];
}

/** Upsert a gate keyed for save — keep array form (WorldSimulation-friendly). */
export function upsertWarpGate(
  gates: unknown,
  gate: StudioWarpGate
): StudioWarpGate[] {
  const list = normalizeGates(gates).filter(
    (g) => !(g.position.x === gate.position.x && g.position.y === gate.position.y)
  );
  list.push(gate);
  return list;
}

export function removeWarpGateAt(gates: unknown, x: number, y: number): StudioWarpGate[] {
  return normalizeGates(gates).filter((g) => !(g.position.x === x && g.position.y === y));
}
