import { describe, it, expect } from 'vitest';
import { ProjectDependencyGraph } from './dependencyGraph';

describe('Global DependencyGraph (Phase 1C)', () => {
  it('tracks dependencies and dependents accurately', () => {
    const graph = new ProjectDependencyGraph();

    graph.addNode({ id: 'item_herb', type: 'ITEM', name: 'Healing Herb' });
    graph.addNode({ id: 'recipe_potion', type: 'RECIPE', name: 'Health Potion Recipe' });
    graph.addNode({ id: 'quest_intro', type: 'QUEST', name: 'Introductory Alchemy' });

    // Recipe requires item
    graph.addEdge({
      fromId: 'recipe_potion',
      fromType: 'RECIPE',
      toId: 'item_herb',
      toType: 'ITEM',
      relation: 'consumes_ingredient',
    });

    // Quest requires recipe completion
    graph.addEdge({
      fromId: 'quest_intro',
      fromType: 'QUEST',
      toId: 'recipe_potion',
      toType: 'RECIPE',
      relation: 'requires_recipe',
    });

    const itemDeps = graph.getDependents('item_herb');
    expect(itemDeps.length).toBe(1);
    expect(itemDeps[0].fromId).toBe('recipe_potion');

    const recipeDeps = graph.getDependencies('recipe_potion');
    expect(recipeDeps.length).toBe(1);
    expect(recipeDeps[0].toId).toBe('item_herb');
  });

  it('detects broken references when target node does not exist', () => {
    const graph = new ProjectDependencyGraph();

    graph.addNode({ id: 'quest_slay', type: 'QUEST', name: 'Slay the Dragon' });

    // Edge pointing to non-existent monster
    graph.addEdge({
      fromId: 'quest_slay',
      fromType: 'QUEST',
      toId: 'monster_dragon_boss',
      toType: 'MONSTER',
      relation: 'target_monster',
    });

    const broken = graph.detectBrokenReferences();
    expect(broken.length).toBe(1);
    expect(broken[0].sourceId).toBe('quest_slay');
    expect(broken[0].targetId).toBe('monster_dragon_boss');
  });

  it('finds unused assets in the project', () => {
    const graph = new ProjectDependencyGraph();

    graph.addNode({ id: 'asset_tree', type: 'ASSET', name: 'Oak Tree Sprite' });
    graph.addNode({ id: 'asset_unused_banner', type: 'ASSET', name: 'Old Beta Banner' });
    graph.addNode({ id: 'map_forest', type: 'MAP', name: 'Whispering Woods' });

    graph.addEdge({
      fromId: 'map_forest',
      fromType: 'MAP',
      toId: 'asset_tree',
      toType: 'ASSET',
      relation: 'contains_tile',
    });

    const unused = graph.findUnusedAssets();
    expect(unused.length).toBe(1);
    expect(unused[0].id).toBe('asset_unused_banner');
  });

  it('computes deletion impact analysis with cascade reporting', () => {
    const graph = new ProjectDependencyGraph();

    graph.addNode({ id: 'item_core_ore', type: 'ITEM', name: 'Mythril Ore' });
    graph.addNode({ id: 'recipe_mythril_bar', type: 'RECIPE', name: 'Smelt Mythril' });
    graph.addNode({ id: 'quest_blacksmith', type: 'QUEST', name: 'Master Smith' });

    graph.addEdge({
      fromId: 'recipe_mythril_bar',
      fromType: 'RECIPE',
      toId: 'item_core_ore',
      toType: 'ITEM',
      relation: 'requires_resource',
    });

    graph.addEdge({
      fromId: 'quest_blacksmith',
      fromType: 'QUEST',
      toId: 'recipe_mythril_bar',
      toType: 'RECIPE',
      relation: 'requires_craft',
    });

    const report = graph.analyzeDeletionImpact('item_core_ore');
    expect(report.canSafelyDelete).toBe(false);
    expect(report.totalDirectDependents).toBe(1);
    expect(report.cascadeAffectedIds).toContain('recipe_mythril_bar');
    expect(report.cascadeAffectedIds).toContain('quest_blacksmith');
    expect(report.warnings.length).toBeGreaterThan(0);
  });
});
