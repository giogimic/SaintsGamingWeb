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
}

export interface CharacterModelProfile {
  id: string;
  name: string;
  category: 'character' | 'creature' | 'monster';
  skeleton: 'manny' | 'creature_custom' | 'mixamo';
  modelUrl: string;
  baseNakedMeshes?: string[];
  defaultFaceId?: string;
  facePartIds?: string[];
  defaultAnimationProfileId?: string;
  embeddedAnimations?: string[];
  animationActionMap?: Record<string, string>;
  compatibleWardrobePack: string;
  modularParts: ProfileModularPartDef[];
}

export const CHARACTER_MODEL_PROFILES: Record<string, CharacterModelProfile> = {
  brute: {
    id: 'brute',
    name: 'Brute',
    category: 'character',
    skeleton: 'manny',
    modelUrl: '/game-assets/models/humanoids/brute/brute.glb',
    baseNakedMeshes: [
      'Torso1',
      'Pants1',
      'Boots1',
      'Head1',
      'Head1_Eyes',
      'Head1_teeth',
    ],
    defaultFaceId: 'brute_head',
    facePartIds: ['brute_head'],
    defaultAnimationProfileId: 'GreystoneManny',
    compatibleWardrobePack: 'brute-armor',
    modularParts: [
      { id: 'brute_head', label: 'Beast Head', category: 'face', meshName: 'Head1', defaultVisible: true, isFaceVariant: true },
      { id: 'brute_helmet', label: 'War Helm', category: 'hat', meshName: 'Helmet1', defaultVisible: false },
      { id: 'brute_torso', label: 'Heavy Torso', category: 'shirt', meshName: 'Torso1', defaultVisible: true },
      { id: 'brute_pants', label: 'Armor Greaves', category: 'pants', meshName: 'Pants1', defaultVisible: true },
      { id: 'brute_boots', label: 'War Boots', category: 'shoes', meshName: 'Boots1', defaultVisible: true },
      { id: 'brute_harness', label: 'Leather Shoulder Harness', category: 'accessory', meshName: 'Shoulder_Belt1', defaultVisible: false },
      { id: 'brute_shoulder', label: 'Spiked Pauldron', category: 'accessory', meshName: 'ShoulderPad1', defaultVisible: false },
      { id: 'brute_cape', label: 'Tattered Cape', category: 'back', meshName: 'Cape1', defaultVisible: false },
      { id: 'brute_belt', label: 'Chain Warbelt', category: 'belt', meshName: 'BeltChains1', defaultVisible: false },
    ],
  },
};

/** Normalize string key to find matching profile. */
export function getCharacterModelProfile(modelIdOrUrl?: string | null): CharacterModelProfile | undefined {
  if (!modelIdOrUrl) return undefined;
  const raw = modelIdOrUrl.trim().toLowerCase();
  const baseKey = raw.replace(/^.*[\\/]/, '').replace(/\.(glb|gltf|fbx|obj)$/i, '');

  if (CHARACTER_MODEL_PROFILES[baseKey]) {
    return CHARACTER_MODEL_PROFILES[baseKey];
  }
  if (baseKey.includes('brute')) {
    return CHARACTER_MODEL_PROFILES.brute;
  }
  return undefined;
}

/** Check strict compatibility between a model profile and a wardrobe item/pack. */
export function isWardrobeItemCompatibleWithProfile(
  profileOrId: CharacterModelProfile | string | null | undefined,
  item: { pack?: string; modularSetName?: string; skeleton?: string; tags?: string[] },
): boolean {
  if (!profileOrId) return false;
  const profile = typeof profileOrId === 'string' ? getCharacterModelProfile(profileOrId) : profileOrId;
  if (!profile) return false;

  // Skeletons must match if specified
  if (item.skeleton && item.skeleton !== profile.skeleton) {
    return false;
  }

  // Pack must match
  if (item.pack && item.pack === profile.compatibleWardrobePack) {
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
