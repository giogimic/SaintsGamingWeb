import { describe, expect, it } from 'vitest';
import { analyzeDeletionImpact } from './impactAnalysis';
import { BaseEntityDefinition } from '../entities/types';

describe('impactAnalysis', () => {
  const entities: BaseEntityDefinition[] = [
    {
      id: 'ITEM_HERO_SWORD',
      name: 'Hero Sword',
      type: 'item',
      version: 1,
      components: {},
      assetReferences: [],
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'QUEST_SWORD_TRAIL',
      name: 'Legend of the Sword',
      type: 'quest',
      version: 1,
      components: {},
      assetReferences: ['ITEM_HERO_SWORD'],
      isPublished: true, // Published -> Blocking
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'NPC_BLACKSMITH',
      name: 'Blacksmith Doran',
      type: 'npc',
      version: 1,
      components: { inventoryItem: 'ITEM_HERO_SWORD' },
      assetReferences: [],
      isPublished: false, // Draft -> Warning
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  it('identifies cascading dependents with correct severity classifications', () => {
    const result = analyzeDeletionImpact('ITEM_HERO_SWORD', entities);

    expect(result.targetEntityId).toBe('ITEM_HERO_SWORD');
    expect(result.totalDependents).toBe(2);
    expect(result.blockingCount).toBe(1); // QUEST_SWORD_TRAIL is published
    expect(result.warningCount).toBe(1); // NPC_BLACKSMITH is draft
    expect(result.canDeleteSafely).toBe(false);
  });

  it('permits safe deletion when no dependents exist', () => {
    const result = analyzeDeletionImpact('NPC_BLACKSMITH', entities);

    expect(result.totalDependents).toBe(0);
    expect(result.canDeleteSafely).toBe(true);
  });

  it('includes map spawn points in impact analysis', () => {
    const maps = [
      {
        id: 'MAP_MARKET',
        name: 'Grand Market',
        isPublished: true,
        spawns: [{ npcId: 'NPC_BLACKSMITH' }],
      },
    ];

    const result = analyzeDeletionImpact('NPC_BLACKSMITH', entities, maps);
    expect(result.totalDependents).toBe(1);
    expect(result.blockingCount).toBe(1);
    expect(result.canDeleteSafely).toBe(false);
  });
});
