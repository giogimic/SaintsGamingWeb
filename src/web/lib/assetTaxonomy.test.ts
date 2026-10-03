import { describe, expect, it } from 'vitest';
import { detectAssetTaxonomy } from './assetTaxonomy';

describe('asset upload intent', () => {
  it('keeps an animation-bank upload classified as an animation asset', () => {
    const result = detectAssetTaxonomy('UAL2_Standard.glb', undefined, undefined, 1, 'animation_pack');
    expect(result).toMatchObject({
      category: 'animation_pack',
      structure: 'Complete',
      label: 'Animation Bank',
      suggestedRoles: ['Animation'],
    });
  });
});
