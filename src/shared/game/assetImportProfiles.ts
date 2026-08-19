export type AssetImportProfileId =
  | "character"
  | "creature"
  | "item"
  | "tile"
  | "ui"
  | "effect";

export type AssetSlotRole = string;

export type AssetCategoryHint =
  | "actor"
  | "creature"
  | "equipment"
  | "consumable"
  | "terrain"
  | "interface"
  | "vfx"
  | "icon"
  | "misc"
  | "face"
  | "hair"
  | "hat"
  | "head_accessory"
  | "clothing"
  | "shirt"
  | "jacket"
  | "pants"
  | "shoes"
  | "accessory"
  | "other";

export type AssetTypeHint =
  | "CHARACTER"
  | "CREATURE"
  | "ITEM"
  | "TILE"
  | "UI"
  | "EFFECT"
  | "OBJECT"
  | "TERRAIN"
  | "AUDIO"
  | "MODEL"
  | "ANIMATION";

export interface AssetImportRoleMeta {
  required: boolean;
  categoryHint?: AssetCategoryHint;
  typeHint?: AssetTypeHint;
}

export type CharacterComponentCategory =
  | "face"
  | "hair"
  | "hat"
  | "head_accessory"
  | "clothing"
  | "shirt"
  | "jacket"
  | "pants"
  | "shoes"
  | "accessory"
  | "other";

export type CharacterComponentLayer =
  | "head"
  | "torso"
  | "legs"
  | "feet"
  | "accessory"
  | "full-body";

export type CharacterViewDirection = "front" | "back" | "left" | "right";

/** LPC-style base body/mesh types. A component sized for one may misalign on another. */
export type CharacterBaseBodyType =
  | "male"
  | "female"
  | "muscular"
  | "pregnant"
  | "child"
  | "teen"
  | "unspecified";

export const CHARACTER_BASE_BODY_TYPES: Record<CharacterBaseBodyType, { label: string }> = {
  male: { label: "Male" },
  female: { label: "Female" },
  muscular: { label: "Muscular" },
  pregnant: { label: "Pregnant" },
  child: { label: "Child" },
  teen: { label: "Teen" },
  unspecified: { label: "Unspecified / Any" },
};

/** Baseline Z-order for stacking modular character layers (lower draws first). */
export const CHARACTER_COMPONENT_DEFAULT_Z_ORDER: Record<CharacterComponentCategory, number> = {
  face: 20,
  hair: 30,
  hat: 60,
  head_accessory: 55,
  clothing: 40,
  shirt: 40,
  jacket: 45,
  pants: 35,
  shoes: 25,
  accessory: 50,
  other: 45,
};

export interface AssetImportProfileMeta {
  label: string;
  defaultRole: AssetSlotRole;
  profileTypeHint: AssetTypeHint;
  roles: Record<AssetSlotRole, AssetImportRoleMeta>;
}

export const CHARACTER_COMPONENT_CATEGORIES: Record<CharacterComponentCategory, { label: string; layer: CharacterComponentLayer }> = {
  face: { label: "Face", layer: "head" },
  hair: { label: "Hair", layer: "head" },
  hat: { label: "Hat", layer: "head" },
  head_accessory: { label: "Head Accessory", layer: "head" },
  clothing: { label: "Clothing", layer: "torso" },
  shirt: { label: "Shirt / Top", layer: "torso" },
  jacket: { label: "Jacket / Outerwear", layer: "torso" },
  pants: { label: "Pants / Bottoms", layer: "legs" },
  shoes: { label: "Shoes / Footwear", layer: "feet" },
  accessory: { label: "Accessory", layer: "accessory" },
  other: { label: "Other Component", layer: "full-body" },
};

export const CHARACTER_VIEW_DIRECTIONS: Record<CharacterViewDirection, { label: string; facing: string }> = {
  front: { label: "Front View", facing: "S" },
  back: { label: "Back View", facing: "N" },
  left: { label: "Left Side View", facing: "W" },
  right: { label: "Right Side View", facing: "E" },
};

