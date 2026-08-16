/**
 * Saints Gaming — Entity System V1 Type Definitions (Bible 20 §5 & Bible 34)
 * Authoritative shared entity contracts for Studio and Runtime Simulation.
 */

export type ComponentTypeId =
  | 'identity'
  | 'transform'
  | 'sprite'
  | 'interact'
  | 'dialogue'
  | 'combatant'
  | 'ai'
  | 'loot'
  | 'respawn'
  | 'resource_node'
  | 'spawner'
  | 'encounter_zone'
  | 'warp'
  | 'door'
  | 'container'
  | 'capabilities'
  | 'enabled';

export type ArchetypeId =
  | 'npc'
  | 'monster'
  | 'resource_node'
  | 'spawner'
  | 'encounter_zone'
  | 'warp'
  | 'door'
  | 'chest'
  | 'decoration'
  | 'trigger'
  | 'generic';

export interface ComponentIdentity {
  name: string;
  slug: string;
  tags?: string[];
  templateId?: string;
  prefabId?: string;
}

export interface ComponentTransform {
  x: number;
  y: number;
  elevation?: number;
  facing?: 'N' | 'S' | 'E' | 'W' | 'NE' | 'NW' | 'SE' | 'SW' | string;
}

export interface ComponentSprite {
  spriteId: string;
  assetId?: string;
  animSet?: string;
  frameIndex?: number;
  scale?: number;
  tint?: string;
}

export interface ComponentInteract {
  enabled: boolean;
  distance?: number;
  action?: string;
  prompt?: string;
}

export interface ComponentDialogue {
  dialogueKey?: string;
  dialogueId?: string;
  speakerName?: string;
}

export interface ComponentCombatant {
  level: number;
  maxHp: number;
  currentHp: number;
  armorClass: number;
  abilities?: string[];
  faction?: 'neutral' | 'hostile' | 'friendly' | 'player';
}

export interface ComponentAI {
  behavior: 'idle' | 'wander' | 'patrol' | 'aggro' | 'flee' | 'guard';
  wanderRadius?: number;
  agroRange?: number;
}

export interface ComponentLoot {
  lootTableId?: string;
  guaranteedDrops?: Array<{ itemSlug: string; quantity: number }>;
}

export interface ComponentRespawn {
  respawnSec: number;
  despawnOnDeath?: boolean;
}

export interface ComponentResourceNode {
  resourceType: 'wood' | 'ore' | 'herb' | 'fish' | 'stone' | string;
  skillRequired?: string;
  minLevel?: number;
  yieldsRemaining?: number;
}

export interface ComponentSpawner {
  spawnArchetype: ArchetypeId | string;
  spawnTemplateId?: string;
  maxActive: number;
  radius: number;
  intervalSec: number;
}

export interface ComponentEncounterZone {
  encounterTableId?: string;
  minLevel: number;
  maxLevel: number;
  encounterRate: number;
}

export interface ComponentWarp {
  targetMapId: string;
  targetSpawn: { x: number; y: number };
  requiredItem?: string;
  requiredElement?: string;
}

export interface ComponentCapabilities {
  hostile?: boolean;
  capturable?: boolean;
  tameable?: boolean;
  mountable?: boolean;
  harvestable?: boolean;
  destructible?: boolean;
  interactable?: boolean;
}

export interface ComponentMap {
  identity: ComponentIdentity;
  transform: ComponentTransform;
  sprite?: ComponentSprite;
  interact?: ComponentInteract;
  dialogue?: ComponentDialogue;
  combatant?: ComponentCombatant;
  ai?: ComponentAI;
  loot?: ComponentLoot;
  respawn?: ComponentRespawn;
  resource_node?: ComponentResourceNode;
  spawner?: ComponentSpawner;
  encounter_zone?: ComponentEncounterZone;
  warp?: ComponentWarp;
  capabilities?: ComponentCapabilities;
  enabled?: boolean;
  [key: string]: unknown;
}

/**
 * EntityInstanceV1 — The single canonical entity structure (Bible 20 §5).
 */
export interface EntityInstanceV1 {
  schemaVersion: 1;
  id: string;
  archetype: ArchetypeId;
  components: Partial<ComponentMap>;
  layer?: number;
  locked?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
