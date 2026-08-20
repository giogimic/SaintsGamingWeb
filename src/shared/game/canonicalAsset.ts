/**
 * Saints Gaming — Canonical Asset Normalization & Projection Layer (Bible 35)
 *
 * Provides a single unified projection function that guarantees every asset ingestion
 * path (upload, slice, pack installer, LPC import, modular importer) produces
 * identical metadata schemas, tag conventions, category structures, and GameAsset records.
 */

import {
  AssetImportProfileId,
  getDefaultSlotRole,
  getDefaultZOrderHint,
  inferCategoryForRole,
  inferCharacterComponentLayerSlot,
  inferTypeForProfile,
  isCharacterComponentCategory,
  isValidAssetImportProfile,
  isValidCharacterBaseBodyType,
  isValidSlotRole,
} from "./assetImportProfiles";
import { resolveSpriteDefinition, SpriteDefinition } from "./spriteDefinitions";

export interface CanonicalAssetInput {
  userId?: string;
  gameId?: string;
  name?: string;
  type?: string;
  category?: string | null;
  tags?: string[];
  width?: number;
  height?: number;
  sourceUrl: string;
  atlasSource?: string | null;
  atlasFrame?: { x: number; y: number; width?: number; height?: number; w?: number; h?: number } | null;
  sourceRegion?: { x: number; y: number; w: number; h: number } | null;
  sourceMode?: "single" | "multi" | "spritesheet";
  importProfile?: string | null;
  slotRole?: string | null;
  animationProfile?: string | null;
  componentCategory?: string | null;
  componentLayer?: string | null;
  variantFamily?: string | null;
  isModularComponent?: boolean;
  zOrderHint?: number | null;
  baseBodyType?: string | null;
  hidesComponents?: string[] | null;
  credits?: { fileName?: string; authors?: string[]; licenses?: string[]; urls?: string[] }[];
  bundleId?: string | null;
  pack?: string | null;
  visibility?: "PERSONAL" | "PROJECT" | "COMMUNITY" | "PUBLIC";
  moderationStatus?: "PENDING" | "APPROVED" | "REJECTED";
  facing?: string | null;
  animationState?: string | null;
  animationFrames?: number;
  frameDurationMs?: number;
  showInCharacterCreation?: boolean;
  isPlayable?: boolean;
  fileSize?: number;
  sourceAssetId?: string | null;
  usableAssetId?: string | null;
}

export interface CanonicalGameAssetData {
  gameId: string | null;
  type: string;
  source: string;
  atlasSource: string | null;
  atlasFrame: string | null; // JSON string
  tags: string; // JSON string
  categories: string; // JSON string
  metadata: string; // JSON string
  isActive: boolean;
  usageCount: number;
  fileSize: number;
  cdnUrl: string | null;
}

export interface CanonicalUsableAssetData {
  sourceAssetId: string | null;
  name: string;
  type: string;
  category: string | null;
  tags: string; // JSON string
  width: number;
  height: number;
  sourceRegion: string | null; // JSON string
  facing: string | null;
  animationState: string | null;
  animationFrames: number;
  frameDurationMs: number;
  createdById: string;
  gameId: string;
  visibility: string;
  moderationStatus: string;
  version: number;
  cdnUrl: string | null;
  thumbnailPath: string | null;
}

export interface CanonicalNormalizedAsset {
  assetName: string;
  normalizedType: string;
  assetCategory: string | null;
  tags: string[];
  categories: string[];
  metadata: Record<string, any>;
  spriteDef: SpriteDefinition;
  atlasFrame: { x: number; y: number; width: number; height: number } | null;
  gameAssetData: CanonicalGameAssetData;
  usableAssetData: CanonicalUsableAssetData;
}

/**
 * Normalizes input parameters across all asset ingestion flows into a single
 * deterministic schema.
 */
