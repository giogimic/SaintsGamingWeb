import { describe, expect, it } from 'vitest';
import {
  CraftingRecipe,
  EnchantmentRune,
  MasterCraftingEngine,
} from './masterCraftingEngine';

describe('Master Player Crafting & Item Enchanting Engine (Phase 53)', () => {
  const runiteBladeRecipe: CraftingRecipe = {
    id: 'recipe_runite_blade',
    name: 'Runite Longsword',
    discipline: 'SMITHING',
    requiredStation: 'FORGE',
    requiredLevel: 85,
    ingredients: [
      { itemId: 'runite_bar', quantity: 2 },
      { itemId: 'coal', quantity: 8 },
    ],
    outputItemId: 'runite_longsword',
    outputQuantity: 1,
    baseXp: 150,
    enchantmentSockets: 2,
  };

  const flamebrandRune: EnchantmentRune = {
    runeId: 'rune_flamebrand',
    name: 'Flamebrand Rune',
    bonusStat: 'FIRE_DAMAGE',
    bonusValue: 15,
    description: 'Infuses weapon strikes with +15 scorching flame damage.',
  };

  it('crafts items, consumes inventory ingredients, and supports rune socketing', () => {
    const engine = new MasterCraftingEngine();
    engine.registerRecipe(runiteBladeRecipe);
    engine.registerRune(flamebrandRune);

    const inventory = new Map<string, number>([
      ['runite_bar', 5],
      ['coal', 20],
    ]);

    // 1. Craft Masterwork Runite Longsword at Forge
    const craft = engine.craftRecipe(
      'crafter_bob',
      'recipe_runite_blade',
      99,
      'FORGE',
      inventory,
      'MASTERWORK'
    );

    expect(craft.success).toBe(true);
    expect(craft.outputItem?.name).toContain('MASTERWORK Runite Longsword');
    expect(craft.outputItem?.enchantmentSockets).toBe(2);
    expect(inventory.get('runite_bar')).toBe(3);
    expect(inventory.get('coal')).toBe(12);

    const blade = craft.outputItem!;

    // 2. Socket Flamebrand Rune into socket 1
    const sock1 = engine.socketEnchantment(blade, 'rune_flamebrand');
    expect(sock1.success).toBe(true);
    expect(blade.slottedRunes).toHaveLength(1);
    expect(blade.slottedRunes[0].bonusStat).toBe('FIRE_DAMAGE');

    // 3. Socket second rune into socket 2
    const sock2 = engine.socketEnchantment(blade, 'rune_flamebrand');
    expect(sock2.success).toBe(true);
    expect(blade.slottedRunes).toHaveLength(2);

    // 4. Attempt socketing into 3rd socket (max 2) -> Fails
    const sock3 = engine.socketEnchantment(blade, 'rune_flamebrand');
    expect(sock3.success).toBe(false);
    expect(sock3.error).toContain('No available enchantment sockets');
  });

  it('handles blind experimental recipe discovery with double bonus experience', () => {
    const engine = new MasterCraftingEngine();
    engine.registerRecipe(runiteBladeRecipe);

    // 1. Blind experiment with exact ingredients at Forge
    const exp = engine.experimentCraft('crafter_alice', 'SMITHING', 'FORGE', 90, [
      { itemId: 'runite_bar', quantity: 2 },
      { itemId: 'coal', quantity: 8 },
    ]);

    expect(exp.success).toBe(true);
    expect(exp.recipeDiscovered?.id).toBe('recipe_runite_blade');
    expect(exp.bonusXp).toBe(300); // 150 * 2

    // 2. Blind experiment with unknown invalid ingredients -> Fizzles
    const invalidExp = engine.experimentCraft('crafter_alice', 'SMITHING', 'FORGE', 90, [
      { itemId: 'dirt', quantity: 10 },
    ]);

    expect(invalidExp.success).toBe(false);
    expect(invalidExp.error).toContain('fizzled');
  });
});
