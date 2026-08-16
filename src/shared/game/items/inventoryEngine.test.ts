import { describe, it, expect } from 'vitest';
import {
  createEmptyInventory,
  addItemToInventory,
  removeItemFromInventory,
  swapInventorySlots,
} from './inventoryEngine';

describe('Player Inventory Stacking & Grid Manager (Bible 14)', () => {
  it('adds items to empty slots and merges into existing stacks', () => {
    const grid = createEmptyInventory(10);

    // 1. Add 50 wood logs (stack limit 99)
    const add1 = addItemToInventory(grid, 'log_wood', 50, 99);
    expect(add1.success).toBe(true);
    expect(grid.slots[0]?.quantity).toBe(50);

    // 2. Add 60 more wood logs (should fill slot 0 to 99, and overflow 11 into slot 1)
    const add2 = addItemToInventory(grid, 'log_wood', 60, 99);
    expect(add2.success).toBe(true);
    expect(grid.slots[0]?.quantity).toBe(99);
    expect(grid.slots[1]?.quantity).toBe(11);
  });

  it('rejects overflow when inventory capacity is exceeded', () => {
    const grid = createEmptyInventory(2); // Only 2 slots

    // Fill both slots with unstackables (maxStack = 1)
    addItemToInventory(grid, 'sword_iron', 1, 1);
    addItemToInventory(grid, 'shield_iron', 1, 1);

    // 3rd item should fail
    const add3 = addItemToInventory(grid, 'potion_hp', 1, 1);
    expect(add3.success).toBe(false);
    expect(add3.addedQuantity).toBe(0);
    expect(add3.remainingQuantity).toBe(1);
  });

  it('removes item quantities correctly across multiple stacks', () => {
    const grid = createEmptyInventory(5);
    addItemToInventory(grid, 'arrow', 100, 99); // Slot 0: 99, Slot 1: 1

    const rem = removeItemFromInventory(grid, 'arrow', 20);
    expect(rem.success).toBe(true);
    expect(grid.slots[1]).toBeNull(); // Slot 1 cleared (had 1)
    expect(grid.slots[0]?.quantity).toBe(80); // Slot 0 decremented by 19
  });

  it('merges stacks during drag-and-drop slot swapping', () => {
    const grid = createEmptyInventory(5);
    grid.slots[0] = { slotIndex: 0, itemId: 'ore_copper', quantity: 30, maxStack: 99 };
    grid.slots[1] = { slotIndex: 1, itemId: 'ore_copper', quantity: 20, maxStack: 99 };

    swapInventorySlots(grid, 0, 1);

    expect(grid.slots[1]?.quantity).toBe(50); // Merged into slot 1
    expect(grid.slots[0]).toBeNull(); // Slot 0 emptied
  });
});
