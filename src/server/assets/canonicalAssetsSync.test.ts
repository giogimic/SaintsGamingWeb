import { describe, it, expect, vi } from 'vitest';
import {
  buildCanonicalGameAssetRecords,
  syncCanonicalGameAssets,
} from './canonicalAssetsSync';

describe('canonicalAssetsSync', () => {
  it('builds canonical GameAsset records for Brute base model and 9 modular parts', () => {
    const records = buildCanonicalGameAssetRecords();
    expect(records.length).toBe(10);

    const fullModels = records.filter((r) => r.id.startsWith('builtin-model-'));
    expect(fullModels.length).toBe(1);

    const modularPieces = records.filter((r) => r.id.startsWith('builtin-piece-'));
    expect(modularPieces.length).toBe(9);

    const brute = records.find((r) => r.id === 'builtin-model-brute');
    expect(brute).toBeDefined();
    expect(brute?.source).toBe('/game-assets/models/humanoids/brute/brute.glb');
    expect(JSON.parse(brute?.tags || '[]')).toContain('manny');

    // Test Brute modular pieces
    const bruteHelmet = records.find((r) => r.id === 'builtin-piece-brute_helmet');
    expect(bruteHelmet).toBeDefined();
    expect(bruteHelmet?.source).toBe('/game-assets/models/humanoids/brute/brute.glb');
    const bruteMeta = JSON.parse(bruteHelmet?.metadata || '{}');
    expect(bruteMeta.componentCategory).toBe('hat');
    expect(bruteMeta.modularSetName).toBe('brute');
    expect(bruteMeta.meshName).toBe('Helmet1');

    const bruteHarness = records.find((r) => r.id === 'builtin-piece-brute_harness');
    expect(bruteHarness).toBeDefined();
    expect(bruteHarness?.source).toBe('/game-assets/models/humanoids/brute/brute.glb');
    const harnessMeta = JSON.parse(bruteHarness?.metadata || '{}');
    expect(harnessMeta.componentCategory).toBe('accessory');
    expect(harnessMeta.modularSetName).toBe('brute');
    expect(harnessMeta.meshName).toBe('Shoulder_Belt1');
  });

  it('syncs records to prisma with upsert', async () => {
    const upsertMock = vi.fn().mockResolvedValue({});
    const deleteManyMock = vi.fn().mockResolvedValue({});
    const fakePrisma = {
      gameAsset: {
        upsert: upsertMock,
        deleteMany: deleteManyMock,
      },
      characterModelProfile: {
        upsert: vi.fn().mockResolvedValue({}),
        deleteMany: vi.fn().mockResolvedValue({}),
      },
    };

    const count = await syncCanonicalGameAssets(fakePrisma);
    expect(count).toBe(10);
    expect(upsertMock).toHaveBeenCalledTimes(10);
    expect(deleteManyMock).toHaveBeenCalled();
  });
});
