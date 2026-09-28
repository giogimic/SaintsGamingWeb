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
      expect(glassesSlot).toBe('head_accessory');
      expect(beardSlot).toBe('beard');
      expect(hairSlot).toBe('hair');
      expect(hatSlot).toBe('hat');

      // All 5 head/facial slots are mutually unique so they never collide!
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

      expect(getModelWardrobeSlotId(pants)).toBe('pants');
      expect(getModelWardrobeSlotId(boots)).toBe('shoes');
      expect(getModelWardrobeSlotId(gloves)).toBe('gloves');
      expect(getModelWardrobeSlotId(cape)).toBe('back');
      expect(getModelWardrobeSlotId(belt)).toBe('belt');
      expect(getModelWardrobeSlotId(sword)).toBe('weapon_main');
      expect(getModelWardrobeSlotId(shield)).toBe('weapon_off');
    });

    it('heals legacy broad tags when item keywords clearly indicate a more specific slot', () => {
      // Legacy item in DB was tagged broad category 'face' but is actually glasses
      const legacyGlasses = {
        assetId: 'face_glasses_aviator',
        label: 'Aviator Glasses',
        category: 'face',
      };
      expect(getModelWardrobeCategory(legacyGlasses)).toBe('head_accessory');
      expect(getModelWardrobeSlotId(legacyGlasses)).toBe('head_accessory');

      // Legacy item in DB was tagged broad category 'hair' but is actually a beard
      const legacyBeard = {
        assetId: 'hair_dwarf_beard',
        label: 'Braided Dwarf Beard',
        category: 'hair',
      };
      expect(getModelWardrobeCategory(legacyBeard)).toBe('beard');
      expect(getModelWardrobeSlotId(legacyBeard)).toBe('beard');

      // Legacy item in DB was tagged broad category 'hat' but is actually a ninja mask
      const legacyMask = {
        assetId: 'hat_ninja_mask',
        label: 'Black Ninja Mask',
        category: 'hat',
      };
      expect(getModelWardrobeCategory(legacyMask)).toBe('mask');
      expect(getModelWardrobeSlotId(legacyMask)).toBe('mask');
    });

    it('maps legacy slot aliases to canonical CharacterComponentCategory', () => {
      expect(getModelWardrobeSlotId({ assetId: 'item1', slot: 'eyewear' })).toBe('head_accessory');
      expect(getModelWardrobeSlotId({ assetId: 'item2', slot: 'headwear' })).toBe('hat');
      expect(getModelWardrobeSlotId({ assetId: 'item3', slot: 'upper_body' })).toBe('clothing');
      expect(getModelWardrobeSlotId({ assetId: 'item4', slot: 'legs' })).toBe('pants');
      expect(getModelWardrobeSlotId({ assetId: 'item5', slot: 'feet' })).toBe('shoes');
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

    it('resolves sunglasses and shades aliases correctly to head_accessory', () => {
      expect(getModelWardrobeCategory({ assetId: 'shades_test', category: 'shades' })).toBe('head_accessory');
      expect(getModelWardrobeCategory({ assetId: 'sunglasses_test', category: 'sunglasses' })).toBe('head_accessory');
    });

    it('resolves animal ears to head_accessory and earrings to accessory without colliding with face', () => {
      expect(getModelWardrobeCategory({ assetId: 'cat_ears_01', label: 'Cat Ears Headband' })).toBe('head_accessory');
      expect(getModelWardrobeCategory({ assetId: 'bunny_ears_pink', label: 'Bunny Ears' })).toBe('head_accessory');
      expect(getModelWardrobeCategory({ assetId: 'gold_earrings', label: 'Gold Hoop Earrings' })).toBe('accessory');
      expect(getModelWardrobeCategory({ assetId: 'silver_earring_left', label: 'Silver Stud' })).toBe('accessory');
    });
  });
});

