/**
 * Universal Sprite Definitions & Animation Profiles
 * 
 * Provides declarative sprite metadata and animation profiles so the Babylon.js
 * 2.5D game engine, Studio Asset Manager, and Slicer share a unified understanding
 * of spritesheet layouts rather than guessing based purely on raw dimensions.
 */

export type SpriteAnimationProfile =
  | 'directional_3x4'
  | 'classic_3x4'
  | 'multi_frame_directional'
  | 'directional_walk'
  | 'portrait-1x1'
  | 'custom';

export interface SpriteActionDefinition {
  startRow: number;
  frameCount: number;
  directions?: {
    up: number;
    left: number;
    down: number;
    right: number;
  };
}

export interface SpriteDefinition {
  profile: SpriteAnimationProfile;
  sheetWidth: number;
  sheetHeight: number;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  walkCycle: number[];
  walkSpeed: number;
  idleFrame: number;
  directions: {
    down: number;
    left: number;
    right: number;
    up: number;
  };
  actions?: Record<string, SpriteActionDefinition>;
  isModular?: boolean;
  label?: string;
  description?: string;
}

/**
 * Standard Direction Row Mapping for Modular Standard Spritesheets:
 * Row offset within an action block:
 * North = +0, West = +1, South = +2, East = +3
 */
export const DIRECTION_ROW_MAP = {
  up: 0,
  left: 1,
  down: 2,
  right: 3,
};

/**
 * Standard Modular Action Row Starting Indices (0-indexed)
 */
export const ACTION_ROWS: Record<string, { startRow: number; frameCount: number }> = {
  spellcast: { startRow: 0, frameCount: 7 },
  thrust: { startRow: 4, frameCount: 8 },
  walk: { startRow: 8, frameCount: 9 },
  slash: { startRow: 12, frameCount: 6 },
  shoot: { startRow: 16, frameCount: 13 },
  hurt: { startRow: 20, frameCount: 6 },
};

/**
 * Predefined Canonical Profiles
 */

export const DIRECTIONAL_3X4_PROFILE: SpriteDefinition = {
  profile: 'directional_3x4',
  sheetWidth: 96,
  sheetHeight: 128,
  frameWidth: 32,
  frameHeight: 32,
  columns: 3,
  rows: 4,
  idleFrame: 1,
  walkCycle: [0, 1, 2, 1],
  walkSpeed: 6,
  directions: {
    down: 0,
    left: 1,
    right: 2,
    up: 3,
  },
  isModular: false,
  label: 'Saints Classic (3x4)',
  description: 'Classic 3-step walk cycle (Down, Left, Right, Up). 32x32 frames.',
};

export const LEGACY_3X4_PROFILE: SpriteDefinition = {
  ...DIRECTIONAL_3X4_PROFILE,
  profile: 'classic_3x4',
};

export const MULTI_FRAME_DIRECTIONAL_PROFILE: SpriteDefinition = {
  profile: 'multi_frame_directional',
  sheetWidth: 832,
  sheetHeight: 1344,
  frameWidth: 64,
  frameHeight: 64,
  columns: 13,
  rows: 21,
  idleFrame: 0,
  walkCycle: [0, 1, 2, 3, 4, 5, 6, 7, 8],
  walkSpeed: 9,
  // Walk row starts at row 8: Up=8, Left=9, Down=10, Right=11
  directions: {
    up: 8,
    left: 9,
    down: 10,
    right: 11,
  },
  actions: ACTION_ROWS,
  isModular: true,
  label: 'Modular Standard (13x21)',
  description: 'Full Modular spritesheet with 9-frame walk, slash, thrust, spellcast, and hurt animations.',
};

export const DIRECTIONAL_WALK_PROFILE: SpriteDefinition = {
  profile: 'directional_walk',
  sheetWidth: 576,
  sheetHeight: 256,
  frameWidth: 64,
  frameHeight: 64,
  columns: 9,
  rows: 4,
  idleFrame: 0,
  walkCycle: [0, 1, 2, 3, 4, 5, 6, 7, 8],
  walkSpeed: 9,
  // Standard Modular 4-row walk: Up=0, Left=1, Down=2, Right=3
  directions: {
    up: 0,
    left: 1,
    down: 2,
    right: 3,
  },
  actions: {
    walk: { startRow: 0, frameCount: 9 },
  },
  isModular: true,
  label: 'Modular Walk-Only (9x4)',
  description: 'Compact 9-frame Modular walk cycle without combat rows (64x64 frames).',
};

