import { describe, it, expect } from 'vitest';
import {
  createBankVault,
  setBankPin,
  unlockBank,
  depositItem,
  withdrawItem,
  moveItemToTab,
} from './bankEngine';

describe('Player Bank Vault & PIN Authentication Security Matrix (Bible 31)', () => {
  it('enforces 4-digit numeric bank PIN verification and lockout on 3 failed attempts', () => {
    const vault = createBankVault('player_vault_1');
    expect(setBankPin(vault, '123')).toEqual({ success: false, reason: 'Bank PIN must be exactly 4 numeric digits (0000-9999).' });
    expect(setBankPin(vault, '4321').success).toBe(true);

    // Fail 1
    const f1 = unlockBank(vault, '1111');
    expect(f1.success).toBe(false);
    expect(vault.failedPinAttempts).toBe(1);

    // Fail 2
    unlockBank(vault, '2222');
    expect(vault.failedPinAttempts).toBe(2);

    // Fail 3 -> Lockout
    const f3 = unlockBank(vault, '3333');
    expect(f3.success).toBe(false);
    expect(vault.isLockedOut).toBe(true);

    // Even correct PIN fails when locked out
    const locked = unlockBank(vault, '4321');
    expect(locked.success).toBe(false);
    expect(locked.reason).toContain('locked out');
  });

  it('deposits noted items as unnoted base items and stacks quantities', () => {
    const vault = createBankVault('player_vault_2');
    vault.isUnlocked = true;

    // Deposit 100 noted magic logs
    const dep1 = depositItem(vault, 'logs_magic_noted', 100, 3);
    expect(dep1.success).toBe(true);
    expect(vault.items.length).toBe(1);
    expect(vault.items[0].itemId).toBe('logs_magic');
    expect(vault.items[0].quantity).toBe(100);
    expect(vault.items[0].tabIndex).toBe(3);

    // Deposit another 50 unnoted magic logs -> stacks to 150
    const dep2 = depositItem(vault, 'logs_magic', 50);
    expect(dep2.success).toBe(true);
    expect(vault.items[0].quantity).toBe(150);
  });

  it('withdraws items as banknotes and moves items across tabs', () => {
    const vault = createBankVault('player_vault_3');
    vault.isUnlocked = true;
    depositItem(vault, 'raw_shark', 200, 0);

    // Move to Loot tab (index 4)
    moveItemToTab(vault, 'raw_shark', 4);
    expect(vault.items[0].tabIndex).toBe(4);

    // Withdraw 50 as noted banknote
    const withdraw = withdrawItem(vault, 'raw_shark', 50, true);
    expect(withdraw.success).toBe(true);
    expect(withdraw.withdrawnItemId).toBe('raw_shark_noted');
    expect(withdraw.withdrawnQuantity).toBe(50);
    expect(withdraw.isNoted).toBe(true);

    // Remaining in vault: 150 unnoted sharks
    expect(vault.items[0].quantity).toBe(150);
  });
});
