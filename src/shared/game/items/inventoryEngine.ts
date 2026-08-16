/**
 * Saints Gaming — Player Inventory Stacking & Grid Engine (Bible 14)
 * Manages fixed-slot inventory grids, stack merging, capacity checks, and slot transfers.
 */

export interface InventorySlot {
  slotIndex: number;
  itemId: string;
  quantity: number;
  maxStack?: number;
}

export interface InventoryGrid {
  capacity: number; // e.g. 28 slots (classic MMO style)
  slots: Array<InventorySlot | null>;
}

export interface AddItemResult {
  success: boolean;
  addedQuantity: number;
  remainingQuantity: number;
}

export const DEFAULT_INVENTORY_CAPACITY = 28;
export const DEFAULT_MAX_STACK = 999;

/**
 * Creates an empty inventory grid with the specified slot capacity.
 */
export function createEmptyInventory(capacity: number = DEFAULT_INVENTORY_CAPACITY): InventoryGrid {
  return {
    capacity,
    slots: Array.from({ length: capacity }, () => null),
  };
}

/**
 * Adds an item stack to the inventory, merging into existing stacks first before claiming empty slots.
 */
export function addItemToInventory(
  grid: InventoryGrid,
  itemId: string,
  quantity: number,
  maxStack: number = DEFAULT_MAX_STACK
): AddItemResult {
  if (quantity <= 0) {
    return { success: true, addedQuantity: 0, remainingQuantity: 0 };
  }

  let remaining = quantity;

  // 1. Try to merge into existing stacks of the same item
  if (maxStack > 1) {
    for (let i = 0; i < grid.capacity; i++) {
      const slot = grid.slots[i];
      if (slot && slot.itemId === itemId && slot.quantity < maxStack) {
        const canTake = maxStack - slot.quantity;
        const toAdd = Math.min(remaining, canTake);
        slot.quantity += toAdd;
        remaining -= toAdd;

        if (remaining === 0) break;
      }
    }
  }

  // 2. Place remaining quantity into empty slots
  if (remaining > 0) {
    for (let i = 0; i < grid.capacity; i++) {
      if (grid.slots[i] === null) {
        const toAdd = Math.min(remaining, maxStack);
        grid.slots[i] = {
          slotIndex: i,
          itemId,
          quantity: toAdd,
          maxStack,
        };
        remaining -= toAdd;

        if (remaining === 0) break;
      }
    }
  }

  const addedQuantity = quantity - remaining;
  return {
    success: remaining === 0,
    addedQuantity,
    remainingQuantity: remaining,
  };
}

/**
 * Removes a specific quantity of an item from the inventory.
 */
export function removeItemFromInventory(
  grid: InventoryGrid,
  itemId: string,
  quantity: number
): { success: boolean; removedQuantity: number } {
  let needed = quantity;

  for (let i = grid.capacity - 1; i >= 0; i--) {
    const slot = grid.slots[i];
    if (slot && slot.itemId === itemId) {
      if (slot.quantity <= needed) {
        needed -= slot.quantity;
        grid.slots[i] = null;
      } else {
        slot.quantity -= needed;
        needed = 0;
      }

      if (needed === 0) break;
    }
  }

  const removedQuantity = quantity - needed;
  return {
    success: needed === 0,
    removedQuantity,
  };
}

/**
 * Swaps two slots in the inventory, merging them if they contain identical items.
 */
export function swapInventorySlots(
  grid: InventoryGrid,
  fromIndex: number,
  toIndex: number
): boolean {
  if (
    fromIndex < 0 ||
    fromIndex >= grid.capacity ||
    toIndex < 0 ||
    toIndex >= grid.capacity
  ) {
    return false;
  }

  const fromSlot = grid.slots[fromIndex];
  const toSlot = grid.slots[toIndex];

  // If both slots contain the same item and have space, merge them
  if (fromSlot && toSlot && fromSlot.itemId === toSlot.itemId) {
    const maxStack = toSlot.maxStack ?? DEFAULT_MAX_STACK;
    const canTake = maxStack - toSlot.quantity;
    if (canTake > 0) {
      const transfer = Math.min(fromSlot.quantity, canTake);
      toSlot.quantity += transfer;
      fromSlot.quantity -= transfer;

      if (fromSlot.quantity === 0) {
        grid.slots[fromIndex] = null;
      }
      return true;
    }
  }

  // Standard swap
  grid.slots[fromIndex] = toSlot ? { ...toSlot, slotIndex: fromIndex } : null;
  grid.slots[toIndex] = fromSlot ? { ...fromSlot, slotIndex: toIndex } : null;
  return true;
}
