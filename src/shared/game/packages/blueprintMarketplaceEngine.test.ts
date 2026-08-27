import { describe, expect, it } from 'vitest';
import { BlueprintMarketplaceEngine } from './blueprintMarketplaceEngine';

describe('Creator Marketplace, Community Studio Blueprints & Mod Sharing Engine (Phase 21)', () => {
  it('publishes blueprints and computes accurate star review averages', () => {
    const engine = new BlueprintMarketplaceEngine();

    const bp = engine.publishBlueprint({
      title: 'Volcanic Dungeon Ruins',
      description: 'A 3-level underground molten cavern.',
      category: 'DUNGEON_LAYOUT',
      authorId: 'creator_1',
      authorName: 'MasterArchitect',
      isVerifiedCreator: true,
      version: '1.0.0',
      tags: ['Dungeon', 'Fire', 'Boss'],
      contents: [
        { type: 'map', slug: 'map_volcano_01', name: 'Volcano Floor 1', data: { width: 30, height: 30 } },
      ],
    });

    expect(bp.title).toBe('Volcanic Dungeon Ruins');
    expect(bp.tags).toContain('dungeon');

    // Submit reviews: 5 stars, 4 stars, 5 stars -> Average = 4.7
    engine.submitReview(bp.id, 5);
    engine.submitReview(bp.id, 4);
    const rev = engine.submitReview(bp.id, 5);

    expect(rev.totalReviews).toBe(3);
    expect(rev.averageRating).toBe(4.7);
  });

  it('filters and sorts marketplace blueprints accurately', () => {
    const engine = new BlueprintMarketplaceEngine();

    const bp1 = engine.publishBlueprint({
      title: 'Beginner Forest Questline',
      description: 'Gentle intro quests.',
      category: 'QUESTLINE',
      authorId: 'creator_2',
      authorName: 'StoryTeller',
      isVerifiedCreator: false,
      version: '1.0.0',
      tags: ['Quest', 'Forest', 'Beginner'],
      contents: [],
    });

    const bp2 = engine.publishBlueprint({
      title: 'Cyberpunk Neon Arena',
      description: 'PvP minigame arena with synthwave lights.',
      category: 'MINIGAME_ARENA',
      authorId: 'creator_1',
      authorName: 'MasterArchitect',
      isVerifiedCreator: true,
      version: '2.0.0',
      tags: ['PvP', 'Arena', 'Cyber'],
      contents: [],
    });

    engine.submitReview(bp1.id, 3);
    engine.submitReview(bp2.id, 5);

    // 1. Filter by category QUESTLINE
    const questResults = engine.queryMarketplace({ category: 'QUESTLINE' });
    expect(questResults).toHaveLength(1);
    expect(questResults[0].title).toBe('Beginner Forest Questline');

    // 2. Filter by tag 'cyber'
    const tagResults = engine.queryMarketplace({ tag: 'cyber' });
    expect(tagResults).toHaveLength(1);
    expect(tagResults[0].title).toBe('Cyberpunk Neon Arena');

    // 3. Sort by HIGHEST_RATED
    const topRated = engine.queryMarketplace({ sortBy: 'HIGHEST_RATED' });
    expect(topRated[0].id).toBe(bp2.id); // 5.0 vs 3.0
  });

  it('handles pre-flight import collision resolution with rename, overwrite, and skip strategies', () => {
    const engine = new BlueprintMarketplaceEngine();

    const bp = engine.publishBlueprint({
      title: 'Haunted Crypt Pack',
      description: 'Spooky assets.',
      category: 'DUNGEON_LAYOUT',
      authorId: 'creator_3',
      authorName: 'GhostDev',
      isVerifiedCreator: false,
      version: '1.0.0',
      tags: ['crypt'],
      contents: [
        { type: 'map', slug: 'map_crypt_01', name: 'Crypt Map', data: {} },
        { type: 'creature', slug: 'monster_crypt_ghoul', name: 'Ghoul', data: {} },
      ],
    });

    // Workspace already contains 'map_crypt_01'
    const workspaceSlugs = new Set(['map_crypt_01']);

    // 1. Strategy: RENAME_WITH_PREFIX
    const resRename = engine.analyzeAndResolveImport(bp.id, workspaceSlugs, 'RENAME_WITH_PREFIX', 'mod_');
    expect(resRename.conflicts).toHaveLength(1);
    expect(resRename.conflicts[0].proposedSlug).toBe('mod_map_crypt_01');
    expect(resRename.resolvedContents.find((c) => c.slug === 'mod_map_crypt_01')).toBeDefined();

    // 2. Strategy: SKIP
    const resSkip = engine.analyzeAndResolveImport(bp.id, workspaceSlugs, 'SKIP');
    expect(resSkip.conflicts).toHaveLength(1);
    // Collided item is dropped, uncollided item remains
    expect(resSkip.resolvedContents).toHaveLength(1);
    expect(resSkip.resolvedContents[0].slug).toBe('monster_crypt_ghoul');

    // 3. Strategy: OVERWRITE
    const resOverwrite = engine.analyzeAndResolveImport(bp.id, workspaceSlugs, 'OVERWRITE');
    expect(resOverwrite.resolvedContents).toHaveLength(2);
    expect(resOverwrite.resolvedContents[0].slug).toBe('map_crypt_01');
  });
});
