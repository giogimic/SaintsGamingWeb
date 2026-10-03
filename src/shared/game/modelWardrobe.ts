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
  meshName?: string;
  isSubmesh?: boolean;
  defaultVisible?: boolean;
  availableInCharacterCreation?: boolean;
  hidesComponents?: string[];
  [key: string]: unknown;
}

const CATEGORY_ALIASES: Record<string, CharacterComponentCategory> = {
  glasses: 'head_accessory',
  sunglasses: 'head_accessory',
  sunglass: 'head_accessory',
  shades: 'head_accessory',
  shade: 'head_accessory',
  eyewear: 'head_accessory',
  goggles: 'head_accessory',
  goggle: 'head_accessory',
  spectacles: 'head_accessory',
  monocle: 'head_accessory',
  eyepatch: 'head_accessory',
  headphone: 'head_accessory',
  headphones: 'head_accessory',
  headset: 'head_accessory',
  headsets: 'head_accessory',
  blindfold: 'head_accessory',
  blindfolds: 'head_accessory',
  head_accessories: 'head_accessory',
  face_accessory: 'head_accessory',
  face_accessories: 'head_accessory',
  cat_ears: 'head_accessory',
  bunny_ears: 'head_accessory',
  fox_ears: 'head_accessory',
  wolf_ears: 'head_accessory',
  animal_ears: 'head_accessory',
  horns: 'head_accessory',
  halo: 'head_accessory',
  mask: 'mask',
  masks: 'mask',
  facemask: 'mask',
  facemasks: 'mask',
  bandana: 'mask',
  bandanas: 'mask',
  respirator: 'mask',
  veil: 'mask',
  face_cover: 'mask',
  balaclava: 'mask',
  beard: 'beard',
  beards: 'beard',
  mustache: 'beard',
  mustaches: 'beard',
  moustache: 'beard',
  moustaches: 'beard',
  goatee: 'beard',
  facial_hair: 'beard',
  stubble: 'beard',
  whiskers: 'beard',
  face: 'face',
  head_base: 'face',
  skin: 'face',
  helmet: 'hat',
  helmets: 'hat',
  cap: 'hat',
  caps: 'hat',
  head: 'hat',
  headwear: 'hat',
  headgear: 'hat',
  crown: 'hat',
  headband: 'hat',
  tiara: 'hat',
  hood: 'hat',
  beanie: 'hat',
  wig: 'hair',
  hair: 'hair',
  hairstyle: 'hair',
  hairstyles: 'hair',
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
  jackets: 'jacket',
  coat: 'jacket',
  coats: 'jacket',
  outerwear: 'jacket',
  cloak: 'jacket',
  robe: 'jacket',
  robes: 'jacket',
  vest: 'jacket',
  hoodie: 'jacket',
  pauldron: 'jacket',
  pauldrons: 'jacket',
  spaulder: 'jacket',
  spaulders: 'jacket',
  waistcoat: 'jacket',
  waistcoats: 'jacket',
  tabard: 'jacket',
  tabards: 'jacket',
  surcoat: 'jacket',
  surcoats: 'jacket',
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
  leggings: 'pants',
  loincloth: 'pants',
  loincloths: 'pants',
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
  arms: 'gloves',
  arm: 'gloves',
  cape: 'back',
  backpack: 'back',
  wings: 'back',
  wing: 'back',
  quiver: 'back',
  quivers: 'back',
  tail: 'back',
  tails: 'back',
  scabbard: 'back',
  sheath: 'back',
  banner: 'back',
  jetpack: 'back',
  back: 'back',
  belt: 'belt',
  waist: 'belt',
  sash: 'belt',
  holster: 'belt',
  holsters: 'belt',
  weapon: 'weapon_main',
  weapons: 'weapon_main',
  sword: 'weapon_main',
  blade: 'weapon_main',
  axe: 'weapon_main',
  bow: 'weapon_main',
  dagger: 'weapon_main',
  staff: 'weapon_main',
  shield: 'weapon_off',
  shields: 'weapon_off',
  buckler: 'weapon_off',
  offhand: 'weapon_off',
  tome: 'weapon_off',
  spellbook: 'weapon_off',
  grimoire: 'weapon_off',
  orb: 'weapon_off',
  lantern: 'weapon_off',
  jewelry: 'accessory',
  jewellery: 'accessory',
  necklace: 'accessory',
  ring: 'accessory',
  earring: 'accessory',
  earrings: 'accessory',
  piercing: 'accessory',
  piercings: 'accessory',
  nose_ring: 'accessory',
  lip_ring: 'accessory',
  septum: 'accessory',
  cigar: 'accessory',
  pipe: 'accessory',
  bracelet: 'accessory',
  scarf: 'accessory',
  choker: 'accessory',
};

