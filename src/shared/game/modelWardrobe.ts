import {
  CHARACTER_COMPONENT_CATEGORIES,
  isCharacterComponentCategory,
  type CharacterComponentCategory,
} from './assetImportProfiles';

export interface ModelWardrobeItem {
  type?: '3D Model' | '3D Sprite' | '2D Sprite' | '2D Box Sprite' | 'Other';
  assetId: string;
  label?: string;
  category?: string;
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
  head_accessories: 'head_accessory',
  face_accessory: 'head_accessory',
  face_accessories: 'head_accessory',
  mask: 'head_accessory',
  helmet: 'hat',
  cap: 'hat',
  head: 'hat',
  headwear: 'hat',
  headgear: 'hat',
  crown: 'hat',
  wig: 'hair',
  beard: 'hair',
  top: 'shirt',
  tops: 'shirt',
  upper_body: 'clothing',
  upperbody: 'clothing',
  torso: 'shirt',
  vest: 'shirt',
  coat: 'jacket',
  outerwear: 'jacket',
  trousers: 'pants',
  legs: 'pants',
  bottoms: 'pants',
  boots: 'shoes',
  footwear: 'shoes',
  feet: 'shoes',
  jewelry: 'accessory',
  jewellery: 'accessory',
  gloves: 'accessory',
  belt: 'accessory',
  cape: 'accessory',
  cloak: 'accessory',
  backpack: 'accessory',
  back: 'accessory',
  weapon: 'accessory',
  shield: 'accessory',
};

function normalizeCategoryCandidate(value: unknown): CharacterComponentCategory | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (isCharacterComponentCategory(normalized)) return normalized;
  return CATEGORY_ALIASES[normalized];
}

/** Resolves legacy and imported wardrobe labels to the canonical visual slot. */
export function getModelWardrobeCategory(item: ModelWardrobeItem): CharacterComponentCategory {
  const descriptiveText = `${item.label || ''} ${item.assetId}`.toLowerCase();
  const patterns: Array<[RegExp, CharacterComponentCategory]> = [
    [/\b(glasses|eyewear|goggles|spectacles|mask|visor)\b/, 'head_accessory'],
    [/\b(helmet|hat|cap|crown|hood|beanie)\b/, 'hat'],
    [/\b(hair|wig|beard|mustache|moustache)\b/, 'hair'],
    [/\b(face|eyes|eyebrows|nose|mouth)\b/, 'face'],
    [/\b(shoe|shoes|boot|boots|sandal|footwear)\b/, 'shoes'],
    [/\b(pants|trousers|leggings|shorts|skirt|bottoms)\b/, 'pants'],
    [/\b(jacket|coat|outerwear|cloak|robe)\b/, 'jacket'],
    [/\b(shirt|top|tunic|vest|torso)\b/, 'shirt'],
    [/\b(clothing|outfit|armor|armour|body)\b/, 'clothing'],
    [/\b(accessory|accessories|jewelry|jewellery|glove|gloves|belt|cape|backpack|weapon|shield)\b/, 'accessory'],
  ];
  for (const [pattern, inferred] of patterns) {
    if (pattern.test(descriptiveText)) return inferred;
  }
  const category = normalizeCategoryCandidate(item.category)
    || normalizeCategoryCandidate(item.componentCategory);
  if (category && category !== 'other') return category;
  return category || 'other';
}

export function getModelWardrobeSlotId(item: ModelWardrobeItem): string {
  switch (getModelWardrobeCategory(item)) {
    case 'hat': return 'headwear';
    case 'head_accessory': return 'eyewear';
    case 'hair': return 'hair';
    case 'face': return 'face';
    case 'shirt':
    case 'jacket':
    case 'clothing': return 'upper-body';
    case 'pants': return 'legs';
    case 'shoes': return 'feet';
    case 'accessory': return 'accessory';
    default: return 'other';
  }
}

export function getDefaultModelWardrobeAttachmentMode(item: ModelWardrobeItem): 'RIGID_SOCKET' | 'SKINNED' {
  if (item.attachmentMode) return item.attachmentMode;
  const category = getModelWardrobeCategory(item);
  if (item.isModular || ['face', 'hair', 'hat', 'head_accessory', 'clothing', 'shirt', 'jacket', 'pants', 'shoes'].includes(category)) {
    return 'SKINNED';
  }
  return 'RIGID_SOCKET';
}

export function getDefaultModelWardrobeSocket(item: ModelWardrobeItem): string {
  if (item.socket) return item.socket;
  const category = getModelWardrobeCategory(item);
  if (['face', 'hair', 'hat', 'head_accessory'].includes(category)) return 'HeadMount';
  if (['clothing', 'shirt', 'jacket'].includes(category)) return 'ChestMount';
  const description = `${item.label || ''} ${item.assetId}`.toLowerCase();
  if (/\b(shield|offhand)\b/.test(description)) return 'LeftHandMount';
  if (/\b(cape|cloak|wing|backpack|quiver)\b/.test(description)) return 'ChestMount';
  return 'RightHandMount';
}

const WARDROBE_CATEGORY_ORDER: CharacterComponentCategory[] = [
  'face', 'hair', 'hat', 'head_accessory', 'shirt', 'jacket', 'clothing', 'pants', 'shoes', 'accessory', 'other',
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
