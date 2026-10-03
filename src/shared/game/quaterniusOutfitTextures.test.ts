import { describe, expect, it } from 'vitest';
import { getQuaterniusOutfitTextureVariants } from './quaterniusOutfitTextures';

describe('Quaternius outfit texture variants', () => {
  it('only exposes verified Peasant and Ranger base-color variants', () => {
    expect(getQuaterniusOutfitTextureVariants('peasant')).toEqual([
      { id: 'default', label: 'Original colors' },
      {
        id: 'peasant-2',
        label: 'Color variation 2',
        textureVariantUrl: '/models/quaternius/textures/T_Peasant_2_BaseColor.png',
      },
    ]);
    expect(getQuaterniusOutfitTextureVariants('ranger')).toEqual([
      { id: 'default', label: 'Original colors' },
      {
        id: 'ranger-3',
        label: 'Color variation 3',
        textureVariantUrl: '/models/quaternius/textures/T_Ranger_3_BaseColor.png',
      },
    ]);
  });

  it('does not imply unsupported color maps for other asset families', () => {
    expect(getQuaterniusOutfitTextureVariants('regular')).toEqual([]);
    expect(getQuaterniusOutfitTextureVariants(undefined)).toEqual([]);
  });
});
