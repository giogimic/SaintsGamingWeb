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

  if (/(hair|beard|moustache|eyebrow)/i.test(lower)) {
    modularSlot = 'hair';
    pieceLabel = 'Modular Hair / Facial Hair';
  } else if (/(hat|helmet|cap|hood|crown|horns|headband)/i.test(lower)) {
    modularSlot = 'head';
    pieceLabel = 'Modular Headwear / Helmet';
  } else if (/(glasses|goggles|mask|headphone|earring)/i.test(lower)) {
    modularSlot = 'head_accessory';
    pieceLabel = 'Head Accessory / Glasses';
  } else if (/(t_?shirt|shirt|jacket|hoodie|coat|vest|chest|torso|top_)/i.test(lower)) {
    modularSlot = 'chest';
    pieceLabel = 'Modular Shirt / Torso';
  } else if (/(pants|pant|trousers|shorts|skirt|jeans|legs)/i.test(lower)) {
    modularSlot = 'legs';
    pieceLabel = 'Modular Pants / Legs';
  } else if (/(boot|boots|shoe|shoes|sneaker|sneakers|foot|feet|slippers)/i.test(lower)) {
    modularSlot = 'feet';
    pieceLabel = 'Modular Boots / Shoes';
  } else if (/(glove|gloves|gauntlet|gauntlets|wrist|bracelet|hands)/i.test(lower)) {
    modularSlot = 'hands';
    pieceLabel = 'Modular Gloves / Hands';
  } else if (/(cape|cloak|backpack|wings|quiver|back)/i.test(lower)) {
    modularSlot = 'back';
    pieceLabel = 'Modular Cape / Back Item';
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
  const isCreatureName = /(creature|monster|dragon|beast|bat|wolf|spider|spider_model|animal|dog|cat|horse|bird|fish|golem|demon|fiend)/i.test(lower);
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
  const isPropName = /(chest|chair|table|barrel|crate|tree|rock|building|lamp|door|cart|fence|pillar|bench|wagon|sign|fountain|altar)/i.test(lower);
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
