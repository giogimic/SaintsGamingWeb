/**
 * Studio workspace mode ids + copy (shared so tests stay free of web imports).
 * PanelId `build` remains the World Builder dock id for permissions compatibility.
 */

export type StudioMode = 'develop' | 'npc' | 'quest' | 'creature' | 'test';

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
  | 'classes';

/** Default panels opened when entering each studio mode (Walk/test closes all). */
export const STUDIO_MODE_DEFAULTS: Record<StudioMode, StudioDockId[]> = {
  develop: ['build', 'properties'],
  npc: ['npc', 'properties', 'assets'],
  quest: ['npc', 'quest'],
  creature: ['creature', 'loot'],
  test: [],
};

export const STUDIO_MODE_META: Record<StudioMode, { label: string; blurb: string }> = {
  develop: {
    label: 'Develop',
    blurb: 'Paint tiles & logic, save maps, place warps.',
  },
  npc: {
    label: 'NPC',
    blurb: 'Place and edit NPCs, dialogue keys, and sprites.',
  },
  quest: {
    label: 'Quest',
    blurb: 'Author quest templates and wire ACCEPT_QUEST on NPCs.',
  },
  creature: {
    label: 'Creature',
    blurb: 'Browse creature defs and loot tables.',
  },
  test: {
    label: 'Walk',
    blurb: 'Play-test movement, gathers, and encounters. Tools hidden.',
  },
};

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
};
