import {
  CHARACTER_COMPONENT_CATEGORIES,
  isCharacterComponentCategory,
  type CharacterComponentCategory,
} from './assetImportProfiles';

export interface ModelWardrobeItem {
  type?: '3D Model' | '3D Sprite' | '2D Sprite' | '2D Box Sprite' | 'Other';
  assetId: string;
  modelUrl?: string | null;
  source?: string | null;
  label?: string;
  category?: string;
  slot?: string;
  isModular?: boolean;
  attachmentMode?: 'RIGID_SOCKET' | 'SKINNED';
  socket?: string;
  defaultVisible?: boolean;
  availableInCharacterCreation?: boolean;
  hidesComponents?: string[];
  [key: string]: unknown;
}

const CATEGORY_ALIASES: Record<string, CharacterComponentCategory> = {
  glasses: 'head_accessory',
  eyewear: 'head_accessory',
  goggles: 'head_accessory',
  spectacles: 'head_accessory',
  monocle: 'head_accessory',
  eyepatch: 'head_accessory',
  head_accessories: 'head_accessory',
  face_accessory: 'head_accessory',
  face_accessories: 'head_accessory',
  mask: 'mask',
  facemask: 'mask',
  bandana: 'mask',
  respirator: 'mask',
  veil: 'mask',
  face_cover: 'mask',
  beard: 'beard',
  mustache: 'beard',
  moustache: 'beard',
  goatee: 'beard',
  facial_hair: 'beard',
  stubble: 'beard',
  whiskers: 'beard',
  face: 'face',
  head_base: 'face',
  skin: 'face',
  helmet: 'hat',
  cap: 'hat',
  head: 'hat',
  headwear: 'hat',
  headgear: 'hat',
  crown: 'hat',
  horns: 'hat',
  headband: 'hat',
  tiara: 'hat',
  hood: 'hat',
  wig: 'hair',
  hair: 'hair',
  hairstyle: 'hair',
  top: 'shirt',
  tops: 'shirt',
  upper_body: 'shirt',
  upperbody: 'shirt',
  torso: 'shirt',
  chest: 'shirt',
  chestplate: 'shirt',
  breastplate: 'shirt',
  cuirass: 'shirt',
  hauberk: 'shirt',
  tunic: 'shirt',
  undershirt: 'shirt',
  jacket: 'jacket',
  coat: 'jacket',
  outerwear: 'jacket',
  cloak: 'jacket',
  robe: 'jacket',
  vest: 'jacket',
  hoodie: 'jacket',
  armor: 'clothing',
  armour: 'clothing',
  clothing: 'clothing',
  outfit: 'clothing',
  pants: 'pants',
  pant: 'pants',
  trousers: 'pants',
  legs: 'pants',
  bottoms: 'pants',
  jeans: 'pants',
  shorts: 'pants',
  skirt: 'pants',
  greaves: 'pants',
  boots: 'shoes',
  boot: 'shoes',
  shoes: 'shoes',
  shoe: 'shoes',
  footwear: 'shoes',
  feet: 'shoes',
  sneakers: 'shoes',
  sandals: 'shoes',
  sabatons: 'shoes',
  gloves: 'gloves',
  glove: 'gloves',
  gauntlets: 'gloves',
  gauntlet: 'gloves',
  bracers: 'gloves',
  hands: 'gloves',
  cape: 'back',
  backpack: 'back',
  wings: 'back',
  quiver: 'back',
  back: 'back',
  belt: 'belt',
  waist: 'belt',
  sash: 'belt',
  weapon: 'weapon_main',
  weapons: 'weapon_main',
  sword: 'weapon_main',
  blade: 'weapon_main',
  axe: 'weapon_main',
  bow: 'weapon_main',
  shield: 'weapon_off',
  offhand: 'weapon_off',
  jewelry: 'accessory',
  jewellery: 'accessory',
  necklace: 'accessory',
  ring: 'accessory',
  earring: 'accessory',
  earrings: 'accessory',
};

function normalizeCategoryCandidate(value: unknown): CharacterComponentCategory | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (isCharacterComponentCategory(normalized)) return normalized;
  return CATEGORY_ALIASES[normalized];
}

