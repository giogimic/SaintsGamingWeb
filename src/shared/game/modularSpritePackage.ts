/**
 * Saints Gaming — Universal Modular Asset Package & Slicing Helpers
 *
 * Provides pure utility functions to detect Modular spritesheet formats, generate
 * predefined animation slice regions for the Studio Slicer, parse layer
 * attribution credits, and unpack multi-layer Modular Generator ZIP exports in the browser.
 */

import JSZip from "jszip";
import {
  CharacterComponentCategory,
  getDefaultZOrderHint,
  inferCharacterComponentLayerSlot,
} from "./assetImportProfiles";

export type SpriteFormatVariant =
  | "multi_frame_directional"
  | "directional_walk"
  | "directional_3x4"
  | "custom-grid";

export interface DetectedSpriteFormat {
  isRecognized: boolean;
  variant: SpriteFormatVariant;
  label: string;
  description: string;
  frameWidth: number;
  frameHeight: number;
  cols: number;
  rows: number;
  totalFrames: number;
  suggestedPresets: string[];
}

export interface SpriteSliceRegion {
  id: string;
  name: string;
  type: string;
  category: string;
  importProfile: string;
  slotRole: string;
  x: number;
  y: number;
  w: number;
  h: number;
  facing: "S" | "N" | "W" | "E";
  animationState: "walk" | "idle" | "slash" | "thrust" | "spellcast" | "shoot" | "hurt";
  animationFrames: number;
}

export interface SpriteCreditEntry {
  fileName?: string;
  authors: string[];
  licenses: string[];
  urls: string[];
}

export interface UnpackedModularLayer {
  file: File;
  name: string;
  componentCategory: CharacterComponentCategory | "other";
  componentLayer: string;
  zOrderHint: number;
  baseBodyType?: string;
  previewUrl: string;
}

export interface UnpackedModularPackage {
  compositeFile?: File;
  compositePreviewUrl?: string;
  layers: UnpackedModularLayer[];
  credits: SpriteCreditEntry[];
  metadata?: Record<string, any>;
  presetName?: string;
  baseBodyType?: string;
}

/**
 * Universal Modular Standard Row Offsets (0-indexed) on a 64x64 cell grid.
 * Each 4-direction action uses standard Modular row ordering:
 * Row + 0: North (Up)
 * Row + 1: West (Left)
 * Row + 2: South (Down)
 * Row + 3: East (Right)
 */
export const ACTION_ROW_OFFSETS: Record<
  string,
  { startRow: number; frameCount: number; action: SpriteSliceRegion["animationState"] }
> = {
  spellcast: { startRow: 0, frameCount: 7, action: "spellcast" },
  thrust: { startRow: 4, frameCount: 8, action: "thrust" },
  walk: { startRow: 8, frameCount: 9, action: "walk" },
  slash: { startRow: 12, frameCount: 6, action: "slash" },
  shoot: { startRow: 16, frameCount: 13, action: "shoot" },
  hurt: { startRow: 20, frameCount: 6, action: "hurt" }, // South only (1 row)
};

/** Direction mapping for standard 4-row Modular action blocks */
export const DIRECTION_ROW_MAP: { offset: number; facing: "N" | "W" | "S" | "E"; label: string }[] = [
  { offset: 0, facing: "N", label: "north" },
  { offset: 1, facing: "W", label: "west" },
  { offset: 2, facing: "S", label: "south" },
  { offset: 3, facing: "E", label: "east" },
];

/**
 * Detects if given dimensions match standard Modular spritesheet layouts.
 */
