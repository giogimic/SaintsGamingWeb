import { describe, it, expect } from 'vitest';
import {
  createEntityFromArchetype,
  ARCHETYPE_REGISTRY,
  npcToEntity,
  entityToNpc,
  gateToEntity,
  EntityInstanceV1,
  ArchetypeId,
} from './index';

describe('Entity System E1 Contracts (Bible 20 §20 & Bible 34)', () => {
  it('instantiates valid EntityInstanceV1 from archetype registry', () => {
    const entity = createEntityFromArchetype('monster', 'Shadow Wolf', 10, 15, 'wolf_dark');

    expect(entity.schemaVersion).toBe(1);
    expect(entity.archetype).toBe('monster');
    expect(entity.components.identity?.name).toBe('Shadow Wolf');
    expect(entity.components.transform?.x).toBe(10);
    expect(entity.components.transform?.y).toBe(15);
    expect(entity.components.sprite?.spriteId).toBe('wolf_dark');
    expect(entity.components.combatant?.faction).toBe('hostile');
    expect(entity.components.capabilities?.capturable).toBe(true);
    expect(entity.components.enabled).toBe(true);
  });

  it('contains definitions for all standard archetypes in registry', () => {
    const expectedArchetypes = [
      'npc',
      'monster',
      'resource_node',
      'spawner',
      'encounter_zone',
      'warp',
      'door',
      'chest',
      'decoration',
      'trigger',
      'generic',
    ];

    expectedArchetypes.forEach((arch) => {
      expect(ARCHETYPE_REGISTRY[arch as ArchetypeId]).toBeDefined();
    });
  });

  it('converts legacy NPCPlacement to EntityInstanceV1 and back losslessly', () => {
    const originalNpc = {
      id: 'npc_elder_1',
      name: 'Elder Aaron',
      x: 12,
      y: 8,
      sprite: 'npc_elder',
      direction: 'down',
      dialogueKey: 'elder_intro',
    };

    const entity = npcToEntity(originalNpc);
    expect(entity.archetype).toBe('npc');
    expect(entity.components.identity?.name).toBe('Elder Aaron');
    expect(entity.components.transform?.x).toBe(12);
    expect(entity.components.transform?.y).toBe(8);
    expect(entity.components.sprite?.spriteId).toBe('npc_elder');
    expect(entity.components.dialogue?.dialogueKey).toBe('elder_intro');

    const restoredNpc = entityToNpc(entity);
    expect(restoredNpc).not.toBeNull();
    expect(restoredNpc?.id).toBe('npc_elder_1');
    expect(restoredNpc?.name).toBe('Elder Aaron');
    expect(restoredNpc?.x).toBe(12);
    expect(restoredNpc?.y).toBe(8);
    expect(restoredNpc?.sprite).toBe('npc_elder');
    expect(restoredNpc?.dialogueKey).toBe('elder_intro');
  });

  it('converts GateData to a valid warp EntityInstanceV1', () => {
    const gateData = {
      targetMapId: 'SAINTS_CITY',
      spawnPoint: { x: 5, y: 10 },
      requiredElement: 'fire',
    };

    const warpEntity = gateToEntity(3, gateData, { x: 20, y: 0 });
    expect(warpEntity.archetype).toBe('warp');
    expect(warpEntity.components.transform?.x).toBe(20);
    expect(warpEntity.components.transform?.y).toBe(0);
    expect(warpEntity.components.warp?.targetMapId).toBe('SAINTS_CITY');
    expect(warpEntity.components.warp?.targetSpawn).toEqual({ x: 5, y: 10 });
    expect(warpEntity.components.warp?.requiredElement).toBe('fire');
  });
});
