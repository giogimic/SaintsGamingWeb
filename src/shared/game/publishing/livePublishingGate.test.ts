import { describe, expect, it } from 'vitest';
import { validateForPublishing } from './livePublishingGate';
import { BaseEntityDefinition } from '../entities/types';

describe('livePublishingGate', () => {
  const existingEntities: BaseEntityDefinition[] = [
    {
      id: 'NPC_GUIDE',
      name: 'Guide Lucian',
      type: 'npc',
      version: 1,
      components: {},
      assetReferences: [],
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const knownAssetIds = new Set(['SPRITE_HERO_WALK', 'SFX_LEVEL_UP']);

  it('approves complete and valid entities, issuing a signed publication manifest', () => {
    const validEntity: BaseEntityDefinition = {
      id: 'QUEST_FIRST_STEPS',
      name: 'First Steps in the Valley',
      type: 'quest',
      version: 1,
      components: {},
      assetReferences: ['NPC_GUIDE', 'SFX_LEVEL_UP'],
      isPublished: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = validateForPublishing(
      validEntity,
      existingEntities,
      knownAssetIds,
      'creator_admin'
    );

    expect(result.eligible).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.manifest).toBeDefined();
    expect(result.manifest?.targetId).toBe('QUEST_FIRST_STEPS');
    expect(result.manifest?.publishedBy).toBe('creator_admin');
    expect(result.manifest?.versionHash).toMatch(/^[0-9a-f]{8}$/);
  });

  it('rejects publishing when an entity contains unresolvable asset references', () => {
    const invalidEntity: BaseEntityDefinition = {
      id: 'QUEST_BROKEN',
      name: 'Broken Quest',
      type: 'quest',
      version: 1,
      components: {},
      assetReferences: ['NON_EXISTENT_ASSET_XYZ'],
      isPublished: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = validateForPublishing(
      invalidEntity,
      existingEntities,
      knownAssetIds
    );

    expect(result.eligible).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].code).toBe('UNRESOLVED_REFERENCE');
    expect(result.manifest).toBeUndefined();
  });
});