export function detectSpriteFormat(width: number, height: number): DetectedSpriteFormat {
  if (width <= 0 || height <= 0) {
    return {
      isRecognized: false,
      variant: "custom-grid",
      label: "Unknown Dimensions",
      description: "Invalid image dimensions",
      frameWidth: 32,
      frameHeight: 32,
      cols: 1,
      rows: 1,
      totalFrames: 1,
      suggestedPresets: [],
    };
  }

  // High-Resolution Modular Full Character Spritesheet (1664x... = 13 cols @ 128x128)
  if (width === 1664 && height >= 512) {
    return {
      isRecognized: true,
      variant: "multi_frame_directional",
      label: "Universal Modular Character Sheet (High-Res 128x128)",
      description: "High-resolution Modular spritesheet with 128x128 cells covering Walk, Slash, Thrust, Spellcast, Shoot, and Hurt.",
      frameWidth: 128,
      frameHeight: 128,
      cols: 13,
      rows: Math.floor(height / 128),
      totalFrames: 13 * Math.floor(height / 128),
      suggestedPresets: ["multi_frame_directional", "directional_walk", "directional_3x4", "directional_idles"],
    };
  }

  // High-Resolution Modular Walk Cycle (1152x512 = 9 cols x 4 rows at 128x128)
  if (width === 1152 && (height === 512 || height % 128 === 0)) {
    return {
      isRecognized: true,
      variant: "directional_walk",
      label: "Modular 4-Direction Walk Cycle (High-Res 128x128)",
      description: "High-resolution 4-direction 9-frame walk cycle sheet (North, West, South, East) at 128x128.",
      frameWidth: 128,
      frameHeight: 128,
      cols: 9,
      rows: Math.floor(height / 128),
      totalFrames: 9 * Math.floor(height / 128),
      suggestedPresets: ["directional_walk", "directional_3x4", "directional_idles"],
    };
  }

  // Universal Modular Full Character Spritesheet (832x1344 = 13 cols x 21 rows at 64x64, or 832x1408, or 832x2048, or 832x3456)
  if (width === 832 && height >= 256) {
    return {
      isRecognized: true,
      variant: "multi_frame_directional",
      label: "Universal Modular Character Sheet (Full)",
      description: "Full Modular spritesheet with 64x64 cells covering Walk, Slash, Thrust, Spellcast, Shoot, and Hurt.",
      frameWidth: 64,
      frameHeight: 64,
      cols: 13,
      rows: Math.floor(height / 64),
      totalFrames: 13 * Math.floor(height / 64),
      suggestedPresets: ["multi_frame_directional", "directional_walk", "directional_3x4", "directional_idles"],
    };
  }

  // Universal Modular 4-Direction Walk Cycle (576x256 = 9 cols x 4 rows at 64x64)
  if (width === 576 && (height === 256 || height % 64 === 0)) {
    return {
      isRecognized: true,
      variant: "directional_walk",
      label: "Modular 4-Direction Walk Cycle (64x64)",
      description: "Standard 4-direction 9-frame walk cycle sheet (North, West, South, East) at 64x64.",
      frameWidth: 64,
      frameHeight: 64,
      cols: 9,
      rows: Math.floor(height / 64),
      totalFrames: 9 * Math.floor(height / 64),
      suggestedPresets: ["directional_walk", "directional_3x4", "directional_idles"],
    };
  }

  // Saints 2.5D Standard 3x4 Walk Grid (96x128 = 3 cols x 4 rows at 32x32)
  if (width === 96 && height === 128) {
    return {
      isRecognized: true,
      variant: "directional_3x4",
      label: "Saints 2.5D MMO Walk Grid (3x4)",
      description: "Standard 3-frame 4-direction walk cycle (South, West, East, North) for the 2.5D game engine.",
      frameWidth: 32,
      frameHeight: 32,
      cols: 3,
      rows: 4,
      totalFrames: 12,
      suggestedPresets: ["directional_3x4", "directional_idles"],
    };
  }

  // 64x64 grid-aligned spritesheet
  if (width % 64 === 0 && height % 64 === 0 && width >= 128 && height >= 128) {
    return {
      isRecognized: true,
      variant: "custom-grid",
      label: `Modular-Compatible Grid (${width}x${height}) [64px]`,
      description: `64x64 pixel-aligned spritesheet with ${width / 64} cols x ${height / 64} rows.`,
      frameWidth: 64,
      frameHeight: 64,
      cols: width / 64,
      rows: height / 64,
      totalFrames: (width / 64) * (height / 64),
      suggestedPresets: ["directional_walk", "directional_3x4", "directional_idles"],
    };
  }

  // 128x128 grid-aligned spritesheet (large custom sheets >= 512px)
  if (width % 128 === 0 && height % 128 === 0 && width >= 512 && height >= 512) {
    return {
      isRecognized: true,
      variant: "custom-grid",
      label: `Modular-Compatible Grid (${width}x${height}) [128px]`,
      description: `128x128 pixel-aligned spritesheet with ${width / 128} cols x ${height / 128} rows.`,
      frameWidth: 128,
      frameHeight: 128,
      cols: width / 128,
      rows: height / 128,
      totalFrames: (width / 128) * (height / 128),
      suggestedPresets: ["directional_walk", "directional_3x4", "directional_idles"],
    };
  }

  return {
    isRecognized: false,
    variant: "custom-grid",
    label: `Custom Spritesheet (${width}x${height})`,
    description: "Custom dimensions spritesheet.",
    frameWidth: 32,
    frameHeight: 32,
    cols: Math.max(1, Math.floor(width / 32)),
    rows: Math.max(1, Math.floor(height / 32)),
    totalFrames: Math.max(1, Math.floor(width / 32) * Math.floor(height / 32)),
    suggestedPresets: ["directional_3x4"],
  };
}

