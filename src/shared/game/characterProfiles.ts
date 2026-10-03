/**
 * Saints Gaming — Character & Model Profiles
 *
 * Provides authoritative profiles for 3D character, monster, and creature models.
 * A CharacterModelProfile bundles:
 * 1. Base Model (naked body mesh / rig)
 * 2. Default & alternate switchable face parts
 * 3. Compatible modular items (clothing, armor, hair, accessories)
 * 4. Animations (embedded tracks, action mappings, or retargeted animation profiles)
 * 5. Strict compatibility boundaries (items from Profile X never attach to Model Y)
 */

import type { CharacterComponentCategory } from './assetImportProfiles';

export interface ProfileModularPartDef {
  id: string;
  label: string;
  category: CharacterComponentCategory;
  meshName: string;
  defaultVisible: boolean;
  isFaceVariant?: boolean;
  suppressesSubmeshes?: string[];
  replacesSubmesh?: string;
}

export interface CharacterModelProfile {
  id: string;
  name: string;
  category: 'character' | 'creature' | 'monster';
  skeleton: string;
  bodyType?: 'male' | 'female' | 'unspecified';
  modelUrl: string;
  baseNakedMeshes?: string[];
  defaultFaceId?: string;
  facePartIds?: string[];
  defaultAnimationProfileId?: string;
  baseScale?: number;
  embeddedAnimations?: string[];
  animationActionMap?: Record<string, string>;
  compatibleWardrobePack: string;
  modularParts: ProfileModularPartDef[];
}

export const CHARACTER_MODEL_PROFILES: Record<string, CharacterModelProfile> = {
  quaternius_base_male: {
    id: 'quaternius_base_male',
    name: 'Quaternius Base Male',
    category: 'character',
    skeleton: 'quaternius_universal',
    bodyType: 'male',
    modelUrl: '/models/quaternius/quaternius_base_male.glb',
    defaultAnimationProfileId: 'quaternius_native',
    compatibleWardrobePack: 'quaternius',
    modularParts: [],
  },
  quaternius_base_female: {
    id: 'quaternius_base_female',
    name: 'Quaternius Base Female',
    category: 'character',
    skeleton: 'quaternius_universal',
    bodyType: 'female',
    modelUrl: '/models/quaternius/quaternius_base_female.glb',
    defaultAnimationProfileId: 'quaternius_native',
    compatibleWardrobePack: 'quaternius',
    modularParts: [],
  },
  superhero_male_fullbody: {
    id: 'superhero_male_fullbody',
    name: 'Quaternius Base Male',
    category: 'character',
    skeleton: 'quaternius_universal',
    bodyType: 'male',
    modelUrl: '/models/quaternius/quaternius_base_male.glb',
    defaultAnimationProfileId: 'quaternius_native',
    compatibleWardrobePack: 'quaternius',
    modularParts: [],
  },
  superhero_female_fullbody: {
    id: 'superhero_female_fullbody',
    name: 'Quaternius Base Female',
    category: 'character',
    skeleton: 'quaternius_universal',
    bodyType: 'female',
    modelUrl: '/models/quaternius/quaternius_base_female.glb',
    defaultAnimationProfileId: 'quaternius_native',
    compatibleWardrobePack: 'quaternius',
    modularParts: [],
  },
};

/** Normalize string key to find matching profile. */
export function getCharacterModelProfile(modelIdOrUrl?: string | null): CharacterModelProfile | undefined {
  if (!modelIdOrUrl) return undefined;
  const raw = modelIdOrUrl.trim().toLowerCase();
  
  const baseKey = raw.replace(/^.*[\\/]/, '').replace(/\.(glb|gltf|fbx|obj)$/i, '');

  const profileKey = baseKey.startsWith('quat-') ? baseKey.slice('quat-'.length) : baseKey;
  return CHARACTER_MODEL_PROFILES[profileKey];
}

/** Check strict compatibility between a model profile and a wardrobe item/pack. */
export function isWardrobeItemCompatibleWithProfile(
  profileOrId: CharacterModelProfile | string | null | undefined,
  item: { pack?: string; modularSetName?: string; skeleton?: string; baseBodyType?: string; tags?: string[] },
): boolean {
  if (!profileOrId) return false;
  const profile = typeof profileOrId === 'string' ? getCharacterModelProfile(profileOrId) : profileOrId;
  if (!profile) return false;

  const itemBodyType = item.baseBodyType?.trim().toLowerCase();
  if (itemBodyType && itemBodyType !== 'unspecified' && profile.bodyType && itemBodyType !== profile.bodyType) {
    return false;
  }

  // Skeletons must match if specified
  if (item.skeleton && item.skeleton !== profile.skeleton) {
    return false;
  }

  // Pack must match
  if (item.pack && item.pack.toLowerCase() === profile.compatibleWardrobePack.toLowerCase()) {
    return true;
  }
  if (item.modularSetName && item.modularSetName.toLowerCase() === profile.id.toLowerCase()) {
    return true;
  }

  // Tags must contain the profile ID
  if (Array.isArray(item.tags)) {
    const hasProfileTag = item.tags.some(
      (t) => t.toLowerCase() === profile.id.toLowerCase() || t.toLowerCase() === profile.compatibleWardrobePack.toLowerCase()
    );
    if (hasProfileTag) return true;
  }

  return false;
}