export const PORTRAIT_1X1_PROFILE: SpriteDefinition = {
  profile: 'portrait-1x1',
  sheetWidth: 64,
  sheetHeight: 64,
  frameWidth: 64,
  frameHeight: 64,
  columns: 1,
  rows: 1,
  idleFrame: 0,
  walkCycle: [0],
  walkSpeed: 0,
  directions: {
    down: 0,
    left: 0,
    right: 0,
    up: 0,
  },
  isModular: false,
  label: 'Single Frame Portrait (1x1)',
  description: 'Static single frame / portrait / creature overworld billboard.',
};

export const ANIMATION_PROFILES: Record<SpriteAnimationProfile, SpriteDefinition> = {
  'directional_3x4': DIRECTIONAL_3X4_PROFILE,
  'classic_3x4': LEGACY_3X4_PROFILE,
  'multi_frame_directional': MULTI_FRAME_DIRECTIONAL_PROFILE,
  'directional_walk': DIRECTIONAL_WALK_PROFILE,
  'portrait-1x1': PORTRAIT_1X1_PROFILE,
  'custom': {
    profile: 'custom',
    sheetWidth: 64,
    sheetHeight: 64,
    frameWidth: 32,
    frameHeight: 32,
    columns: 2,
    rows: 2,
    idleFrame: 0,
    walkCycle: [0, 1],
    walkSpeed: 6,
    directions: { down: 0, left: 1, right: 2, up: 3 },
    isModular: false,
    label: 'Custom Grid',
    description: 'Custom grid dimensions and animation frames.',
  },
};

export interface ResolveSpriteInput {
  animationProfile?: string | null;
  width?: number | null;
  height?: number | null;
  spriteUrl?: string | null;
  columns?: number | null;
  rows?: number | null;
  frameWidth?: number | null;
  frameHeight?: number | null;
  spriteConfig?: any;
}

/**
 * Checks if a sprite URL is known to be a single-frame billboard/portrait.
 */
export function isPortraitOrSingleFrameUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (/-ow\.png(?:$|\?)/i.test(url)) return true;
  if (url.includes('/creatures/') || url.includes('/world-monsters/')) return true;
  if (url.includes('/portraits/') || url.includes('/icons/')) return true;
  return false;
}

/**
 * Resolves a SpriteDefinition from explicit metadata, with deterministic fallback
 * inference for legacy assets without stored profiles.
 */