/**
 * Generates predefined slice regions for various Modular preset workflows.
 */
export function getStandardSlices(
  preset: "multi_frame_directional" | "directional_walk" | "directional_3x4" | "directional_idles",
  options: {
    sheetWidth?: number;
    sheetHeight?: number;
    prefix?: string;
    cellSize?: number;
  } = {}
): SpriteSliceRegion[] {
  const regions: SpriteSliceRegion[] = [];
  const prefix = options.prefix ? `${options.prefix}_` : "";

  // Derive cell dimensions dynamically from options or sheet width
  const explicitCellSize = options.cellSize;
  let cellW = 64;
  let cellH = 64;
  if (explicitCellSize && explicitCellSize > 0) {
    cellW = explicitCellSize;
    cellH = explicitCellSize;
  } else if (options.sheetWidth === 1664 || options.sheetWidth === 1152) {
    cellW = 128;
    cellH = 128;
  } else if (options.sheetWidth && options.sheetWidth > 0) {
    if (options.sheetWidth % 13 === 0 && options.sheetWidth >= 832) {
      cellW = Math.floor(options.sheetWidth / 13);
      cellH = cellW;
    } else if (options.sheetWidth % 9 === 0 && options.sheetWidth >= 576) {
      cellW = Math.floor(options.sheetWidth / 9);
      cellH = cellW;
    }
  }

  if (preset === "multi_frame_directional") {
    // 1. Walk Cycles (Rows 8..11)
    for (const dir of DIRECTION_ROW_MAP) {
      const row = ACTION_ROW_OFFSETS.walk.startRow + dir.offset;
      regions.push({
        id: `slice_walk_${dir.facing.toLowerCase()}`,
        name: `${prefix}walk_${dir.label}`,
        type: "CHARACTER",
        category: "actor",
        importProfile: "character",
        slotRole: "walk",
        x: 0,
        y: row * cellH,
        w: 9 * cellW,
        h: cellH,
        facing: dir.facing,
        animationState: "walk",
        animationFrames: 9,
      });
    }

    // 2. Slash Actions (Rows 12..15)
    for (const dir of DIRECTION_ROW_MAP) {
      const row = ACTION_ROW_OFFSETS.slash.startRow + dir.offset;
      regions.push({
        id: `slice_slash_${dir.facing.toLowerCase()}`,
        name: `${prefix}slash_${dir.label}`,
        type: "CHARACTER",
        category: "actor",
        importProfile: "character",
        slotRole: "attack",
        x: 0,
        y: row * cellH,
        w: 6 * cellW,
        h: cellH,
        facing: dir.facing,
        animationState: "slash",
        animationFrames: 6,
      });
    }

    // 3. Thrust Actions (Rows 4..7)
    for (const dir of DIRECTION_ROW_MAP) {
      const row = ACTION_ROW_OFFSETS.thrust.startRow + dir.offset;
      regions.push({
        id: `slice_thrust_${dir.facing.toLowerCase()}`,
        name: `${prefix}thrust_${dir.label}`,
        type: "CHARACTER",
        category: "actor",
        importProfile: "character",
        slotRole: "attack",
        x: 0,
        y: row * cellH,
        w: 8 * cellW,
        h: cellH,
        facing: dir.facing,
        animationState: "thrust",
        animationFrames: 8,
      });
    }

    // 4. Spellcast Actions (Rows 0..3)
    for (const dir of DIRECTION_ROW_MAP) {
      const row = ACTION_ROW_OFFSETS.spellcast.startRow + dir.offset;
      regions.push({
        id: `slice_spellcast_${dir.facing.toLowerCase()}`,
        name: `${prefix}spellcast_${dir.label}`,
        type: "CHARACTER",
        category: "actor",
        importProfile: "character",
        slotRole: "attack",
        x: 0,
        y: row * cellH,
        w: 7 * cellW,
        h: cellH,
        facing: dir.facing,
        animationState: "spellcast",
        animationFrames: 7,
      });
    }

    // 5. Shoot Actions (Rows 16..19)
    for (const dir of DIRECTION_ROW_MAP) {
      const row = ACTION_ROW_OFFSETS.shoot.startRow + dir.offset;
      regions.push({
        id: `slice_shoot_${dir.facing.toLowerCase()}`,
        name: `${prefix}shoot_${dir.label}`,
        type: "CHARACTER",
        category: "actor",
        importProfile: "character",
        slotRole: "attack",
        x: 0,
        y: row * cellH,
        w: 13 * cellW,
        h: cellH,
        facing: dir.facing,
        animationState: "shoot",
        animationFrames: 13,
      });
    }

    // 6. Hurt (Row 20 - South only)
    regions.push({
      id: "slice_hurt_south",
      name: `${prefix}hurt_south`,
      type: "CHARACTER",
      category: "actor",
      importProfile: "character",
      slotRole: "attack",
      x: 0,
      y: ACTION_ROW_OFFSETS.hurt.startRow * cellH,
      w: 6 * cellW,
      h: cellH,
      facing: "S",
      animationState: "hurt",
      animationFrames: 6,
    });

    // 7. Standing Idles (Frame 0 of each Walk row)
    for (const dir of DIRECTION_ROW_MAP) {
      const row = ACTION_ROW_OFFSETS.walk.startRow + dir.offset;
      regions.push({
        id: `slice_idle_${dir.facing.toLowerCase()}`,
        name: `${prefix}idle_${dir.label}`,
        type: "CHARACTER",
        category: "actor",
        importProfile: "character",
        slotRole: "idle",
        x: 0,
        y: row * cellH,
        w: cellW,
        h: cellH,
        facing: dir.facing,
        animationState: "idle",
        animationFrames: 1,
      });
    }
  } else if (preset === "directional_walk") {
    // 4-Direction Walk Cycle (starts at row 0 for walk-only sheets, or row 8 for full sheets)
    const isFullSheet =
      (options.sheetHeight || 0) >= cellH * 21 ||
      (options.sheetWidth || 0) >= cellW * 13;
    const startRowOffset = isFullSheet ? ACTION_ROW_OFFSETS.walk.startRow : 0;

    for (const dir of DIRECTION_ROW_MAP) {
      const row = startRowOffset + dir.offset;
      regions.push({
        id: `slice_walk_${dir.facing.toLowerCase()}`,
        name: `${prefix}walk_${dir.label}`,
        type: "CHARACTER",
        category: "actor",
        importProfile: "character",
        slotRole: "walk",
        x: 0,
        y: row * cellH,
        w: 9 * cellW,
        h: cellH,
        facing: dir.facing,
        animationState: "walk",
        animationFrames: 9,
      });
    }
  } else if (preset === "directional_3x4") {
    // 3x4 Grid for 2.5D Engine (South, West, East, North)
    // If standard 96x128 sheet: 32x32 frames
    const is32Grid = (options.sheetWidth || 0) === 96 || (options.sheetHeight || 0) === 128;
    const size = is32Grid ? 32 : cellW;
    const rows = [
      { row: 0, facing: "S" as const, label: "south" },
      { row: 1, facing: "W" as const, label: "west" },
      { row: 2, facing: "E" as const, label: "east" },
      { row: 3, facing: "N" as const, label: "north" },
    ];

    for (const item of rows) {
      regions.push({
        id: `slice_25d_${item.label}`,
        name: `${prefix}walk_${item.label}`,
        type: "CHARACTER",
        category: "actor",
        importProfile: "character",
        slotRole: "walk",
        x: 0,
        y: item.row * size,
        w: 3 * size,
        h: size,
        facing: item.facing,
        animationState: "walk",
        animationFrames: 3,
      });
    }
  } else if (preset === "directional_idles") {
    // 4-Direction Idles
    const isFullSheet =
      (options.sheetHeight || 0) >= cellH * 21 ||
      (options.sheetWidth || 0) >= cellW * 13;
    const startRowOffset = isFullSheet ? ACTION_ROW_OFFSETS.walk.startRow : 0;

    for (const dir of DIRECTION_ROW_MAP) {
      const row = startRowOffset + dir.offset;
      regions.push({
        id: `slice_idle_${dir.facing.toLowerCase()}`,
        name: `${prefix}idle_${dir.label}`,
        type: "CHARACTER",
        category: "actor",
        importProfile: "character",
        slotRole: "idle",
        x: 0,
        y: row * cellH,
        w: cellW,
        h: cellH,
        facing: dir.facing,
        animationState: "idle",
        animationFrames: 1,
      });
    }
  }

  return regions;
}

