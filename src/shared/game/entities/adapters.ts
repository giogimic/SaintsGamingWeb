/**
 * Saints Gaming — Entity Adapters (Bible 20 §20 E1)
 * Bidirectional conversion between legacy map records (NPCPlacement, GateData) and EntityInstanceV1.
 */

import { EntityInstanceV1 } from './types';
import { NPCPlacement, GateData } from '../types/map';

/**
 * Converts a legacy NPCPlacement into a modern EntityInstanceV1 record.
 */
export function npcToEntity(npc: NPCPlacement): EntityInstanceV1 {
  const name = npc.name || 'NPC';
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const id = npc.id || `ent_npc_${slug || 'unnamed'}`;

  return {
    schemaVersion: 1,
    id,
    archetype: 'npc',
    components: {
      identity: {
        name,
        slug,
        templateId: npc.templateId,
      },
      transform: {
        x: npc.x,
        y: npc.y,
        elevation: 0,
        facing: (npc.direction as any) || 'S',
      },
      sprite: {
        spriteId: npc.sprite || 'hero_male',
        scale: 1,
      },
      interact: {
        enabled: true,
        distance: 1.5,
        prompt: 'Talk',
      },
      dialogue: {
        dialogueKey: npc.dialogueKey,
        speakerName: name,
      },
      ai: {
        behavior: 'idle',
      },
      capabilities: {
        interactable: true,
        hostile: false,
      },
      enabled: true,
    },
  };
}

/**
 * Converts an EntityInstanceV1 back into a legacy NPCPlacement record.
 */
export function entityToNpc(entity: EntityInstanceV1): NPCPlacement | null {
  const transform = entity.components.transform;
  if (!transform) return null;

  const identity = entity.components.identity;
  const sprite = entity.components.sprite;
  const dialogue = entity.components.dialogue;

  return {
    id: entity.id,
    templateId: identity?.templateId,
    name: identity?.name || 'NPC',
    x: transform.x,
    y: transform.y,
    sprite: sprite?.spriteId || 'hero_male',
    direction: transform.facing || 'down',
    dialogueKey: dialogue?.dialogueKey,
  };
}

/**
 * Converts a legacy GateData record into a modern EntityInstanceV1 warp entity.
 */
export function gateToEntity(gateIndex: number, gate: GateData, pos: { x: number; y: number }): EntityInstanceV1 {
  const targetMapId = gate.targetMapId || 'LOBBY';
  const id = `ent_warp_gate_${gateIndex}_${pos.x}_${pos.y}`;

  return {
    schemaVersion: 1,
    id,
    archetype: 'warp',
    components: {
      identity: {
        name: `Gate to ${targetMapId}`,
        slug: `gate_${targetMapId.toLowerCase()}`,
      },
      transform: {
        x: pos.x,
        y: pos.y,
      },
      warp: {
        targetMapId,
        targetSpawn: gate.spawnPoint || { x: 6, y: 2 },
        requiredElement: gate.requiredElement,
      },
      enabled: true,
    },
  };
}
