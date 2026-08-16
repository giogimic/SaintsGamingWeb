/**
 * Saints Gaming — Player Bank Vault & PIN Authentication Security Matrix (Bible 31)
 * Manages player bank vault slots, 4-digit PIN verification, tab organization, and banknote conversions.
 */

export interface BankItem {
  itemId: string;
  quantity: number;
  tabIndex: number;
}

export interface BankVault {
  playerId: string;
  pin?: string;
  isUnlocked: boolean;
  failedPinAttempts: number;
  isLockedOut: boolean;
  maxSlots: number;
  tabs: string[];
  items: BankItem[];
}

export function createBankVault(playerId: string, maxSlots: number = 800): BankVault {
  return {
    playerId,
    isUnlocked: false,
    failedPinAttempts: 0,
    isLockedOut: false,
    maxSlots,
    tabs: ['Main', 'Combat', 'Magic', 'Crafting', 'Loot'],
    items: [],
  };
}

/**
 * Sets or updates a 4-digit bank PIN.
 */
export function setBankPin(
  vault: BankVault,
  pin: string
): { success: boolean; reason?: string } {
  if (!/^\d{4}$/.test(pin)) {
    return { success: false, reason: 'Bank PIN must be exactly 4 numeric digits (0000-9999).' };
  }

  vault.pin = pin;
  return { success: true };
}

/**
 * Unlocks the bank vault using the 4-digit PIN.
 */
export function unlockBank(
  vault: BankVault,
  pin: string
): { success: boolean; reason?: string } {
  if (vault.isLockedOut) {
    return { success: false, reason: 'Vault is locked out due to too many failed attempts.' };
  }

  if (!vault.pin) {
    vault.isUnlocked = true;
    return { success: true };
  }

  if (vault.pin === pin) {
    vault.isUnlocked = true;
    vault.failedPinAttempts = 0;
    return { success: true };
  } else {
    vault.failedPinAttempts += 1;
    if (vault.failedPinAttempts >= 3) {
      vault.isLockedOut = true;
      return { success: false, reason: 'Incorrect PIN. Vault is now locked out.' };
    }
    return {
      success: false,
      reason: `Incorrect PIN. ${3 - vault.failedPinAttempts} attempts remaining.`,
    };
  }
}

/**
 * Deposits items into the bank vault (un-noting banknotes automatically).
 */
export function depositItem(
  vault: BankVault,
  itemId: string,
  quantity: number,
  tabIndex: number = 0
): { success: boolean; depositedQuantity: number; reason?: string } {
  if (!vault.isUnlocked && vault.pin) {
    return { success: false, depositedQuantity: 0, reason: 'Bank vault is locked.' };
  }

  if (quantity <= 0) {
    return { success: false, depositedQuantity: 0, reason: 'Invalid deposit quantity.' };
  }

  // Canonical base item ID (stripping banknote suffix if any)
  const baseItemId = itemId.replace(/_noted$/, '');

  const existing = vault.items.find((i) => i.itemId === baseItemId);
  if (existing) {
    existing.quantity += quantity;
    return { success: true, depositedQuantity: quantity };
  }

  if (vault.items.length >= vault.maxSlots) {
    return { success: false, depositedQuantity: 0, reason: 'Bank vault is full.' };
  }

  vault.items.push({
    itemId: baseItemId,
    quantity,
    tabIndex: Math.max(0, Math.min(vault.tabs.length - 1, tabIndex)),
  });

  return { success: true, depositedQuantity: quantity };
}

/**
 * Withdraws items from the bank vault, optionally converting into noted banknotes.
 */
export function withdrawItem(
  vault: BankVault,
  itemId: string,
  quantity: number,
  asNote: boolean = false
): {
  success: boolean;
  withdrawnItemId?: string;
  withdrawnQuantity: number;
  isNoted: boolean;
  reason?: string;
} {
  if (!vault.isUnlocked && vault.pin) {
    return {
      success: false,
      withdrawnQuantity: 0,
      isNoted: false,
      reason: 'Bank vault is locked.',
    };
  }

  const baseItemId = itemId.replace(/_noted$/, '');
  const itemIndex = vault.items.findIndex((i) => i.itemId === baseItemId);

  if (itemIndex === -1) {
    return {
      success: false,
      withdrawnQuantity: 0,
      isNoted: false,
      reason: 'Item not found in bank vault.',
    };
  }

  const bankItem = vault.items[itemIndex];
  const actualQty = Math.min(bankItem.quantity, quantity);

  bankItem.quantity -= actualQty;
  if (bankItem.quantity <= 0) {
    vault.items.splice(itemIndex, 1);
  }

  const finalItemId = asNote ? `${baseItemId}_noted` : baseItemId;

  return {
    success: true,
    withdrawnItemId: finalItemId,
    withdrawnQuantity: actualQty,
    isNoted: asNote,
  };
}

/**
 * Moves an item to a specific bank tab.
 */
export function moveItemToTab(
  vault: BankVault,
  itemId: string,
  targetTabIndex: number
): { success: boolean; reason?: string } {
  const item = vault.items.find((i) => i.itemId === itemId);
  if (!item) {
    return { success: false, reason: 'Item not found in vault.' };
  }

  item.tabIndex = Math.max(0, Math.min(vault.tabs.length - 1, targetTabIndex));
  return { success: true };
}