export function buildCanonicalAssetData(input: CanonicalAssetInput): CanonicalNormalizedAsset {
  const gameId = input.gameId || "tuxemon";
  const sourceUrl = input.sourceUrl || "";
  const filename = sourceUrl.split("/").pop() || "unnamed_asset";
  const assetName = input.name || filename.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");

  const rawFrame = input.atlasFrame || input.sourceRegion;
  const width = input.width || (rawFrame ? ((rawFrame as any).width ?? (rawFrame as any).w) : null) || 32;
  const height = input.height || (rawFrame ? ((rawFrame as any).height ?? (rawFrame as any).h) : null) || 32;
  const sourceMode = input.sourceMode || (input.sourceRegion ? "spritesheet" : "single");

  // 1. Modular classification
  const isModularComponent = Boolean(
    input.isModularComponent ||
      (input.componentCategory && isCharacterComponentCategory(input.componentCategory))
  );
  const componentCategory = (input.componentCategory || "").trim().toLowerCase() || null;
  const componentLayer =
    (input.componentLayer || (componentCategory ? inferCharacterComponentLayerSlot(componentCategory) : "") || "")
      .trim()
      .toLowerCase() || null;
  const variantFamily = (input.variantFamily || "").trim() || null;

  let zOrderHint: number | null = null;
  let baseBodyType: string | null = null;
  let hidesComponents: string[] = [];

  if (isModularComponent) {
    zOrderHint =
      typeof input.zOrderHint === "number" && Number.isFinite(input.zOrderHint)
        ? input.zOrderHint
        : componentCategory
        ? getDefaultZOrderHint(componentCategory)
        : null;

    const requestedBodyType = (input.baseBodyType || "").trim().toLowerCase();
    if (requestedBodyType && isValidCharacterBaseBodyType(requestedBodyType)) {
      baseBodyType = requestedBodyType;
    }

    if (Array.isArray(input.hidesComponents)) {
      hidesComponents = Array.from(
        new Set(input.hidesComponents.map((v) => String(v).trim().toLowerCase()).filter(isCharacterComponentCategory))
      );
    }
  }

  // 2. Profile & Role Validation
  let importProfile: AssetImportProfileId | null = null;
  if (input.importProfile?.trim()) {
    const p = input.importProfile.trim().toLowerCase();
    if (isValidAssetImportProfile(p)) {
      importProfile = p;
    }
  }

  let slotRole: string | null = null;
  if (importProfile) {
    const r = input.slotRole?.trim() || getDefaultSlotRole(importProfile);
    if (isValidSlotRole(importProfile, r)) {
      slotRole = r;
    }
  }

  const inferredType = importProfile ? inferTypeForProfile(importProfile) : null;
  const inferredFromUrl =
    sourceUrl.includes("/audio/") || sourceUrl.includes("/sounds/") || sourceUrl.includes("/music/")
      ? "AUDIO"
      : sourceUrl.includes("/tilesets/") || sourceUrl.includes("/terrain/")
      ? "TILESET"
      : sourceUrl.includes("/monster/") || sourceUrl.includes("/creatures/")
      ? "CREATURE"
      : sourceUrl.includes("/npc/") || sourceUrl.includes("/player/")
      ? "CHARACTER"
      : sourceUrl.includes("/items/")
      ? "ITEM"
      : sourceUrl.includes("/objects/")
      ? "OBJECT"
      : "OBJECT";

  const normalizedType = (input.type || inferredType || inferredFromUrl).toUpperCase();
  const inferredCategory = slotRole ? inferCategoryForRole(slotRole) : null;
  const assetCategory = input.category || inferredCategory || (isModularComponent ? componentCategory || "other" : null);

  // 3. Sprite Definition Resolution
  const spriteDef = resolveSpriteDefinition({
    animationProfile: input.animationProfile,
    width,
    height,
    spriteUrl: sourceUrl,
  });

  const baseTags = Array.isArray(input.tags) ? input.tags : [];
  const hasPlayableTag =
    baseTags.includes("playable") || baseTags.includes("character_creator") || baseTags.includes("player");

  const isPlayable = Boolean(
    input.isPlayable ??
      (input.showInCharacterCreation ||
        hasPlayableTag ||
        input.pack === "heroes" ||
        (importProfile === "character" && (slotRole === "hero" || slotRole === "player")))
  );

  const showInCharacterCreation = Boolean(
    input.showInCharacterCreation ??
      (input.isPlayable || hasPlayableTag || input.pack === "heroes")
  );

  // 4. Unified Enriched Tags
  const enrichedTags = Array.from(
    new Set(
      [
        ...baseTags,
        gameId,
        normalizedType.toLowerCase(),
        `anim:${spriteDef.profile}`,
        importProfile ? `profile:${importProfile}` : "",
        slotRole ? `role:${slotRole}` : "",
        isModularComponent ? "modular" : "",
        isModularComponent ? "sprite-component" : "",
        componentCategory ? `component:${componentCategory}` : "",
        componentLayer ? `layer:${componentLayer}` : "",
        variantFamily ? `variant:${variantFamily.toLowerCase()}` : "",
        baseBodyType ? `body:${baseBodyType}` : "",
        input.bundleId ? `bundle:${input.bundleId}` : "",
        input.pack ? `pack:${input.pack}` : "",
        `source:${sourceMode}`,
        isPlayable ? "playable" : "",
        showInCharacterCreation ? "character_creator" : "",
        showInCharacterCreation ? "player" : "",
      ].filter(Boolean)
    )
  );

  // 5. Unified Categories
  const enrichedCategories = Array.from(
    new Set(
      [
        assetCategory || "general",
        ...(componentCategory ? [componentCategory] : []),
        ...(isModularComponent ? ["modular", "character-component"] : []),
        ...(importProfile ? [importProfile] : []),
      ].filter(Boolean)
    )
  );

  // 6. Sliced Atlas Frame Resolution
  let atlasFrame: { x: number; y: number; width: number; height: number } | null = null;
  if (rawFrame) {
    atlasFrame = {
      x: rawFrame.x,
      y: rawFrame.y,
      width: (rawFrame as any).width ?? (rawFrame as any).w ?? width,
      height: (rawFrame as any).height ?? (rawFrame as any).h ?? height,
    };
  }

  // 7. Canonical Metadata Object
  const metadata: Record<string, any> = {
    name: assetName,
    anim: spriteDef.profile,
    profile: importProfile || undefined,
    role: slotRole || undefined,
    cat: componentCategory || undefined,
    layer: componentLayer || undefined,
    variant: variantFamily || undefined,
    z: zOrderHint ?? undefined,
    body: baseBodyType || undefined,
    hidesComponents: hidesComponents.length > 0 ? hidesComponents : undefined,
    isModularComponent: isModularComponent || undefined,
    componentCategory: componentCategory || undefined,
    componentLayer: componentLayer || undefined,
    variantFamily: variantFamily || undefined,
    zOrderHint: zOrderHint ?? undefined,
    baseBodyType: baseBodyType || undefined,
    w: width,
    h: height,
    bundle: input.bundleId || undefined,
    pack: input.pack || (sourceMode === "spritesheet" ? "studio-slice" : "studio-import"),
    sourceRegion: input.sourceRegion || (atlasFrame ? { x: atlasFrame.x, y: atlasFrame.y, w: atlasFrame.width, h: atlasFrame.height } : undefined),
    facing: input.facing || undefined,
    animationState: input.animationState || undefined,
    animationFrames: input.animationFrames || undefined,
    frameDurationMs: input.frameDurationMs || undefined,
    showInCharacterCreation,
    isPlayable,
    sourceAssetId: input.sourceAssetId || undefined,
    usableAssetId: input.usableAssetId || undefined,
    credits: input.credits || undefined,
  };

  const tagsJson = JSON.stringify(enrichedTags);
  const categoriesJson = JSON.stringify(enrichedCategories);
  const metadataJson = JSON.stringify(metadata);
  const atlasFrameJson = atlasFrame ? JSON.stringify(atlasFrame) : null;
  const sourceRegionJson = input.sourceRegion ? JSON.stringify(input.sourceRegion) : atlasFrameJson;

  const gameAssetData: CanonicalGameAssetData = {
    gameId,
    type: normalizedType,
    source: sourceUrl,
    atlasSource: input.atlasSource || (atlasFrame ? sourceUrl : null),
    atlasFrame: atlasFrameJson,
    tags: tagsJson,
    categories: categoriesJson,
    metadata: metadataJson,
    isActive: true,
    usageCount: 0,
    fileSize: input.fileSize || 0,
    cdnUrl: sourceUrl,
  };

  const usableAssetData: CanonicalUsableAssetData = {
    sourceAssetId: input.sourceAssetId || null,
    name: assetName,
    type: normalizedType,
    category: assetCategory,
    tags: tagsJson,
    width,
    height,
    sourceRegion: sourceRegionJson,
    facing: input.facing || null,
    animationState: input.animationState || null,
    animationFrames: input.animationFrames || 1,
    frameDurationMs: input.frameDurationMs || 100,
    createdById: input.userId || "system",
    gameId,
    visibility: input.visibility || "COMMUNITY",
    moderationStatus: input.moderationStatus || "APPROVED",
    version: 1,
    cdnUrl: sourceUrl,
    thumbnailPath: sourceUrl,
  };

  return {
    assetName,
    normalizedType,
    assetCategory,
    tags: enrichedTags,
    categories: enrichedCategories,
    metadata,
    spriteDef,
    atlasFrame,
    gameAssetData,
    usableAssetData,
  };
}

