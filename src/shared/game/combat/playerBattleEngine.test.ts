import { describe, expect, it } from 'vitest';
import { PlayerBattleEngine } from './playerBattleEngine';

describe('Player Battles (PvP) & Wilderness Combat Engine (Phase 15)', () => {
  it('handles duel initiation, acceptance, countdown, and combat victory', () => {
    const engine = new PlayerBattleEngine();
    const rules = {
      allowPotions: false,
      allowMagic: true,
      allowBuddies: false,
      allowFood: true,
      stakeGold: 5000,
    };

    // 1. Challenge
    const duel = engine.challengePlayer(
      'p1',
      'Knight Arthur',
      100,
      'p2',
      'Ranger Robin',
      100,
      rules
    );

    expect(duel.status).toBe('CHALLENGED');
    expect(duel.stakePot).toBe(10000);

    // 2. Accept
    engine.acceptChallenge(duel.duelId, 'p2');
    expect(duel.status).toBe('ACCEPTED');

    // 3. Countdown & Fight
    engine.startCountdown(duel.duelId);
    expect(duel.status).toBe('COUNTDOWN');
    engine.startFight(duel.duelId);
    expect(duel.status).toBe('FIGHTING');

    // 4. Damage & Victory
    engine.applyDuelDamage(duel.duelId, 'p2', 60);
    expect(duel.target.hp).toBe(40);

    const result = engine.applyDuelDamage(duel.duelId, 'p2', 50);
    expect(result.duel.status).toBe('COMPLETED');
    expect(result.winnerId).toBe('p1');
    expect(result.loserId).toBe('p2');
  });

  it('calculates wilderness combat attack brackets correctly', () => {
    const engine = new PlayerBattleEngine();

    // Attacker level 50 at Wilderness Level 10 -> [40, 60]
    const bracket1 = engine.isEligibleToAttack(50, 45, 10);
    expect(bracket1.eligible).toBe(true);
    expect(bracket1.minLevel).toBe(40);
    expect(bracket1.maxLevel).toBe(60);

    // Defender level 70 is out of range
    const bracket2 = engine.isEligibleToAttack(50, 70, 10);
    expect(bracket2.eligible).toBe(false);

    // Attacker at deep wilderness level 30 -> [20, 80]
    const bracket3 = engine.isEligibleToAttack(50, 70, 30);
    expect(bracket3.eligible).toBe(true);
  });

  it('applies 20-minute skull penalty on unprovoked wilderness attack', () => {
    const engine = new PlayerBattleEngine();
    const now = 1700000000000;

    // Attacking unskulled player
    const res = engine.applySkull('attacker_1', false, 20, now);
    expect(res.skulled).toBe(true);
    expect(res.skullExpiresAt).toBe(now + 20 * 60 * 1000);
    expect(engine.isSkulled('attacker_1', now + 1000)).toBe(true);

    // After 21 minutes -> skull expired
    expect(engine.isSkulled('attacker_1', now + 21 * 60 * 1000)).toBe(false);
  });

  it('calculates item protection on PvP defeat for unskulled vs skulled players', () => {
    const engine = new PlayerBattleEngine();
    const items = [
      { itemId: 'whip', value: 1500000, quantity: 1 },
      { itemId: 'fury', value: 2000000, quantity: 1 },
      { itemId: 'dragon_boots', value: 200000, quantity: 1 },
      { itemId: 'rune_platebody', value: 40000, quantity: 1 },
      { itemId: 'shark', value: 1000, quantity: 10 },
    ];

    // 1. Unskulled player: protects 3 most valuable (fury, whip, dragon_boots)
    const unskulledDeath = engine.calculateLostItemsOnDeath(items, false, false);
    const protectedIds = unskulledDeath.protectedItems.map((i) => i.itemId);
    expect(protectedIds).toContain('fury');
    expect(protectedIds).toContain('whip');
    expect(protectedIds).toContain('dragon_boots');
    expect(protectedIds).not.toContain('rune_platebody');

    // 2. Skulled player: drops everything
    const skulledDeath = engine.calculateLostItemsOnDeath(items, true, false);
    expect(skulledDeath.protectedItems).toHaveLength(0);
    expect(skulledDeath.droppedItems.length).toBeGreaterThanOrEqual(4);

    // 3. Skulled player with Protect Item Prayer: protects 1 most valuable (fury)
    const skulledProtectedDeath = engine.calculateLostItemsOnDeath(items, true, true);
    expect(skulledProtectedDeath.protectedItems).toHaveLength(1);
    expect(skulledProtectedDeath.protectedItems[0].itemId).toBe('fury');
  });
});
