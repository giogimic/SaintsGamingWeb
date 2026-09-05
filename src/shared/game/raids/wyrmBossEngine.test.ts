import { describe, it, expect } from 'vitest';
import {
  initializeOlmState,
  applyDamageToOlm,
  resolveCrystalBurst,
  resolveTeleportPair,
  processBurnTick,
  type PlayerRaidPosition,
} from './olmBossEngine';

describe('The Great Wyrm Phase Engine & Special Attacks', () => {
  it('manages 3-phase fight progression and head vulnerability unlock in Phase 3', () => {
    const wyrm = initializeOlmState(3, false);
    expect(wyrm.phase).toBe(1);
    expect(wyrm.isHeadVulnerable).toBe(false);

    // Cripple Left Hand in Phase 1
    const dmg1 = applyDamageToOlm(wyrm, 'LEFT_HAND', wyrm.leftHand.maxHp);
    expect(dmg1.componentDestroyed).toBe(true);
    expect(wyrm.leftHand.isCrippled).toBe(true);
    expect(wyrm.phase).toBe(1); // Right hand still alive

    // Cripple Right Hand in Phase 1 -> Phase advances to 2
    const dmg2 = applyDamageToOlm(wyrm, 'RIGHT_HAND', wyrm.rightHand.maxHp);
    expect(dmg2.phaseAdvanced).toBe(true);
    expect(wyrm.phase).toBe(2);
    expect(wyrm.leftHand.isCrippled).toBe(false);

    // Complete Phase 2 -> Phase advances to Phase 3 (Enraged)
    applyDamageToOlm(wyrm, 'LEFT_HAND', wyrm.leftHand.maxHp);
    applyDamageToOlm(wyrm, 'RIGHT_HAND', wyrm.rightHand.maxHp);
    expect(wyrm.phase).toBe(3);
    expect(wyrm.enraged).toBe(true);
    expect(wyrm.isHeadVulnerable).toBe(false);

    // Phase 3: Cripple both hands -> Unlocks Head Vulnerability
    applyDamageToOlm(wyrm, 'LEFT_HAND', wyrm.leftHand.maxHp);
    applyDamageToOlm(wyrm, 'RIGHT_HAND', wyrm.rightHand.maxHp);
    expect(wyrm.isHeadVulnerable).toBe(true);

    // Execute Head -> Wyrm Defeated
    const finalKill = applyDamageToOlm(wyrm, 'HEAD', wyrm.headHp);
    expect(finalKill.olmDefeated).toBe(true);
    expect(wyrm.isDead).toBe(true);
  });

  it('evaluates Crystal Burst tile collision', () => {
    const spikes = [{ x: 10, y: 15 }, { x: 12, y: 15 }];
    // Player stood still on spike
    const hit = resolveCrystalBurst({ x: 10, y: 15 }, spikes);
    expect(hit.hit).toBe(true);
    expect(hit.damage).toBeGreaterThanOrEqual(25);

    // Player dodged off spike
    const dodged = resolveCrystalBurst({ x: 10, y: 16 }, spikes);
    expect(dodged.hit).toBe(false);
    expect(dodged.damage).toBe(0);
  });

  it('calculates Teleport Pair proximity damage', () => {
    // Perfect sync (same tile) -> 0 damage
    const sync = resolveTeleportPair({ x: 14, y: 20 }, { x: 14, y: 20 });
    expect(sync.synced).toBe(true);
    expect(sync.damagePerPlayer).toBe(0);

    // 4 tiles apart -> distance ~4 -> ~20 damage
    const separation = resolveTeleportPair({ x: 10, y: 20 }, { x: 14, y: 20 });
    expect(separation.synced).toBe(false);
    expect(separation.damagePerPlayer).toBe(20);
  });

  it('processes ticking Burn status and spreads to adjacent teammates', () => {
    const players: PlayerRaidPosition[] = [
      { playerId: 'p1', x: 10, y: 10, hp: 99, isBurning: true, burnTicksRemaining: 3 },
      { playerId: 'p2', x: 11, y: 10, hp: 99, isBurning: false, burnTicksRemaining: 0 }, // Adjacent to p1
      { playerId: 'p3', x: 20, y: 20, hp: 99, isBurning: false, burnTicksRemaining: 0 }, // Far away
    ];

    const tick = processBurnTick(players);
    // p1 takes 3 burn damage (99 - 3 = 96) and tick count drops to 2
    expect(tick.updatedPlayers[0].hp).toBe(96);
    expect(tick.updatedPlayers[0].burnTicksRemaining).toBe(2);

    // p2 caught the burn contagion from p1
    expect(tick.updatedPlayers[1].isBurning).toBe(true);
    expect(tick.updatedPlayers[1].burnTicksRemaining).toBe(5);
    expect(tick.spreadCount).toBe(1);

    // p3 was untouched
    expect(tick.updatedPlayers[2].isBurning).toBe(false);
  });
});
