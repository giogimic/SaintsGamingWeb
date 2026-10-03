import { resolveEntitySpriteUrl } from './creatureCatalog';
import type { PresentationDefinition, ModularAttachmentDef } from './canonicalAsset';
import {
  getDefaultModelWardrobeAttachmentMode,
  getDefaultModelWardrobeSocket,
} from './modelWardrobe';

import type { CharacterComponentCategory } from './assetImportProfiles';
import type { ModelWardrobeItem } from './modelWardrobe';
import { getProfileSlotUrls } from './animationProfiles';

/** Saved actor binding. `scale` belongs to the actor; `modelScale` belongs to its imported asset. */
export interface WorldModelBinding extends Omit<PresentationDefinition, 'mode' | 'modularAttachments'> {
  type: '2D Sprite' | '2D Box Sprite' | '3D Model' | 'Other';
  assetId: string;
  source?: string | null;
  scale?: number;
  modularAttachments?: ModelWardrobeItem[];
}

/** Copy a new asset's complete visual definition without carrying settings from the previous base. */
export function resolveWorldModelAssetValue(asset: any, actorScale?: number): WorldModelBinding {
  let metadata = asset?.metadata || {};
  if (typeof metadata === 'string') {
    try { metadata = JSON.parse(metadata); } catch { metadata = {}; }
  }
  const presentation = asset?.presentation || metadata.presentation || {};
  const definition = presentation.assetDefinition || metadata.assetDefinition || {};
  const transform = definition.transform || presentation.transform || {};
  const modelUrl = asset?.source || asset?.cdnUrl || presentation.modelUrl || asset?.id;
  return {
    ...presentation,
    type: '3D Model',
    assetId: asset?.id || modelUrl,
    modelUrl,
    source: modelUrl,
    scale: actorScale ?? 1,
    modelScale: presentation.modelScale ?? transform.scale,
    modelRotationY: presentation.modelRotationY ?? transform.rotationY,
    grounding: presentation.grounding ?? transform.grounding ?? transform.groundingOffsetY,
    cameraHeightOffset: presentation.cameraHeightOffset ?? transform.cameraYOffset ?? transform.cameraHeightOffset,
    animationProfileId: presentation.animationProfileId ?? definition.animationProfileId,
    animations: presentation.animations ?? definition.animations,
    rigAnalysis: presentation.rigAnalysis ?? definition.rigAnalysis ?? metadata.rigAnalysis,
    categorizedAnimations: presentation.categorizedAnimations ?? definition.categorizedAnimations,
    skeletonRequirements: presentation.skeletonRequirements ?? definition.skeletonRequirements,
    skeleton: presentation.skeleton ?? definition.skeleton ?? metadata.skeleton,
    sockets: presentation.sockets ?? definition.attachments,
    materials: presentation.materials ?? definition.materials,
    assetDefinition: definition,
    modularAttachments: presentation.modularAttachments,
  };
}

/** Collect stable asset identities and actual model/texture/animation sources from an actor visual. */
export function collectWorldModelAssetReferences(value: unknown): string[] {
  const refs = new Set<string>();
  const add = (ref: unknown) => {
    if (typeof ref === 'string' && ref.trim() && !ref.startsWith('blob:') && !ref.startsWith('data:')) refs.add(ref.trim());
  };
  let data: any = value;
  if (typeof value === 'string') {
    try { data = JSON.parse(value); } catch { add(value); data = undefined; }
  }
  const visit = (node: any) => {
    if (!node || typeof node !== 'object') return;
    for (const [key, ref] of Object.entries(node)) {
      if (['assetId', 'modelUrl', 'source', 'cdnUrl', 'textureVariantUrl', 'sourcePath', 'textureUrl', 'spriteSheetUrl', 'portraitUrl'].includes(key)) add(ref);
      else if (key === 'sourceId' && typeof ref === 'string' && !['embedded', 'profile'].includes(ref)) add(ref);
      if (ref && typeof ref === 'object') visit(ref);
      if (typeof ref === 'string' && /(?:url|texture|map)$/i.test(key) && /^(?:\/|https?:\/\/)/.test(ref)) add(ref);
    }
  };
  visit(data);
  const presentation = getWorldModelPresentation(value);
  if (presentation) {
    visit(presentation);
    if (presentation.animationProfileId) Object.values(getProfileSlotUrls(presentation.animationProfileId)).forEach(add);
  }
  return [...refs];
}

export interface CanonicalModelPartDef {
  id: string;
  label: string;
  category: CharacterComponentCategory;
  meshName: string;
  defaultVisible: boolean;
  suppressesSubmeshes?: string[];
  isFaceVariant?: boolean;
}

