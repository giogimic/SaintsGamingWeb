import { describe, it, expect } from 'vitest';
import {
  spawnBloodReavers,
  processBloodReaverMovement,
  damageBloodReaver,
  resolveThe AncientianWrath,
  type The AncientianWrathExplosion,
} from './seraphMinionMechanics';

describe('Seraph Minions & The Ancientian Wrath Mechanics Engine', () => {
  it('manages Crimson Siphon movement, focus-fire kills, and Seraph siphon heal', () => {
    const reavers = spawnBloodReavers();
    expect(reavers.length).toBe(2);

    const seraphPos = { x: 7, y: 7 };

    // Move reavers 1 step closer
    const tick1 = processBloodReaverMovement(reavers, seraphPos);
    expect(tick1.activeReavers.length).toBe(2);
    expect(tick1.siphonedCount).toBe(0);

    // Damage & kill Reaver 1
    const killRes = damageBloodReaver(reavers[0], 50000);
    expect(killRes.isKilled).toBe(true);

    // Position Reaver 2 right serapht to Seraph (x: 7, y: 6) -> 1 step away
    reavers[1].x = 7;
    reavers[1].y = 6;
    const siphonTick = processBloodReaverMovement(reavers, seraphPos);
    expect(siphonTick.siphonedCount).toBe(1);
    expect(siphonTick.seraphTotalHeal).toBe(250000);
    expect(reavers[1].isDead).toBe(true);
  });

  it('evaluates The Ancientian Wrath 8-tile explosion radius upon death', () => {
    const wrath: The AncientianWrathExplosion = {
      isChanneling: false,
      channelTicksRemaining: 0,
      origin: { x: 20, y: 20 },
      radius: 8,
    };

    // Player surged 10 tiles away (20, 30) -> Escaped
    const safe = resolveThe AncientianWrath({ x: 20, y: 30 }, 990, wrath);
    expect(safe.isHit).toBe(false);
    expect(safe.damageDealt).toBe(0);

    // Player stayed inside 5 tiles (20, 25) -> Instant wipe (100% max HP damage)
    const dead = resolveThe AncientianWrath({ x: 20, y: 25 }, 990, wrath);
    expect(dead.isHit).toBe(true);
    expect(dead.damageDealt).toBe(990);
  });
});
