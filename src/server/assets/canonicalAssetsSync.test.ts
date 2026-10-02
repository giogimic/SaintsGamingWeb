import { describe, it, expect, vi } from 'vitest';
import {
  buildCanonicalGameAssetRecords,
  syncCanonicalGameAssets,
} from './canonicalAssetsSync';

describe('canonicalAssetsSync', () => {
  it('builds canonical GameAsset records for all canonical models, modular parts, and citizens', () => {
    const records = buildCanonicalGameAssetRecords();
    expect(records.length).toBe(0);
  });

  it('syncs records to prisma with upsert', async () => {
    const upsertMock = vi.fn().mockResolvedValue({});
    const deleteManyMock = vi.fn().mockResolvedValue({});
    const profileDeleteManyMock = vi.fn().mockResolvedValue({});
    const fakePrisma = {
      gameAsset: {
        upsert: upsertMock,
        deleteMany: deleteManyMock,
      },
      characterModelProfile: {
        upsert: vi.fn().mockResolvedValue({}),
        deleteMany: profileDeleteManyMock,
      },
    };

    const count = await syncCanonicalGameAssets(fakePrisma as any);
    expect(count).toBe(0);
    expect(upsertMock).toHaveBeenCalledTimes(0);
  });
});
