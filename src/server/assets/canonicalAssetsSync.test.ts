import { describe, it, expect, vi } from 'vitest';
import {
  buildCanonicalGameAssetRecords,
  syncCanonicalGameAssets,
} from './canonicalAssetsSync';

describe('canonicalAssetsSync', () => {
  it('builds canonical GameAsset records for all canonical models, modular parts, and citizens', () => {
    const records = buildCanonicalGameAssetRecords();
    expect(records).toHaveLength(142);
    expect(records.find((record) => record.id === 'quat-quaternius_base_male')).toMatchObject({
      type: 'CHARACTER',
      source: '/models/quaternius/quaternius_base_male.glb',
    });
    expect(records.find((record) => record.id === 'quat-male_ranger_head_hood')?.metadata).toContain('"hidesComponents":["hair"]');
    expect(records.filter((record) => record.type === 'ANIMATION')).toHaveLength(4);
    expect(records.filter((record) => record.type === 'CREATURE')).toHaveLength(2);
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
    expect(count).toBe(142);
    expect(upsertMock).toHaveBeenCalledTimes(142);
    expect(fakePrisma.characterModelProfile.upsert).toHaveBeenCalledTimes(2);
  });
});
