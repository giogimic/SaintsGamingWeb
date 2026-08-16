import { describe, it, expect } from 'vitest';
import {
  createDizanasQuiver,
  chargeQuiverWithSplinters,
  blessDizanasQuiver,
  calculateQuiverCombatStats,
  consumeQuiverAmmo,
  BLESSED_QUIVER_SPLINTER_COST,
} from './quiverUpgradeEngine';

describe('Sunfire Splinter & Dizana’s Quiver Upgrade Engine', () => {
  it('charges unblessed quiver at 10 charges per splinter', () => {
    const quiver = createDizanasQuiver();
    expect(quiver.chargesRemaining).toBe(0);

    // Charge 100 splinters -> 1,000 charges
    const res = chargeQuiverWithSplinters(quiver, 100);
    expect(res.success).toBe(true);
    expect(res.newCharges).toBe(1000);
    expect(quiver.chargesRemaining).toBe(1000);
  });

  it('permanently blesses quiver with 150,000 splinters and sacrifice quiver', () => {
    const quiver = createDizanasQuiver();

    // Insufficient splinters
    const failRes = blessDizanasQuiver(quiver, 100000, 1);
    expect(failRes.success).toBe(false);
    expect(failRes.error).toContain('150000 Sunfire Splinters');

    // Missing sacrifice quiver
    const failRes2 = blessDizanasQuiver(quiver, 150000, 0);
    expect(failRes2.success).toBe(false);
    expect(failRes2.error).toContain('sacrifice');

    // Successful blessing
    const blessRes = blessDizanasQuiver(quiver, 160000, 1);
    expect(blessRes.success).toBe(true);
    expect(blessRes.splintersRemaining).toBe(10000);
    expect(quiver.isBlessed).toBe(true);
    expect(quiver.chargesRemaining).toBe(Infinity);
  });

  it('calculates combat stats with Sunfire max hit bonus when charged/blessed', () => {
    const uncharged = createDizanasQuiver();
    const statsUncharged = calculateQuiverCombatStats(uncharged);
    expect(statsUncharged.rangedAccuracy).toBe(18);
    expect(statsUncharged.baseRangedStrength).toBe(2);
    expect(statsUncharged.sunfireMaxHitBonus).toBe(0); // 0 when uncharged

    // Charge quiver
    chargeQuiverWithSplinters(uncharged, 50);
    const statsCharged = calculateQuiverCombatStats(uncharged);
    expect(statsCharged.sunfireMaxHitBonus).toBe(1); // +1 when charged
  });

  it('auto-resolves dual ammo slots between Bows (arrows) and Crossbows (bolts)', () => {
    const quiver = createDizanasQuiver();
    chargeQuiverWithSplinters(quiver, 10);
    quiver.primarySlot = { itemId: 'dragon_arrow', name: 'Dragon Arrow', ammoType: 'ARROW', quantity: 50 };
    quiver.secondarySlot = { itemId: 'ruby_dragon_bolts_e', name: 'Ruby Dragon Bolts (e)', ammoType: 'BOLT', quantity: 30 };

    // Fire Crossbow -> pulls from secondarySlot (BOLT)
    const boltShot = consumeQuiverAmmo(quiver, 'CROSSBOW');
    expect(boltShot.success).toBe(true);
    expect(boltShot.firedAmmo?.itemId).toBe('ruby_dragon_bolts_e');
    expect(quiver.secondarySlot?.quantity).toBe(29);
    expect(quiver.primarySlot?.quantity).toBe(50); // Untouched

    // Fire Bow -> pulls from primarySlot (ARROW)
    const arrowShot = consumeQuiverAmmo(quiver, 'BOW');
    expect(arrowShot.success).toBe(true);
    expect(arrowShot.firedAmmo?.itemId).toBe('dragon_arrow');
    expect(quiver.primarySlot?.quantity).toBe(49);
  });
});
