/**
 * Sunfire Splinter Economy & Dizana's Quiver Upgrade Engine (Bible 24 & Bible 27).
 *
 * Implements:
 * - Dizana's Quiver item mechanics: Dual Ammo Slot (Primary Arrows, Secondary Bolts).
 * - Sunfire Splinter charging: 1 splinter = 10 charges.
 * - Permanent Blessing: 150,000 Sunfire Splinters + 1 sacrifice Quiver.
 * - Combat bonuses: +18 Ranged Accuracy, +2 base Ranged Strength, +1 Sunfire Max Hit when charged/blessed.
 * - Weapon ammo auto-resolution (Bows use Arrow slot, Crossbows use Bolt slot).
 */

export interface QuiverAmmoSlot {
  itemId: string;
  name: string;
  ammoType: 'ARROW' | 'BOLT' | 'JAVELIN';
  quantity: number;
}

export interface DizanasQuiverState {
  isBlessed: boolean; // Infinite charges
  chargesRemaining: number;
  primarySlot: QuiverAmmoSlot | null;
  secondarySlot: QuiverAmmoSlot | null;
}

export interface QuiverCombatStats {
  rangedAccuracy: number;
  baseRangedStrength: number;
  sunfireMaxHitBonus: number;
  prayerBonus: number;
}

export const SPLINTERS_PER_CHARGE = 10; // 1 splinter = 10 charges
export const BLESSED_QUIVER_SPLINTER_COST = 150000;

/**
 * Initializes a fresh Dizana's Quiver.
 */
export function createDizanasQuiver(): DizanasQuiverState {
  return {
    isBlessed: false,
    chargesRemaining: 0,
    primarySlot: null,
    secondarySlot: null,
  };
}

/**
 * Adds Sunfire Splinters to charge an unblessed Quiver.
 */
export function chargeQuiverWithSplinters(
  quiver: DizanasQuiverState,
  splinterCount: number
): { success: boolean; newCharges: number; splintersConsumed: number; error?: string } {
  if (quiver.isBlessed) {
    return { success: false, newCharges: Infinity, splintersConsumed: 0, error: 'Quiver is permanently blessed' };
  }

  if (splinterCount <= 0) {
    return { success: false, newCharges: quiver.chargesRemaining, splintersConsumed: 0, error: 'Invalid splinter count' };
  }

  const addedCharges = splinterCount * SPLINTERS_PER_CHARGE;
  quiver.chargesRemaining += addedCharges;

  return {
    success: true,
    newCharges: quiver.chargesRemaining,
    splintersConsumed: splinterCount,
  };
}

/**
 * Permanently blesses Dizana's Quiver (costs 150,000 Sunfire Splinters and 1 sacrifice Quiver).
 */
export function blessDizanasQuiver(
  quiver: DizanasQuiverState,
  playerSplinterInventory: number,
  playerSacrificeQuivers: number
): { success: boolean; splintersRemaining: number; error?: string } {
  if (quiver.isBlessed) {
    return { success: false, splintersRemaining: playerSplinterInventory, error: 'Quiver is already blessed' };
  }

  if (playerSplinterInventory < BLESSED_QUIVER_SPLINTER_COST) {
    return {
      success: false,
      splintersRemaining: playerSplinterInventory,
      error: `Requires ${BLESSED_QUIVER_SPLINTER_COST} Sunfire Splinters (Available: ${playerSplinterInventory})`,
    };
  }

  if (playerSacrificeQuivers < 1) {
    return {
      success: false,
      splintersRemaining: playerSplinterInventory,
      error: 'Requires 1 additional Dizana’s Quiver to sacrifice',
    };
  }

  quiver.isBlessed = true;
  quiver.chargesRemaining = Infinity;

  return {
    success: true,
    splintersRemaining: playerSplinterInventory - BLESSED_QUIVER_SPLINTER_COST,
  };
}

/**
 * Calculates Dizana's Quiver combat statistics based on charge and blessing state.
 */
export function calculateQuiverCombatStats(quiver: DizanasQuiverState): QuiverCombatStats {
  const isInfused = quiver.isBlessed || quiver.chargesRemaining > 0;

  return {
    rangedAccuracy: 18,
    baseRangedStrength: 2,
    sunfireMaxHitBonus: isInfused ? 1 : 0,
    prayerBonus: 2,
  };
}

/**
 * Resolves ammo consumption when firing a ranged weapon.
 */
export function consumeQuiverAmmo(
  quiver: DizanasQuiverState,
  weaponType: 'BOW' | 'CROSSBOW' | 'BALLISTA'
): {
  firedAmmo: QuiverAmmoSlot | null;
  chargesRemaining: number;
  success: boolean;
  error?: string;
} {
  const targetType = weaponType === 'BOW' ? 'ARROW' : weaponType === 'CROSSBOW' ? 'BOLT' : 'JAVELIN';

  let chosenSlot: 'primarySlot' | 'secondarySlot' | null = null;
  if (quiver.primarySlot && quiver.primarySlot.ammoType === targetType && quiver.primarySlot.quantity > 0) {
    chosenSlot = 'primarySlot';
  } else if (quiver.secondarySlot && quiver.secondarySlot.ammoType === targetType && quiver.secondarySlot.quantity > 0) {
    chosenSlot = 'secondarySlot';
  }

  if (!chosenSlot) {
    return {
      firedAmmo: null,
      chargesRemaining: quiver.chargesRemaining,
      success: false,
      error: `No matching ${targetType} ammo found in quiver`,
    };
  }

  const slot = quiver[chosenSlot]!;
  slot.quantity -= 1;
  const firedCopy = { ...slot, quantity: 1 };

  if (slot.quantity === 0) {
    quiver[chosenSlot] = null;
  }

  if (!quiver.isBlessed && quiver.chargesRemaining > 0) {
    quiver.chargesRemaining = Math.max(0, quiver.chargesRemaining - 1);
  }

  return {
    firedAmmo: firedCopy,
    chargesRemaining: quiver.chargesRemaining,
    success: true,
  };
}
