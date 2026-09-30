import { describe, it, expect, vi } from 'vitest';
import {
  buildCanonicalGameAssetRecords,
  syncCanonicalGameAssets,
} from './canonicalAssetsSync';

describe('canonicalAssetsSync', () => {
  it('builds canonical GameAsset records for all 4 base models and 44 modular parts', () => {
    const records = buildCanonicalGameAssetRecords();
    expect(records.length).toBe(48);

    const fullModels = records.filter((r) => r.id.startsWith('builtin-model-'));
    expect(fullModels.length).toBe(4);

    const modularPieces = records.filter((r) => r.id.startsWith('builtin-piece-'));
    expect(modularPieces.length).toBe(44);

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

    // Test Brute modular piece
    const bruteHelmet = records.find((r) => r.id === 'builtin-piece-brute_helmet');
    expect(bruteHelmet).toBeDefined();
    expect(bruteHelmet?.source).toBe('/game-assets/models/brute.glb');
    const bruteMeta = JSON.parse(bruteHelmet?.metadata || '{}');
    expect(bruteMeta.componentCategory).toBe('hat');
    expect(bruteMeta.modularSetName).toBe('brute');
    expect(bruteMeta.meshName).toBe('Helmet1');

    // Test Adventurer modular piece
    const adventurerTop = records.find((r) => r.id === 'builtin-piece-adventurer_pullover');
    expect(adventurerTop).toBeDefined();
    expect(adventurerTop?.source).toBe('/game-assets/models/adventurer.glb');
    const advMeta = JSON.parse(adventurerTop?.metadata || '{}');
    expect(advMeta.componentCategory).toBe('shirt');
    expect(advMeta.modularSetName).toBe('adventurer');
    expect(advMeta.meshName).toBe('Man_Pullover_Mesh');
  });

  it('syncs records to prisma with upsert', async () => {
    const upsertMock = vi.fn().mockResolvedValue({});
    const fakePrisma = {
      gameAsset: {
        upsert: upsertMock,
      },
    };

    const count = await syncCanonicalGameAssets(fakePrisma);
    expect(count).toBe(48);
    expect(upsertMock).toHaveBeenCalledTimes(48);
  });
});
