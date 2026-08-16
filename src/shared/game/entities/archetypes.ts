/**
 * Saints Gaming — Archetype Registry (Bible 20 §18)
 */

import { ArchetypeId, EntityInstanceV1 } from './types';

export interface ArchetypeDef {
  id: ArchetypeId;
  label: string;
  description: string;
  defaultComponents: Array<string>;
}

export const ARCHETYPE_REGISTRY: Record<ArchetypeId, ArchetypeDef> = {
  npc: {
    id: 'npc',
    label: 'NPC (Citizen / Vendor / Quest Giver)',
    description: 'Interactive character with speech and optional shop/quest components',
    defaultComponents: ['identity', 'transform', 'sprite', 'interact', 'dialogue', 'ai'],
  },
  monster: {
    id: 'monster',
    label: 'Monster / Wild Creature',
    description: 'Hostile or capturable creature with combat capabilities and loot drops',
    defaultComponents: ['identity', 'transform', 'sprite', 'combatant', 'ai', 'loot', 'respawn', 'capabilities'],
  },
  resource_node: {
    id: 'resource_node',
    label: 'Resource Node (Tree, Ore, Herb)',
    description: 'Harvestable node yielding crafting materials and granting skill XP',
    defaultComponents: ['identity', 'transform', 'sprite', 'interact', 'resource_node', 'loot', 'respawn'],
  },
  spawner: {
    id: 'spawner',
    label: 'Area Entity Spawner',
    description: 'Dynamic periodic generator of monsters or ambient creatures',
    defaultComponents: ['identity', 'transform', 'spawner'],
  },
  encounter_zone: {
    id: 'encounter_zone',
    label: 'Wild Encounter Zone',
    description: 'Trigger volume for random wild creature battles',
    defaultComponents: ['identity', 'transform', 'encounter_zone'],
  },
  warp: {
    id: 'warp',
    label: 'Warp Portal / Realm Gate',
    description: 'Teleports players across maps and shard instances',
    defaultComponents: ['identity', 'transform', 'warp'],
  },
  door: {
    id: 'door',
    label: 'Interactive Door / Barrier',
    description: 'Passable barrier with open/close state and optional key requirements',
    defaultComponents: ['identity', 'transform', 'sprite', 'interact'],
  },
  chest: {
    id: 'chest',
    label: 'Treasure Container',
    description: 'Interactive container storing loot items and currency',
    defaultComponents: ['identity', 'transform', 'sprite', 'interact', 'loot'],
  },
  decoration: {
    id: 'decoration',
    label: 'Scenic Decoration',
    description: 'Visual environmental prop with optional collision',
    defaultComponents: ['identity', 'transform', 'sprite'],
  },
  trigger: {
    id: 'trigger',
    label: 'Script Trigger Volume',
    description: 'Invisible volume firing script triggers upon entity entry',
    defaultComponents: ['identity', 'transform'],
  },
  generic: {
    id: 'generic',
    label: 'Generic Entity',
    description: 'Flexible blank slate entity instance',
    defaultComponents: ['identity', 'transform'],
  },
};

/**
 * Instantiates an EntityInstanceV1 with default archetype components.
 */
export function createEntityFromArchetype(
  archetype: ArchetypeId,
  name: string,
  x: number,
  y: number,
  spriteId?: string
): EntityInstanceV1 {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const id = `ent_${archetype}_${slug || Date.now().toString(36)}`;

  const entity: EntityInstanceV1 = {
    schemaVersion: 1,
    id,
    archetype,
    components: {
      identity: {
        name,
        slug,
      },
      transform: {
        x,
        y,
        elevation: 0,
        facing: 'S',
      },
      enabled: true,
    },
  };

  if (spriteId) {
    entity.components.sprite = {
      spriteId,
      scale: 1,
    };
  }

  // Populate archetype-specific defaults
  if (archetype === 'npc') {
    entity.components.interact = { enabled: true, distance: 1.5, prompt: 'Talk' };
    entity.components.dialogue = { speakerName: name };
    entity.components.ai = { behavior: 'idle' };
  } else if (archetype === 'monster') {
    entity.components.combatant = {
      level: 1,
      maxHp: 30,
      currentHp: 30,
      armorClass: 10,
      faction: 'hostile',
    };
    entity.components.ai = { behavior: 'wander', wanderRadius: 3, agroRange: 4 };
    entity.components.capabilities = { hostile: true, capturable: true, destructible: true };
    entity.components.respawn = { respawnSec: 60 };
  } else if (archetype === 'resource_node') {
    entity.components.interact = { enabled: true, prompt: 'Harvest' };
    entity.components.resource_node = { resourceType: 'wood', yieldsRemaining: 3 };
    entity.components.respawn = { respawnSec: 120 };
  }

  return entity;
}
