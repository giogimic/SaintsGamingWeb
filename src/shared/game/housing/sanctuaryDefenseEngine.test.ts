import { describe, expect, it } from 'vitest';
import { SanctuaryDefenseEngine } from './sanctuaryDefenseEngine';

describe('Sanctuary House Privacy, Guest Tip Jar & Dungeon Defense Engine (Phase 17)', () => {
  it('enforces privacy mode access rules and blacklists', () => {
    const engine = new SanctuaryDefenseEngine();
    const profile = engine.createProfile('estate_1', 'owner_alice');

    // 1. OPEN_HOUSE mode
    expect(engine.canPlayerEnter('estate_1', 'visitor_bob')).toBe(true);

    // 2. Blacklisted visitor cannot enter
    profile.bannedList.push('visitor_troll');
    expect(engine.canPlayerEnter('estate_1', 'visitor_troll')).toBe(false);

    // 3. FRIENDS_ONLY mode
    engine.setPrivacyMode('estate_1', 'owner_alice', 'FRIENDS_ONLY');
    expect(engine.canPlayerEnter('estate_1', 'stranger_charlie', false)).toBe(false);
    expect(engine.canPlayerEnter('estate_1', 'friend_dan', true)).toBe(true);

    // 4. PRIVATE mode
    engine.setPrivacyMode('estate_1', 'owner_alice', 'PRIVATE');
    expect(engine.canPlayerEnter('estate_1', 'friend_dan', true)).toBe(false);
    expect(engine.canPlayerEnter('estate_1', 'owner_alice')).toBe(true);
  });

  it('manages Tip Jar deposits and owner withdrawals', () => {
    const engine = new SanctuaryDefenseEngine();
    engine.createProfile('estate_2', 'owner_alice');

    // Visitors deposit tips
    engine.depositTip('estate_2', 'visitor_bob', 1000);
    engine.depositTip('estate_2', 'visitor_charlie', 2500);

    const profile = engine.createProfile('estate_2', 'owner_alice');
    expect(profile.tipJarCoins).toBe(3500);

    // Owner withdraws partial
    const withdrawn = engine.withdrawTip('estate_2', 'owner_alice', 1500);
    expect(withdrawn).toBe(1500);
    expect(profile.tipJarCoins).toBe(2000);

    // Owner withdraws full remainder
    const full = engine.withdrawTip('estate_2', 'owner_alice');
    expect(full).toBe(2000);
    expect(profile.tipJarCoins).toBe(0);
  });

  it('handles dungeon trap placement, triggering, and disarming', () => {
    const engine = new SanctuaryDefenseEngine();
    engine.createProfile('estate_3', 'owner_alice');

    // Place a flame jet trap at room (1, 1), tile (4, 4) requiring level 65 thieving
    engine.addTrap('estate_3', 'owner_alice', {
      type: 'FLAME_JET',
      roomX: 1,
      roomY: 1,
      tileX: 4,
      tileY: 4,
      damage: 40,
      disarmReqLevel: 65,
    });

    // 1. Novice thief (level 30) triggers trap -> takes 40 damage
    const res1 = engine.triggerTrap('estate_3', 1, 1, 4, 4, 30);
    expect(res1.trapTriggered).toBe(true);
    expect(res1.disarmed).toBe(false);
    expect(res1.damageDealt).toBe(40);

    // 2. Master rogue (level 75) disarms trap -> 0 damage
    const res2 = engine.triggerTrap('estate_3', 1, 1, 4, 4, 75);
    expect(res2.trapTriggered).toBe(false);
    expect(res2.disarmed).toBe(true);
    expect(res2.damageDealt).toBe(0);
  });

  it('assigns guard beasts to defend dungeon chambers', () => {
    const engine = new SanctuaryDefenseEngine();
    engine.createProfile('estate_4', 'owner_alice');

    const guard = engine.assignGuard('estate_4', 'owner_alice', {
      creatureSlug: 'monster_abyssal_fiend',
      name: 'Abyssal Guardian',
      level: 85,
      roomX: 1,
      roomY: 2,
      hp: 500,
      maxHp: 500,
    });

    expect(guard.creatureSlug).toBe('monster_abyssal_fiend');
    expect(guard.level).toBe(85);
    expect(guard.hp).toBe(500);
  });
});