function normalizeCategoryCandidate(value: unknown): CharacterComponentCategory | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (isCharacterComponentCategory(normalized)) return normalized;
  return CATEGORY_ALIASES[normalized];
}

/** Resolves legacy and imported wardrobe labels to the canonical visual slot. */
export function getModelWardrobeCategory(item: ModelWardrobeItem): CharacterComponentCategory {
  const explicitCategory = normalizeCategoryCandidate(item.category)
    || normalizeCategoryCandidate(item.componentCategory)
    || normalizeCategoryCandidate(item.slot);

  // Gather descriptive text from label, name, assetId, source, modelUrl, and metadata name/label
  // Do NOT include item.slot or item.category here so broad category tags don't self-match in pattern testing!
  const textSources = [
    typeof item.label === 'string' ? item.label : '',
    typeof item.name === 'string' ? item.name : '',
    typeof item.assetId === 'string' ? item.assetId : '',
    typeof item.source === 'string' ? item.source : '',
    typeof item.modelUrl === 'string' ? item.modelUrl : '',
    typeof item.metadata === 'object' && item.metadata
      ? [
          (item.metadata as any).name,
          (item.metadata as any).label,
        ].filter(Boolean).join(' ')
      : '',
  ].filter(Boolean).join(' ');

  // Sanitize non-alphanumeric characters into spaces so \b word boundaries match underscored identifiers (e.g. male_face_01 -> male face 01)
  const descriptiveText = ` ${textSources} `
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ');

  // 1. High-specificity semantic pattern matching
  // Specific pieces evaluate before broad sets (e.g. shoes, pants, shirts before fullbody clothing)
  const patterns: Array<[RegExp, CharacterComponentCategory]> = [
    // Eyewear / Glasses (check face accessory, headphones, and costume ears here so they don't get swallowed by face)
    [/\b(glasses|sunglasses|sunglass|shades|shade|eyewear|goggles|goggle|spectacles|spectacle|monocle|eyepatch|eyepatches|face accessory|face accessories|headphone|headphones|headset|headsets|visor|visors|specs|blindfold|blindfolds|cat ears|bunny ears|fox ears|wolf ears|animal ears|horns|ram horns|demon horns|dragon horns|halo|halos|antenna|antennae|pacifier|pacifiers)\b/, 'head_accessory'],
    // Jewelry & Small Accessories (evaluated before face so earrings and piercings aren't trapped in face)
    [/\b(earring|earrings|piercing|piercings|nose ring|nose stud|lip ring|lip stud|septum|eyebrow ring|cigar|cigars|cigarette|cigarettes|pipe|smoking pipe|necklace|necklaces|amulet|amulets|pendant|pendants|bracelet|bracelets|ring|rings|jewelry|jewellery|badge|badges|choker|chokers|scarf|scarves|necktie|collar|brooch|pin|clown nose)\b/, 'accessory'],
    // Masks & Face Covers
    [/\b(mask|masks|bandana|bandanas|respirator|respirators|veil|veils|facemask|facemasks|face mask|face cover|balaclava|balaclavas|mouth cover|gas mask|gasmask|face shield)\b/, 'mask'],
    // Facial Hair / Beard
    [/\b(beard|beards|mustache|mustaches|moustache|moustaches|goatee|goatees|whiskers|facial hair|stubble|sideburns|muttonchops)\b/, 'beard'],
    // Hair / Hairstyles
    [/\b(hair|hairstyle|hairstyles|wig|wigs|ponytail|ponytails|braids|dreads|afro|fade|buzzcut|curls|bun|buns|pigtails|bangs|topknot|undercut|dreadlocks|cornrows|locks|mohawk|pompadour|eyebrow|eyebrows)\b/, 'hair'],
    // Headwear / Hats
    [/\b(helmet|helmets|hat|hats|cap|caps|crown|crowns|hood|hoods|beanie|beanies|headband|headbands|tiara|tiaras|beret|berets|fedora|fedoras|sombrero|turban|turbans|circlet|circlets|cowl)\b/, 'hat'],
    // Face Mesh / Features (tested after glasses, earrings, mask, and beard)
    [/\b(face|faces|head base|eye color|eyes|eyeballs?|nose|mouth|teeth|tongue|lips|head skin|facial features|emotion|expression|head_base)\b/, 'face'],
    // Shoes / Footwear
    [/\b(shoe|shoes|boot|boots|sandal|sandals|sneaker|sneakers|footwear|slippers|sabaton|sabatons|loafers|heels|cleats|foot armor|sock|socks)\b/, 'shoes'],
    // Gloves / Hands
    [/\b(glove|gloves|gauntlet|gauntlets|bracer|bracers|mittens|hand armor|wrist|wristband|wristbands|vambrace|vambraces)\b/, 'gloves'],
    // Pants / Legs
    [/\b(pants|pant|trousers|leggings|shorts|skirt|skirts|jeans|bottoms|greaves|kilt|kilts|sweatpants|chaps|tights|slacks|breeches|leg armor|loincloth|loincloths|underwear|boxers|briefs)\b/, 'pants'],
    // Back / Cape / Backpack / Wings / Tails
    [/\b(cape|capes|backpack|backpacks|wings|wing|quiver|quivers|back item|back mount|scabbard|scabbards|sheath|sheaths|tail|tails|cat tail|fox tail|wolf tail|devil tail|dragon tail|jetpack|banner|war banner|back banner)\b/, 'back'],
    // Belts / Waist / Holster
    [/\b(belt|belts|waist|sash|sashes|buckle|buckles|girdle|girdles|holster|holsters|hip pouch|fanny pack|toolbelt)\b/, 'belt'],
    // Weapons / Offhand
    [/\b(shield|shields|buckler|bucklers|offhand|off hand|tome|tomes|orb|orbs|lantern|lanterns|grimoire|grimoires|spellbook|spellbooks|relic|relics|chalice|parrying dagger)\b/, 'weapon_off'],
    // Weapons / Main Hand
    [/\b(weapon|weapons|sword|swords|blade|blades|axe|axes|mace|maces|hammer|hammers|staff|staffs|staves|wand|wands|bow|bows|dagger|daggers|gun|guns|pistol|pistols|rifle|rifles|spear|spears|halberd|halberds|scythe|scythes|crossbow|crossbows|katana|greatsword|claymore|rapier|saber|sabre|scepter|sceptre|flail|club|morningstar|scimitar|falchion|broadsword|longsword|shortsword|zweihander|shotgun|blunderbuss|revolver|musket)\b/, 'weapon_main'],
    // Outerwear / Jackets / Robes / Pauldrons
    [/\b(jacket|jackets|coat|coats|outerwear|outwear|cloak|cloaks|robe|robes|vest|vests|waistcoat|waistcoats|blazer|blazers|cardigan|cardigans|hoodie|hoodies|parka|parkas|overcoat|overcoats|sweater|sweaters|windbreaker|windbreakers|duster|dusters|trenchcoat|trenchcoats|poncho|ponchos|pauldron|pauldrons|spaulder|spaulders|shoulderpad|shoulderpads|shoulder armor|mantle|tabard|tabards|surcoat|surcoats)\b/, 'jacket'],
    // Shirts / Tops / Chest Armor
    [/\b(shirt|shirts|t shirt|tshirt|tshirts|top|tops|tunic|tunics|undershirt|undershirts|blouse|blouses|tank|tank top|corset|corsets|chest|chestplate|chestplates|breastplate|breastplates|cuirass|cuirasses|hauberk|crop top|croptop|polo|jersey|jerseys|singlet)\b/, 'shirt'],
    // Full Outfits / Armor Sets (evaluated after individual clothing pieces)
    [/\b(clothing|outfit|outfits|costume|costumes|suit|suits|fullbody|overalls?|jumpsuit|jumpsuits|armor set|body)\b/, 'clothing'],
    // Accessories / Jewelry fallback
    [/\b(accessory|accessories|jewelry|jewellery|ring|rings|necklace|necklaces|amulet|amulets|earring|earrings|pendant|pendants|bracelet|bracelets|badge|badges)\b/, 'accessory'],
  ];

  // If explicitCategory is broad/generic (e.g. legacy tag like 'face', 'hair', 'hat', 'shirt', 'clothing', 'accessory', or 'other'),
  // let high-specificity keywords override it so glasses aren't trapped in 'face', beards in 'hair', jackets in 'clothing', etc.
  const isBroadCategory = !explicitCategory
    || explicitCategory === 'other'
    || explicitCategory === 'face'
    || explicitCategory === 'hair'
    || explicitCategory === 'hat'
    || explicitCategory === 'shirt'
    || explicitCategory === 'clothing'
    || explicitCategory === 'accessory';

  if (isBroadCategory) {
    for (const [pattern, inferred] of patterns) {
      if (pattern.test(descriptiveText)) return inferred;
    }
  }

  if (explicitCategory && explicitCategory !== 'other') {
    return explicitCategory;
  }

  for (const [pattern, inferred] of patterns) {
    if (pattern.test(descriptiveText)) return inferred;
  }

  return 'other';
}