/**
 * Parses raw text from an Modular generator credits.txt file into structured credit entries.
 */
export function parseCreditsText(rawText: string): SpriteCreditEntry[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const credits: SpriteCreditEntry[] = [];

  for (const line of lines) {
    if (line.startsWith("#") || line.startsWith("//") || line.startsWith("---")) continue;

    // Pattern: "filename/path.png by Author Name (License) - http://..."
    let fileName: string | undefined;
    let author = "";
    let license = "";
    let url = "";

    const byMatch = line.match(/^([^\s:]+)\s+(?:by|credited to)\s+([^(]+)(?:\(([^)]+)\))?(?:\s*[-–]\s*(https?:\/\/[^\s]+))?/i);
    if (byMatch) {
      fileName = byMatch[1]?.trim();
      author = byMatch[2]?.trim() || "";
      license = byMatch[3]?.trim() || "";
      url = byMatch[4]?.trim() || "";
    } else {
      const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        url = urlMatch[1];
      }
      const licenseMatch = line.match(/\b(CC-BY-SA\s*[\d.]*|CC-BY\s*[\d.]*|CC0|GPL\s*[\d.]*|OGA-BY)\b/i);
      if (licenseMatch) {
        license = licenseMatch[1];
      }
      author = line.replace(/(https?:\/\/[^\s]+)/g, "").replace(/\([^)]+\)/g, "").trim();
    }

    if (author || fileName || license || url) {
      credits.push({
        fileName,
        authors: author ? [author] : ["Liberated Pixel Cup Contributors"],
        licenses: license ? [license] : ["CC-BY-SA 3.0"],
        urls: url ? [url] : ["https://opengameart.org"],
      });
    }
  }

  return credits;
}

