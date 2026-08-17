import { describe, it, expect } from 'vitest';
import {
  classifyCreatureAsset,
  CREATURE_ASSET_OPTIONS,
  CREATURE_SUBCATEGORY_LABELS,
  type CreatureAssetSubcategory,
} from './creatureCatalog';

describe('Creature Asset Subcategories (Phase 4B)', () => {
  it('correctly classifies front sprites', () => {
    expect(classifyCreatureAsset('public/assets/tuxemon/agnite-front.png')).toBe('front_sprite');
    expect(classifyCreatureAsset('/game-assets/monster/rockitten_front_1.png')).toBe('front_sprite');
    expect(classifyCreatureAsset('budaye-front2.png')).toBe('front_sprite');
  });

  it('correctly classifies back sprites', () => {
    expect(classifyCreatureAsset('public/assets/tuxemon/agnite-back.png')).toBe('back_sprite');
    expect(classifyCreatureAsset('/game-assets/monster/rockitten_back_1.png')).toBe('back_sprite');
  });

  it('correctly classifies face portraits', () => {
    expect(classifyCreatureAsset('public/assets/tuxemon/agnite-face.png')).toBe('face_portrait');
    expect(classifyCreatureAsset('/game-assets/monster/face/rockitten_face.png')).toBe('face_portrait');
  });

  it('correctly classifies battle sheets', () => {
    expect(classifyCreatureAsset('monster/battle/agnite-sheet.png')).toBe('battle_sheet');
    expect(classifyCreatureAsset('/game-assets/monster/battle/rockitten-sheet.png')).toBe('battle_sheet');
  });

  it('correctly classifies overworld sprites', () => {
    expect(classifyCreatureAsset('creatures/rockitten-ow.png')).toBe('overworld');
    expect(classifyCreatureAsset('/game-assets/world-monsters/boss-ow.png')).toBe('overworld');
  });

  it('provides readable human labels for all creature subcategories', () => {
    const categories: CreatureAssetSubcategory[] = [
      'battle_sheet',
      'front_sprite',
      'back_sprite',
      'face_portrait',
      'overworld',
    ];
    for (const cat of categories) {
      expect(CREATURE_SUBCATEGORY_LABELS[cat]).toBeDefined();
      expect(typeof CREATURE_SUBCATEGORY_LABELS[cat]).toBe('string');
    }
  });

  it('assigns subcategories to curated creature asset options', () => {
    for (const opt of CREATURE_ASSET_OPTIONS) {
      if (opt.kind === 'battle') {
        expect(opt.subcategory).toBe('battle_sheet');
      } else if (opt.kind === 'overworld') {
        expect(opt.subcategory).toBe('overworld');
      }
    }
  });
});
