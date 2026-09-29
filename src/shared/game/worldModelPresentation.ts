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

export const CANONICAL_BUILTIN_MODELS: Record<string, CanonicalModelDef> = {
  brute: {
    id: 'brute',
    name: 'Brute',
    modelUrl: '/game-assets/models/brute.glb',
    category: 'character',
    skeleton: 'manny',
    defaultAnimationProfileId: 'GreystoneManny',
    modularParts: [
      { id: 'brute_helmet', label: 'Brute Helm', category: 'hat', meshName: 'Helmet1', defaultVisible: true },
      { id: 'brute_head', label: 'Brute Head', category: 'face', meshName: 'Head1', defaultVisible: true },
      { id: 'brute_torso', label: 'Brute Torso', category: 'shirt', meshName: 'Torso1', defaultVisible: true },
      { id: 'brute_pants', label: 'Brute Pants', category: 'pants', meshName: 'Pants1', defaultVisible: true },
      { id: 'brute_boots', label: 'Brute Boots', category: 'shoes', meshName: 'Boots1', defaultVisible: true },
      { id: 'brute_shoulder', label: 'Brute Pauldron', category: 'jacket', meshName: 'ShoulderPad1', defaultVisible: true },
      { id: 'brute_cape', label: 'Brute Cape', category: 'back', meshName: 'Cape1', defaultVisible: true },
      { id: 'brute_belt', label: 'Brute Belt', category: 'belt', meshName: 'BeltChains1', defaultVisible: true },
    ],
  },
  adventurer: {
    id: 'adventurer',
    name: 'Adventurer',
    modelUrl: '/game-assets/models/adventurer.glb',
    category: 'character',
    skeleton: 'manny',
    defaultAnimationProfileId: 'GreystoneManny',
    modularParts: [
      { id: 'adventurer_head', label: 'Adventurer Head', category: 'face', meshName: 'Man_Head_Mesh', defaultVisible: true },
      { id: 'adventurer_pullover', label: 'Adventurer Top', category: 'shirt', meshName: 'Man_Pullover_Mesh', defaultVisible: true },
      { id: 'adventurer_pants', label: 'Adventurer Pants', category: 'pants', meshName: 'Man_Pants_Mesh', defaultVisible: true },
      { id: 'adventurer_shoes', label: 'Adventurer Shoes', category: 'shoes', meshName: 'Man_Shoes_Mesh', defaultVisible: true },
      { id: 'adventurer_bag', label: 'Adventurer Pack', category: 'back', meshName: 'Man_Bag_Mesh', defaultVisible: true },
      { id: 'adventurer_arms', label: 'Adventurer Arms', category: 'gloves', meshName: 'Man_Arms_Mesh', defaultVisible: true },
    ],
  },
  citizen: {
    id: 'citizen',
    name: 'Citizen',
    modelUrl: '/game-assets/models/citizen.glb',
    category: 'character',
    skeleton: 'mixamo',
    defaultAnimationProfileId: 'MocapMobility',
    modularParts: [
      { id: 'citizen_body', label: 'Citizen Body', category: 'clothing', meshName: 'Body_010', defaultVisible: true },
      { id: 'citizen_face', label: 'Citizen Face', category: 'face', meshName: 'Male_emotion_usual_001', defaultVisible: true },
      { id: 'citizen_hair', label: 'Citizen Hair', category: 'hair', meshName: 'Hairstyle_male_010', defaultVisible: true },
      { id: 'citizen_shirt', label: 'Citizen T-Shirt', category: 'shirt', meshName: 'T-Shirt_009', defaultVisible: true },
      { id: 'citizen_pants', label: 'Citizen Pants', category: 'pants', meshName: 'Pants_010', defaultVisible: true },
      { id: 'citizen_shoes', label: 'Citizen Sneakers', category: 'shoes', meshName: 'Shoe_Sneakers_009', defaultVisible: true },
      { id: 'citizen_hair_alt', label: 'Short Hair', category: 'hair', meshName: 'Hairstyle_male_012', defaultVisible: false },
      { id: 'citizen_face_happy', label: 'Happy Face', category: 'face', meshName: 'Male_emotion_happy_002', defaultVisible: false },
      { id: 'citizen_face_angry', label: 'Angry Face', category: 'face', meshName: 'Male_emotion_angry_003', defaultVisible: false },
      { id: 'citizen_hat_cap', label: 'Baseball Cap', category: 'hat', meshName: 'Hat_010', defaultVisible: false },
      { id: 'citizen_hat_beanie', label: 'Beanie', category: 'hat', meshName: 'Hat_049', defaultVisible: false },
      { id: 'citizen_hat_fedora', label: 'Fedora', category: 'hat', meshName: 'Hat_057', defaultVisible: false },
      { id: 'citizen_outerwear_jacket', label: 'Casual Jacket', category: 'jacket', meshName: 'Outwear_029', defaultVisible: false },
      { id: 'citizen_outerwear_coat', label: 'Warm Coat', category: 'jacket', meshName: 'Outwear_036', defaultVisible: false },
      { id: 'citizen_costume_6', label: 'Worker Costume', category: 'clothing', meshName: 'Costume_6_001', defaultVisible: false },
      { id: 'citizen_costume_10', label: 'Specialist Costume', category: 'clothing', meshName: 'Costume_10_001', defaultVisible: false },
      { id: 'citizen_pants_alt', label: 'Slacks', category: 'pants', meshName: 'Pants_014', defaultVisible: false },
      { id: 'citizen_shorts', label: 'Shorts', category: 'pants', meshName: 'Shorts_003', defaultVisible: false },
      { id: 'citizen_socks', label: 'Socks', category: 'shoes', meshName: 'Socks_008', defaultVisible: false },
      { id: 'citizen_slippers_1', label: 'Cozy Slippers', category: 'shoes', meshName: 'Shoe_Slippers_002', defaultVisible: false },
      { id: 'citizen_slippers_2', label: 'House Slippers', category: 'shoes', meshName: 'Shoe_Slippers_005', defaultVisible: false },
      { id: 'citizen_glasses_shades', label: 'Dark Sunglasses', category: 'head_accessory', meshName: 'Glasses_006', defaultVisible: false },
      { id: 'citizen_glasses_round', label: 'Reading Glasses', category: 'head_accessory', meshName: 'Glasses_004', defaultVisible: false },
      { id: 'citizen_headphones', label: 'Studio Headphones', category: 'head_accessory', meshName: 'Headphones_002', defaultVisible: false },
      { id: 'citizen_pacifier', label: 'Pacifier', category: 'accessory', meshName: 'Pacifier_001', defaultVisible: false },
      { id: 'citizen_clown_nose', label: 'Red Clown Nose', category: 'accessory', meshName: 'Clown_nose_001', defaultVisible: false },
      { id: 'citizen_mustache_1', label: 'Gentleman Mustache', category: 'beard', meshName: 'Moustache_001', defaultVisible: false },
      { id: 'citizen_mustache_2', label: 'Handlebar Mustache', category: 'beard', meshName: 'Moustache_002', defaultVisible: false },
      { id: 'citizen_gloves_1', label: 'Winter Gloves', category: 'gloves', meshName: 'Gloves_006', defaultVisible: false },
      { id: 'citizen_gloves_2', label: 'Work Gloves', category: 'gloves', meshName: 'Gloves_014', defaultVisible: false },
    ],
  },
  golem: {
    id: 'golem',
    name: 'Golem',
    modelUrl: '/game-assets/models/golem.glb',
    category: 'monster',
    skeleton: 'creature_custom',
    embeddedAnimations: [
      'Golem|LeftAttack',
      'Golem|RightHandAttack',
      'Golem|SmashAttack',
      'Golem|StompAttack',
    ],
  },
  stone_golem: {
    id: 'stone_golem',
    name: 'Stone Golem',
    modelUrl: '/game-assets/models/golem.glb',
    category: 'monster',
    skeleton: 'creature_custom',
    embeddedAnimations: [
      'Golem|LeftAttack',
      'Golem|RightHandAttack',
      'Golem|SmashAttack',
      'Golem|StompAttack',
    ],
  },
};