/** Resolves legacy and imported wardrobe labels to the canonical visual slot. */
export function getModelWardrobeCategory(item: ModelWardrobeItem): CharacterComponentCategory {
  // 1. Explicit normalized category or slot has highest precedence
  const explicitCategory = normalizeCategoryCandidate(item.category)
    || normalizeCategoryCandidate(item.componentCategory)
    || normalizeCategoryCandidate(item.slot);
  if (explicitCategory && explicitCategory !== 'other') {
    return explicitCategory;
  }

  // 2. High-specificity semantic pattern matching
  // Sanitize non-alphanumeric characters into spaces so \b word boundaries match underscored identifiers (e.g. male_face_01 -> male face 01)
  const descriptiveText = ` ${item.label || ''} ${item.assetId || ''} ${item.slot || ''} `
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ');

  const patterns: Array<[RegExp, CharacterComponentCategory]> = [
    // Eyewear / Glasses (check face accessory here so it doesn't get swallowed by face)
    [/\b(glasses|sunglasses|shades|eyewear|goggles|spectacles|monocle|eyepatch|face accessory|face accessories)\b/, 'head_accessory'],
    // Masks & Face Covers
    [/\b(mask|masks|bandana|respirator|veil|facemask|face mask|face cover)\b/, 'mask'],
    // Facial Hair / Beard
    [/\b(beard|mustache|moustache|goatee|whiskers|facial hair|stubble)\b/, 'beard'],
    // Hair
    [/\b(hair|wig|ponytail|braids|dreads|afro|fade|buzzcut|curls)\b/, 'hair'],
    // Headwear / Hats
    [/\b(helmet|hat|cap|crown|hood|beanie|headband|tiara|beret)\b/, 'hat'],
    // Face Mesh / Features (tested after glasses, mask, and beard)
    [/\b(face|head base|eye color|eyes|eyeballs?|nose|mouth|teeth|lips)\b/, 'face'],
    // Outerwear / Jackets / Robes
    [/\b(jacket|coat|outerwear|cloak|robe|vest|blazer|cardigan|hoodie|parka)\b/, 'jacket'],
    // Shirts / Tops / Chest Armor
    [/\b(shirt|t shirt|top|tunic|undershirt|blouse|tank|corset|chest|chestplate|breastplate|cuirass|hauberk)\b/, 'shirt'],
    // Full Outfits / Armor
    [/\b(clothing|outfit|armor|armour|body)\b/, 'clothing'],
    // Pants / Legs
    [/\b(pants|pant|trousers|leggings|shorts|skirt|jeans|bottoms|greaves|kilt)\b/, 'pants'],
    // Shoes / Footwear
    [/\b(shoe|shoes|boot|boots|sandal|sandals|sneaker|sneakers|footwear|slippers|sabaton)\b/, 'shoes'],
    // Gloves / Hands
    [/\b(glove|gloves|gauntlet|gauntlets|bracer|bracers|mittens)\b/, 'gloves'],
    // Back / Cape / Backpack
    [/\b(cape|backpack|wings|quiver|back item|back mount)\b/, 'back'],
    // Belts / Waist
    [/\b(belt|waist|sash|buckle)\b/, 'belt'],
    // Weapons / Offhand
    [/\b(shield|offhand)\b/, 'weapon_off'],
    [/\b(weapon|sword|blade|axe|mace|hammer|staff|wand|bow|dagger|gun|pistol|rifle)\b/, 'weapon_main'],
    // Accessories / Jewelry
    [/\b(accessory|accessories|jewelry|jewellery|ring|necklace|amulet|earring|earrings)\b/, 'accessory'],
  ];

  for (const [pattern, inferred] of patterns) {
    if (pattern.test(descriptiveText)) return inferred;
  }

  return explicitCategory || 'other';
}

export function getModelWardrobeSlotId(item: ModelWardrobeItem): string {
  // If item has an explicit recognized slot, preserve it directly
  if (item.slot) {
    const norm = item.slot.trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (['face', 'hair', 'beard', 'eyewear', 'mask', 'headwear', 'shirt', 'jacket', 'upper-body', 'legs', 'feet', 'gloves', 'back', 'belt', 'weapon_main', 'weapon_off', 'accessory'].includes(norm)) {
      return norm;
    }
  }

  switch (getModelWardrobeCategory(item)) {
    case 'face': return 'face';
    case 'hair': return 'hair';
    case 'beard': return 'beard';
    case 'head_accessory': return 'eyewear';
    case 'mask': return 'mask';
    case 'hat': return 'headwear';
    case 'shirt': return 'shirt';
    case 'jacket': return 'jacket';
    case 'clothing': return 'upper-body';
    case 'pants': return 'legs';
    case 'shoes': return 'feet';
    case 'gloves': return 'gloves';
    case 'back': return 'back';
    case 'belt': return 'belt';
    case 'weapon_main': return 'weapon_main';
    case 'weapon_off': return 'weapon_off';
    case 'accessory': return 'accessory';
    default: return 'other';
  }
}

export function getDefaultModelWardrobeAttachmentMode(item: ModelWardrobeItem): 'RIGID_SOCKET' | 'SKINNED' {
  if (item.attachmentMode) return item.attachmentMode;
  const category = getModelWardrobeCategory(item);
  if (
    item.isModular ||
    ['face', 'hair', 'beard', 'hat', 'head_accessory', 'mask', 'clothing', 'shirt', 'jacket', 'pants', 'shoes', 'gloves', 'belt'].includes(category)
  ) {
    return 'SKINNED';
  }
  return 'RIGID_SOCKET';
}

