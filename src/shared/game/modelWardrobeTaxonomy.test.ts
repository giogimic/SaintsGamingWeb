import { describe, it, expect } from 'vitest';
import {
  getModelWardrobeCategory,
  getModelWardrobeSlotId,
  getDefaultModelWardrobeAttachmentMode,
  getDefaultModelWardrobeSocket,
} from './modelWardrobe';

describe('modelWardrobeTaxonomy & Slot Separation', () => {
  describe('Face vs Eyewear vs Mask vs Beard (No Slot Collisions)', () => {
    it('accurately distinguishes faces from glasses, masks, and beards', () => {
      // Faces
      expect(getModelWardrobeCategory({ assetId: 'male_face_01', label: 'Male Face 1' })).toBe('face');
      expect(getModelWardrobeCategory({ assetId: 'head_base_human', label: 'Human Head Base' })).toBe('face');
      expect(getModelWardrobeCategory({ assetId: 'character_face_mesh', label: 'Standard Face' })).toBe('face');

      // Glasses / Eyewear
      expect(getModelWardrobeCategory({ assetId: 'face_accessory_glasses', label: 'Aviator Glasses' })).toBe('head_accessory');
      expect(getModelWardrobeCategory({ assetId: 'char_face_sunglasses', label: 'Cool Shades' })).toBe('head_accessory');
      expect(getModelWardrobeCategory({ assetId: 'goggles_steampunk', label: 'Brass Goggles' })).toBe('head_accessory');
      expect(getModelWardrobeCategory({ assetId: 'eyepatch_pirate', label: 'Leather Eyepatch' })).toBe('head_accessory');

      // Masks
      expect(getModelWardrobeCategory({ assetId: 'ninja_face_mask', label: 'Ninja Mask' })).toBe('mask');
      expect(getModelWardrobeCategory({ assetId: 'bandana_red', label: 'Outlaw Bandana' })).toBe('mask');

      // Beards & Facial Hair
      expect(getModelWardrobeCategory({ assetId: 'dwarf_beard_braided', label: 'Braided Beard' })).toBe('beard');
      expect(getModelWardrobeCategory({ assetId: 'french_moustache', label: 'Gentleman Mustache' })).toBe('beard');

      // Hair
      expect(getModelWardrobeCategory({ assetId: 'hair_ponytail_blonde', label: 'Blonde Ponytail' })).toBe('hair');
      expect(getModelWardrobeCategory({ assetId: 'curly_afro_black', label: 'Black Afro' })).toBe('hair');
    });

    it('maps to completely separate slot IDs so faces and glasses can be mixed', () => {
      const faceItem = { assetId: 'hero_face_01', label: 'Hero Face' };
      const glassesItem = { assetId: 'face_accessory_shades', label: 'Aviator Shades' };
      const beardItem = { assetId: 'rugged_beard', label: 'Rugged Beard' };
      const hairItem = { assetId: 'spiky_hair', label: 'Spiky Hair' };
      const hatItem = { assetId: 'cowboy_hat', label: 'Cowboy Hat' };

      const faceSlot = getModelWardrobeSlotId(faceItem);
      const glassesSlot = getModelWardrobeSlotId(glassesItem);
      const beardSlot = getModelWardrobeSlotId(beardItem);
      const hairSlot = getModelWardrobeSlotId(hairItem);
      const hatSlot = getModelWardrobeSlotId(hatItem);

      expect(faceSlot).toBe('face');
      expect(glassesSlot).toBe('eyewear');
      expect(beardSlot).toBe('beard');
      expect(hairSlot).toBe('hair');
      expect(hatSlot).toBe('headwear');

      // All 5 head/facial slots are mutually unique!
      const uniqueSlots = new Set([faceSlot, glassesSlot, beardSlot, hairSlot, hatSlot]);
      expect(uniqueSlots.size).toBe(5);
    });
  });

  describe('Clothing and Gear Granular Slots', () => {
    it('separates shirts from outerwear jackets, cloaks, and robes', () => {
      const shirt = { assetId: 'iron_chestplate', label: 'Iron Chestplate' };
      const jacket = { assetId: 'shadow_cloak', label: 'Shadow Cloak' };
      const robe = { assetId: 'mage_robe_outer', label: 'Mage Robes' };

      expect(getModelWardrobeSlotId(shirt)).toBe('shirt');
      expect(getModelWardrobeSlotId(jacket)).toBe('jacket');
      expect(getModelWardrobeSlotId(robe)).toBe('jacket');
      expect(getModelWardrobeSlotId(shirt)).not.toBe(getModelWardrobeSlotId(jacket));
    });

    it('separates pants, shoes, gloves, capes, belts, and weapons', () => {
      const pants = { assetId: 'denim_jeans', label: 'Blue Jeans' };
      const boots = { assetId: 'combat_boots', label: 'Combat Boots' };
      const gloves = { assetId: 'steel_gauntlets', label: 'Steel Gauntlets' };
      const cape = { assetId: 'hero_cape', label: 'Hero Cape' };
      const belt = { assetId: 'leather_belt', label: 'Leather Belt' };
      const sword = { assetId: 'iron_sword', label: 'Iron Sword' };
      const shield = { assetId: 'wooden_shield', label: 'Wooden Shield' };

      expect(getModelWardrobeSlotId(pants)).toBe('legs');
      expect(getModelWardrobeSlotId(boots)).toBe('feet');
      expect(getModelWardrobeSlotId(gloves)).toBe('gloves');
      expect(getModelWardrobeSlotId(cape)).toBe('back');
      expect(getModelWardrobeSlotId(belt)).toBe('belt');
      expect(getModelWardrobeSlotId(sword)).toBe('weapon_main');
      expect(getModelWardrobeSlotId(shield)).toBe('weapon_off');
    });

    it('gives explicit item category precedence over ambiguous name guessing', () => {
      // Even if the name contains "face", an explicit category of "head_accessory" wins
      const itemWithExplicitCat = {
        assetId: 'custom_item_face_prop',
        label: 'Prop',
        category: 'head_accessory',
      };
      expect(getModelWardrobeCategory(itemWithExplicitCat)).toBe('head_accessory');
      expect(getModelWardrobeSlotId(itemWithExplicitCat)).toBe('eyewear');
    });

    it('defaults wearable modular clothing to SKINNED and weapons/offhand to sockets', () => {
      expect(getDefaultModelWardrobeAttachmentMode({ assetId: 'face_01' })).toBe('SKINNED');
      expect(getDefaultModelWardrobeAttachmentMode({ assetId: 'shades_01' })).toBe('SKINNED');
      expect(getDefaultModelWardrobeAttachmentMode({ assetId: 'robe_01' })).toBe('SKINNED');
      expect(getDefaultModelWardrobeAttachmentMode({ assetId: 'cape_01', isModular: true })).toBe('SKINNED');

      expect(getDefaultModelWardrobeSocket({ assetId: 'shield_01' })).toBe('LeftHandMount');
      expect(getDefaultModelWardrobeSocket({ assetId: 'sword_01' })).toBe('RightHandMount');
      expect(getDefaultModelWardrobeSocket({ assetId: 'backpack_01' })).toBe('ChestMount');
    });
  });
});
