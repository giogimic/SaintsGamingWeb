/**
 * Universal Sprite Definitions & Animation Profiles
 * 
 * Provides declarative sprite metadata and animation profiles so the Babylon.js
 * 2.5D game engine, Studio Asset Manager, and Slicer share a unified understanding
 * of spritesheet layouts rather than guessing based purely on raw dimensions.
 */

export type SpriteAnimationProfile =
  | 'tuxemon-3x4'
  | 'lpc-full'
  | 'lpc-walk'
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
  isLpc?: boolean;
  label?: string;
  description?: string;
}

/**
 * Standard Direction Row Mapping for LPC Standard Spritesheets:
 * Row offset within an action block:
 * North = +0, West = +1, South = +2, East = +3
 */
export const LPC_DIRECTION_ROW_MAP = {
  up: 0,
  left: 1,
  down: 2,
  right: 3,
};

/**
 * Standard LPC Action Row Starting Indices (0-indexed)
 */
export const LPC_ACTION_ROWS: Record<string, { startRow: number; frameCount: number }> = {
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

export const TUXEMON_3X4_PROFILE: SpriteDefinition = {
  profile: 'tuxemon-3x4',
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
  isLpc: false,
  label: 'Tuxemon Classic (3x4)',
  description: 'Classic 3-step walk cycle (Down, Left, Right, Up). 32x32 frames.',
};

export const LPC_FULL_PROFILE: SpriteDefinition = {
  profile: 'lpc-full',
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
  actions: LPC_ACTION_ROWS,
  isLpc: true,
  label: 'Universal LPC Full Sheet (13x21)',
  description: 'Universal LPC 64x64 sheet with Walk, Slash, Thrust, Spellcast, Shoot, Hurt animations.',
};

export const LPC_WALK_PROFILE: SpriteDefinition = {
  profile: 'lpc-walk',
  sheetWidth: 576,
  sheetHeight: 256,
  frameWidth: 64,
  frameHeight: 64,
  columns: 9,
  rows: 4,
  idleFrame: 0,
  walkCycle: [0, 1, 2, 3, 4, 5, 6, 7, 8],
  walkSpeed: 9,
  // Standard LPC 4-row walk: Up=0, Left=1, Down=2, Right=3
  directions: {
    up: 0,
    left: 1,
    down: 2,
    right: 3,
  },
  actions: {
    walk: { startRow: 0, frameCount: 9 },
  },
  isLpc: true,
  label: 'LPC Walk Cycle (9x4)',
  description: '4-direction 9-frame LPC walk cycle (Up, Left, Down, Right). 64x64 frames.',
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
  isLpc: false,
  label: 'Single Frame Portrait (1x1)',
  description: 'Static single frame / portrait / creature overworld billboard.',
};

export const ANIMATION_PROFILES: Record<SpriteAnimationProfile, SpriteDefinition> = {
  'tuxemon-3x4': TUXEMON_3X4_PROFILE,
  'lpc-full': LPC_FULL_PROFILE,
  'lpc-walk': LPC_WALK_PROFILE,
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
    isLpc: false,
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

  // 1. Explicit Animation Profile
  if (animationProfile && animationProfile in ANIMATION_PROFILES && animationProfile !== 'custom') {
    const base = ANIMATION_PROFILES[animationProfile as SpriteAnimationProfile];
    return {
      ...base,
      sheetWidth: width && width > 0 ? width : base.sheetWidth,
      sheetHeight: height && height > 0 ? height : base.sheetHeight,
    };
  }

  // 2. Custom Explicit Columns & Rows
  if (columns && rows && columns > 0 && rows > 0) {
    if (columns === 1 && rows === 1) return { ...PORTRAIT_1X1_PROFILE, sheetWidth: width || 64, sheetHeight: height || 64 };
    if (columns === 3 && rows === 4) return { ...TUXEMON_3X4_PROFILE, sheetWidth: width || 96, sheetHeight: height || 128 };
    if (columns === 13 && rows >= 21) return { ...LPC_FULL_PROFILE, sheetWidth: width || 832, sheetHeight: height || 1344 };
    if (columns === 9 && rows === 4) return { ...LPC_WALK_PROFILE, sheetWidth: width || 576, sheetHeight: height || 256 };

    return {
      profile: 'custom',
      sheetWidth: width || columns * (frameWidth || 32),
      sheetHeight: height || rows * (frameHeight || 32),
      frameWidth: frameWidth || (width ? Math.floor(width / columns) : 32),
      frameHeight: frameHeight || (height ? Math.floor(height / rows) : 32),
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
      isLpc: false,
    };
  }

  // 3. Check existing spriteConfig object
  if (spriteConfig && spriteConfig.columns && spriteConfig.rows) {
    if (spriteConfig.columns === 1 && spriteConfig.rows === 1) return PORTRAIT_1X1_PROFILE;
    if (spriteConfig.columns === 3 && spriteConfig.rows === 4) return TUXEMON_3X4_PROFILE;
    if (spriteConfig.columns === 13 && spriteConfig.rows >= 21) return LPC_FULL_PROFILE;
    if (spriteConfig.columns === 9 && spriteConfig.rows === 4) return LPC_WALK_PROFILE;
  }

  // 4. URL Pattern Detection for Single Frame / Portraits
  if (isPortraitOrSingleFrameUrl(spriteUrl)) {
    return {
      ...PORTRAIT_1X1_PROFILE,
      sheetWidth: width || 64,
      sheetHeight: height || 64,
    };
  }

  // 5. Dimension-Based Fallback Inference
  const w = width || 0;
  const h = height || 0;

  if (w > 0 && h > 0) {
    // Universal LPC Full Sheet (832x1344, 832x1408, 832x2048)
    if (w === 832 && h >= 1344) {
      return {
        ...LPC_FULL_PROFILE,
        sheetWidth: w,
        sheetHeight: h,
        rows: Math.floor(h / 64),
      };
    }

    // LPC Walk Cycle (576x256)
    if (w === 576 && h === 256) {
      return {
        ...LPC_WALK_PROFILE,
        sheetWidth: w,
        sheetHeight: h,
      };
    }

    // Classic Tuxemon 3x4 (96x128, 48x128, 48x64, 96x96, etc.)
    if ((w === 96 && h === 128) || (w === 48 && h === 128) || (w % 3 === 0 && h % 4 === 0 && w < 300)) {
      return {
        ...TUXEMON_3X4_PROFILE,
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

  // Default fallback for general walking characters: Classic Tuxemon 3x4
  return TUXEMON_3X4_PROFILE;
}

/**
 * Converts a SpriteDefinition into a BabylonEngine-compatible SpriteSheetConfig.
 */
export function spriteDefinitionToBabylonConfig(def: SpriteDefinition) {
  return {
    columns: def.columns,
    rows: def.rows,
    idleFrame: def.idleFrame,
    walkCycle: def.walkCycle,
    walkSpeed: def.walkSpeed,
    directions: {
      down: def.directions.down,
      left: def.directions.left,
      right: def.directions.right,
      up: def.directions.up,
    },
  };
}
