import { describe, it, expect, vi } from 'vitest';
import {
  buildCanonicalGameAssetRecords,
  syncCanonicalGameAssets,
} from './canonicalAssetsSync';

describe('canonicalAssetsSync', () => {
  it('builds canonical GameAsset records for all 4 base models and 30 modular parts', () => {
    const records = buildCanonicalGameAssetRecords();
    expect(records.length).toBe(34);

    const fullModels = records.filter((r) => r.id.startsWith('builtin-model-'));
    expect(fullModels.length).toBe(4);

    const modularPieces = records.filter((r) => r.id.startsWith('builtin-piece-'));
    expect(modularPieces.length).toBe(30);

    const citizen = records.find((r) => r.id === 'builtin-model-citizen');
    expect(citizen).toBeDefined();
    expect(citizen?.source).toBe('/game-assets/models/citizen.glb');
    expect(citizen?.type).toBe('MODEL');
    expect(JSON.parse(citizen?.tags || '[]')).toContain('mixamo');
    expect(JSON.parse(citizen?.metadata || '{}').anim).toBe('MocapMobility');

    const brute = records.find((r) => r.id === 'builtin-model-brute');
    expect(brute).toBeDefined();
    expect(brute?.source).toBe('/game-assets/models/brute.glb');
    expect(JSON.parse(brute?.tags || '[]')).toContain('manny');

    const golem = records.find((r) => r.id === 'builtin-model-golem');
    expect(golem).toBeDefined();
    expect(golem?.source).toBe('/game-assets/models/golem.glb');
    expect(JSON.parse(golem?.tags || '[]')).toContain('creature');

    const cap = records.find((r) => r.id === 'builtin-piece-citizen_hat_cap');
    expect(cap).toBeDefined();
    expect(cap?.source).toBe('/game-assets/models/citizen/Hat_010.glb');
    const capMeta = JSON.parse(cap?.metadata || '{}');
    expect(capMeta.componentCategory).toBe('hat');
    expect(capMeta.modularSetName).toBe('citizen');
  });

  it('syncs records to prisma with upsert', async () => {
    const upsertMock = vi.fn().mockResolvedValue({});
    const fakePrisma = {
      gameAsset: {
        upsert: upsertMock,
      },
    };

    const count = await syncCanonicalGameAssets(fakePrisma);
    expect(count).toBe(34);
    expect(upsertMock).toHaveBeenCalledTimes(34);
  });
});
