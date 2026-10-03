import { describe, expect, it } from 'vitest';
import { getQuaterniusBodyRegionsToHide, getHiddenWardrobeAttachmentIndexes, shouldHideBaseMesh } from './quaterniusCharacter';

describe('Quaternius wardrobe visibility', () => {
  it('keeps intrinsic head visible under broad legacy body rules and ignores unequipped clothes', () => {
    expect(shouldHideBaseMesh('QuaterniusBody_Head', 'body')).toBe(false);
    expect(shouldHideBaseMesh('QuaterniusBody_Head', 'head')).toBe(false);
    expect(shouldHideBaseMesh('QuaterniusBody_Torso', 'torso')).toBe(true);
    expect(shouldHideBaseMesh('QuaterniusBody_Arms', 'torso')).toBe(false);
    expect(getQuaterniusBodyRegionsToHide([{ category: 'clothing', defaultVisible: false }])).toEqual([]);
  });
  it('hides only clothing-covered regions and preserves the head', () => {
    expect(getQuaterniusBodyRegionsToHide([
      { assetId: 'quat-male_ranger_body', category: 'clothing' },
      { assetId: 'quat-male_ranger_arms', category: 'arms' },
      { assetId: 'quat-male_ranger_legs', category: 'legs' },
      { assetId: 'quat-male_ranger_feet', category: 'shoes' },
      { assetId: 'quat-male_ranger_head_hood', category: 'hat', hidesComponents: ['hair'] },
    ])).toEqual(['torso', 'arms', 'legs', 'feet']);
  });

  it('lets a complete outfit replace the covered base and modular clothing while keeping the head free', () => {
    const completeOutfit = { assetId: 'quat-male_peasant_outfit', category: 'clothing', hidesComponents: ['clothing', 'arms', 'legs', 'shoes'] };
    expect(getQuaterniusBodyRegionsToHide([completeOutfit])).toEqual(['torso', 'arms', 'legs', 'feet']);
    expect(getHiddenWardrobeAttachmentIndexes([
      completeOutfit,
      { assetId: 'quat-male_peasant_body', category: 'clothing' },
      { assetId: 'quat-male_peasant_arms', category: 'arms' },
      { assetId: 'quat-male_peasant_legs', category: 'legs' },
      { assetId: 'quat-male_peasant_feet', category: 'shoes' },
      { assetId: 'quat-male_ranger_head_hood', category: 'hat' },
      { assetId: 'quat-hair_long', category: 'hair' },
    ])).toEqual([1, 2, 3, 4]);
  });

  it('suppresses a separate hair attachment when a hood is equipped regardless of load order', () => {
    expect(getHiddenWardrobeAttachmentIndexes([
      { assetId: 'quat-hair_long', category: 'hair' },
      { assetId: 'quat-male_ranger_head_hood', category: 'hat', hidesComponents: ['hair'] },
    ])).toEqual([0]);
    expect(getHiddenWardrobeAttachmentIndexes([
      { assetId: 'quat-male_ranger_head_hood', category: 'hat', hidesComponents: ['hair'] },
      { assetId: 'quat-hair_long', category: 'hair' },
    ])).toEqual([1]);
  });
});
