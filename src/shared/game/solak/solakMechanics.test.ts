import { describe, it, expect } from 'vitest';
import {
  spawnRootCage,
  damageRootCage,
  resolveNatureDomeProtection,
} from './solakMechanics';

describe('Solak Mechanics, Root Cages & Nature Dome Engine', () => {
  it('manages Root Cage trapping and rescue damage', () => {
    const cage = spawnRootCage('player_01', 15000);
    expect(cage.isBroken).toBe(false);
    expect(cage.trappedPlayerId).toBe('player_01');

    // Teammate hits for 10,000 (5,000 remaining)
    const hit1 = damageRootCage(cage, 10000);
    expect(hit1.isFreed).toBe(false);
    expect(hit1.remainingHp).toBe(5000);

    // Teammate hits for 6,000 -> Freed
    const hit2 = damageRootCage(cage, 6000);
    expect(hit2.isFreed).toBe(true);
    expect(cage.isBroken).toBe(true);
  });

  it('evaluates Nature Shield Dome storm immunity within 3 tiles', () => {
    const dome = { center: { x: 20, y: 20 }, radius: 3, isActive: true };

    // Player inside dome (20, 22 -> distance 2 <= 3) -> 100% protected
    const safe = resolveNatureDomeProtection({ x: 20, y: 22 }, dome);
    expect(safe.isProtected).toBe(true);
    expect(safe.stormDamageTaken).toBe(0);

    // Player outside dome (20, 25 -> distance 5 > 3) -> takes 1200 storm damage
    const hit = resolveNatureDomeProtection({ x: 20, y: 25 }, dome);
    expect(hit.isProtected).toBe(false);
    expect(hit.stormDamageTaken).toBe(1200);
  });
});
