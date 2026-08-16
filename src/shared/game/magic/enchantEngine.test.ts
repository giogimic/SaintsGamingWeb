import { describe, it, expect } from 'vitest';
import { enchantJewelry } from './enchantEngine';

describe('Enchantment Matrix & Jewel Infusion Engine (Bible 14)', () => {
  it('enchants sapphire ring into ring of recoil with standard runes', () => {
    const runes = { rune_water: 5, rune_cosmic: 2 };
    const enchant = enchantJewelry('ring_sapphire', 10, runes);

    expect(enchant.success).toBe(true);
    expect(enchant.enchantedItemId).toBe('ring_of_recoil');
    expect(enchant.consumedRunes).toEqual({ rune_water: 1, rune_cosmic: 1 });
    expect(enchant.xpAwarded).toBe(17.5);
  });

  it('enchants ruby amulet into amulet of strength with fire staff discounting fire runes', () => {
    // Player has only cosmic runes, no fire runes
    const runes = { rune_cosmic: 5 };

    const enchant = enchantJewelry('amulet_ruby', 50, runes, 'rune_fire');

    expect(enchant.success).toBe(true);
    expect(enchant.enchantedItemId).toBe('amulet_of_strength');
    expect(enchant.consumedRunes).toEqual({ rune_cosmic: 1 }); // rune_fire was waived
    expect(enchant.xpAwarded).toBe(59);
  });

  it('blocks enchantment when Magic level is insufficient', () => {
    const runes = { rune_fire: 20, rune_earth: 20, rune_cosmic: 5 };

    // Onyx requires Level 87 Magic (player has 70 -> blocked)
    const failLevel = enchantJewelry('amulet_onyx', 70, runes);
    expect(failLevel.success).toBe(false);
    expect(failLevel.reason).toContain('Requires Magic level 87');
  });

  it('enforces charged jewelry creation with initial charge count', () => {
    const runes = { rune_air: 10, rune_cosmic: 5 };
    const enchant = enchantJewelry('ring_emerald', 30, runes);

    expect(enchant.success).toBe(true);
    expect(enchant.enchantedItemId).toBe('ring_of_dueling_8');
    expect(enchant.charges).toBe(8);
  });
});
