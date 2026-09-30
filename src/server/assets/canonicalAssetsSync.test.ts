import { describe, it, expect, vi } from 'vitest';
import {
  buildCanonicalGameAssetRecords,
  syncCanonicalGameAssets,
} from './canonicalAssetsSync';

describe('canonicalAssetsSync', () => {
  it('builds canonical GameAsset records for all 5 base models and 44 modular parts', () => {
    const records = buildCanonicalGameAssetRecords();
    expect(records.length).toBe(49);

    const fullModels = records.filter((r) => r.id.startsWith('builtin-model-'));
    expect(fullModels.length).toBe(5);

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
    expect(brute?.source).toBe('/game-assets/models/humanoids/brute/brute.glb');
    expect(JSON.parse(brute?.tags || '[]')).toContain('manny');

    const adventurer = records.find((r) => r.id === 'builtin-model-adventurer');
    expect(adventurer).toBeDefined();
    expect(adventurer?.source).toBe('/game-assets/models/humanoids/adventurer/adventurer.glb');
    expect(JSON.parse(adventurer?.tags || '[]')).toContain('manny');

    const golem = records.find((r) => r.id === 'builtin-model-golem');
    expect(golem).toBeDefined();
    expect(golem?.source).toBe('/game-assets/models/creatures/golems/golem_base.glb');
    expect(JSON.parse(golem?.tags || '[]')).toContain('creature');

    const shadowGolem = records.find((r) => r.id === 'builtin-model-shadow_golem');
    expect(shadowGolem).toBeDefined();
    expect(shadowGolem?.source).toBe('/game-assets/models/creatures/golems/shadow_golem_attacks.glb');

    const cap = records.find((r) => r.id === 'builtin-piece-citizen_hat_cap');
    expect(cap).toBeDefined();
    expect(cap?.source).toBe('/game-assets/models/citizen/Hat_010.glb');
    const capMeta = JSON.parse(cap?.metadata || '{}');
    expect(capMeta.componentCategory).toBe('hat');
    expect(capMeta.modularSetName).toBe('citizen');

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

    // Test Adventurer modular piece
    const adventurerTop = records.find((r) => r.id === 'builtin-piece-adventurer_pullover');
    expect(adventurerTop).toBeDefined();
    expect(adventurerTop?.source).toBe('/game-assets/models/humanoids/adventurer/adventurer.glb');
    const advMeta = JSON.parse(adventurerTop?.metadata || '{}');
    expect(advMeta.componentCategory).toBe('shirt');
    expect(advMeta.modularSetName).toBe('adventurer');
    expect(advMeta.meshName).toBe('Man_Pullover_Mesh');
  });

  it('syncs records to prisma with upsert', async () => {
    const upsertMock = vi.fn().mockResolvedValue({});
    const deleteManyMock = vi.fn().mockResolvedValue({});
    const fakePrisma = {
      gameAsset: {
        upsert: upsertMock,
        deleteMany: deleteManyMock,
      },
    };

    const count = await syncCanonicalGameAssets(fakePrisma);
    expect(count).toBe(49);
    expect(upsertMock).toHaveBeenCalledTimes(49);
    expect(deleteManyMock).toHaveBeenCalled();
  });
});