export function getDefaultModelWardrobeSocket(item: ModelWardrobeItem): string {
  if (item.socket) return item.socket;
  const category = getModelWardrobeCategory(item);
  if (['face', 'hair', 'beard', 'hat', 'head_accessory', 'mask'].includes(category)) return 'HeadMount';
  if (['clothing', 'shirt', 'jacket'].includes(category)) return 'ChestMount';
  if (category === 'back') return 'ChestMount';
  if (category === 'belt') return 'ChestMount';
  if (category === 'gloves') return 'RightHandMount';
  if (category === 'weapon_off') return 'LeftHandMount';
  if (category === 'weapon_main') return 'RightHandMount';

  const description = `${item.label || ''} ${item.assetId}`.toLowerCase();
  if (/\b(shield|offhand)\b/.test(description)) return 'LeftHandMount';
  if (/\b(cape|cloak|wing|backpack|quiver)\b/.test(description)) return 'ChestMount';
  return 'RightHandMount';
}

const WARDROBE_CATEGORY_ORDER: CharacterComponentCategory[] = [
  'face', 'hair', 'beard', 'head_accessory', 'mask', 'hat', 'shirt', 'jacket', 'clothing', 'pants', 'shoes', 'gloves', 'back', 'belt', 'weapon_main', 'weapon_off', 'accessory', 'other',
];

export function groupModelWardrobeItems(items: ModelWardrobeItem[]): Array<{
  category: CharacterComponentCategory;
  label: string;
  items: ModelWardrobeItem[];
}> {
  const groups = new Map<CharacterComponentCategory, ModelWardrobeItem[]>();
  for (const item of items) {
    const category = getModelWardrobeCategory(item);
    const group = groups.get(category) || [];
    group.push(item);
    groups.set(category, group);
  }
  return WARDROBE_CATEGORY_ORDER
    .filter((category) => groups.has(category))
    .map((category) => ({
      category,
      label: CHARACTER_COMPONENT_CATEGORIES[category].label,
      items: groups.get(category)!,
    }));
}

export function getModelWardrobeItemLabel(item: ModelWardrobeItem): string {
  const label = item.label?.trim();
  if (label) return label;
  const fileName = item.assetId.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') || item.assetId;
  return fileName.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function getModelWardrobeCategoryLabel(item: ModelWardrobeItem): string {
  return CHARACTER_COMPONENT_CATEGORIES[getModelWardrobeCategory(item)].label;
}

export function parseModelWardrobeItems(value: unknown): ModelWardrobeItem[] {
  let data: any = value;
  if (typeof value === 'string') {
    try {
      data = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
  const items = Array.isArray(data.modularAttachments)
    ? data.modularAttachments
    : Array.isArray(data.worldModel?.modularAttachments)
      ? data.worldModel.modularAttachments
      : [];
  return items
    .filter((item: any) => item && typeof item.assetId === 'string' && item.assetId.trim())
    .map((item: any) => {
      const normalized: ModelWardrobeItem = {
        ...item,
        modelUrl: item.modelUrl || item.source || undefined,
        category: getModelWardrobeCategory(item),
      };
      normalized.attachmentMode = getDefaultModelWardrobeAttachmentMode(normalized);
      if (normalized.attachmentMode === 'RIGID_SOCKET') {
        normalized.socket = getDefaultModelWardrobeSocket(normalized);
      }
      return normalized;
    });
}

/** Keep each archetype outfit intact while applying the creator's choices. */
export function applyCharacterCreationWardrobe(
  visualData: string | null | undefined,
  selectedAssetIds: string[],
): string {
  let data: any = {};
  try {
    const parsed = JSON.parse(visualData || '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) data = parsed;
  } catch {
    data = {};
  }

  const selected = new Set(selectedAssetIds);
  const attachments = parseModelWardrobeItems(data);
  const nextAttachments = attachments.map((item) => {
    if (!item.availableInCharacterCreation) return item;
    return { ...item, defaultVisible: selected.has(item.assetId) };
  });

  if (Array.isArray(data.modularAttachments)) data.modularAttachments = nextAttachments;
  if (data.worldModel && Array.isArray(data.worldModel.modularAttachments)) {
    data.worldModel = { ...data.worldModel, modularAttachments: nextAttachments };
  }
  if (!Array.isArray(data.modularAttachments) && !Array.isArray(data.worldModel?.modularAttachments)) {
    data.modularAttachments = nextAttachments;
  }
  return JSON.stringify(data);
}
