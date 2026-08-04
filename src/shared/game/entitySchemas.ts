/**
 * Schema-driven entity property definitions for Saints Studio (bible 17).
 * Panels should render from these schemas rather than hardcoded field lists.
 */

import type { LootRef } from "./lootRefs";

export type SchemaFieldType =
  | "string"
  | "number"
  | "boolean"
  | "enum"
  | "lootRef"
  | "json";

export type SchemaField = {
  key: string;
  label: string;
  type: SchemaFieldType;
  category: string;
  description?: string;
  defaultValue?: string | number | boolean | null;
  /** For enum fields */
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  /** Advanced tier — hidden unless Advanced Mode is on */
  advanced?: boolean;
};

export type EntitySchemaKind =
  | "npc"
  | "monster"
  | "resource_node"
  | "spawner"
  | "encounter_zone"
  | "door"
  | "chest"
  | "decoration"
  | "warp";

export type EntitySchema = {
  kind: EntitySchemaKind;
  label: string;
  description: string;
  categories: string[];
  fields: SchemaField[];
};

/** NPC property categories from the Studio architecture brief. */
export const NPC_PROPERTY_CATEGORIES = [
  "General",
  "Appearance",
  "Behaviour",
  "AI",
  "Combat",
  "Stats",
  "Movement",
  "Dialogue",
  "Vendor",
  "Quests",
  "Loot",
  "Spawn Rules",
  "Conditions",
  "Variables",
  "Relationships",
  "Events",
  "Animation",
  "Permissions",
  "Debug",
] as const;

const NPC_FIELDS: SchemaField[] = [
  { key: "id", label: "Internal ID", type: "string", category: "General" },
  { key: "displayName", label: "Display Name", type: "string", category: "General", defaultValue: "New NPC" },
  { key: "tags", label: "Tags", type: "string", category: "General", description: "Comma-separated tags" },
  { key: "spriteId", label: "Sprite", type: "string", category: "Appearance", defaultValue: "adventurer" },
  { key: "scale", label: "Scale", type: "number", category: "Appearance", defaultValue: 1, min: 0.25, max: 4 },
  {
    key: "behaviour",
    label: "Behaviour",
    type: "enum",
    category: "Behaviour",
    options: [
      { value: "idle", label: "Idle" },
      { value: "wander", label: "Wander" },
      { value: "patrol", label: "Patrol" },
      { value: "guard", label: "Guard" },
    ],
    defaultValue: "idle",
  },
  {
    key: "aiProfile",
    label: "AI Profile",
    type: "string",
    category: "AI",
    defaultValue: "passive",
    advanced: true,
  },
  { key: "hostile", label: "Hostile", type: "boolean", category: "Combat", defaultValue: false },
  { key: "level", label: "Level", type: "number", category: "Stats", defaultValue: 1, min: 1, max: 200 },
  { key: "wanderRadius", label: "Wander Radius", type: "number", category: "Movement", defaultValue: 0, min: 0 },
  { key: "dialogueId", label: "Dialogue ID", type: "string", category: "Dialogue" },
  { key: "shopId", label: "Shop ID", type: "string", category: "Vendor" },
  { key: "questIds", label: "Quest IDs", type: "string", category: "Quests", description: "Comma-separated quest slugs" },
  { key: "loot", label: "Loot", type: "lootRef", category: "Loot" },
  { key: "respawnMs", label: "Respawn (ms)", type: "number", category: "Spawn Rules", defaultValue: 0, min: 0 },
  { key: "activeConditions", label: "Active Conditions", type: "json", category: "Conditions", advanced: true },
  { key: "variables", label: "Variables", type: "json", category: "Variables", advanced: true },
  { key: "factionId", label: "Faction", type: "string", category: "Relationships" },
  { key: "onInteract", label: "On Interact Event", type: "string", category: "Events", advanced: true },
  { key: "animSet", label: "Animation Set", type: "string", category: "Animation" },
  { key: "editorOnly", label: "Editor Only", type: "boolean", category: "Permissions", defaultValue: false, advanced: true },
  { key: "debugLabel", label: "Debug Label", type: "string", category: "Debug", advanced: true },
];

