import { describe, it, expect, vi } from 'vitest';
import {
  buildCanonicalGameAssetRecords,
  syncCanonicalGameAssets,
} from './canonicalAssetsSync';

describe('canonicalAssetsSync', () => {
  it('builds canonical GameAsset records for all canonical models, modular parts, and citizens', () => {
    const records = buildCanonicalGameAssetRecords();
    expect(records.length).toBe(65);

    const fullModels = records.filter((r) => r.id.startsWith('builtin-model-'));
    expect(fullModels.length).toBe(6);

    const modularPieces = records.filter((r) => r.id.startsWith('builtin-piece-'));
    expect(modularPieces.length).toBe(17);

    const citizenModels = records.filter((r) => r.id.startsWith('builtin-citizen-'));
    expect(citizenModels.length).toBe(42);
    expect(new Set(citizenModels.map((r) => r.source)).size).toBe(42);
    expect(citizenModels.find((r) => r.id === 'builtin-citizen-girl_1')?.source)
      .toBe('/game-assets/models/humanoids/citizens/glb/girl_1.glb');
    expect(citizenModels.every((r) => r.fileSize > 0)).toBe(true);

    const brute = records.find((r) => r.id === 'builtin-model-brute');
    expect(brute).toBeDefined();
    expect(brute?.source).toBe('/game-assets/models/humanoids/brute/brute.glb');
    expect(JSON.parse(brute?.tags || '[]')).toContain('manny');

    const boy = records.find((r) => r.id === 'builtin-model-boy');
    expect(boy).toBeDefined();
    expect(boy?.source).toBe('/game-assets/models/humanoids/boy/boy.glb');

    const girl = records.find((r) => r.id === 'builtin-model-girl');
    expect(girl).toBeDefined();
    expect(girl?.source).toBe('/game-assets/models/humanoids/girl/girl.glb');

    const asianGirl = records.find((r) => r.id === 'builtin-model-asian_girl');
    expect(asianGirl).toBeDefined();
    expect(asianGirl?.source).toBe('/game-assets/models/humanoids/asian_girl/asian_girl.glb');

    // Test Brute modular pieces
    const bruteHelmet = records.find((r) => r.id === 'builtin-piece-brute_helmet');
    expect(bruteHelmet).toBeDefined();
    expect(bruteHelmet?.source).toBe('/game-assets/models/humanoids/brute/brute.glb');
    const bruteMeta = JSON.parse(bruteHelmet?.metadata || '{}');
    expect(bruteMeta.componentCategory).toBe('hat');
    expect(bruteMeta.modularSetName).toBe('brute');
    expect(bruteMeta.meshName).toBe('Helmet1');

    // Test Asian Girl modular pieces
    const agShirt = records.find((r) => r.id === 'builtin-piece-ag_shirt');
    expect(agShirt).toBeDefined();
    expect(agShirt?.source).toBe('/game-assets/models/humanoids/asian_girl/asian_girl.glb');
    expect(JSON.parse(agShirt?.metadata || '{}')).toMatchObject({
      isSubmesh: true,
      meshName: '4_+Shirt1_01_0_0',
    });

    // Test Katana prop
    const katana = records.find((r) => r.id === 'builtin-piece-katana');
    expect(katana).toBeDefined();
    expect(katana?.source).toBe('/game-assets/models/humanoids/asian_girl/katana.glb');
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
    const repeatedCount = await syncCanonicalGameAssets(fakePrisma);
    expect(count).toBe(65);
    expect(repeatedCount).toBe(65);
    expect(upsertMock).toHaveBeenCalledTimes(130);
    expect(deleteManyMock).toHaveBeenCalledTimes(2);

    const cleanup = deleteManyMock.mock.calls[0][0] as any;
    const pieceFilter = cleanup.where.OR.find((filter: any) => filter.id.startsWith === 'builtin-piece-');
    expect(pieceFilter.id.notIn).toContain('builtin-piece-katana');
    expect(pieceFilter.id.notIn).not.toContain('builtin-piece-obsolete');
  });
});
