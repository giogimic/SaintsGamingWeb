/**
 * Canonical DEMO_SANDBOX layout aligned with MapLogicTile ids:
 * 0 walkable, 1 wall, 2 tall grass, 5 tree, 6 ore, 7 shop, 9 craft, 11 bramble
 */

export const DEMO_MAP_ID = "DEMO_SANDBOX";
export const DEMO_MAP_W = 30;
export const DEMO_MAP_H = 30;

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
    x: 15,
    y: 15,
    sprite: "adventurer",
    direction: "down",
    dialogue: ["Talk to Warden Vance near the north path for your toolbelt."],
  },
  {
    id: "npc_soulwarden_aldric",
    name: "Soulwarden Aldric",
    x: 13,
    y: 13,
    // Use overworld crops (npc/*-ow), not full 1024² battle portraits
    sprite: "soulwarden_aldric-ow",
    direction: "down",
    dialogue: [],
  },
  {
    id: "npc_elder_voss",
    name: "Elder Voss",
    x: 16,
    y: 13,
    sprite: "elder_voss-ow",
    direction: "down",
    dialogue: [],
  },
  {
    id: "npc_scout_mira",
    name: "Scout Mira",
    x: 18,
    y: 12,
    sprite: "scout_mira-ow",
    direction: "left",
    dialogue: [],
  },
  {
    id: "npc_capturer_kian",
    name: "Capturer Kian",
    x: 17,
    y: 15,
    sprite: "capturer_kian-ow",
    direction: "up",
    dialogue: [],
  },
  {
    id: "npc_ironwright_kael",
    name: "Ironwright Kael",
    x: 12,
    y: 15,
    sprite: "ironwright_kael-ow",
    direction: "right",
    dialogue: [],
  },
  {
    id: "npc_candrift_keeper",
    name: "Candrift Keeper",
    x: 14,
    y: 16,
    sprite: "candrift_keeper-ow",
    direction: "up",
    dialogue: [],
  },
];

/** Vance stands on the clear path north of spawn plaza. */
export const DEMO_VANCE_SPAWN = { x: 14, y: 12 };

/**
 * Roaming overworld wilds — ONLY creatures with real walk-sheet sprites.
 * Custom LimeWire battle portraits must NOT roam here (they look like battle icons).
 * Tall-grass TB encounters still use DEMO_ENCOUNTERS (battle sheets).
 */
export const DEMO_WILD_SPAWNS: { slug: string; x: number; y: number }[] = [
  { slug: "rockitten", x: 16, y: 18 },
];

/** @deprecated Prefer DEMO_WILD_SPAWNS — kept for older imports. */
export const DEMO_WILD_SPOTS = DEMO_WILD_SPAWNS.map(({ x, y }) => ({ x, y }));

export const DEMO_ENCOUNTERS = [
  { speciesSlug: "ashwhirl", weight: 2, minLevel: 3, maxLevel: 5 },
  { speciesSlug: "grimvast", weight: 2, minLevel: 3, maxLevel: 5 },
  { speciesSlug: "hollowmirth", weight: 2, minLevel: 3, maxLevel: 5 },
  { speciesSlug: "rootwail", weight: 2, minLevel: 3, maxLevel: 5 },
  { speciesSlug: "siltmourne", weight: 2, minLevel: 3, maxLevel: 5 },
  { speciesSlug: "tanglewrath", weight: 2, minLevel: 3, maxLevel: 5 },
  { speciesSlug: "rockitten", weight: 1, minLevel: 3, maxLevel: 5 },
];

/** Dialogue trees for custom demo NPCs (npcId → tree). */
export const DEMO_NPC_DIALOGUES: Record<
  string,
  { name: string; tree: Record<string, unknown> }
> = {
  npc_soulwarden_aldric: {
    name: "Soulwarden Aldric",
    tree: {
      node_start: {
        text: "I tend the soul-lanterns of Emberwood. If you bond a companion, bring them here — light remembers light.",
        options: [
          { label: "Where is Warden Vance?", nextNode: "node_vance" },
          { label: "Farewell.", nextNode: "exit" },
        ],
      },
      node_vance: {
        text: "Vance walks the north path from the plaza. He will arm you for the basin.",
        options: [{ label: "Thanks.", nextNode: "exit" }],
      },
    },
  },
  npc_elder_voss: {
    name: "Elder Voss",
    tree: {
      node_start: {
        text: "The basin remembers every footfall. Chop with care, dig with respect, and the wilds may yet yield their secrets.",
        options: [
          { label: "Any advice for a new tamer?", nextNode: "node_advice" },
          { label: "Goodbye.", nextNode: "exit" },
        ],
      },
      node_advice: {
        text: "Weaken a wildling before you expose film. A panicked soul rarely settles in the frame.",
        options: [{ label: "Understood.", nextNode: "exit" }],
      },
    },
  },
  npc_scout_mira: {
    name: "Scout Mira",
    tree: {
      node_start: {
        text: "Tall grass east of here hides ashwhirls and rootwails. Keep your camera dry — siltmourne loves the damp spots.",
        options: [
          { label: "Which way to the bramble?", nextNode: "node_bramble" },
          { label: "Thanks, scout.", nextNode: "exit" },
        ],
      },
      node_bramble: {
        text: "North path. Clear it with a Rook Hatchet once Vance outfits you — Aethervale waits beyond.",
        options: [{ label: "On my way.", nextNode: "exit" }],
      },
    },
  },
  npc_capturer_kian: {
    name: "Capturer Kian",
    tree: {
      node_start: {
        text: "Film before crystal — that's the new creed. Buy Standard Film at the merchant, or craft it if you're short on coin.",
        options: [
          { label: "Any favorite wilds?", nextNode: "node_favorites" },
          { label: "Later.", nextNode: "exit" },
        ],
      },
      node_favorites: {
        text: "Hollowmirth if you like speed. Grimvast if you want a wall. Don't sleep on tanglewrath — those vines bite back.",
        options: [{ label: "Noted.", nextNode: "exit" }],
      },
    },
  },
  npc_ironwright_kael: {
    name: "Ironwright Kael",
    tree: {
      node_start: {
        text: "Shop tile and craft bench are west of the plaza. Bring me wood and ore — I'll make sure the anvil stays warm.",
        options: [
          { label: "What should I craft first?", nextNode: "node_craft" },
          { label: "Goodbye.", nextNode: "exit" },
        ],
      },
      node_craft: {
        text: "Standard Film from Crystal Dust and Wood Logs. Capture kit before vanity gear.",
        options: [{ label: "Will do.", nextNode: "exit" }],
      },
    },
  },
  npc_candrift_keeper: {
    name: "Candrift Keeper",
    tree: {
      node_start: {
        text: "The candles never go out in this grove. Rest a moment — the wilds will still be hungry when you return.",
        options: [
          { label: "Who tends these flames?", nextNode: "node_flames" },
          { label: "Farewell.", nextNode: "exit" },
        ],
      },
      node_flames: {
        text: "We do — keepers of candrift. If your lantern gutters, come sit a while.",
        options: [{ label: "I will.", nextNode: "exit" }],
      },
    },
  },
};