/**
 * Infers a Saints Gaming CharacterComponentCategory from a file/folder path in an Modular export.
 */
export function inferComponentCategoryFromPath(filePath: string): {
  category: CharacterComponentCategory | "other";
  layer: string;
  zOrder: number;
  baseBodyType?: string;
} {
  const lower = filePath.toLowerCase().replace(/\\/g, "/");

  let baseBodyType: string | undefined;
  if (lower.includes("/male/") || lower.includes("_male")) baseBodyType = "male";
  else if (lower.includes("/female/") || lower.includes("_female")) baseBodyType = "female";
  else if (lower.includes("/muscular/") || lower.includes("_muscular")) baseBodyType = "muscular";
  else if (lower.includes("/pregnant/") || lower.includes("_pregnant")) baseBodyType = "pregnant";
  else if (lower.includes("/child/") || lower.includes("_child")) baseBodyType = "child";
  else if (lower.includes("/teen/") || lower.includes("_teen")) baseBodyType = "teen";

  let category: CharacterComponentCategory | "other" = "other";

  if (lower.includes("hair")) category = "hair";
  else if (lower.includes("face") || lower.includes("eyes") || lower.includes("beard") || lower.includes("nose")) category = "face";
  else if (lower.includes("hat") || lower.includes("helmet") || lower.includes("hood") || lower.includes("cap")) category = "hat";
  else if (lower.includes("head") || lower.includes("mask") || lower.includes("glasses") || lower.includes("earring")) category = "head_accessory";
  else if (lower.includes("shirt") || lower.includes("top") || lower.includes("tunic") || lower.includes("vest")) category = "shirt";
  else if (lower.includes("jacket") || lower.includes("robe") || lower.includes("armor") || lower.includes("cape") || lower.includes("coat")) category = "jacket";
  else if (lower.includes("pant") || lower.includes("leg") || lower.includes("skirt") || lower.includes("shorts")) category = "pants";
  else if (lower.includes("shoe") || lower.includes("boot") || lower.includes("feet") || lower.includes("sock")) category = "shoes";
  else if (lower.includes("weapon") || lower.includes("sword") || lower.includes("shield") || lower.includes("staff") || lower.includes("bow") || lower.includes("accessory") || lower.includes("belt")) category = "accessory";
  else if (lower.includes("cloth") || lower.includes("dress")) category = "clothing";

  const layer = inferCharacterComponentLayerSlot(category) || "full-body";
  const zOrder = getDefaultZOrderHint(category) ?? 45;

  return { category, layer, zOrder, baseBodyType };
}