const RESOURCE_NODE_FIELDS: SchemaField[] = [
  { key: "id", label: "Internal ID", type: "string", category: "General" },
  { key: "displayName", label: "Display Name", type: "string", category: "General", defaultValue: "Resource Node" },
  {
    key: "resourceType",
    label: "Resource Type",
    type: "enum",
    category: "General",
    options: [
      { value: "wood", label: "Wood" },
      { value: "ore", label: "Ore" },
      { value: "fish", label: "Fish" },
      { value: "herb", label: "Herb" },
      { value: "crystal", label: "Crystal" },
    ],
    defaultValue: "wood",
  },
  {
    key: "requiredSkill",
    label: "Required Skill",
    type: "enum",
    category: "Gathering",
    options: [
      { value: "woodcutting", label: "Woodcutting" },
      { value: "mining", label: "Mining" },
      { value: "fishing", label: "Fishing" },
      { value: "herbalism", label: "Herbalism" },
    ],
    defaultValue: "woodcutting",
  },
  { key: "requiredLevel", label: "Required Level", type: "number", category: "Gathering", defaultValue: 1, min: 1 },
  { key: "xpReward", label: "XP Reward", type: "number", category: "Gathering", defaultValue: 25, min: 0 },
  { key: "harvestDurationMs", label: "Harvest Duration (ms)", type: "number", category: "Gathering", defaultValue: 3000, min: 0 },
  {
    key: "depletionBehaviour",
    label: "Depletion",
    type: "enum",
    category: "Gathering",
    options: [
      { value: "respawn", label: "Respawn" },
      { value: "permanent", label: "Permanent" },
      { value: "seasonal", label: "Seasonal" },
    ],
    defaultValue: "respawn",
  },
  { key: "respawnMs", label: "Respawn Timer (ms)", type: "number", category: "Gathering", defaultValue: 60000, min: 0 },
  { key: "durability", label: "Durability", type: "number", category: "Gathering", defaultValue: 1, min: 1 },
  { key: "loot", label: "Loot Pool", type: "lootRef", category: "Loot" },
  { key: "animation", label: "Animation", type: "string", category: "Presentation" },
  { key: "sound", label: "Sound", type: "string", category: "Presentation" },
  { key: "interactionRadius", label: "Interaction Radius", type: "number", category: "Presentation", defaultValue: 1.5, min: 0.5 },
  { key: "visualState", label: "Visual State", type: "string", category: "Presentation", defaultValue: "full" },
  { key: "seasonalBehaviour", label: "Seasonal Behaviour", type: "json", category: "Conditions", advanced: true },
];

const SPAWNER_FIELDS: SchemaField[] = [
  { key: "id", label: "Internal ID", type: "string", category: "General" },
  { key: "displayName", label: "Display Name", type: "string", category: "General", defaultValue: "Area Spawner" },
  { key: "creaturePool", label: "Creature Pool", type: "string", category: "Spawn", description: "Pool id or weighted slug list" },
  { key: "spawnWeighting", label: "Spawn Weighting", type: "json", category: "Spawn", advanced: true },
  { key: "maxPopulation", label: "Max Population", type: "number", category: "Spawn", defaultValue: 3, min: 1 },
  { key: "wanderRadius", label: "Wander Radius", type: "number", category: "Spawn", defaultValue: 4, min: 0 },
  { key: "respawnDelayMs", label: "Respawn Delay (ms)", type: "number", category: "Spawn", defaultValue: 30000, min: 0 },
  { key: "activeConditions", label: "Active Conditions", type: "json", category: "Conditions", advanced: true },
  { key: "timeRestrictions", label: "Time Restrictions", type: "json", category: "Conditions", advanced: true },
  { key: "weatherRestrictions", label: "Weather Restrictions", type: "json", category: "Conditions", advanced: true },
  { key: "eventRestrictions", label: "Event Restrictions", type: "json", category: "Conditions", advanced: true },
  {
    key: "despawnBehaviour",
    label: "Despawn Behaviour",
    type: "enum",
    category: "Spawn",
    options: [
      { value: "keep", label: "Keep" },
      { value: "despawn_distant", label: "Despawn when distant" },
      { value: "despawn_idle", label: "Despawn when idle" },
    ],
    defaultValue: "despawn_distant",
  },
];

const ENCOUNTER_ZONE_FIELDS: SchemaField[] = [
  { key: "id", label: "Internal ID", type: "string", category: "General" },
  { key: "encounterPool", label: "Encounter Pool", type: "string", category: "Encounter" },
  { key: "encounterRate", label: "Encounter Rate", type: "number", category: "Encounter", defaultValue: 10, min: 0, max: 100 },
  { key: "minLevel", label: "Min Level", type: "number", category: "Encounter", defaultValue: 1, min: 1 },
  { key: "maxLevel", label: "Max Level", type: "number", category: "Encounter", defaultValue: 10, min: 1 },
  { key: "biome", label: "Biome", type: "string", category: "Atmosphere" },
  { key: "music", label: "Music", type: "string", category: "Atmosphere" },
  { key: "weatherOverrides", label: "Weather Overrides", type: "json", category: "Atmosphere", advanced: true },
  { key: "timeRestrictions", label: "Time Restrictions", type: "json", category: "Conditions", advanced: true },
  { key: "questRequirements", label: "Quest Requirements", type: "json", category: "Conditions", advanced: true },
  { key: "eventRequirements", label: "Event Requirements", type: "json", category: "Conditions", advanced: true },
];