export function resolveSpriteDefinition(input: ResolveSpriteInput = {}): SpriteDefinition {
  const {
    animationProfile,
    width = 0,
    height = 0,
    spriteUrl = '',
    columns,
    rows,
    frameWidth,
    frameHeight,
    spriteConfig,
  } = input;

  const w = width || 0;
  const h = height || 0;

  // 1. Explicit Animation Profile
  if (animationProfile && animationProfile in ANIMATION_PROFILES && animationProfile !== 'custom') {
    const base = ANIMATION_PROFILES[animationProfile as SpriteAnimationProfile];
    const cellWidth = w > 0 ? Math.floor(w / base.columns) : base.frameWidth;
    const actualRows =
      animationProfile === 'multi_frame_directional' && h > 0 && cellWidth > 0
        ? Math.floor(h / cellWidth)
        : base.rows;

    return {
      ...base,
      sheetWidth: w > 0 ? w : base.sheetWidth,
      sheetHeight: h > 0 ? h : base.sheetHeight,
      frameWidth: cellWidth > 0 ? cellWidth : base.frameWidth,
      frameHeight: cellWidth > 0 ? cellWidth : base.frameHeight,
      rows: actualRows > 0 ? actualRows : base.rows,
    };
  }

  // 2. Custom Explicit Columns & Rows
  if (columns && rows && columns > 0 && rows > 0) {
    if (columns === 1 && rows === 1) return { ...PORTRAIT_1X1_PROFILE, sheetWidth: w || 64, sheetHeight: h || 64, frameWidth: w || 64, frameHeight: h || 64 };
    if (columns === 3 && rows === 4) return { ...LEGACY_3X4_PROFILE, sheetWidth: w || 96, sheetHeight: h || 128, frameWidth: w ? Math.floor(w / 3) : 32, frameHeight: h ? Math.floor(h / 4) : 32 };
    if (columns === 13 && rows >= 21) {
      const cellWidth = w > 0 ? Math.floor(w / 13) : 64;
      return {
        ...MULTI_FRAME_DIRECTIONAL_PROFILE,
        sheetWidth: w || 832,
        sheetHeight: h || rows * cellWidth,
        frameWidth: cellWidth,
        frameHeight: cellWidth,
        rows,
      };
    }
    if (columns === 9 && rows === 4) {
      const cellWidth = w > 0 ? Math.floor(w / 9) : 64;
      return {
        ...DIRECTIONAL_WALK_PROFILE,
        sheetWidth: w || 576,
        sheetHeight: h || 256,
        frameWidth: cellWidth,
        frameHeight: cellWidth,
      };
    }

    return {
      profile: 'custom',
      sheetWidth: w || columns * (frameWidth || 32),
      sheetHeight: h || rows * (frameHeight || 32),
      frameWidth: frameWidth || (w ? Math.floor(w / columns) : 32),
      frameHeight: frameHeight || (h ? Math.floor(h / rows) : 32),
      columns,
      rows,
      idleFrame: 0,
      walkCycle: Array.from({ length: columns }, (_, i) => i),
      walkSpeed: 6,
      directions: {
        down: 0,
        left: Math.min(1, rows - 1),
        right: Math.min(2, rows - 1),
        up: Math.min(3, rows - 1),
      },
      isModular: false,
    };
  }

  // 3. Check existing spriteConfig object
  if (spriteConfig && spriteConfig.columns && spriteConfig.rows) {
    if (spriteConfig.columns === 1 && spriteConfig.rows === 1) return PORTRAIT_1X1_PROFILE;
    if (spriteConfig.columns === 3 && spriteConfig.rows === 4) return LEGACY_3X4_PROFILE;
    if (spriteConfig.columns === 13 && spriteConfig.rows >= 21) return { ...MULTI_FRAME_DIRECTIONAL_PROFILE, rows: spriteConfig.rows };
    if (spriteConfig.columns === 9 && spriteConfig.rows === 4) return DIRECTIONAL_WALK_PROFILE;
  }

  // 4. URL Pattern Detection for Single Frame / Portraits
  if (isPortraitOrSingleFrameUrl(spriteUrl)) {
    return {
      ...PORTRAIT_1X1_PROFILE,
      sheetWidth: w || 64,
      sheetHeight: h || 64,
      frameWidth: w || 64,
      frameHeight: h || 64,
    };
  }

  // 4.5 URL Pattern Detection for Modular Characters & Modular Components
  if (spriteUrl) {
    const s = spriteUrl.toLowerCase();
    if (
      s.includes('good-') ||
      s.includes('evil-') ||
      s.includes('modular_') ||
      s.includes('_modular') ||
      s.includes('item-') ||
      s.includes('/npc/item-') ||
      s.includes('/modular/') ||
      s.includes('character_layer_')
    ) {
      const cellWidth = w === 1664 ? 128 : 64;
      const actualRows = h && h >= cellWidth ? Math.floor(h / cellWidth) : 21;
      return {
        ...MULTI_FRAME_DIRECTIONAL_PROFILE,
        sheetWidth: w || 832,
        sheetHeight: h || actualRows * cellWidth,
        frameWidth: cellWidth,
        frameHeight: cellWidth,
        rows: actualRows,
      };
    }
  }

  // 5. Dimension-Based Fallback Inference
  if (w > 0 && h > 0) {
    // High-Res Modular Full Sheet (1664x4992, 1664x6912, etc. 13 cols @ 128px)
    if (w === 1664 && h >= 512) {
      const rowsCount = Math.floor(h / 128);
      return {
        ...MULTI_FRAME_DIRECTIONAL_PROFILE,
        sheetWidth: w,
        sheetHeight: h,
        frameWidth: 128,
        frameHeight: 128,
        rows: rowsCount,
      };
    }

    // High-Res Modular Walk Cycle (1152x512, 9 cols @ 128px)
    if (w === 1152 && (h === 512 || h % 128 === 0)) {
      return {
        ...DIRECTIONAL_WALK_PROFILE,
        sheetWidth: w,
        sheetHeight: h,
        frameWidth: 128,
        frameHeight: 128,
        rows: Math.floor(h / 128),
      };
    }

    // Standard Modular Full Sheet (832x1344, 832x1408, 832x2048, 832x3456, etc. 13 cols @ 64px)
    if (w === 832 && h >= 256) {
      return {
        ...MULTI_FRAME_DIRECTIONAL_PROFILE,
        sheetWidth: w,
        sheetHeight: h,
        frameWidth: 64,
        frameHeight: 64,
        rows: Math.floor(h / 64),
      };
    }

    // Standard Modular Walk Cycle (576x256 or 9 cols x N rows @ 64px)
    if (w === 576 && (h === 256 || h % 64 === 0)) {
      return {
        ...DIRECTIONAL_WALK_PROFILE,
        sheetWidth: w,
        sheetHeight: h,
        frameWidth: 64,
        frameHeight: 64,
        rows: Math.floor(h / 64),
      };
    }

    // Grid-aligned modular spritesheets
    if (w % 64 === 0 && h % 64 === 0 && w >= 576) {
      const cols = Math.floor(w / 64);
      const rowsCount = Math.floor(h / 64);
      if (cols === 13) {
        return {
          ...MULTI_FRAME_DIRECTIONAL_PROFILE,
          sheetWidth: w,
          sheetHeight: h,
          frameWidth: 64,
          frameHeight: 64,
          rows: rowsCount,
        };
      }
      if (cols === 9 && rowsCount === 4) {
        return {
          ...DIRECTIONAL_WALK_PROFILE,
          sheetWidth: w,
          sheetHeight: h,
          frameWidth: 64,
          frameHeight: 64,
        };
      }
    }

    // Classic 3x4 (96x128, 48x128, 48x64, 96x96, etc.)
    if ((w === 96 && h === 128) || (w === 48 && h === 128) || (w % 3 === 0 && h % 4 === 0 && w < 300)) {
      return {
        ...LEGACY_3X4_PROFILE,
        sheetWidth: w,
        sheetHeight: h,
        frameWidth: Math.floor(w / 3),
        frameHeight: Math.floor(h / 4),
      };
    }

    // Single square frame
    if (w === h && w <= 128) {
      return {
        ...PORTRAIT_1X1_PROFILE,
        sheetWidth: w,
        sheetHeight: h,
        frameWidth: w,
        frameHeight: h,
      };
    }
  }

  // Default fallback for general walking characters: Classic 3x4
  return LEGACY_3X4_PROFILE;
}

