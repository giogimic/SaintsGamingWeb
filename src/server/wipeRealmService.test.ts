import { describe, it, expect, vi } from 'vitest';
import { wipeNonBundledRealmContent } from './wipeRealmService';
import { DEMO_MAP_ID } from './demoMapSeed';

vi.mock('@/server/DemoBootstrap', () => ({
  ensureStudioMapFoundation: vi.fn().mockResolvedValue({ logicTiles: true, demoMap: true }),
}));

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
    };

    const result = await wipeNonBundledRealmContent(mockPrisma);

    expect(result.ok).toBe(true);
    expect(result.wipedMapsCount).toBe(5);
    expect(result.wipedCharactersCount).toBe(3);

    // Verify maps wiped exclude DEMO_MAP_ID
    expect(deletedMapWhere.length).toBe(1);
    expect(deletedMapWhere[0]?.id?.notIn).toContain(DEMO_MAP_ID);

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
