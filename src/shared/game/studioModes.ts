/**
 * Studio workspace mode ids + copy (shared so tests stay free of web imports).
 * PanelId `build` remains the World Builder dock id for permissions compatibility.
 *
 * Canonical engine-editor UI labels (bible 29): Walk · Paint · Place · Populate · Script · Catalog.
 * Internal ids stay stable for permissions / defaults.
 */

export type StudioMode = 'develop' | 'voxel' | 'tile' | 'logic' | 'atlas' | 'npc' | 'quest' | 'creature' | 'assets' | 'hero' | 'test';

/** Bible 29 canonical tool modes (UI vocabulary). */
export type StudioCanonicalMode =
  | 'walk'
  | 'paint'
  | 'voxel'
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
  | 'entityLibrary'
  | 'quest'
  | 'dialogue'
  | 'creature'
  | 'abilities'
  | 'loot'
  | 'dev'
  | 'characters'
  | 'classes'
  | 'items'
  | 'professions'
  | 'recipes'
  | 'dungeons'
  | 'spawner'
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
  | 'logic'
  | 'publishing'
  | 'quickUpload'
  | 'tileBrowser'
  | 'voxelBrowser'
  | 'newTileMap'
  | 'newVoxelMap'
  | 'animations'
  | 'interface'
  | 'camera'
  | 'biome'
  | 'versionManager'
  | 'procedural'
  | 'hierarchy'
  | 'layers'
  | 'materials'
  | 'selection'
  | 'transform'
  | 'tileset'
  | 'asset_suite'
  | 'hero_suite'
  | 'primaryTileViewport'
  | 'primaryVoxelViewport'
  | 'secondaryTileViewport'
  | 'secondaryVoxelViewport'
  | 'studioHome';

/** Map stable internal ids → canonical engine-editor labels. */
export const STUDIO_MODE_TO_CANONICAL: Record<StudioMode, StudioCanonicalMode> = {
  test: 'walk',
  develop: 'paint',
  tile: 'paint',
  voxel: 'voxel',
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
  develop: ['studioHome'],
  tile: ['primaryTileViewport', 'build', 'layers', 'hierarchy', 'logic', 'entityLibrary'],
  voxel: ['primaryVoxelViewport', 'build', 'materials', 'transform', 'selection', 'hierarchy', 'entityLibrary'],
  logic: ['logic'],
  atlas: ['atlas'],
  npc: ['entityLibrary', 'npc', 'properties', 'assets', 'spawner'],
  quest: ['npc', 'quest'],
  creature: ['creature', 'loot', 'items'],
  assets: ['asset_suite'],
  hero: ['hero_suite'],
  test: [],
};

export const STUDIO_MODE_META: Record<
  StudioMode,
  { label: string; canonical: StudioCanonicalMode; blurb: string }