export const ASSET_IMPORT_PROFILE_META: Record<AssetImportProfileId, AssetImportProfileMeta> = {
  character: {
    label: "Character",
    defaultRole: "idle",
    profileTypeHint: "CHARACTER",
    roles: {
      idle: { required: true, categoryHint: "actor", typeHint: "CHARACTER" },
      walk: { required: true, categoryHint: "actor", typeHint: "CHARACTER" },
      run: { required: false, categoryHint: "actor", typeHint: "CHARACTER" },
      attack: { required: false, categoryHint: "actor", typeHint: "CHARACTER" },
      portrait: { required: false, categoryHint: "interface", typeHint: "UI" },
      icon: { required: false, categoryHint: "icon", typeHint: "UI" },
      shadow: { required: false, categoryHint: "misc", typeHint: "EFFECT" },
      face: { required: false, categoryHint: "face", typeHint: "CHARACTER" },
      hair: { required: false, categoryHint: "hair", typeHint: "CHARACTER" },
      hat: { required: false, categoryHint: "hat", typeHint: "CHARACTER" },
      head_accessory: { required: false, categoryHint: "head_accessory", typeHint: "CHARACTER" },
      clothing: { required: false, categoryHint: "clothing", typeHint: "CHARACTER" },
      shirt: { required: false, categoryHint: "shirt", typeHint: "CHARACTER" },
      jacket: { required: false, categoryHint: "jacket", typeHint: "CHARACTER" },
      pants: { required: false, categoryHint: "pants", typeHint: "CHARACTER" },
      shoes: { required: false, categoryHint: "shoes", typeHint: "CHARACTER" },
      accessory: { required: false, categoryHint: "accessory", typeHint: "CHARACTER" },
      other: { required: false, categoryHint: "other", typeHint: "CHARACTER" },
    },
  },
  creature: {
    label: "Creature",
    defaultRole: "front",
    profileTypeHint: "CREATURE",
    roles: {
      front: { required: true, categoryHint: "creature", typeHint: "CREATURE" },
      back: { required: true, categoryHint: "creature", typeHint: "CREATURE" },
      idle: { required: false, categoryHint: "creature", typeHint: "CREATURE" },
      attack: { required: false, categoryHint: "creature", typeHint: "CREATURE" },
      hurt: { required: false, categoryHint: "creature", typeHint: "CREATURE" },
      icon: { required: false, categoryHint: "icon", typeHint: "UI" },
      shadow: { required: false, categoryHint: "misc", typeHint: "EFFECT" },
    },
  },
  item: {
    label: "Item",
    defaultRole: "icon",
    profileTypeHint: "ITEM",
    roles: {
      icon: { required: true, categoryHint: "icon", typeHint: "ITEM" },
      world: { required: false, categoryHint: "equipment", typeHint: "ITEM" },
      use: { required: false, categoryHint: "consumable", typeHint: "ITEM" },
      drop: { required: false, categoryHint: "equipment", typeHint: "ITEM" },
    },
  },
  tile: {
    label: "Tile",
    defaultRole: "base",
    profileTypeHint: "TILE",
    roles: {
      base: { required: true, categoryHint: "terrain", typeHint: "TILE" },
      autotile: { required: false, categoryHint: "terrain", typeHint: "TILE" },
      collision: { required: false, categoryHint: "terrain", typeHint: "TILE" },
      deco: { required: false, categoryHint: "misc", typeHint: "OBJECT" },
      overlay: { required: false, categoryHint: "terrain", typeHint: "TILE" },
    },
  },
  ui: {
    label: "UI",
    defaultRole: "panel",
    profileTypeHint: "UI",
    roles: {
      panel: { required: true, categoryHint: "interface", typeHint: "UI" },
      button: { required: false, categoryHint: "interface", typeHint: "UI" },
      icon: { required: false, categoryHint: "icon", typeHint: "UI" },
      cursor: { required: false, categoryHint: "interface", typeHint: "UI" },
      font: { required: false, categoryHint: "interface", typeHint: "UI" },
    },
  },
  effect: {
    label: "Effect",
    defaultRole: "impact",
    profileTypeHint: "EFFECT",
    roles: {
      impact: { required: true, categoryHint: "vfx", typeHint: "EFFECT" },
      cast: { required: false, categoryHint: "vfx", typeHint: "EFFECT" },
      loop: { required: false, categoryHint: "vfx", typeHint: "EFFECT" },
      trail: { required: false, categoryHint: "vfx", typeHint: "EFFECT" },
      burst: { required: false, categoryHint: "vfx", typeHint: "EFFECT" },
    },
  },
};

