import { describe, it, expect, vi } from 'vitest';
import { wipeNonBundledRealmContent } from './wipeRealmService';



vi.mock('@/shared/game/mapCache', () => ({
  invalidateMapCache: vi.fn(),
  invalidateLogicTilesCache: vi.fn(),
}));

describe('wipeNonBundledRealmContent', () => {
  it('wipes non-bundled maps, custom characters, non-bundled assets, and resets setup settings', async () => {
    const deletedMapWhere: any[] = [];
    const deletedAssetWhere: any[] = [];
    const deletedSettingWhere: any[] = [];

    const mockPrisma = {
      worldMap: {
        deleteMany: vi.fn().mockImplementation((args) => {
          deletedMapWhere.push(args?.where);
          return Promise.resolve({ count: 5 });
        }),
      },
      worldMapVersion: {
        deleteMany: vi.fn().mockResolvedValue({ count: 12 }),
      },
      mapSyncEntry: {
        deleteMany: vi.fn().mockResolvedValue({ count: 8 }),
      },
      mapPrefab: {
        deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
      gameQuest: {
        deleteMany: vi.fn().mockResolvedValue({ count: 4 }),
      },
      gameCharacter: {
        deleteMany: vi.fn().mockResolvedValue({ count: 3 }),
      },
      playerCreature: {
        deleteMany: vi.fn().mockResolvedValue({ count: 6 }),
      },
      playerInventoryItem: {
        deleteMany: vi.fn().mockResolvedValue({ count: 20 }),
      },
      playerSkill: {
        deleteMany: vi.fn().mockResolvedValue({ count: 15 }),
      },
      playerQuestState: {
        deleteMany: vi.fn().mockResolvedValue({ count: 4 }),
      },
      gtcListing: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      gameAsset: {
        deleteMany: vi.fn().mockImplementation((args) => {
          deletedAssetWhere.push(args?.where);
          return Promise.resolve({ count: 7 });
        }),
      },
      siteSetting: {
        deleteMany: vi.fn().mockImplementation((args) => {
          deletedSettingWhere.push(args?.where);
          return Promise.resolve({ count: 9 });
        }),
      },
      starterHero: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
      characterClass: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
      abilityDictionary: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
      creatureDef: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
      itemTemplate: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
      mountTemplate: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
      dungeonTemplate: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
      shopTemplate: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
      professionTemplate: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
      craftingRecipe: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
      worldEventTemplate: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
      questTemplate: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
      creatureElement: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
      elementEffectiveness: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    };

    const result = await wipeNonBundledRealmContent(mockPrisma);

    expect(result.ok).toBe(true);
    expect(result.wipedMapsCount).toBe(5);
    expect(result.wipedCharactersCount).toBe(3);

    // Verify all maps are wiped with no exclusions
    expect(mockPrisma.worldMap.deleteMany).toHaveBeenCalledWith({});

    // Verify non-bundled asset filtering
    expect(deletedAssetWhere.length).toBe(1);
    expect(deletedAssetWhere[0]?.NOT?.tags?.contains).toBe('bundled');

    // Verify setup settings are deleted
    expect(deletedSettingWhere.length).toBe(1);
    expect(deletedSettingWhere[0]?.key?.in).toContain('GAME_INITIALIZED');
    expect(deletedSettingWhere[0]?.key?.in).toContain('SETUP_COMPLETED');
    expect(deletedSettingWhere[0]?.key?.in).toContain('DEFAULT_MAP_ID');

    // Verify related tables were cleared
    expect(mockPrisma.worldMapVersion.deleteMany).toHaveBeenCalled();
    expect(mockPrisma.mapSyncEntry.deleteMany).toHaveBeenCalled();
    expect(mockPrisma.mapPrefab.deleteMany).toHaveBeenCalled();
    expect(mockPrisma.gameQuest.deleteMany).toHaveBeenCalled();
    expect(mockPrisma.playerCreature.deleteMany).toHaveBeenCalled();
  });
});
