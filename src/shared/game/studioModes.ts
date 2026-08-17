/**
 * Studio workspace mode ids + copy (shared so tests stay free of web imports).
 * PanelId `build` remains the World Builder dock id for permissions compatibility.
 *
 * Canonical engine-editor UI labels (bible 29): Walk · Paint · Place · Populate · Script · Catalog.
 * Internal ids stay stable for permissions / defaults.
 */

export type StudioMode = 'develop' | 'atlas' | 'npc' | 'quest' | 'creature' | 'test';

/** Bible 29 canonical tool modes (UI vocabulary). */
export type StudioCanonicalMode =
  | 'walk'
  | 'paint'
  | 'place'
  | 'populate'
  | 'script'
  | 'catalog'
  | 'atlas';

export type StudioDockId =
  | 'build'
  | 'properties'
  | 'assets'
  | 'npc'
  | 'quest'
  | 'dialogue'
  | 'creature'
  | 'loot'
  | 'dev'
  | 'characters'
  | 'classes'
  | 'items'
  | 'spawner'
  | 'prefab'
  | 'atlas'
  | 'problems'
  | 'gameplay';

/** Map stable internal ids → canonical engine-editor labels. */
export const STUDIO_MODE_TO_CANONICAL: Record<StudioMode, StudioCanonicalMode> = {
  test: 'walk',
  develop: 'paint',
  atlas: 'atlas',
  npc: 'populate',
  quest: 'script',
  creature: 'catalog',
};

/** Default panels opened when entering each studio mode (Walk/test closes all). */
export const STUDIO_MODE_DEFAULTS: Record<StudioMode, StudioDockId[]> = {
  develop: ['build', 'properties', 'prefab'],
  atlas: ['atlas'],
  npc: ['npc', 'properties', 'assets', 'spawner'],
  quest: ['npc', 'quest'],
  creature: ['creature', 'loot', 'items'],
  test: [],
};

export const STUDIO_MODE_META: Record<
  StudioMode,
  { label: string; canonical: StudioCanonicalMode; blurb: string }
> = {
  develop: {
    label: 'Paint',
    canonical: 'paint',
    blurb: 'Author terrain, logic layers, and world structure.',
  },
  atlas: {
    label: 'Atlas',
    canonical: 'atlas',
    blurb: 'Connect maps visually into a seamless world.',
  },
  npc: {
    label: 'Populate',
    canonical: 'populate',
    blurb: 'Place NPCs, sprites, and dialogue hooks.',
  },
  quest: {
    label: 'Script',
    canonical: 'script',
    blurb: 'Author quests, dialogue trees, and triggers.',
  },
  creature: {
    label: 'Catalog',
    canonical: 'catalog',
    blurb: 'Edit creature defs, loot tables, and definitions.',
  },
  test: {
    label: 'Play',
    canonical: 'walk',
    blurb: 'Playtest movement, gathers, and encounters. Tools hidden.',
  },
};

/** Place mode is designed (bible 16) — surfaces as coming-online under Paint docks. */
export const STUDIO_PLACE_MODE_NOTE =
  'Place mode (objects as entities) comes online next — use Populate for NPCs today.';

export const STUDIO_DOCK_META: Record<StudioDockId, { label: string; blurb: string }> = {
  build: {
    label: 'World',
    blurb: 'Pick a map, choose a layer, paint tiles or logic tags, then Save.',
  },
  properties: {
    label: 'Inspector',
    blurb: 'Register logic components, warps, and encounter pools for the selected tile.',
  },
  assets: {
    label: 'Assets',
    blurb: 'Browse sprites and tileset images for the active world.',
  },
  npc: {
    label: 'NPCs',
    blurb: 'Spawn and edit map NPCs.',
  },
  quest: {
    label: 'Quests',
    blurb: 'Quest templates and NPC quest hooks.',
  },
  dialogue: {
    label: 'Dialogue',
    blurb: 'Dialogue trees for NPCs and cutscenes.',
  },
  creature: {
    label: 'Creatures',
    blurb: 'Creature catalog definitions.',
  },
  loot: {
    label: 'Loot',
    blurb: 'Loot tables used by gathers and drops.',
  },
  dev: {
    label: 'Dev',
    blurb: 'Server controls and engine config (staff).',
  },
  characters: {
    label: 'Heroes',
    blurb: 'Starter hero loadouts.',
  },
  classes: {
    label: 'Classes',
    blurb: 'Class and skill definitions.',
  },
  items: {
    label: 'Items',
    blurb: 'Item definitions and economy values.',
  },
  spawner: {
    label: 'Spawners',
    blurb: 'Monster spawners for hostile roaming enemies.',
  },
  prefab: {
    label: 'Prefabs',
    blurb: 'Stamp pre-built multi-tile structures.',
  },
  atlas: {
    label: 'World Atlas',
    blurb: 'Drag and drop maps to connect them seamlessly.',
  },
  problems: {
    label: 'Problems',
    blurb: 'Live validation diagnostics, broken warps, and entity collision checks.',
  },
  gameplay: {
    label: 'Gameplay Hub',
    blurb: 'Abilities, status conditions, 27-skill matrix, professions, and combat balance simulations.',
  },
};
