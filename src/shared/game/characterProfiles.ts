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
  skeleton: 'manny' | 'creature_custom' | 'mixamo' | 'daz_g8f' | 'static';
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
  boy: {
    id: 'boy',
    name: 'Stylized Boy',
    category: 'character',
    skeleton: 'mixamo',
    modelUrl: '/game-assets/models/humanoids/boy/boy.glb',
    defaultAnimationProfileId: 'boy_native',
    compatibleWardrobePack: 'boy_default',
    modularParts: [],
  },
  girl: {
    id: 'girl',
    name: 'Stylized Adventurer Girl',
    category: 'character',
    skeleton: 'mixamo',
    modelUrl: '/game-assets/models/humanoids/girl/girl.glb',
    defaultAnimationProfileId: 'girl_native',
    compatibleWardrobePack: 'girl_default',
    modularParts: [],
  },
  asian_girl: {
    id: 'asian_girl',
    name: 'Asian Heroine (Modular)',
    category: 'character',
    skeleton: 'daz_g8f',
    modelUrl: '/game-assets/models/humanoids/asian_girl/asian_girl.glb',
    baseScale: 0.01,
    baseNakedMeshes: ['4_full_body001', '4_Legs', '4_Arms', '4_face001', '4_Eyes_01_0_0', '6_Hair2_01_0_0001'],
    defaultAnimationProfileId: 'GreystoneManny',
    compatibleWardrobePack: 'asian_girl_outfits',
    modularParts: [
      {
        id: 'ag_shirt',
        label: 'Uniform Blouse',
        category: 'shirt',
        meshName: '4_+Shirt1_01_0_0',
        defaultVisible: true,
        suppressesSubmeshes: ['4_-Top1_01_0_0'],
      },
      {
        id: 'ag_skirt',
        label: 'Pleated Skirt',
        category: 'pants',
        meshName: '4_+Skirt1_01_0_0',
        defaultVisible: true,
        suppressesSubmeshes: ['6_+Panty_01_0_0'],
      },
      {
        id: 'ag_shoes',
        label: 'Sneakers',
        category: 'shoes',
        meshName: '4_+Shoes_01_0_0002',
        defaultVisible: true,
      },
      {
        id: 'ag_scabbard',
        label: 'Hip Scabbard',
        category: 'accessory',
        meshName: '6_+HolsterScabbard_01_0_0001',
        defaultVisible: true,
      },
      {
        id: 'ag_katana_hand',
        label: 'Drawn Katana',
        category: 'weapon_main',
        meshName: '4_-Katana|Hand_01_0_0001',
        defaultVisible: false,
      },
      {
        id: 'ag_shuriken',
        label: 'Shuriken Pouch',
        category: 'weapon_off',
        meshName: '24_-shuriken|2_bladeoutfit_b2_03_0_0002',
        defaultVisible: false,
      },
      {
        id: 'ag_gloves',
        label: 'Leather Gloves',
        category: 'gloves',
        meshName: '4_+Gloves_01_0_0001',
        defaultVisible: false,
        suppressesSubmeshes: ['4_Arms'],
      },
      {
        id: 'ag_pants',
        label: 'Default Trousers',
        category: 'pants',
        meshName: '4_+Pants|Default_01_0_0007',
        defaultVisible: false,
      },
      {
        id: 'ag_skirt_alt',
        label: 'Layered Skirt',
        category: 'pants',
        meshName: '4_+Skirt2_01_0_0',
        defaultVisible: false,
      },
      {
        id: 'ag_holster',
        label: 'Katana Hip Holster',
        category: 'belt',
        meshName: '4_+Katana|Holster_01_0_0001',
        defaultVisible: false,
      },
      {
        id: 'ag_top_alt',
        label: 'Alternate Top',
        category: 'shirt',
        meshName: '4_+Shirt2_01_0_0',
        defaultVisible: false,
      },
      {
        id: 'ag_top_layer',
        label: 'Outer Shirt Layer',
        category: 'jacket',
        meshName: '4_+Shirt3_01_0_0',
        defaultVisible: false,
      },
      {
        id: 'ag_base_katana',
        label: 'Katana Scabbard Set',
        category: 'belt',
        meshName: '4_+Holster_01_0_0001',
        defaultVisible: false,
      },
    ],
  },
  citizens: {
    id: 'citizens',
    name: 'Town Citizen',
    category: 'character',
    skeleton: 'static',
    modelUrl: '/game-assets/models/humanoids/citizens/glb/man_1.glb',
    compatibleWardrobePack: 'citizens_pack',
    modularParts: [],
  },
};

/** Normalize string key to find matching profile. */
export function getCharacterModelProfile(modelIdOrUrl?: string | null): CharacterModelProfile | undefined {
  if (!modelIdOrUrl) return undefined;
  const raw = modelIdOrUrl.trim().toLowerCase();
  if (raw.includes('/citizens/glb/') || /^builtin-citizen-/.test(raw) || /^citizen-/.test(raw)) {
    return CHARACTER_MODEL_PROFILES.citizens;
  }
  const baseKey = raw.replace(/^.*[\\/]/, '').replace(/\.(glb|gltf|fbx|obj)$/i, '');

  if (CHARACTER_MODEL_PROFILES[baseKey]) {
    return CHARACTER_MODEL_PROFILES[baseKey];
  }
  if (baseKey.includes('brute')) {
    return CHARACTER_MODEL_PROFILES.brute;
  }
  if (baseKey.includes('boy')) {
    return CHARACTER_MODEL_PROFILES.boy;
  }
  if (baseKey.includes('girl') && !baseKey.includes('asian')) {
    return CHARACTER_MODEL_PROFILES.girl;
  }
  if (baseKey.includes('asian')) {
    return CHARACTER_MODEL_PROFILES.asian_girl;
  }
  if (baseKey.includes('leoverse')) return undefined;
  if (baseKey.includes('citizen') || baseKey.includes('people')) {
    return CHARACTER_MODEL_PROFILES.citizens;
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