/**
 * In-browser Modular ZIP Package Unpacker.
 * Takes a .zip file exported by the Universal Modular Character Generator, extracts
 * the composite spritesheet image, all layer components, and metadata/credits.
 */
export async function unpackModularZipPackage(zipFile: File): Promise<UnpackedModularPackage> {
  const zip = await JSZip.loadAsync(zipFile);
  const entries = Object.keys(zip.files);

  let compositeFile: File | undefined;
  let compositePreviewUrl: string | undefined;
  const layers: UnpackedModularLayer[] = [];
  let credits: SpriteCreditEntry[] = [];
  let metadata: Record<string, any> | undefined;
  let presetName: string | undefined;
  let baseBodyType: string | undefined;

  // 1. Look for credits or metadata files first
  for (const path of entries) {
    const fileEntry = zip.files[path];
    if (fileEntry.dir) continue;
    const lower = path.toLowerCase();

    if (lower.endsWith("credits.txt") || lower.endsWith("attribution.txt") || lower.endsWith("credits.md")) {
      const text = await fileEntry.async("text");
      credits = parseCreditsText(text);
    } else if (lower.endsWith("metadata.json") || lower.endsWith("config.json") || lower.endsWith("character.json")) {
      try {
        const text = await fileEntry.async("text");
        metadata = JSON.parse(text);
        if (metadata?.preset || metadata?.preset_title || metadata?.name) {
          presetName = metadata.preset_title || metadata.preset || metadata.name;
        }
        if (metadata?.bodyType || metadata?.baseBodyType) {
          baseBodyType = metadata.bodyType || metadata.baseBodyType;
        }
        if (Array.isArray(metadata?.credits)) {
          credits = metadata.credits;
        }
      } catch {
        // Ignore JSON parse errors
      }
    }
  }

  // 2. Extract PNG images
  const pngPaths = entries.filter(
    (p) => !zip.files[p].dir && p.toLowerCase().endsWith(".png") && !p.startsWith("__MACOSX")
  );

  let compositePath = pngPaths.find((p) => {
    const name = p.split("/").pop()?.toLowerCase() || "";
    return (
      name === "spritesheet.png" ||
      name === "character.png" ||
      name === "sheet.png" ||
      name === "full.png" ||
      name === "preview.png"
    );
  });

  if (!compositePath && pngPaths.length === 1) {
    compositePath = pngPaths[0];
  }

  for (const path of pngPaths) {
    const fileEntry = zip.files[path];
    const blob = await fileEntry.async("blob");
    const filename = path.split("/").pop() || path;
    const file = new File([blob], filename, { type: "image/png" });
    const previewUrl = URL.createObjectURL(blob);

    if (compositePath && path === compositePath) {
      compositeFile = file;
      compositePreviewUrl = previewUrl;
    } else {
      const { category, layer, zOrder, baseBodyType: inferredBody } = inferComponentCategoryFromPath(path);
      if (!baseBodyType && inferredBody) {
        baseBodyType = inferredBody;
      }
      layers.push({
        file,
        name: filename.replace(/\.png$/i, "").replace(/[_-]/g, " "),
        componentCategory: category,
        componentLayer: layer,
        zOrderHint: zOrder,
        baseBodyType: inferredBody,
        previewUrl,
      });
    }
  }

  if (!compositeFile && layers.length > 0) {
    compositeFile = layers[0].file;
    compositePreviewUrl = layers[0].previewUrl;
  }

  return {
    compositeFile,
    compositePreviewUrl,
    layers,
    credits,
    metadata,
    presetName: presetName || zipFile.name.replace(/\.zip$/i, "").replace(/[_-]/g, " "),
    baseBodyType,
  };
}