/** Resolves an item to its authoritative visual slot ID. */
export function getModelWardrobeSlotId(item: ModelWardrobeItem): CharacterComponentCategory {
  return getModelWardrobeCategory(item);
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

export const WARDROBE_CATEGORY_ICONS: Record<CharacterComponentCategory, string> = {
  face: '😐',
  hair: '💇',
  beard: '🧔',
  head_accessory: '👓',
  mask: '😷',
  hat: '🎩',
  shirt: '👕',
  jacket: '🧥',
  clothing: '👔',
  pants: '👖',
  shoes: '👟',
  gloves: '🧤',
  back: '🎒',
  belt: '🥋',
  weapon_main: '⚔️',
  weapon_off: '🛡️',
  accessory: '💍',
  other: '📦',
};

const WARDROBE_CATEGORY_ORDER: CharacterComponentCategory[] = [
  'face', 'hair', 'beard', 'head_accessory', 'mask', 'hat', 'shirt', 'jacket', 'clothing', 'pants', 'shoes', 'gloves', 'back', 'belt', 'weapon_main', 'weapon_off', 'accessory', 'other',
];

export function groupModelWardrobeItems(items: ModelWardrobeItem[]): Array<{
  category: CharacterComponentCategory;
  label: string;
  icon: string;
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
    .map((category) => {
      const groupItems = groups.get(category)!;
      const sorted = [...groupItems].sort((a, b) => {
        const aDef = a.defaultVisible !== false ? 0 : 1;
        const bDef = b.defaultVisible !== false ? 0 : 1;
        if (aDef !== bDef) return aDef - bDef;
        return getModelWardrobeItemLabel(a).localeCompare(
          getModelWardrobeItemLabel(b),
          undefined,
          { numeric: true, sensitivity: 'base' }
        );
      });
      return {
        category,
        label: CHARACTER_COMPONENT_CATEGORIES[category].label,
        icon: WARDROBE_CATEGORY_ICONS[category] || '📦',
        items: sorted,
      };
    });
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
      normalized.attachmentMode = item.attachmentMode || (item.isModular ? 'SKINNED' : getDefaultModelWardrobeAttachmentMode(normalized));
      if (normalized.attachmentMode === 'RIGID_SOCKET') {
        normalized.socket = item.socket || getDefaultModelWardrobeSocket(normalized);
      }
      return normalized;
    });
}