export const ENTITY_SCHEMAS: Record<EntitySchemaKind, EntitySchema> = {
  npc: {
    kind: "npc",
    label: "NPC",
    description: "Quest givers, vendors, story characters, guards.",
    categories: [...NPC_PROPERTY_CATEGORIES],
    fields: NPC_FIELDS,
  },
  monster: {
    kind: "monster",
    label: "Monster",
    description: "Hostile or neutral combat entities.",
    categories: ["General", "Appearance", "Combat", "Stats", "AI", "Loot", "Spawn Rules", "Debug"],
    fields: NPC_FIELDS.filter((f) =>
      ["General", "Appearance", "Combat", "Stats", "AI", "Loot", "Spawn Rules", "Debug"].includes(f.category)
    ),
  },
  resource_node: {
    kind: "resource_node",
    label: "Resource Node",
    description: "Trees, rocks, fishing spots, gathering nodes.",
    categories: ["General", "Gathering", "Loot", "Presentation", "Conditions"],
    fields: RESOURCE_NODE_FIELDS,
  },
  spawner: {
    kind: "spawner",
    label: "Area Spawner",
    description: "Invisible population controller for creature pools.",
    categories: ["General", "Spawn", "Conditions"],
    fields: SPAWNER_FIELDS,
  },
  encounter_zone: {
    kind: "encounter_zone",
    label: "Encounter Zone",
    description: "Logic overlay for wild encounter rates (not terrain replacement).",
    categories: ["General", "Encounter", "Atmosphere", "Conditions"],
    fields: ENCOUNTER_ZONE_FIELDS,
  },
  door: {
    kind: "door",
    label: "Door",
    description: "Interactive door / gate prop.",
    categories: ["General", "Appearance", "Events", "Permissions"],
    fields: [
      { key: "id", label: "Internal ID", type: "string", category: "General" },
      { key: "displayName", label: "Display Name", type: "string", category: "General", defaultValue: "Door" },
      { key: "spriteId", label: "Sprite", type: "string", category: "Appearance" },
      { key: "locked", label: "Locked", type: "boolean", category: "Permissions", defaultValue: false },
      { key: "onOpen", label: "On Open", type: "string", category: "Events" },
    ],
  },
  chest: {
    kind: "chest",
    label: "Chest",
    description: "Container with loot ref.",
    categories: ["General", "Loot", "Permissions"],
    fields: [
      { key: "id", label: "Internal ID", type: "string", category: "General" },
      { key: "displayName", label: "Display Name", type: "string", category: "General", defaultValue: "Chest" },
      { key: "loot", label: "Loot", type: "lootRef", category: "Loot" },
      { key: "oneTime", label: "One-Time", type: "boolean", category: "Permissions", defaultValue: true },
    ],
  },
  decoration: {
    kind: "decoration",
    label: "Decoration",
    description: "Non-interactive visual prop.",
    categories: ["General", "Appearance"],
    fields: [
      { key: "id", label: "Internal ID", type: "string", category: "General" },
      { key: "displayName", label: "Display Name", type: "string", category: "General", defaultValue: "Decor" },
      { key: "spriteId", label: "Sprite", type: "string", category: "Appearance" },
    ],
  },
  warp: {
    kind: "warp",
    label: "Warp",
    description: "Teleport / gate entity.",
    categories: ["General", "Events"],
    fields: [
      { key: "id", label: "Internal ID", type: "string", category: "General" },
      { key: "targetMapId", label: "Target Map", type: "string", category: "Events" },
      { key: "targetX", label: "Target X", type: "number", category: "Events", defaultValue: 0 },
      { key: "targetY", label: "Target Y", type: "number", category: "Events", defaultValue: 0 },
    ],
  },
};

export function getEntitySchema(kind: EntitySchemaKind): EntitySchema {
  return ENTITY_SCHEMAS[kind];
}

export function fieldsForCategory(schema: EntitySchema, category: string, opts?: { advanced?: boolean }): SchemaField[] {
  const showAdvanced = opts?.advanced ?? false;
  return schema.fields.filter((f) => f.category === category && (showAdvanced || !f.advanced));
}

export function defaultEntityProps(kind: EntitySchemaKind): Record<string, unknown> {
  const schema = getEntitySchema(kind);
  const props: Record<string, unknown> = { kind };
  for (const f of schema.fields) {
    if (f.defaultValue !== undefined) props[f.key] = f.defaultValue;
  }
  if (kind === "resource_node" || kind === "npc" || kind === "chest" || kind === "monster") {
    if (props.loot === undefined) {
      props.loot = { strategy: "pool", poolId: "" } satisfies LootRef;
    }
  }
  return props;
}

export function groupFieldsByCategory(
  schema: EntitySchema,
  opts?: { advanced?: boolean }
): Array<{ category: string; fields: SchemaField[] }> {
  const showAdvanced = opts?.advanced ?? false;
  const groups: Array<{ category: string; fields: SchemaField[] }> = [];
  for (const category of schema.categories) {
    const fields = schema.fields.filter((f) => f.category === category && (showAdvanced || !f.advanced));
    if (fields.length) groups.push({ category, fields });
  }
  return groups;
}
