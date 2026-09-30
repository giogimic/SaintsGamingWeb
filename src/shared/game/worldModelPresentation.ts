import { resolveEntitySpriteUrl } from './creatureCatalog';
import type { PresentationDefinition, ModularAttachmentDef } from './canonicalAsset';
import {
  getDefaultModelWardrobeAttachmentMode,
  getDefaultModelWardrobeSocket,
} from './modelWardrobe';

import type { CharacterComponentCategory } from './assetImportProfiles';

export interface CanonicalModelPartDef {
  id: string;
  label: string;
  category: CharacterComponentCategory;
  meshName: string;
  defaultVisible: boolean;
}

export interface CanonicalModelDef {
  id: string;
  name: string;
  modelUrl: string;
  category: 'character' | 'creature' | 'monster';
  skeleton: 'manny' | 'creature_custom' | 'mixamo';
  defaultAnimationProfileId?: string;
  modularParts?: CanonicalModelPartDef[];
  embeddedAnimations?: string[];
}

import {
  CHARACTER_MODEL_PROFILES,
  getCharacterModelProfile,
  type CharacterModelProfile,
} from './characterProfiles';

export {
  CHARACTER_MODEL_PROFILES,
  getCharacterModelProfile,
  type CharacterModelProfile,
};

export const CANONICAL_BUILTIN_MODELS: Record<string, CanonicalModelDef> = {
  brute: {
    id: 'brute',
    name: 'Brute',
    modelUrl: '/game-assets/models/humanoids/brute/brute.glb',
    category: 'character',
    skeleton: 'manny',
    defaultAnimationProfileId: 'GreystoneManny',
    modularParts: CHARACTER_MODEL_PROFILES.brute.modularParts,
  },
};

export function getCanonicalModelDef(modelIdOrUrl?: string | null): CanonicalModelDef | undefined {
  if (!modelIdOrUrl) return undefined;
  const key = modelIdOrUrl.trim().toLowerCase().replace(/^.*[\\/]/, '').replace(/\.(glb|gltf|fbx|obj)$/i, '');
  if (CANONICAL_BUILTIN_MODELS[key]) {
    return CANONICAL_BUILTIN_MODELS[key];
  }
  if (key.includes('brute')) {
    return CANONICAL_BUILTIN_MODELS.brute;
  }
  return undefined;
}

export function getModelModularComponents(modelIdOrUrl?: string | null): CanonicalModelPartDef[] {
  return getCanonicalModelDef(modelIdOrUrl)?.modularParts || [];
}

/** Safely resolve a 3D model asset string to its GLB/GLTF model URL without falling back to 2D png sprites. */
export function resolveModelAssetUrl(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = String(raw).trim();
  if (!trimmed) return undefined;

  // Direct URLs or web assets
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }

  // Files in uploads folder
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')) {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }

  // Canonical built-in model aliases - match on bare id or file basename
  const canonical = getCanonicalModelDef(trimmed);
  if (canonical) {
    return canonical.modelUrl;
  }

  // Upload identifiers
  if (trimmed.startsWith('upload_') || trimmed.startsWith('asset_custom_')) {
    if (/\.(glb|gltf|fbx|obj)$/i.test(trimmed)) {
      return `/uploads/${trimmed}`;
    }
    return `/uploads/${trimmed}.glb`;
  }

  // Explicit model file extensions
  if (/\.(glb|gltf|fbx|obj)$/i.test(trimmed)) {
    return trimmed.startsWith('/') ? trimmed : `/game-assets/models/${trimmed}`;
  }

  // Explicit absolute paths that do not end in 2D raster image extensions
  if (trimmed.startsWith('/') && !/\.(png|jpg|jpeg|webp|gif|svg)$/i.test(trimmed)) {
    return trimmed;
  }

  return undefined;
}