export interface CanonicalModelDef {
  id: string;
  name: string;
  modelUrl: string;
  category: 'character' | 'creature' | 'monster' | 'prop';
  skeleton: string;
  isPlayable?: boolean;
  defaultAnimationProfileId?: string;
  modularParts?: CanonicalModelPartDef[];
  embeddedAnimations?: string[];
  defaultScale?: number;
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
  quaternius_base_male: {
    id: 'quaternius_base_male',
    name: 'Quaternius Base Male',
    modelUrl: '/models/quaternius/quaternius_base_male.glb',
    category: 'character',
    skeleton: 'quaternius_universal',
    isPlayable: true,
    defaultAnimationProfileId: 'quaternius_native',
    modularParts: [],
  },
  quaternius_base_female: {
    id: 'quaternius_base_female',
    name: 'Quaternius Base Female',
    modelUrl: '/models/quaternius/quaternius_base_female.glb',
    category: 'character',
    skeleton: 'quaternius_universal',
    isPlayable: true,
    defaultAnimationProfileId: 'quaternius_native',
    modularParts: [],
  },
  superhero_male_fullbody: {
    id: 'superhero_male_fullbody',
    name: 'Quaternius Base Male',
    modelUrl: '/models/quaternius/quaternius_base_male.glb',
    category: 'character',
    skeleton: 'quaternius_universal',
    isPlayable: true,
    defaultAnimationProfileId: 'quaternius_native',
    modularParts: [],
  },
  superhero_female_fullbody: {
    id: 'superhero_female_fullbody',
    name: 'Quaternius Base Female',
    modelUrl: '/models/quaternius/quaternius_base_female.glb',
    category: 'character',
    skeleton: 'quaternius_universal',
    isPlayable: true,
    defaultAnimationProfileId: 'quaternius_native',
    modularParts: [],
  },
  imp: {
    id: 'imp',
    name: 'Imp',
    modelUrl: '/models/quaternius/imp.glb',
    category: 'monster',
    skeleton: 'creature_custom',
    isPlayable: false,
    modularParts: [],
  },
  puglin: {
    id: 'puglin',
    name: 'Puglin',
    modelUrl: '/models/quaternius/puglin.glb',
    category: 'monster',
    skeleton: 'creature_custom',
    isPlayable: false,
    modularParts: [],
  },
  // Legacy / test compatibility
  brute: {
    id: 'brute',
    name: 'Brute',
    modelUrl: '/game-assets/models/humanoids/brute/brute.glb',
    category: 'character',
    skeleton: 'manny',
    defaultAnimationProfileId: 'GreystoneManny',
    modularParts: [],
  },
  asian_girl: {
    id: 'asian_girl',
    name: 'Asian Heroine',
    modelUrl: '/game-assets/models/humanoids/asian_girl/asian_girl.glb',
    category: 'character',
    skeleton: 'daz_g8f',
    isPlayable: true,
    defaultAnimationProfileId: 'GreystoneManny',
    modularParts: [],
  },
  boy: {
    id: 'boy',
    name: 'Stylized Boy',
    modelUrl: '/game-assets/models/humanoids/boy/boy.glb',
    category: 'character',
    skeleton: 'mixamo',
    defaultAnimationProfileId: 'boy_native',
    modularParts: [],
  },
  girl: {
    id: 'girl',
    name: 'Stylized Girl',
    modelUrl: '/game-assets/models/humanoids/girl/girl.glb',
    category: 'character',
    skeleton: 'mixamo',
    defaultAnimationProfileId: 'girl_native',
    modularParts: [],
  },
};

