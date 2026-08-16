import { describe, it, expect } from 'vitest';
import {
  initializePortCraftingState,
  addScrollPiece,
  craftAncientItem,
  ANCIENT_RECIPES,
} from './portCraftingEngine';

describe('Port Trade Goods Economy & Ancient Armor Crafting Matrix', () => {
  it('tracks 4 scroll pieces per recipe to unlock crafting', () => {
    const state = initializePortCraftingState();
    expect(state.unlockedScrolls.tetsu_body).toBeUndefined();

    // Add 1st, 2nd, 3rd piece
    addScrollPiece(state, 'tetsu_body');
    addScrollPiece(state, 'tetsu_body');
    const p3 = addScrollPiece(state, 'tetsu_body');
    expect(p3.currentPieces).toBe(3);
    expect(p3.isFullyUnlocked).toBe(false);

    // 4th piece unlocks
    const p4 = addScrollPiece(state, 'tetsu_body');
    expect(p4.currentPieces).toBe(4);
    expect(p4.isFullyUnlocked).toBe(true);
  });

  it('enforces skill levels and resource costs when crafting Tetsu armor', () => {
    const state = initializePortCraftingState();
    // Unlock all 4 scrolls for Tetsu Body
    for (let i = 0; i < 4; i++) addScrollPiece(state, 'tetsu_body');

    // Insufficient Smithing (level 1 < 90)
    const failSkill = craftAncientItem(state, 'tetsu_body');
    expect(failSkill.success).toBe(false);
    expect(failSkill.error).toContain('level 90 smithing');

    state.skillLevels.smithing = 90;

    // Insufficient Plate (0 < 100)
    const failMat = craftAncientItem(state, 'tetsu_body');
    expect(failMat.success).toBe(false);
    expect(failMat.error).toContain('Insufficient plate');

    // Add plate and craft successfully
    state.resources.plate = 120;
    const res = craftAncientItem(state, 'tetsu_body');
    expect(res.success).toBe(true);
    expect(res.outputItem?.id).toBe('superior_tetsu_body');
    expect(state.resources.plate).toBe(20); // 120 - 100
  });

  it('crafts Death Lotus, Seasinger, and Scrimshaws with appropriate trade resources', () => {
    const state = initializePortCraftingState();
    // Unlock and level up for Scrimshaw of Vampyrism (Ancient Bones + Fletching 90)
    for (let i = 0; i < 4; i++) addScrollPiece(state, 'scrimshaw_vampyrism');
    state.skillLevels.fletching = 92;
    state.resources.ancient_bones = 15;

    const res = craftAncientItem(state, 'scrimshaw_vampyrism');
    expect(res.success).toBe(true);
    expect(res.outputItem?.id).toBe('superior_scrimshaw_vampyrism');
    expect(state.resources.ancient_bones).toBe(5); // 15 - 10
  });
});