/** The choices an author has made available to players, including legacy unflagged outfits. */
export function getCharacterCreationWardrobeOptions(items: ModelWardrobeItem[]): ModelWardrobeItem[] {
  const hasExplicitOptions = items.some((item) => item.availableInCharacterCreation === true);
  return items.filter((item) => hasExplicitOptions
    ? item.availableInCharacterCreation === true
    : item.availableInCharacterCreation !== false);
}

/** Use the authored default outfit consistently when picking, rolling, or resetting an Archetype. */
export function getDefaultCharacterCreationWardrobeIds(items: ModelWardrobeItem[]): string[] {
  return [...new Set(getCharacterCreationWardrobeOptions(items)
    .filter((item) => item.defaultVisible !== false)
    .map((item) => item.assetId))];
}

/** Keep each archetype outfit intact while applying the creator's choices. */
export function applyCharacterCreationWardrobe(
  visualData: string | null | undefined,
  selectedAssetIds: string[],
  hairColor?: string,
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
  const anyExplicitCreation = attachments.some((item) => item.availableInCharacterCreation === true);
  const nextAttachments = attachments
    .map((item) => {
      const isOffered = anyExplicitCreation
        ? item.availableInCharacterCreation === true
        : item.availableInCharacterCreation !== false;
      
      let finalItem = item;
      // Keep items not offered in Character Creation exactly as they were
      if (isOffered) {
        // If it is offered, ONLY keep it if it was explicitly selected by the user
        if (selected.has(item.assetId)) {
          finalItem = { ...item, defaultVisible: true };
        } else {
          // Discard unselected items so they aren't saved to the DB
          return null;
        }
      }

      // Apply hair color tint
      if (hairColor) {
        const category = finalItem.category?.toLowerCase() || '';
        if (category === 'hair' || category === 'beard' || category === 'eyebrows') {
          finalItem = { ...finalItem, tint: hairColor };
        }
      }
      
      return finalItem;
    })
    .filter(Boolean);

  data.modularAttachments = nextAttachments;
  if (data.worldModel && typeof data.worldModel === 'object' && !Array.isArray(data.worldModel)) {
    data.worldModel.modularAttachments = nextAttachments;
  }
  return JSON.stringify(data);
}