export function getCanonicalModelDef(modelIdOrUrl?: string | null): CanonicalModelDef | undefined {
  if (!modelIdOrUrl) return undefined;
  const key = modelIdOrUrl.trim().toLowerCase().replace(/^.*[\\/]/, '').replace(/\.(glb|gltf|fbx|obj)$/i, '');
  return CANONICAL_BUILTIN_MODELS[key];
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

  // Canonical built-in model aliases
  const canonical = CANONICAL_BUILTIN_MODELS[trimmed.toLowerCase()];
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
    try {
      data = JSON.parse(value);
    } catch {
      return undefined;
    }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return undefined;

  const model = data.worldModel || data;
  const modelType = model.type || model.assetProfileId;
  const candidateBaseUrl = model.modelUrl || model.source || (typeof model === 'object' && model?.url);
  const rawId = model.assetId || candidateBaseUrl;
  if (!rawId || (modelType !== '3D Model' && modelType !== 'MODEL')) return undefined;

  const modelUrl = candidateBaseUrl || resolveModelAssetUrl(model.assetId) || resolveEntitySpriteUrl(model.assetId);
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

  const canonicalDef = (rawId && CANONICAL_BUILTIN_MODELS[String(rawId).toLowerCase()])
    || (model.assetId && CANONICAL_BUILTIN_MODELS[String(model.assetId).toLowerCase()])
    || Object.values(CANONICAL_BUILTIN_MODELS).find(c => c.modelUrl === modelUrl);

  return {
    mode: '3D',
    assetId: model.assetId,
    animationProfileId: model.animationProfileId ?? data.animationProfileId ?? data.assetDefinition?.animationProfileId ?? canonicalDef?.defaultAnimationProfileId,
    modelUrl,
    modularModelUrls,
    modularAttachments,
    modelScale: Number.isFinite(scale) && scale > 0 ? Math.min(100, scale) : undefined,
    cameraHeightOffset: Number.isFinite(camHeight) && camHeight > 0 ? camHeight : undefined,
    animations,
    rigAnalysis,
    categorizedAnimations,
    skeletonRequirements,
    materials,
  };
}
