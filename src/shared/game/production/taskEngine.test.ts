import { describe, it, expect } from 'vitest';
import {
  DependencyGraphEngine,
  createStudioTask,
  ResourceRef,
  DependencyEdge,
} from './taskEngine';

describe('Studio Task & Dependency Graph Engine (Bible 27 §3.5 & §3.6)', () => {
  it('creates and tracks development tasks linked to game resources', () => {
    const mapRef: ResourceRef = { type: 'map', id: 'saints_citadel' };
    const task = createStudioTask({
      projectId: 'world_custom_1',
      title: 'Tune boss encounter balance',
      description: 'Adjust hitpoints and ability cooldowns.',
      priority: 'high',
      reporterId: 'lead_dev',
      linkedResources: [mapRef],
    });

    expect(task.id).toBeDefined();
    expect(task.status).toBe('backlog');
    expect(task.priority).toBe('high');
    expect(task.linkedResources.length).toBe(1);
    expect(task.linkedResources[0].id).toBe('saints_citadel');
  });

  it('tracks dependencies and dependents across resources', () => {
    const mapRef: ResourceRef = { type: 'map', id: 'saints_citadel' };
    const lootRef: ResourceRef = { type: 'loot', id: 'citadel_boss_pool' };
    const itemRef: ResourceRef = { type: 'item', id: 'citadel_relic' };

    const edges: DependencyEdge[] = [
      { from: mapRef, to: lootRef, field: 'entities.spawners.lootPoolId', strength: 'hard' },
      { from: lootRef, to: itemRef, field: 'entries.itemId', strength: 'hard' },
    ];

    const engine = new DependencyGraphEngine(edges);

    // Map depends on Loot
    const mapDeps = engine.getDependenciesOf(mapRef);
    expect(mapDeps.length).toBe(1);
    expect(mapDeps[0].id).toBe('citadel_boss_pool');

    // Loot is depended on by Map
    const lootDependents = engine.getDependentsOf(lootRef);
    expect(lootDependents.length).toBe(1);
    expect(lootDependents[0].id).toBe('saints_citadel');

    expect(engine.hasHardDependency(mapRef, lootRef)).toBe(true);
    expect(engine.hasHardDependency(mapRef, itemRef)).toBe(false);
  });
});