/**
 * Projects a UsableAsset record (and optional SourceAsset) directly into canonical GameAsset data.
 */
export function projectUsableAssetToGameAssetData(
  usable: {
    id: string;
    sourceAssetId?: string | null;
    name: string;
    type: string;
    category?: string | null;
    tags?: string | null;
    width: number;
    height: number;
    sourceRegion?: string | null;
    facing?: string | null;
    animationState?: string | null;
    animationFrames?: number;
    frameDurationMs?: number;
    gameId?: string | null;
    cdnUrl?: string | null;
    thumbnailPath?: string | null;
  },
  sourceAsset?: {
    id: string;
    storagePath: string;
    filename: string;
    fileSize?: number;
    metadata?: string;
  } | null
): CanonicalGameAssetData {
  let parsedTags: string[] = [];
  try {
    parsedTags = JSON.parse(usable.tags || "[]");
  } catch {
    parsedTags = [];
  }

  let sourceRegion: { x: number; y: number; w: number; h: number } | null = null;
  try {
    if (usable.sourceRegion) {
      sourceRegion = JSON.parse(usable.sourceRegion);
    }
  } catch {
    sourceRegion = null;
  }

  let sourceMeta: Record<string, any> = {};
  try {
    if (sourceAsset?.metadata) {
      sourceMeta = JSON.parse(sourceAsset.metadata);
    }
  } catch {
    sourceMeta = {};
  }

  const sourceUrl = sourceAsset?.storagePath || usable.cdnUrl || usable.thumbnailPath || "";

  const canonical = buildCanonicalAssetData({
    userId: undefined,
    gameId: usable.gameId || "tuxemon",
    name: usable.name,
    type: usable.type,
    category: usable.category,
    tags: parsedTags,
    width: usable.width,
    height: usable.height,
    sourceUrl,
    atlasSource: sourceAsset ? sourceAsset.storagePath : null,
    sourceRegion,
    sourceMode: sourceRegion ? "spritesheet" : "single",
    importProfile: sourceMeta.profile || undefined,
    slotRole: sourceMeta.role || undefined,
    animationProfile: sourceMeta.anim || undefined,
    componentCategory: sourceMeta.cat || usable.category || undefined,
    componentLayer: sourceMeta.layer || undefined,
    variantFamily: sourceMeta.variant || undefined,
    zOrderHint: sourceMeta.z ?? undefined,
    baseBodyType: sourceMeta.body || undefined,
    bundleId: sourceMeta.bundle || undefined,
    facing: usable.facing,
    animationState: usable.animationState,
    animationFrames: usable.animationFrames,
    frameDurationMs: usable.frameDurationMs,
    fileSize: sourceAsset?.fileSize || 0,
    sourceAssetId: usable.sourceAssetId || sourceAsset?.id || null,
    usableAssetId: usable.id,
  });

  return canonical.gameAssetData;
}

