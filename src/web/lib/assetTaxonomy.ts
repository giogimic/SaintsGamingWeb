import { ModelDimensions } from '../components/the-lobby/editor/asset-studio/glbParser';
import { RigAnalysisResult } from '@/shared/game/modelRigTaxonomy';

export type DetectedAssetCategory =
  | 'complete_character'
  | 'modular_base'
  | 'modular_piece'
  | 'weapon'
  | 'prop'
  | 'creature_monster';

export interface AssetTaxonomyResult {
  category: DetectedAssetCategory;
  structure: 'Complete' | 'Modular' | 'ModularItem';
  label: string;
  suggestedRoles: string[];
  modularSlot?: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  scaleSuggestion: {
    recommendedScale: number;
    scaleType: 'UNREAL_CENTIMETERS' | 'STANDARD_METERS' | 'COMPACT_ITEM' | 'CUSTOM';
    explanation: string;
    detectedHeight: number;
    normalizedHeight: number;
  };
}

/**
 * Intelligently classifies an uploaded 3D model based on filename heuristics,
 * skeletal rig analysis, mesh counts, and bounding box dimensions.
 */
export function detectAssetTaxonomy(
  filename: string,
  dimensions?: ModelDimensions,
  rigAnalysis?: RigAnalysisResult,
  meshCount: number = 1,
  intentHint?: DetectedAssetCategory
): AssetTaxonomyResult {
  const lower = filename.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const height = dimensions?.height ?? 1.75;
  const isLargeCentimeters = height > 50;
  const effectiveHeight = isLargeCentimeters ? height * 0.01 : height;

  // Compute recommended scale
  let recommendedScale = 1.0;
  let scaleType: 'UNREAL_CENTIMETERS' | 'STANDARD_METERS' | 'COMPACT_ITEM' | 'CUSTOM' = 'STANDARD_METERS';
  let scaleExplanation = 'Standard 1:1 scale.';

  if (isLargeCentimeters) {
    recommendedScale = 0.01;
    scaleType = 'UNREAL_CENTIMETERS';
    scaleExplanation = `Model height is ${height.toFixed(1)}cm (likely Unreal Engine export). 0.01x scale converts to standard meters (${(height * 0.01).toFixed(2)}m).`;
  } else if (effectiveHeight >= 1.0 && effectiveHeight <= 3.5) {
    // Humanoid / creature range: offer direct 1.75m normalization
    recommendedScale = Number((1.75 / effectiveHeight).toFixed(3));
    scaleType = 'STANDARD_METERS';
    scaleExplanation = `Model height is ${effectiveHeight.toFixed(2)}m. Normalized scale ${recommendedScale}x targets 1.75m standard player height.`;
  } else if (effectiveHeight < 0.8) {
    recommendedScale = 1.0;
    scaleType = 'COMPACT_ITEM';
    scaleExplanation = `Compact model (${effectiveHeight.toFixed(2)}m). Kept at 1.0x native scale.`;
  }

  // If the user explicitly clicked an upload intent button, honor it directly
  if (intentHint === 'modular_base') {
    return {
      category: 'modular_base',
      structure: 'Modular',
      label: 'Modular Base Character',
      suggestedRoles: ['Character', 'Player', 'NPC'],
      confidence: 'high',
      reason: 'User selected Modular Base Body upload mode.',
      scaleSuggestion: { recommendedScale, scaleType, explanation: scaleExplanation, detectedHeight: height, normalizedHeight: 1.75 },
    };
  } else if (intentHint === 'modular_piece') {
    return {
      category: 'modular_piece',
      structure: 'ModularItem',
      label: 'Modular Equipment / Piece',
      suggestedRoles: ['Item', 'Equipment', 'Armor'],
      confidence: 'high',
      reason: 'User selected Modular Wardrobe & Armor upload mode.',
      scaleSuggestion: { recommendedScale: isLargeCentimeters ? 0.01 : 1.0, scaleType: isLargeCentimeters ? 'UNREAL_CENTIMETERS' : 'COMPACT_ITEM', explanation: 'Preserved native modular piece scale.', detectedHeight: height, normalizedHeight: height },
    };
  } else if (intentHint === 'weapon') {
    return {
      category: 'weapon',
      structure: 'Complete',
      label: 'Weapon / Tool Model',
      suggestedRoles: ['Weapon', 'Tool', 'Item'],
      confidence: 'high',
      reason: 'User selected Weapons & Equipment upload mode.',
      scaleSuggestion: { recommendedScale: isLargeCentimeters ? 0.01 : 1.0, scaleType: isLargeCentimeters ? 'UNREAL_CENTIMETERS' : 'COMPACT_ITEM', explanation: 'Preserved weapon scale.', detectedHeight: height, normalizedHeight: height },
    };
  } else if (intentHint === 'creature_monster') {
    return {
      category: 'creature_monster',
      structure: 'Complete',
      label: 'Creature / Monster Model',
      suggestedRoles: ['Creature', 'Enemy', 'NPC'],
      confidence: 'high',
      reason: 'User selected Creature & Mount upload mode.',
      scaleSuggestion: { recommendedScale, scaleType, explanation: scaleExplanation, detectedHeight: height, normalizedHeight: 1.75 },
    };
  } else if (intentHint === 'prop') {
    return {
      category: 'prop',
      structure: 'Complete',
      label: 'Environment Prop / Scenery',
      suggestedRoles: ['Prop'],
      confidence: 'high',
      reason: 'User selected Props & Scenery upload mode.',
      scaleSuggestion: { recommendedScale: isLargeCentimeters ? 0.01 : 1.0, scaleType: isLargeCentimeters ? 'UNREAL_CENTIMETERS' : 'STANDARD_METERS', explanation: 'Kept at native prop scale.', detectedHeight: height, normalizedHeight: height },
    };
  } else if (intentHint === 'complete_character') {
    return {
      category: 'complete_character',
      structure: 'Complete',
      label: 'Complete Humanoid Character',
      suggestedRoles: ['Character', 'NPC', 'Enemy'],
      confidence: 'high',
      reason: 'User selected Complete Character upload mode.',
      scaleSuggestion: { recommendedScale, scaleType, explanation: scaleExplanation, detectedHeight: height, normalizedHeight: 1.75 },
    };
  }

  // Check 1: Modular Base Character
  // e.g. Body_010.glb, Basemesh.fbx, Male_Base.fbx, Human_Base.glb
  const isBaseName =
    /(^|_)body(_|\b|\d)/i.test(lower) ||
    /basemesh/i.test(lower) ||
    /base_?body/i.test(lower) ||
    /character_?base/i.test(lower) ||
    /male_?base/i.test(lower) ||
    /female_?base/i.test(lower);

  if (isBaseName && !/(armor|knight|skeleton|costume|suit|dress)/i.test(lower)) {
    return {
      category: 'modular_base',
      structure: 'Modular',
      label: 'Modular Base Character',
      suggestedRoles: ['Character', 'Player', 'NPC'],
      confidence: 'high',
      reason: 'Name matches modular base body patterns (e.g. Body, BaseMesh).',
      scaleSuggestion: {
        recommendedScale,
        scaleType,
        explanation: scaleExplanation,
        detectedHeight: height,
        normalizedHeight: 1.75,
      },
    };
  }

  // Check 2: Standalone Weapon / Shield
  const isWeaponName = /(sword|axe|dagger|staff|mace|hammer|spear|bow|crossbow|wand|shield|gun|rifle|blade|halberd|scythe|weapon)/i.test(lower);
  if (isWeaponName && !/(knight|paladin|warrior|character|hero)/i.test(lower)) {
    const isShield = /shield/i.test(lower);
    return {
      category: 'weapon',
      structure: 'ModularItem',
      label: isShield ? 'Offhand / Shield' : 'Weapon (Main Hand)',
      suggestedRoles: ['Weapon', 'Equipment', 'Prop'],
      modularSlot: isShield ? 'weapon_off' : 'weapon_main',
      confidence: 'high',
      reason: 'Filename matches weapon / armament taxonomy.',
      scaleSuggestion: {
        recommendedScale: isLargeCentimeters ? 0.01 : 1.0,
        scaleType: isLargeCentimeters ? 'UNREAL_CENTIMETERS' : 'COMPACT_ITEM',
        explanation: isLargeCentimeters ? 'Scaled 0.01x from centimeters.' : 'Preserved native weapon scale.',
        detectedHeight: height,
        normalizedHeight: height,
      },
    };
  }

  // Check 3: Modular Pieces (Clothing, Hair, Hats, Pants, Boots, Accessories)
  let modularSlot: string | undefined = undefined;
  let pieceLabel = 'Modular Piece';

  // Specific facial accessories must precede generic face/head base meshes so face_glasses or face_mask do not map to face
  if (/(glasses|sunglasses|shades|goggles|spectacles|monocle|eyepatch|eyewear|headphone|headphones|face_?accessories|face_?accessory|visor|specs|cat_?ears|bunny_?ears|fox_?ears|wolf_?ears|animal_?ears)/i.test(lower)) {
    modularSlot = 'head_accessory';
    pieceLabel = 'Head Accessory / Glasses';
  } else if (/(earring|earrings|jewelry|jewellery|ring|necklace|amulet|pendant|badge)/i.test(lower)) {
    modularSlot = 'accessory';
    pieceLabel = 'Modular Accessory / Jewelry';
  } else if (/(mask|masks|bandana|respirator|veil|facemask|face_?cover|face_?mask|balaclava|mouth_?cover)/i.test(lower)) {
    modularSlot = 'mask';
    pieceLabel = 'Face Mask / Bandana';
  } else if (/(beard|mustache|moustache|goatee|whiskers|facial_?hair|stubble|sideburns)/i.test(lower)) {
    modularSlot = 'beard';
    pieceLabel = 'Modular Beard / Facial Hair';
  } else if (/(hair|wig|ponytail|braids|dreads|afro|fade|buzzcut|curls|bun|pigtails|bangs|topknot)/i.test(lower)) {
    modularSlot = 'hair';
    pieceLabel = 'Modular Hairstyle';
  } else if (/(hat|helmet|cap|hood|crown|horns|headband|tiara|beret|fedora|beanie|sombrero|turban|circlet)/i.test(lower)) {
    modularSlot = 'hat';
    pieceLabel = 'Modular Headwear / Helmet';
  } else if (/(face|head_base|eye_color|eyes|eyeball|mouth|teeth|tongue|lips|nose|head_skin|facial_features|(\b|_)ears(\b|_))/i.test(lower) && !/(earring|cat_?ears|bunny_?ears)/i.test(lower)) {
    modularSlot = 'face';
    pieceLabel = 'Modular Face / Head';
  } else if (/(jacket|coat|hoodie|vest|robe|blazer|cardigan|parka|cloak|overcoat|sweater|windbreaker|duster|trenchcoat)/i.test(lower)) {
    modularSlot = 'jacket';
    pieceLabel = 'Modular Jacket / Outerwear';
  } else if (/(t_?shirt|shirt|chest|torso|top_|tunic|undershirt|tank|corset|chestplate|breastplate|cuirass|hauberk|crop_?top|polo|jersey|blouse)/i.test(lower)) {
    modularSlot = 'shirt';
    pieceLabel = 'Modular Shirt / Torso';
  } else if (/(clothing|outfit|costume|suit|fullbody|overall|overalls|jumpsuit|armor_set)/i.test(lower)) {
    modularSlot = 'clothing';
    pieceLabel = 'Modular Outfit / Armor';
  } else if (/(pants|pant|trousers|shorts|skirt|jeans|legs|greaves|kilt|sweatpants|chaps|leggings)/i.test(lower)) {
    modularSlot = 'pants';
    pieceLabel = 'Modular Pants / Legs';
  } else if (/(boot|boots|shoe|shoes|sneaker|sneakers|foot|feet|slippers|sabaton|sabatons|sandals|loafers|heels)/i.test(lower)) {
    modularSlot = 'shoes';
    pieceLabel = 'Modular Boots / Shoes';
  } else if (/(glove|gloves|gauntlet|gauntlets|wrist|bracelet|hands|bracer|bracers|mittens|hand_armor)/i.test(lower)) {
    modularSlot = 'gloves';
    pieceLabel = 'Modular Gloves / Hands';
  } else if (/(cape|cloak|backpack|wings|quiver|back_?item|back|scabbard)/i.test(lower)) {
    modularSlot = 'back';
    pieceLabel = 'Modular Cape / Back Item';
  } else if (/(belt|waist|sash|buckle|girdle)/i.test(lower)) {
    modularSlot = 'belt';
    pieceLabel = 'Modular Belt / Waist';
  } else if (/(ring|necklace|amulet|pendant|earring|earrings|jewelry|jewellery|accessory|accessories|badge|bracelet)/i.test(lower)) {
    modularSlot = 'accessory';
    pieceLabel = 'Modular Accessory / Jewelry';
  }

  if (modularSlot) {
    return {
      category: 'modular_piece',
      structure: 'ModularItem',
      label: pieceLabel,
      suggestedRoles: ['Equipment', 'Prop'],
      modularSlot,
      confidence: 'high',
      reason: `Matches modular component naming convention for [${modularSlot}].`,
      scaleSuggestion: {
        recommendedScale: isLargeCentimeters ? 0.01 : 1.0,
        scaleType: isLargeCentimeters ? 'UNREAL_CENTIMETERS' : 'COMPACT_ITEM',
        explanation: isLargeCentimeters ? 'Scaled 0.01x from centimeters.' : 'Preserved native modular piece scale.',
        detectedHeight: height,
        normalizedHeight: height,
      },
    };
  }

  // Check 4: Creature / Monster / Animal
  const isCreatureName = /(creature|monster|dragon|beast|bat|wolf|spider|spider_model|animal|dog|cat|horse|bird|fish|golem|demon|fiend|bear|tiger|deer|chicken|kitty|pinguin|penguin|lion)/i.test(lower);
  const isCreatureRig = rigAnalysis?.isQuadruped || rigAnalysis?.isFlyer || rigAnalysis?.family === 'QUADRUPED_BEAST' || rigAnalysis?.family === 'WINGED_FLYER';

  if (isCreatureName || isCreatureRig) {
    return {
      category: 'creature_monster',
      structure: 'Complete',
      label: 'Creature / Monster Model',
      suggestedRoles: ['Creature', 'Enemy', 'NPC'],
      confidence: isCreatureRig ? 'high' : 'medium',
      reason: isCreatureRig ? `Rig matches ${rigAnalysis?.family} creature taxonomy.` : 'Matches creature naming pattern.',
      scaleSuggestion: {
        recommendedScale,
        scaleType,
        explanation: scaleExplanation,
        detectedHeight: height,
        normalizedHeight: 1.75,
      },
    };
  }

  // Check 5: Environment Prop / Scenery
  const isPropName = /(chest|chair|table|barrel|crate|tree|rock|building|lamp|door|cart|fence|pillar|bench|wagon|sign|fountain|altar|book|bookcase|bed|couch|pot|shelf|carpet|clock|mirror|fireplace|radio|telescope|scroll|woodlog|bath|toilet|kitchen|fridge|closet|plate|jug|log|cloud|clouds|mushroom)/i.test(lower);
  if (isPropName) {
    return {
      category: 'prop',
      structure: 'Complete',
      label: 'Environment Prop / Object',
      suggestedRoles: ['Prop'],
      confidence: 'high',
      reason: 'Matches environment / prop naming patterns.',
      scaleSuggestion: {
        recommendedScale: isLargeCentimeters ? 0.01 : 1.0,
        scaleType: isLargeCentimeters ? 'UNREAL_CENTIMETERS' : 'STANDARD_METERS',
        explanation: isLargeCentimeters ? 'Scaled 0.01x from centimeters.' : 'Kept at native scale.',
        detectedHeight: height,
        normalizedHeight: height,
      },
    };
  }

  // Check 6: Complete Character (Default for skinned humanoids or character names)
  // e.g. SKM_DKM_Armor.obj, skeleton_model_110.fbx, CHARACTER.glb
  const isCharacterName = /(character|knight|paladin|mage|warrior|rogue|ranger|hero|villain|npc|soldier|guard|skeleton|zombie|orc|goblin|boss|assassin|priest)/i.test(lower);
  const isHumanoidRig = rigAnalysis?.isHumanoid || rigAnalysis?.family === 'HUMANOID_BIPED';

  return {
    category: 'complete_character',
    structure: 'Complete',
    label: isHumanoidRig ? 'Complete Humanoid Character' : 'Complete 3D Model',
    suggestedRoles: ['Character', 'NPC', 'Enemy'],
    confidence: isCharacterName || isHumanoidRig ? 'high' : 'medium',
    reason: isHumanoidRig
      ? 'Detected standard humanoid skeletal rig.'
      : isCharacterName
      ? 'Filename matches character / actor naming taxonomy.'
      : 'Defaulted to standalone complete model.',
    scaleSuggestion: {
      recommendedScale,
      scaleType,
      explanation: scaleExplanation,
      detectedHeight: height,
      normalizedHeight: 1.75,
    },
  };
}
