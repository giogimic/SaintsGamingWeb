import { describe, it, expect } from 'vitest';
import {
  createEntityFromArchetype,
  buildRuntimeEntities,
  gateToEntity,
  npcToEntity,
} from './index';

describe('Entity Runtime Factory (Bible 20 §20 E4)', () => {
  it('extracts NPCs, warps, resource nodes, and spawners into runtime simulation collections', () => {
    const npc = npcToEntity({
      id: 'npc_guide',
      name: 'Guide Luna',
      x: 5,
      y: 5,
      sprite: 'npc_luna',
    });

    const warp = gateToEntity(0, { targetMapId: 'SAINTS_VILLAGE', spawnPoint: { x: 10, y: 10 } }, { x: 0, y: 5 });

    const tree = createEntityFromArchetype('resource_node', 'Oak Tree', 8, 8, 'tree_oak');

    const spawner = createEntityFromArchetype('spawner', 'Wolf Spawner', 15, 15);
    spawner.components.spawner = {
      spawnArchetype: 'monster',
      spawnTemplateId: 'wolf_wild',
      maxActive: 4,
      radius: 5,
      intervalSec: 30,
    };

    const runtime = buildRuntimeEntities([npc, warp, tree, spawner]);

    expect(runtime.npcs.length).toBe(1);
    expect(runtime.npcs[0].name).toBe('Guide Luna');

    expect(runtime.gates['0_5']).toBeDefined();
    expect(runtime.gates['0_5'].targetMapId).toBe('SAINTS_VILLAGE');

    expect(runtime.resourceNodes.length).toBe(1);
    expect(runtime.resourceNodes[0].resourceType).toBe('wood');
    expect(runtime.resourceNodes[0].x).toBe(8);

    expect(runtime.spawners.length).toBe(1);
    expect(runtime.spawners[0].maxActive).toBe(4);
  });

  it('skips disabled entities during runtime simulation extraction', () => {
    const disabledNpc = npcToEntity({
      id: 'npc_hidden',
      name: 'Hidden NPC',
      x: 1,
      y: 1,
      sprite: 'npc_hidden',
    });
    disabledNpc.components.enabled = false;

    const runtime = buildRuntimeEntities([disabledNpc]);
    expect(runtime.npcs.length).toBe(0);
  });
});