/** Resolve the per-actor world model config stored by Studio's shared model selector. */
export function getWorldModelPresentation(value?: unknown): PresentationDefinition | undefined {
  if (!value) return undefined;

  let data: any = value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    try {
      data = JSON.parse(trimmed);
    } catch {
      data = undefined;
    }
    // If raw string was not valid JSON object or was array, treat it as a direct model reference
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      const canonical = getCanonicalModelDef(trimmed);
      const resolvedUrl = resolveModelAssetUrl(trimmed);
      if (canonical || resolvedUrl || trimmed.includes('brute') || /\.(glb|gltf|fbx)$/i.test(trimmed)) {
        data = {
          type: '3D Model',
          assetId: canonical?.id || (trimmed.startsWith('/') ? undefined : trimmed),
          modelUrl: canonical?.modelUrl || resolvedUrl,
        };
      }
    }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return undefined;

  const model = data.worldModel || data;
  const modelType = model.type || model.assetProfileId;
  const candidateBaseUrl = model.modelUrl || model.source || (typeof model === 'object' && model?.url);
  const rawId = model.assetId || model.id || candidateBaseUrl;

  const canonicalLookup = getCanonicalModelDef(rawId)
    || getCanonicalModelDef(candidateBaseUrl)
    || getCanonicalModelDef(model.assetId);

  const resolvedModelUrl = candidateBaseUrl
    || resolveModelAssetUrl(model.assetId)
    || resolveModelAssetUrl(rawId)
    || canonicalLookup?.modelUrl;

  if (!resolvedModelUrl && modelType !== '3D Model' && modelType !== 'MODEL') return undefined;

  const modelUrl = resolvedModelUrl || resolveEntitySpriteUrl(model.assetId);
  if (!modelUrl) return undefined;

  const configuredAttachments = Array.isArray(data.modularAttachments)
    ? data.modularAttachments
    : Array.isArray(model.modularAttachments)
      ? model.modularAttachments
      : [];
  const modularAttachments: ModularAttachmentDef[] = configuredAttachments
      .filter((att: any) => att?.defaultVisible !== false)
      .map((att: any): ModularAttachmentDef | undefined => {
        const rawId = typeof att === 'string' ? att : att?.assetId;
        const candidateUrl = typeof att === 'object' && att ? (att.modelUrl || att.source || att.url || att.cdnUrl) : undefined;
        const url = candidateUrl || resolveModelAssetUrl(rawId) || (rawId && /\.(glb|gltf)$/i.test(rawId) ? resolveEntitySpriteUrl(rawId) : undefined);
        if (!url) return undefined;
        const wardrobeItem = typeof att === 'string' ? { assetId: rawId, modelUrl: url } : { ...att, assetId: rawId, modelUrl: url };
        const attachmentMode = att?.attachmentMode || (att?.isModular ? 'SKINNED' : getDefaultModelWardrobeAttachmentMode(wardrobeItem));
        return {
          modelUrl: url,
          assetId: rawId,
          socket: att?.socket || (attachmentMode === 'SKINNED' ? undefined : getDefaultModelWardrobeSocket(wardrobeItem)),
          attachOffset: att?.attachOffset,
          sheathedSocket: att?.sheathedSocket,
          sheathedOffset: att?.sheathedOffset,
          attachmentMode,
          hidesComponents: Array.isArray(att?.hidesComponents) ? att.hidesComponents : [],
          scale: Number(att?.scale) || undefined,
        };
      })
      .filter((a: ModularAttachmentDef | undefined): a is ModularAttachmentDef => !!a);

  const modularModelUrls = modularAttachments.map((a: ModularAttachmentDef) => a.modelUrl);
  const scale = Number(model.scale ?? model.modelScale ?? data.scale ?? data.modelScale ?? (data.assetDefinition?.transform?.scale));

  const camHeight = Number(model.cameraHeightOffset ?? model.cameraYOffset ?? data.cameraHeightOffset ?? data.cameraYOffset ?? (data.assetDefinition?.transform?.cameraYOffset));

  const animations = model.animations ?? data.animations ?? data.assetDefinition?.animations;
  const rigAnalysis = model.rigAnalysis ?? data.rigAnalysis ?? data.assetDefinition?.rigAnalysis;
  const categorizedAnimations = model.categorizedAnimations ?? data.categorizedAnimations ?? data.assetDefinition?.categorizedAnimations;
  const skeletonRequirements = model.skeletonRequirements ?? data.skeletonRequirements ?? data.assetDefinition?.skeletonRequirements;
  const materials = model.materials ?? data.materials ?? data.assetDefinition?.materials;

  const canonicalDef = canonicalLookup
    || (rawId && getCanonicalModelDef(String(rawId)))
    || (model.assetId && getCanonicalModelDef(String(model.assetId)))
    || CANONICAL_BUILTIN_MODELS.brute;

  const profile = getCharacterModelProfile(rawId)
    || getCharacterModelProfile(model.assetId)
    || getCharacterModelProfile(modelUrl)
    || (canonicalDef?.id ? getCharacterModelProfile(canonicalDef.id) : undefined);

  const resolvedAnimations = animations || (profile?.animationActionMap ? {
    mapped: profile.animationActionMap,
    embedded: profile.embeddedAnimations,
  } : undefined);

  return {
    mode: '3D',
    assetId: model.assetId || canonicalDef?.id || 'builtin-model-brute',
    animationProfileId: model.animationProfileId ?? data.animationProfileId ?? data.assetDefinition?.animationProfileId ?? canonicalDef?.defaultAnimationProfileId ?? profile?.defaultAnimationProfileId ?? 'GreystoneManny',
    modelUrl,
    modularModelUrls,
    modularAttachments,
    modelScale: Number.isFinite(scale) && scale > 0 ? Math.min(100, scale) : (canonicalDef?.defaultScale ?? 0.8),
    cameraHeightOffset: Number.isFinite(camHeight) && camHeight > 0 ? camHeight : undefined,
    animations: resolvedAnimations,
    rigAnalysis,
    categorizedAnimations,
    skeletonRequirements,
    materials,
  };
}
