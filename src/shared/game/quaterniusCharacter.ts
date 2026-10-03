export type QuaterniusBodyRegion = 'head' | 'torso' | 'arms' | 'legs' | 'feet';

export interface WardrobeVisibilityItem {
  assetId?: string;
  id?: string;
  category?: string | null;
  hidesComponents?: string[] | null;
  defaultVisible?: boolean;
}

const REGION_ORDER: QuaterniusBodyRegion[] = ['torso', 'arms', 'legs', 'feet'];

const CATEGORY_REGION: Record<string, QuaterniusBodyRegion> = {
  shirt: 'torso',
  jacket: 'torso',
  clothing: 'torso',
  armor: 'torso',
  torso: 'torso',
  chest: 'torso',
  arms: 'arms',
  gloves: 'arms',
  hands: 'arms',
  legs: 'legs',
  pants: 'legs',
  feet: 'feet',
  shoes: 'feet',
  footwear: 'feet',
};

function normalize(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function toBodyRegion(value: string): QuaterniusBodyRegion | undefined {
  const normalized = normalize(value);
  if (normalized in CATEGORY_REGION) return CATEGORY_REGION[normalized];
  return (['head', 'torso', 'arms', 'legs', 'feet'] as const).find((region) => region === normalized);
}

export function getQuaterniusBodyRegionsToHide(items: WardrobeVisibilityItem[]): QuaterniusBodyRegion[] {
  const hidden = new Set<QuaterniusBodyRegion>();
  for (const item of items) {
    if (item.defaultVisible === false) continue;
    const region = CATEGORY_REGION[normalize(item.category)];
    if (region && region !== 'head') hidden.add(region);
    for (const keyword of item.hidesComponents || []) {
      const hideRegion = toBodyRegion(keyword);
      if (hideRegion && hideRegion !== 'head') hidden.add(hideRegion);
    }
  }
  return REGION_ORDER.filter((region) => hidden.has(region));
}

function categoryMatchesHide(category: string, hiddenCategory: string): boolean {
  const target = normalize(category);
  const hide = normalize(hiddenCategory);
  if (target === hide) return true;

  const aliases: Record<string, string[]> = {
    hair: ['hairstyle', 'hair_style'],
    beard: ['facial_hair', 'mustache', 'moustache'],
    hat: ['hood', 'helmet', 'headwear'],
    head_accessory: ['eyewear', 'glasses', 'face_accessory'],
    shirt: ['torso', 'chest'],
    clothing: ['armor', 'armour', 'outfit'],
    legs: ['pants', 'trousers'],
    shoes: ['feet', 'footwear', 'boots'],
  };
  return (aliases[hide] || []).includes(target) || (aliases[target] || []).includes(hide);
}

/** Returns attachment indexes hidden by another equipped item's hidesComponents rule. */
export function getHiddenWardrobeAttachmentIndexes(items: WardrobeVisibilityItem[]): number[] {
  const hidden = new Set<number>();
  items.forEach((hider, hiderIndex) => {
    if (hider.defaultVisible === false) return;
    for (const keyword of hider.hidesComponents || []) {
      items.forEach((target, targetIndex) => {
        if (hiderIndex === targetIndex || target.defaultVisible === false || !target.category) return;
        if (categoryMatchesHide(target.category, keyword)) hidden.add(targetIndex);
      });
    }
  });
  return [...hidden].sort((a, b) => a - b);
}

export function getQuaterniusBodyRegionFromMeshName(meshName: string): QuaterniusBodyRegion | undefined {
  const normalized = normalize(meshName).replace(/_/g, '');
  const match = normalized.match(/quaterniusbody(head|torso|arms|legs|feet)$/);
  return match?.[1] as QuaterniusBodyRegion | undefined;
}

/** Broad legacy rules such as "body" must never remove a prepared base's head. */
export function shouldHideBaseMesh(meshName: string, keyword: string): boolean {
  const region = getQuaterniusBodyRegionFromMeshName(meshName);
  if (region) return region !== 'head' && toBodyRegion(keyword) === region;
  const normalizedKeyword = normalize(keyword).replace(/_/g, '');
  if (!normalizedKeyword || ['hair', 'beard', 'hat', 'headaccessory'].includes(normalizedKeyword)) return false;
  return normalize(meshName).replace(/_/g, '').includes(normalizedKeyword);
}
