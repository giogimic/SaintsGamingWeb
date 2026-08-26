import { describe, it, expect } from 'vitest';
import { ProjectValidationRegistry } from './projectValidationRegistry';
import { ProjectDependencyGraph } from '../graph/dependencyGraph';

describe('ProjectValidationRegistry (Phase 1D)', () => {
  it('runs built-in validators and aggregates issues', async () => {
    const registry = new ProjectValidationRegistry();
    const graph = new ProjectDependencyGraph();

    // Add a valid node and a broken edge
    graph.addNode({ id: 'quest_broken', type: 'QUEST', name: 'Broken Quest' });
    graph.addEdge({
      fromId: 'quest_broken',
      fromType: 'QUEST',
      toId: 'non_existent_item',
      toType: 'ITEM',
      relation: 'rewards_item',
    });

    const report = await registry.validateProject(graph);
    expect(report.issues.length).toBeGreaterThan(0);

    const brokenEdgeIssue = report.issues.find((i) => i.code === 'ERR_BROKEN_DEPENDENCY');
    expect(brokenEdgeIssue).toBeDefined();
    expect(brokenEdgeIssue?.severity).toBe('ERROR');
    expect(brokenEdgeIssue?.entityId).toBe('quest_broken');
  });

  it('allows registering and unregistering custom domain validators', async () => {
    const registry = new ProjectValidationRegistry();

    registry.registerValidator('custom_test_validator', 'ECONOMY', () => [
      {
        code: 'WARN_FREE_SHOP_ITEM',
        category: 'ECONOMY',
        severity: 'WARNING',
        message: 'Shop has item priced at 0 gold.',
        suggestedAction: 'Set price or mark as gift.',
      },
    ]);

    const report = await registry.validateProject();
    const customIssue = report.issues.find((i) => i.code === 'WARN_FREE_SHOP_ITEM');
    expect(customIssue).toBeDefined();
    expect(customIssue?.severity).toBe('WARNING');

    // Remove validator
    registry.removeValidator('custom_test_validator');
    const report2 = await registry.validateProject();
    expect(report2.issues.find((i) => i.code === 'WARN_FREE_SHOP_ITEM')).toBeUndefined();
  });
});