export function getCanonicalModelDef(modelIdOrUrl?: string | null): CanonicalModelDef | undefined {
  if (!modelIdOrUrl) return undefined;
  const raw = modelIdOrUrl.trim().toLowerCase();
  const key = raw.replace(/^.*[\\/]/, '').replace(/\.(glb|gltf|fbx|obj)$/i, '');
  const exactAliases: Record<string, string> = {
    'quat-quaternius_base_male': 'quaternius_base_male',
    'quat-quaternius_base_female': 'quaternius_base_female',
    'builtin-model-quaternius-base-male': 'quaternius_base_male',
    'builtin-model-quaternius-base-female': 'quaternius_base_female',
    'builtin-model-brute': 'brute',
    'builtin-model-asian-girl': 'asian_girl',
    'builtin-model-boy': 'boy',
    'builtin-model-girl': 'girl',
    'builtin-model-imp': 'imp',
    'builtin-model-puglin': 'puglin',
    superhero_male_fullbody: 'superhero_male_fullbody',
    superhero_female_fullbody: 'superhero_female_fullbody',
    imp: 'imp',
    puglin: 'puglin',
    brute: 'brute',
    asian_girl: 'asian_girl',
    boy: 'boy',
    girl: 'girl',
  };
  const canonicalKey = exactAliases[key] || key;
  return CANONICAL_BUILTIN_MODELS[canonicalKey];
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

  // Preserve explicit paths such as `/models/quaternius/imp.glb` before
  // considering bare canonical aliases with the same basename.
  if (trimmed.startsWith('/') && !/\.(png|jpg|jpeg|webp|gif|svg)$/i.test(trimmed)) {
    return trimmed;
  }

  // Upload identifiers
  if (trimmed.startsWith('upload_') || trimmed.startsWith('asset_custom_')) {
    if (/\.(glb|gltf|fbx|obj)$/i.test(trimmed)) {
      return `/uploads/${trimmed}`;
    }
    return `/uploads/${trimmed}.glb`;
  }

  // Canonical bare model names may include an extension in saved records.
  // Resolve those through the registry before the generic extension fallback.
  const canonical = getCanonicalModelDef(trimmed);
  if (canonical) return canonical.modelUrl;

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
      if (canonical || resolvedUrl || trimmed.includes('brute') || trimmed.includes('golem') || /\.(glb|gltf|fbx)$/i.test(trimmed)) {
        data = {
          type: '3D Model',
          assetId: canonical?.id || (trimmed.startsWith('/') ? undefined : trimmed),
          modelUrl: canonical?.modelUrl || resolvedUrl,
        };
      }
    }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return undefined;

  const model = data.worldModel || data.appearance || data;
  const assetDefinition = model.assetDefinition || data.assetDefinition || {};
  const transform = assetDefinition.transform || model.transform || data.transform || {};
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
      .map((att: any): ModularAttachmentDef | undefined => {
        const rawId = typeof att === 'string' ? att : att?.assetId;
        const candidateUrl = typeof att === 'object' && att ? (att.modelUrl || att.source || att.url || att.cdnUrl) : undefined;
        const url = candidateUrl || resolveModelAssetUrl(rawId) || (rawId && /\.(glb|gltf)$/i.test(rawId) ? resolveEntitySpriteUrl(rawId) : undefined);
        if (!url) return undefined;
        const wardrobeItem = typeof att === 'string' ? { assetId: rawId, modelUrl: url } : { ...att, assetId: rawId, modelUrl: url };
        const attachmentMode = att?.attachmentMode || (att?.isModular ? 'SKINNED' : getDefaultModelWardrobeAttachmentMode(wardrobeItem));
        return {
          ...(typeof att === 'object' && att ? att : {}),
          modelUrl: url,
          assetId: rawId,
          socket: att?.socket || (attachmentMode === 'SKINNED' ? undefined : getDefaultModelWardrobeSocket(wardrobeItem)),
          attachOffset: att?.attachOffset,
          sheathedSocket: att?.sheathedSocket,
          sheathedOffset: att?.sheathedOffset,
          attachmentMode,
          hidesComponents: Array.isArray(att?.hidesComponents) ? att.hidesComponents : [],
          scale: Number(att?.scale) || undefined,
          isSubmesh: Boolean(att?.isSubmesh || att?.meshName || att?.assetDefinition?.meshName || att?.metadata?.meshName),
          meshName: att?.meshName || att?.assetDefinition?.meshName || att?.metadata?.meshName,
          defaultVisible: att?.defaultVisible ?? att?.metadata?.defaultVisible,
          category: att?.category || att?.metadata?.category,
          tint: att?.tint,
          textureVariantUrl: att?.textureVariantUrl || att?.metadata?.textureVariantUrl,
        };
      })
      .filter((a: ModularAttachmentDef | undefined): a is ModularAttachmentDef => !!a);

  const modularModelUrls = modularAttachments.map((a: ModularAttachmentDef) => a.modelUrl);
  const scale = Number(model.modelScale ?? data.modelScale ?? transform.scale);

  const camHeight = Number(model.cameraHeightOffset ?? model.cameraYOffset ?? data.cameraHeightOffset ?? data.cameraYOffset ?? transform.cameraYOffset ?? transform.cameraHeightOffset);

  const animations = model.animations ?? data.animations ?? assetDefinition.animations;
  const rigAnalysis = model.rigAnalysis ?? data.rigAnalysis ?? assetDefinition.rigAnalysis;
  const categorizedAnimations = model.categorizedAnimations ?? data.categorizedAnimations ?? assetDefinition.categorizedAnimations;
  const skeletonRequirements = model.skeletonRequirements ?? data.skeletonRequirements ?? assetDefinition.skeletonRequirements;
  const materials = model.materials ?? data.materials ?? assetDefinition.materials;

  const canonicalDef = canonicalLookup
    || (rawId && getCanonicalModelDef(String(rawId)))
    || (model.assetId && getCanonicalModelDef(String(model.assetId)));

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
    assetId: model.assetId || canonicalDef?.id || String(rawId ?? modelUrl),
    animationProfileId: model.animationProfileId ?? data.animationProfileId ?? assetDefinition.animationProfileId ?? canonicalDef?.defaultAnimationProfileId ?? profile?.defaultAnimationProfileId ?? (canonicalDef?.skeleton === 'manny' ? 'GreystoneManny' : undefined),
    modelUrl,
    modularModelUrls,
    modularAttachments,
    modelScale: Number.isFinite(scale) && scale > 0 ? Math.min(100, scale) : (canonicalDef?.defaultScale ?? profile?.baseScale ?? 1),
    modelRotationY: model.modelRotationY ?? transform.rotationY,
    grounding: model.grounding ?? transform.grounding ?? transform.groundingOffsetY,
    cameraHeightOffset: Number.isFinite(camHeight) ? camHeight : undefined,
    character: model.character ?? data.character,
    assetDefinition,
    skeleton: model.skeleton ?? assetDefinition.skeleton,
    sockets: model.sockets ?? assetDefinition.attachments,
    animations: resolvedAnimations,
    rigAnalysis,
    categorizedAnimations,
    skeletonRequirements,
    materials,
  };
}