/**
 * Converts a SpriteDefinition into the compact SpriteSheetConfig format
 * used by the BabylonEngine 2.5D renderer.
 */
export function spriteDefinitionToBabylonConfig(def: SpriteDefinition): any {
  return {
    columns: def.columns,
    rows: def.rows,
    frameWidth: def.frameWidth,
    frameHeight: def.frameHeight,
    directions: {
      down: def.directions.down,
      left: def.directions.left,
      right: def.directions.right,
      up: def.directions.up,
    },
    walkCycle: def.walkCycle,
    idleFrame: def.idleFrame,
    walkSpeed: def.walkSpeed,
    isModular: def.isModular || false,
    profile: def.profile,
  };
}

// ==========================================
// ASSET FORMAT TAXONOMY (GAME SETUP 2.0)
// ==========================================

export type EntityType = 'CHARACTER' | 'CREATURE' | 'MONSTER' | 'OBJECT' | 'TILE' | 'UI' | 'EFFECT' | 'AUDIO';

export interface AssetFormatDefinition {
  id: string;
  displayName: string;
  shortDescription: string;
  technicalDescription: string;
  aliases: string[];
  searchTerms: string[];
  examples: string[];
  supportedEntityTypes: EntityType[];
  supportedRoles: string[];
  animationProfile: SpriteAnimationProfile;
  directionCount: number;
  frameCount: number | 'variable';
  layoutDescription: string;
  modular: boolean;
  isStatic: boolean;
}

