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
  adventurer: {
    id: 'adventurer',
    name: 'Adventurer',
    category: 'character',
    skeleton: 'manny',
    modelUrl: '/game-assets/models/humanoids/adventurer/adventurer.glb',
    baseNakedMeshes: [
      'Man_Head_Mesh',
      'Man_Eyes_Mesh',
      'Man_Arms_Mesh',
    ],
    defaultFaceId: 'adventurer_head',
    facePartIds: ['adventurer_head'],
    defaultAnimationProfileId: 'GreystoneManny',
    compatibleWardrobePack: 'adventurer-gear',
    modularParts: [
      { id: 'adventurer_head', label: 'Adventurer Head', category: 'face', meshName: 'Man_Head_Mesh', defaultVisible: true, isFaceVariant: true },
      { id: 'adventurer_pullover', label: 'Pullover Shirt', category: 'shirt', meshName: 'Man_Pullover_Mesh', defaultVisible: true },
      { id: 'adventurer_pants', label: 'Cargo Pants', category: 'pants', meshName: 'Man_Pants_Mesh', defaultVisible: true },
      { id: 'adventurer_shoes', label: 'Combat Boots', category: 'shoes', meshName: 'Man_Shoes_Mesh', defaultVisible: true },
      { id: 'adventurer_bag', label: 'Expedition Pack', category: 'back', meshName: 'Man_Bag_Mesh', defaultVisible: false },
    ],
  },

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

  citizen: {
    id: 'citizen',
    name: 'Citizen',
    category: 'character',
    skeleton: 'mixamo',
    modelUrl: '/game-assets/models/citizen.glb',
    baseNakedMeshes: ['Body_010'],
    defaultFaceId: 'citizen_face',
    facePartIds: ['citizen_face', 'citizen_face_happy', 'citizen_face_angry'],
    defaultAnimationProfileId: 'MocapMobility',
    compatibleWardrobePack: 'citizen-wardrobe',
    modularParts: [
      { id: 'citizen_body', label: 'Citizen Body', category: 'clothing', meshName: 'Body_010', defaultVisible: true },
      { id: 'citizen_face', label: 'Neutral Face', category: 'face', meshName: 'Male_emotion_usual_001', defaultVisible: true, isFaceVariant: true },
      { id: 'citizen_face_happy', label: 'Happy Face', category: 'face', meshName: 'Male_emotion_happy_002', defaultVisible: false, isFaceVariant: true },
      { id: 'citizen_face_angry', label: 'Angry Face', category: 'face', meshName: 'Male_emotion_angry_003', defaultVisible: false, isFaceVariant: true },
      { id: 'citizen_hair', label: 'Casual Hair', category: 'hair', meshName: 'Hairstyle_male_010', defaultVisible: true },
      { id: 'citizen_hair_alt', label: 'Short Hair', category: 'hair', meshName: 'Hairstyle_male_012', defaultVisible: false },
      { id: 'citizen_shirt', label: 'Citizen T-Shirt', category: 'shirt', meshName: 'T-Shirt_009', defaultVisible: false },
      { id: 'citizen_pants', label: 'Citizen Pants', category: 'pants', meshName: 'Pants_010', defaultVisible: false },
      { id: 'citizen_shoes', label: 'Citizen Sneakers', category: 'shoes', meshName: 'Shoe_Sneakers_009', defaultVisible: false },
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

  shadow_golem: {
    id: 'shadow_golem',
    name: 'Shadow Golem',
    category: 'monster',
    skeleton: 'creature_custom',
    modelUrl: '/game-assets/models/creatures/golems/shadow_golem_attacks.glb',
    baseNakedMeshes: ['LOW_POLY1', 'Golem_Mesh'],
    compatibleWardrobePack: 'shadow-golem-set',
    modularParts: [],
    embeddedAnimations: [
      'Golem|LeftAttack',
      'Golem|RightHandAttack',
      'Golem|SmashAttack',
      'Golem|StompAttack',
    ],
    animationActionMap: {
      attack_light: 'Golem|LeftAttack',
      attack_heavy: 'Golem|RightHandAttack',
      attack_smash: 'Golem|SmashAttack',
      attack_stomp: 'Golem|StompAttack',
      idle: 'Golem|SmashAttack',
      walk: 'Golem|StompAttack',
    },
  },

  golem: {
    id: 'golem',
    name: 'Golem',
    category: 'monster',
    skeleton: 'creature_custom',
    modelUrl: '/game-assets/models/creatures/golems/golem_base.glb',
    baseNakedMeshes: ['Golem_Mesh'],
    compatibleWardrobePack: 'golem-set',
    modularParts: [],
    embeddedAnimations: [
      'Golem|LeftAttack',
      'Golem|RightHandAttack',
      'Golem|SmashAttack',
      'Golem|StompAttack',
    ],
    animationActionMap: {
      attack_light: 'Golem|LeftAttack',
      attack_heavy: 'Golem|RightHandAttack',
      attack_smash: 'Golem|SmashAttack',
      attack_stomp: 'Golem|StompAttack',
      idle: 'Golem|SmashAttack',
      walk: 'Golem|StompAttack',
    },
  },

  stone_golem: {
    id: 'stone_golem',
    name: 'Stone Golem',
    category: 'monster',
    skeleton: 'creature_custom',
    modelUrl: '/game-assets/models/creatures/golems/golem_base.glb',
    baseNakedMeshes: ['Golem_Mesh'],
    compatibleWardrobePack: 'golem-set',
    modularParts: [],
    embeddedAnimations: [
      'Golem|LeftAttack',
      'Golem|RightHandAttack',
      'Golem|SmashAttack',
      'Golem|StompAttack',
    ],
    animationActionMap: {
      attack_light: 'Golem|LeftAttack',
      attack_heavy: 'Golem|RightHandAttack',
      attack_smash: 'Golem|SmashAttack',
      attack_stomp: 'Golem|StompAttack',
      idle: 'Golem|SmashAttack',
      walk: 'Golem|StompAttack',
    },
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
  if (baseKey === 'golem_base' || baseKey === 'test_golem_textured') {
    return CHARACTER_MODEL_PROFILES.golem;
  }
  if (baseKey === 'shadow_golem_attacks' || baseKey === 'golem_attacks_textured') {
    return CHARACTER_MODEL_PROFILES.shadow_golem;
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