/**
 * Parses raw JSON strings from GameAsset DB rows into normalized objects for client APIs.
 */
export function formatCanonicalGameAsset(asset: any) {
  let tags: string[] = [];
  try {
    const parsed = JSON.parse(asset.tags || "[]");
    tags = Array.isArray(parsed) ? parsed : [];
  } catch {
    tags = [];
  }

  let categories: string[] = [];
  try {
    const parsed = JSON.parse(asset.categories || "[]");
    categories = Array.isArray(parsed) ? parsed : [];
  } catch {
    categories = [];
  }

  let metadata: Record<string, any> = {};
  try {
    const parsed = JSON.parse(asset.metadata || "{}");
    metadata = parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    metadata = {};
  }

  let atlasFrame: { x: number; y: number; width: number; height: number } | null = null;
  try {
    if (asset.atlasFrame) {
      const parsed = JSON.parse(asset.atlasFrame);
      if (parsed && typeof parsed === "object") {
        atlasFrame = {
          x: parsed.x ?? 0,
          y: parsed.y ?? 0,
          width: parsed.width ?? parsed.w ?? metadata.w ?? 32,
          height: parsed.height ?? parsed.h ?? metadata.h ?? 32,
        };
      }
    }
  } catch {
    atlasFrame = null;
  }

  let customLabels: Record<string, string> | null = null;
  try {
    if (asset.customLabels) {
      const parsed = JSON.parse(asset.customLabels);
      customLabels = parsed && typeof parsed === "object" ? parsed : null;
    }
  } catch {
    customLabels = null;
  }

  const isModular = Boolean(
    metadata.isModularComponent ||
      tags.includes("modular") ||
      tags.includes("sprite-component") ||
      metadata.componentCategory ||
      metadata.cat
  );

  return {
    ...asset,
    tags,
    categories,
    metadata,
    atlasFrame,
    customLabels,
    isModularComponent: isModular,
    componentCategory: metadata.componentCategory || metadata.cat || null,
    componentLayer: metadata.componentLayer || metadata.layer || null,
    variantFamily: metadata.variantFamily || metadata.variant || null,
    zOrderHint: metadata.zOrderHint ?? metadata.z ?? null,
    baseBodyType: metadata.baseBodyType || metadata.body || null,
    hidesComponents: Array.isArray(metadata.hidesComponents) ? metadata.hidesComponents : [],
  };
}
