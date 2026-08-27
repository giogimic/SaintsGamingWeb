import { describe, it, expect, beforeEach } from 'vitest';
import { DependencyGraph, ProjectValidator } from './DependencyGraph';
import { BaseEntityDefinition } from '../entities/types';

describe('DependencyGraph & ProjectValidator', () => {
  let graph: DependencyGraph;
  let validator: ProjectValidator;

  beforeEach(() => {
    graph = new DependencyGraph();
    validator = new ProjectValidator(graph);
  });

  it('should detect missing asset references', () => {
    // 1. Define a mock entity with a broken reference
    const mockEntity: BaseEntityDefinition = {
      id: 'mon_goblin_01',
      version: 1,
      type: 'monster',
      name: 'Goblin',
      components: {},
      assetReferences: ['asset_goblin_sprite', 'asset_broken_sound'],
      isPublished: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 2. Register the entity in the graph
    graph.registerEntity(mockEntity);

    // 3. Define the set of valid assets (simulating DB query results)
    const validAssetIds = new Set(['asset_goblin_sprite']);

    // 4. Validate
    const issues = validator.validate([mockEntity], validAssetIds);

    // 5. Assertions
    expect(issues.length).toBe(1);
    expect(issues[0].missingReferenceId).toBe('asset_broken_sound');
    expect(issues[0].entityId).toBe('mon_goblin_01');
    expect(issues[0].message).toContain('references missing asset: asset_broken_sound');
  });

  it('should pass when all references are valid', () => {
    const mockEntity: BaseEntityDefinition = {
      id: 'item_potion_01',
      version: 1,
      type: 'item',
      name: 'Health Potion',
      components: {},
      assetReferences: ['asset_potion_icon'],
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    graph.registerEntity(mockEntity);

    const validAssetIds = new Set(['asset_potion_icon']);
    const issues = validator.validate([mockEntity], validAssetIds);

    expect(issues.length).toBe(0);
  });
});
