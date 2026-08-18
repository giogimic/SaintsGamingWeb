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
  | "misc";

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

export interface AssetImportProfileMeta {
  label: string;
  defaultRole: AssetSlotRole;
  profileTypeHint: AssetTypeHint;
  roles: Record<AssetSlotRole, AssetImportRoleMeta>;
}

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

export function inferCategoryForRole(role: string): AssetCategoryHint | null {
  // Deterministic tie-breaker: first match in stable profile order wins.
  for (const profile of PROFILE_IDS) {
    const roleMeta = ASSET_IMPORT_PROFILE_META[profile].roles[role];
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