const PROFILE_IDS = Object.keys(ASSET_IMPORT_PROFILE_META) as AssetImportProfileId[];
const PROFILE_ID_SET = new Set<string>(PROFILE_IDS);

const PROFILE_ROLES: Record<AssetImportProfileId, AssetSlotRole[]> = PROFILE_IDS.reduce(
  (acc, profile) => {
    acc[profile] = Object.keys(ASSET_IMPORT_PROFILE_META[profile].roles);
    return acc;
  },
  {} as Record<AssetImportProfileId, AssetSlotRole[]>
);

export function listAssetImportProfiles(): AssetImportProfileId[] {
  return PROFILE_IDS;
}

export function listSlotRolesForProfile(profile: AssetImportProfileId): AssetSlotRole[] {
  return PROFILE_ROLES[profile];
}

export function isValidAssetImportProfile(value: string): value is AssetImportProfileId {
  return PROFILE_ID_SET.has(value);
}

export function isValidSlotRole(profile: AssetImportProfileId, role: string): boolean {
  return PROFILE_ROLES[profile].includes(role);
}

export function getDefaultSlotRole(profile: AssetImportProfileId): AssetSlotRole {
  return ASSET_IMPORT_PROFILE_META[profile].defaultRole;
}

export function inferTypeForProfile(profile: AssetImportProfileId): AssetTypeHint {
  return ASSET_IMPORT_PROFILE_META[profile].profileTypeHint;
}

export function listCharacterComponentCategories(): CharacterComponentCategory[] {
  return Object.keys(CHARACTER_COMPONENT_CATEGORIES) as CharacterComponentCategory[];
}

export function listCharacterBaseBodyTypes(): CharacterBaseBodyType[] {
  return Object.keys(CHARACTER_BASE_BODY_TYPES) as CharacterBaseBodyType[];
}

export function isValidCharacterBaseBodyType(value: string): value is CharacterBaseBodyType {
  return value in CHARACTER_BASE_BODY_TYPES;
}

export function getDefaultZOrderHint(category: string): number | null {
  const normalized = category.trim().toLowerCase();
  if (isCharacterComponentCategory(normalized)) {
    return CHARACTER_COMPONENT_DEFAULT_Z_ORDER[normalized];
  }
  return null;
}

export function listCharacterViewDirections(): CharacterViewDirection[] {
  return Object.keys(CHARACTER_VIEW_DIRECTIONS) as CharacterViewDirection[];
}

export function inferCharacterViewFromFacing(facing: string | null | undefined): CharacterViewDirection | null {
  const normalized = (facing || "").trim().toUpperCase();
  if (!normalized) return null;
  if (normalized === "S") return "front";
  if (normalized === "N") return "back";
  if (normalized === "W") return "left";
  if (normalized === "E") return "right";
  if (normalized === "DOWN") return "front";
  if (normalized === "UP") return "back";
  if (normalized === "LEFT") return "left";
  if (normalized === "RIGHT") return "right";
  return null;
}

export function isCharacterComponentCategory(value: string): value is CharacterComponentCategory {
  return value in CHARACTER_COMPONENT_CATEGORIES;
}

export function inferCharacterComponentLayerSlot(category: string): CharacterComponentLayer | null {
  const normalized = category.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized in CHARACTER_COMPONENT_CATEGORIES) {
    return CHARACTER_COMPONENT_CATEGORIES[normalized as CharacterComponentCategory].layer;
  }
  return null;
}

export function inferCategoryForRole(role: string): AssetCategoryHint | null {
  const normalized = role.trim().toLowerCase();
  if (isCharacterComponentCategory(normalized)) {
    return normalized;
  }
  // Deterministic tie-breaker: first match in stable profile order wins.
  for (const profile of PROFILE_IDS) {
    const roleMeta = ASSET_IMPORT_PROFILE_META[profile].roles[normalized];
    if (roleMeta?.categoryHint) {
      return roleMeta.categoryHint;
    }
  }
  return null;
}

export function getMissingRequiredRoles(
  profile: AssetImportProfileId,
  assignedRoles: string[]
): AssetSlotRole[] {
  const assignedSet = new Set(assignedRoles.filter(Boolean));
  return PROFILE_ROLES[profile].filter((role) => {
    const meta = ASSET_IMPORT_PROFILE_META[profile].roles[role];
    return meta.required && !assignedSet.has(role);
  });
}