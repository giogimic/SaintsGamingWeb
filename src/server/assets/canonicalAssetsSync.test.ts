import { describe, it, expect, vi } from 'vitest';
import {
  buildCanonicalGameAssetRecords,
  syncCanonicalGameAssets,
} from './canonicalAssetsSync';

describe('canonicalAssetsSync', () => {
  it('builds canonical GameAsset records for all 6 base models and 52 modular parts', () => {
    const records = buildCanonicalGameAssetRecords();
    expect(records.length).toBe(58);

    const fullModels = records.filter((r) => r.id.startsWith('builtin-model-'));
    expect(fullModels.length).toBe(6);

    const modularPieces = records.filter((r) => r.id.startsWith('builtin-piece-'));
    expect(modularPieces.length).toBe(52);

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

    const girl = records.find((r) => r.id === 'builtin-model-stylized_girl');
    expect(girl).toBeDefined();
    expect(girl?.source).toBe('/game-assets/models/humanoids/stylized_girl/stylized_girl.glb');
    expect(JSON.parse(girl?.tags || '[]')).toContain('manny');

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

    // Test Brute modular piece
    const bruteHelmet = records.find((r) => r.id === 'builtin-piece-brute_helmet');
    expect(bruteHelmet).toBeDefined();
    expect(bruteHelmet?.source).toBe('/game-assets/models/humanoids/brute/brute.glb');
    const bruteMeta = JSON.parse(bruteHelmet?.metadata || '{}');
    expect(bruteMeta.componentCategory).toBe('hat');
    expect(bruteMeta.modularSetName).toBe('brute');
    expect(bruteMeta.meshName).toBe('Helmet1');

    // Test Adventurer modular piece
    const adventurerTop = records.find((r) => r.id === 'builtin-piece-adventurer_pullover');
    expect(adventurerTop).toBeDefined();
    expect(adventurerTop?.source).toBe('/game-assets/models/humanoids/adventurer/adventurer.glb');
    const advMeta = JSON.parse(adventurerTop?.metadata || '{}');
    expect(advMeta.componentCategory).toBe('shirt');
    expect(advMeta.modularSetName).toBe('adventurer');
    expect(advMeta.meshName).toBe('Man_Pullover_Mesh');

    // Test Stylized Girl modular piece
    const girlTop = records.find((r) => r.id === 'builtin-piece-stylized_girl_top');
    expect(girlTop).toBeDefined();
    expect(girlTop?.source).toBe('/game-assets/models/humanoids/stylized_girl/stylized_girl.glb');
    const girlMeta = JSON.parse(girlTop?.metadata || '{}');
    expect(girlMeta.componentCategory).toBe('shirt');
    expect(girlMeta.modularSetName).toBe('stylized_girl');
  });

  it('syncs records to prisma with upsert', async () => {
    const upsertMock = vi.fn().mockResolvedValue({});
    const fakePrisma = {
      gameAsset: {
        upsert: upsertMock,
      },
    };

    const count = await syncCanonicalGameAssets(fakePrisma);
    expect(count).toBe(58);
    expect(upsertMock).toHaveBeenCalledTimes(58);
  });
});