export const ASSET_FORMAT_TAXONOMY: Record<string, AssetFormatDefinition> = {
  'modular-4dir-pixel': {
    id: 'modular-4dir-pixel',
    displayName: 'Modular 4-Directional Pixel Character',
    shortDescription: 'Layered pixel-art character format designed for interchangeable body, hair, clothing, and accessory components across four directions.',
    technicalDescription: '13-column by 21-row layout (or 9-column by 4-row subset) containing standardized rows for walking, spellcasting, thrusting, slashing, and hurt animations.',
    aliases: ['Modular', 'Modular sprite', 'Modular character', 'Saints Modular 4-Dir'],
    searchTerms: ['modular pixel character', 'four directional modular character', 'modular sprite sheet'],
    examples: ['Saints Modular Character Pipeline', 'Custom 2.5D RPG character sprites'],
    supportedEntityTypes: ['CHARACTER'],
    supportedRoles: ['idle', 'walk', 'attack', 'hurt', 'spellcast', 'thrust', 'slash', 'shoot'],
    animationProfile: 'multi_frame_directional',
    directionCount: 4,
    frameCount: 'variable',
    layoutDescription: 'Standard Modular 13x21 grid or 9x4 walk cycle subset.',
    modular: true,
    isStatic: false,
  },
  'classic-3x4-rpg': {
    id: 'classic-3x4-rpg',
    displayName: 'Classic 3x4 Four-Directional Character Sheet',
    shortDescription: 'A compact top-down character format using three animation frames across four facing directions.',
    technicalDescription: '3 columns by 4 rows grid, mapping to Down, Left, Right, Up. Walk cycle loops across the three columns (e.g. 0-1-2-1).',
    aliases: ['classic 3x4', '3x4 RPG sheet', 'four-direction 3-frame'],
    searchTerms: ['rpg maker style', '3x4 directional', 'classic walk'],
    examples: ['Classic Walk Grid'],
    supportedEntityTypes: ['CHARACTER', 'CREATURE', 'MONSTER'],
    supportedRoles: ['overworld', 'idle', 'walk', 'battle_front', 'battle_back'],
    animationProfile: 'classic_3x4',
    directionCount: 4,
    frameCount: 3,
    layoutDescription: 'Grid of 3 columns and 4 rows (Down, Left, Right, Up).',
    modular: false,
    isStatic: false,
  },
  'directional_3x4': {
    id: 'directional_3x4',
    displayName: 'Saints 3x4 Directional Entity',
    shortDescription: 'A modified 3x4 sheet with Saints Engine specific frame mappings.',
    technicalDescription: '3 columns by 4 rows grid. Uses a different walk cycle pacing or resting frame.',
    aliases: ['Saints 3x4'],
    searchTerms: ['saints style', '3x4'],
    examples: ['Saints Gaming default characters'],
    supportedEntityTypes: ['CHARACTER', 'CREATURE', 'MONSTER'],
    supportedRoles: ['overworld', 'idle', 'walk'],
    animationProfile: 'directional_3x4',
    directionCount: 4,
    frameCount: 3,
    layoutDescription: '3x4 grid with Saints engine walk loops.',
    modular: false,
    isStatic: false,
  },
  'full-4dir-anim': {
    id: 'full-4dir-anim',
    displayName: 'Full 4-Directional Character Animation Sheet',
    shortDescription: 'Comprehensive four-directional animation sheet with custom dimensions.',
    technicalDescription: 'A non-standard grid requiring explicit configuration of rows, columns, and action mappings.',
    aliases: ['Custom 4-Dir', 'Full Anim Sheet'],
    searchTerms: ['custom character', '4 direction anim'],
    examples: ['Custom commissioned assets'],
    supportedEntityTypes: ['CHARACTER', 'CREATURE', 'MONSTER'],
    supportedRoles: ['idle', 'walk', 'attack', 'hurt'],
    animationProfile: 'custom',
    directionCount: 4,
    frameCount: 'variable',
    layoutDescription: 'Custom defined grid.',
    modular: false,
    isStatic: false,
  },
  'static-2d-image': {
    id: 'static-2d-image',
    displayName: 'Static 2D Entity Image',
    shortDescription: 'A single non-animated frame.',
    technicalDescription: '1x1 grid containing a single portrait or static sprite.',
    aliases: ['Portrait', 'Icon', 'Billboard'],
    searchTerms: ['static image', 'portrait', 'icon', 'single frame'],
    examples: ['Creature Battle Fronts', 'Character Portraits', 'Icons'],
    supportedEntityTypes: ['CHARACTER', 'CREATURE', 'MONSTER', 'OBJECT', 'TILE'],
    supportedRoles: ['portrait', 'icon', 'battle_front', 'battle_back', 'shadow'],
    animationProfile: 'portrait-1x1',
    directionCount: 1,
    frameCount: 1,
    layoutDescription: 'Single image frame (1x1).',
    modular: false,
    isStatic: true,
  },
  'custom-spritesheet': {
    id: 'custom-spritesheet',
    displayName: 'Custom Sprite Sheet',
    shortDescription: 'Layout could not be determined automatically. Requires manual configuration.',
    technicalDescription: 'Unknown dimensions or grid layout.',
    aliases: ['Unknown layout'],
    searchTerms: ['custom sprite', 'unrecognized sheet'],
    examples: [],
    supportedEntityTypes: ['CHARACTER', 'CREATURE', 'MONSTER', 'OBJECT', 'TILE'],
    supportedRoles: [],
    animationProfile: 'custom',
    directionCount: 1,
    frameCount: 'variable',
    layoutDescription: 'Manual grid definition required.',
    modular: false,
    isStatic: false,
  },
  '3d-model': {
    id: '3d-model',
    displayName: '3D Model (GLTF/GLB)',
    shortDescription: 'A 3D model representation for 3D environments.',
    technicalDescription: 'Standard GLTF or GLB format with internal skeletal animations.',
    aliases: ['3D Mesh', 'Model'],
    searchTerms: ['3d model', 'mesh', 'gltf', 'glb'],
    examples: ['Creature 3D Mesh', 'Hero 3D Model'],
    supportedEntityTypes: ['CHARACTER', 'CREATURE', 'MONSTER', 'OBJECT'],
    supportedRoles: ['world_mesh'],
    animationProfile: 'custom',
    directionCount: 360,
    frameCount: 'variable',
    layoutDescription: '3D spatial geometry.',
    modular: true,
    isStatic: false,
  },
  'ui-portrait': {
    id: 'ui-portrait',
    displayName: 'UI Portrait / Avatar',
    shortDescription: 'High-resolution image for dialogue and UI.',
    technicalDescription: 'A 2D image intended exclusively for screen-space UI rendering.',
    aliases: ['Avatar', 'Dialogue Bust'],
    searchTerms: ['portrait', 'avatar', 'ui bust'],
    examples: ['Dialogue Portrait', 'Player Avatar'],
    supportedEntityTypes: ['CHARACTER', 'MONSTER', 'UI'],
    supportedRoles: ['dialogue_portrait', 'ui_avatar'],
    animationProfile: 'portrait-1x1',
    directionCount: 1,
    frameCount: 1,
    layoutDescription: 'Single high-res image.',
    modular: false,
    isStatic: true,
  },
  'audio-sfx': {
    id: 'audio-sfx',
    displayName: 'Audio Sound Effect',
    shortDescription: 'Sound effect or ambient audio.',
    technicalDescription: 'An audio file (mp3, wav, ogg) used for actions or ambience.',
    aliases: ['SFX', 'Sound'],
    searchTerms: ['audio', 'sfx', 'sound'],
    examples: ['Sword Slash SFX', 'Ambient Wind'],
    supportedEntityTypes: ['AUDIO', 'EFFECT'],
    supportedRoles: ['combat_sfx', 'ambient_sfx'],
    animationProfile: 'custom',
    directionCount: 0,
    frameCount: 0,
    layoutDescription: 'Audio track.',
    modular: false,
    isStatic: true,
  }
};

export const ASSET_FORMATS_LIST = Object.values(ASSET_FORMAT_TAXONOMY);