> = {
  develop: {
    label: 'Develop',
    canonical: 'paint',
    blurb: 'Legacy unified mode.',
  },
  tile: {
    label: 'Tile',
    canonical: 'paint',
    blurb: 'Paint 2.5D terrain tiles, manage tile layers, and author logic.',
  },
  voxel: {
    label: 'Voxel',
    canonical: 'voxel',
    blurb: '3D block chunk building, slope ramps, and terrain stratigraphy.',
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
  entityLibrary: {
    label: 'Entity Library',
    blurb: 'Browse and place entities onto the map.',
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
    label: 'Hero Studio',
    blurb: 'Manage player hero identities and starting classes',
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
    label: 'Dungeon Studio',
    blurb: 'Create auto-generating dungeon blueprints and layer setups.',
  },
  spawner: {
    label: 'Spawners',
    blurb: 'Configure enemy spawn points',
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
  abilities: {
    label: 'Abilities & VFX',
    blurb: 'Design visually stunning combat skills and elemental logic.',
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
  logic: {
    label: 'Logic Painter',
    blurb: 'Author gameplay tags, collision boundaries, and interactive triggers directly onto the map.',
  },
  publishing: {
    label: 'Publish & Releases',
    blurb: 'Pre-flight validation gates, release snapshot history, and rollback.',
  },
  quickUpload: {
    label: 'Quick Upload',
    blurb: 'Quickly upload tilesets to the asset system.',
  },
  tileBrowser: {
    label: 'Tile Maps',
    blurb: 'Manage, search, and switch between tile maps.',
  },
  voxelBrowser: {
    label: 'Voxel Maps',
    blurb: 'Manage, search, and switch between 3D voxel/fractal maps.',
  },
  newTileMap: {
    label: 'New Tile Map',
    blurb: 'Generate a new 2D tile map.',
  },
  newVoxelMap: {
    label: 'New Voxel Map',
    blurb: 'Generate a new 3D voxel or procedural fractal map.',
  },
  animations: {
    label: 'Animation Studio',
    blurb: 'Sprite animation timeline editor, onion skinning, frame scrubbing, and preview controls.',
  },
  interface: {
    label: 'HUD Studio',
    blurb: 'Game engine UI theme styles, HUD scaling, and in-game widget customizer.',
  },
  camera: {
    label: 'Camera & View Settings',
    blurb: 'Projection modes, view angle presets, FOV, sensitivity, in-game camera defaults, and object rotation.',
  },
  biome: {
    label: 'Biome Configurator',
    blurb: 'Configure procedural fractal noise, strata layers, and environment.',
  },
  hierarchy: {
    label: 'World Hierarchy',
    blurb: 'Scene outliner: terrain volumes, objects, entities, markers, and visibility locks.',
  },
  layers: {
    label: 'Layers',
    blurb: 'Layer manager: scope control, visual/logic layers, visibility, and locking.',
  },
  materials: {
    label: 'Material Library',
    blurb: 'Source selection: voxel materials, terrain textures, and environment palettes.',
  },
  selection: {
    label: 'Selection',
    blurb: '3D volumetric selection tools, booleans, grow/shrink, and selection presets.',
  },
  transform: {
    label: 'Transform',
    blurb: 'Numeric precision coordinates, rotation, scaling, pivot alignment, and mirroring.',
  },
  procedural: {
    label: 'Procedural Authoring',
    blurb: 'Procedural world rules, biomes, seeds, fractal terrain strata, and generation.',
  },
  tileset: {
    label: 'Tilesets',
    blurb: 'Manage visual tile sets for painting terrain and structures.',
  },
  asset_suite: {
    label: 'Asset Studio',
    blurb: 'Full suite for managing sprites, items, audio, and more.',
  },
  hero_suite: {
    label: 'Hero Studio',
    blurb: 'Full suite for managing classes, archetypes, and heroes.',
  },
  primaryTileViewport: {
    label: 'Primary Tile Canvas',
    blurb: 'Main 2D tile canvas viewport connected to the World Atlas.',
  },
  primaryVoxelViewport: {
    label: 'Primary Voxel Canvas',
    blurb: 'Main 3D voxel canvas viewport connected to the World Atlas.',
  },
  secondaryTileViewport: {
    label: 'Secondary Tile Canvas',
    blurb: 'Isolated 2D tile canvas viewport.',
  },
  secondaryVoxelViewport: {
    label: 'Secondary Voxel Canvas',
    blurb: 'Isolated 3D voxel canvas viewport.',
  },
  studioHome: {
    label: 'Studio Dashboard',
    blurb: 'Welcome to Saints Studio. Access quick tools and assets.',
  },
  versionManager: {
    label: 'Version Manager',
    blurb: 'Atlas-driven version history and map releases.',
  },
};

export interface WorkspacePresetDef {
  id: string;
  name: string;
  blurb: string;
  openDocks: StudioDockId[];
}

export const STUDIO_WORKSPACE_PRESETS: WorkspacePresetDef[] = [
  {
    id: 'world-building',
    name: 'World Building',
    blurb: 'Dominant 3D viewport with Material Library, Inspector, and Layers.',
    openDocks: ['materials', 'properties', 'layers'],
  },
  {
    id: 'voxel-sculpting',
    name: 'Voxel Sculpting',
    blurb: 'Direct block carving and sculpt brushes with Material Library and Inspector.',
    openDocks: ['materials', 'properties', 'selection'],
  },
  {
    id: 'terrain-shaping',
    name: 'Terrain Shaping',
    blurb: 'Macro terrain sculpting, elevation smoothing, and material painting.',
    openDocks: ['materials', 'properties', 'build'],
  },
  {
    id: 'region-planning',
    name: 'Region Planning',
    blurb: 'World Atlas topology navigation with Map Browser and Region Inspector.',
    openDocks: ['atlas', 'tileBrowser', 'voxelBrowser', 'properties'],
  },
  {
    id: 'procedural-authoring',
    name: 'Procedural Authoring',
    blurb: 'Procedural biome synthesis, fractal strata preview, and generation.',
    openDocks: ['procedural', 'properties', 'atlas'],
  },
  {
    id: 'population-entities',
    name: 'Population / Entities',
    blurb: 'Spawn NPCs, creatures, monsters, and interactive anchors.',
    openDocks: ['npc', 'spawner', 'creature', 'properties'],
  },
  {
    id: 'debugging',
    name: 'Debugging',
    blurb: 'Diagnostics, problem reporting, rule evaluation, and streaming.',
    openDocks: ['problems', 'streaming', 'dev'],
  },
  {
    id: 'city-district-editing',
    name: 'City / District Editing',
    blurb: 'Precision layout: Selection, Transform, Prefab/Blueprint Library, and Outliner.',
    openDocks: ['selection', 'transform', 'layers', 'properties'],
  },
];


