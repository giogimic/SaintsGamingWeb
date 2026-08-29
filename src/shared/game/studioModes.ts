/**
 * Studio workspace mode ids + copy (shared so tests stay free of web imports).
 * PanelId `build` remains the World Builder dock id for permissions compatibility.
 *
 * Canonical engine-editor UI labels (bible 29): Walk · Paint · Place · Populate · Script · Catalog.
 * Internal ids stay stable for permissions / defaults.
 */

export type StudioMode = 'develop' | 'logic' | 'atlas' | 'npc' | 'quest' | 'creature' | 'assets' | 'hero' | 'test';

/** Bible 29 canonical tool modes (UI vocabulary). */
export type StudioCanonicalMode =
  | 'walk'
  | 'paint'
  | 'logic'
  | 'place'
  | 'populate'
  | 'script'
  | 'catalog'
  | 'atlas'
  | 'assets'
  | 'hero';

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
  | 'professions'
  | 'recipes'
  | 'dungeons'
  | 'spawner'
  | 'prefab'
  | 'atlas'
  | 'problems'
  | 'streaming'
  | 'gameplay'
  | 'settings'
  | 'dungeon'
  | 'shop'
  | 'mounts'
  | 'worldevent'
  | 'simulation'
  | 'tileset'
  | 'logic'
  | 'publishing'
  | 'maps'
  | 'animations';

/** Map stable internal ids → canonical engine-editor labels. */
export const STUDIO_MODE_TO_CANONICAL: Record<StudioMode, StudioCanonicalMode> = {
  test: 'walk',
  develop: 'paint',
  logic: 'logic',
  atlas: 'atlas',
  npc: 'populate',
  quest: 'script',
  creature: 'catalog',
  assets: 'assets',
  hero: 'hero',
};

/** Default panels opened when entering each studio mode (Walk/test closes all). */
export const STUDIO_MODE_DEFAULTS: Record<StudioMode, StudioDockId[]> = {
  develop: ['build', 'tileset'],
  logic: ['logic'],
  atlas: ['atlas'],
  npc: ['npc', 'properties', 'assets', 'spawner'],
  quest: ['npc', 'quest'],
  creature: ['creature', 'loot', 'items'],
  assets: [],
  hero: [],
  test: [],
};

export const STUDIO_MODE_META: Record<
  StudioMode,
  { label: string; canonical: StudioCanonicalMode; blurb: string }
> = {
  develop: {
    label: 'Paint',
    canonical: 'paint',
    blurb: 'Paint terrain tiles, manage tilesets, and author visual layers.',
  },
  logic: {
    label: 'Logic',
    canonical: 'logic',
    blurb: 'Paint collision, triggers, tags, and gameplay rules.',
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
  assets: {
    label: 'Assets',
    canonical: 'assets',
    blurb: 'Manage characters, creatures, tilesets, items, audio, and asset packs.',
  },
  hero: {
    label: 'Hero Studio',
    canonical: 'hero',
    blurb: 'Unified editor for Archetypes, Classes, and Hero loadouts.',
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
    blurb: 'Hero classes and skills',
  },
  items: {
    label: 'Items',
    blurb: 'Manage items and equipment',
  },
  professions: {
    label: 'Professions',
    blurb: 'Manage crafting professions',
  },
  recipes: {
    label: 'Recipes',
    blurb: 'Manage crafting recipes',
  },
  dungeons: {
    label: 'Dungeons',
    blurb: 'Manage dungeon sequences and instances',
  },
  spawner: {
    label: 'Spawners',
    blurb: 'Configure enemy spawn points',
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
  streaming: {
    label: 'Streaming Inspector',
    blurb: 'Monitor chunk loading and offloading for seamless world streaming.',
  },
  gameplay: {
    label: 'Gameplay Hub',
    blurb: 'Abilities, status conditions, 27-skill matrix, professions, and combat balance simulations.',
  },
  settings: {
    label: 'Server Settings',
    blurb: 'Configure realm identity, Saint/Hero terminology, Soul Link chat, and capture mechanics.',
  },
  dungeon: {
    label: 'Dungeons',
    blurb: 'Manage instanced dungeons and their parameters.',
  },
  shop: {
    label: 'Economy & Shops',
    blurb: 'Manage in-game merchants and item economies.',
  },
  mounts: {
    label: 'Mounts',
    blurb: 'Define rideable mounts, flying, swimming, and collection integration.',
  },
  worldevent: {
    label: 'World Events',
    blurb: 'Global events that mutate spawn rates or weather.',
  },
  simulation: {
    label: 'Simulation Presets',
    blurb: 'Configure hardcore rules and experience multipliers.',
  },
  tileset: {
    label: 'Tile Selector',
    blurb: 'Visual tileset picker, GID brush selection, layer selection, and tileset swapping.',
  },
  logic: {
    label: 'Logic Painter',
    blurb: 'Author gameplay tags, collision boundaries, and interactive triggers directly onto the map.',
  },
  publishing: {
    label: 'Publish & Releases',
    blurb: 'Pre-flight validation gates, release snapshot history, and rollback.',
  },
  maps: {
    label: 'Map Browser',
    blurb: 'Manage, search, and switch between available map files.',
  },
  animations: {
    label: 'Animation Studio',
    blurb: 'Sprite animation timeline editor, onion skinning, frame scrubbing, and preview controls.',
  },
};
