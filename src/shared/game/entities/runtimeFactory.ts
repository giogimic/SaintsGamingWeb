/**
 * Saints Gaming — Entity Runtime Factory (Bible 20 §20 E4)
 * Instantiates simulation actors, renderables, and interaction nodes from EntityInstanceV1 collections.
 */

import { EntityInstanceV1 } from './types';
import { NPCPlacement, GateData, EncounterEntry } from '../types/map';
import { entityToNpc } from './adapters';

export interface RuntimeWorldEntities {
  npcs: NPCPlacement[];
  gates: Record<string, GateData & { x: number; y: number }>;
  resourceNodes: Array<{
    id: string;
    resourceType: string;
    x: number;
    y: number;
    yieldsRemaining: number;
    respawnSec: number;
  }>;
  spawners: Array<{
    id: string;
    spawnArchetype: string;
    spawnTemplateId?: string;
    x: number;
    y: number;
    maxActive: number;
    radius: number;
    intervalSec: number;
  }>;
  encounterZones: Array<{
    id: string;
    x: number;
    y: number;
    encounterTableId?: string;
    minLevel: number;
    maxLevel: number;
    encounterRate: number;
  }>;
}

/**
 * Builds runtime simulation collections from an array of EntityInstanceV1 records.
 */
export function buildRuntimeEntities(entities: EntityInstanceV1[]): RuntimeWorldEntities {
  const result: RuntimeWorldEntities = {
    npcs: [],
    gates: {},
    resourceNodes: [],
    spawners: [],
    encounterZones: [],
  };

  for (const ent of entities) {
    if (ent.components.enabled === false) continue;

    const transform = ent.components.transform;
    if (!transform) continue;

    const x = transform.x;
    const y = transform.y;

    switch (ent.archetype) {
      case 'npc': {
        const npc = entityToNpc(ent);
        if (npc) result.npcs.push(npc);
        break;
      }

      case 'warp': {
        const warpComp = ent.components.warp;
        if (warpComp) {
          result.gates[`${x}_${y}`] = {
            targetMapId: warpComp.targetMapId,
            spawnPoint: warpComp.targetSpawn,
            requiredElement: warpComp.requiredElement,
            x,
            y,
          };
        }
        break;
      }

      case 'resource_node': {
        const resComp = ent.components.resource_node;
        const respawnComp = ent.components.respawn;
        if (resComp) {
          result.resourceNodes.push({
            id: ent.id,
            resourceType: resComp.resourceType,
            x,
            y,
            yieldsRemaining: resComp.yieldsRemaining ?? 3,
            respawnSec: respawnComp?.respawnSec ?? 60,
          });
        }
        break;
      }

      case 'spawner': {
        const spawnComp = ent.components.spawner;
        if (spawnComp) {
          result.spawners.push({
            id: ent.id,
            spawnArchetype: spawnComp.spawnArchetype,
            spawnTemplateId: spawnComp.spawnTemplateId,
            x,
            y,
            maxActive: spawnComp.maxActive,
            radius: spawnComp.radius,
            intervalSec: spawnComp.intervalSec,
          });
        }
        break;
      }

      case 'encounter_zone': {
        const encComp = ent.components.encounter_zone;
        if (encComp) {
          result.encounterZones.push({
            id: ent.id,
            x,
            y,
            encounterTableId: encComp.encounterTableId,
            minLevel: encComp.minLevel,
            maxLevel: encComp.maxLevel,
            encounterRate: encComp.encounterRate,
          });
        }
        break;
      }

      case 'monster':
      case 'chest':
      case 'door':
      case 'decoration':
      case 'trigger':
      case 'generic':
      default:
        // Future runtime actor registrations
        break;
    }
  }

  return result;
}
