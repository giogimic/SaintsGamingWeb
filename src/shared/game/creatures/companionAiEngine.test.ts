import { describe, expect, it } from 'vitest';
import { CompanionAiEngine, CompanionState } from './companionAiEngine';

describe('Companion AI, Pet Commands & Buddy Tactics Engine (Phase 22)', () => {
  function createTestCompanion(overrides?: Partial<CompanionState>): CompanionState {
    return {
      companionId: 'pet_01',
      ownerId: 'player_01',
      creatureSlug: 'beast_ember_hound',
      name: 'Blaze',
      stance: 'DEFENSIVE',
      targetEntityId: null,
      x: 10,
      y: 10,
      ownerX: 10,
      ownerY: 10,
      loyaltyLevel: 90,
      specialCooldownUntil: 0,
      isStayStationary: false,
      ...overrides,
    };
  }

  it('handles player tactical commands and special ability cooldowns', () => {
    const engine = new CompanionAiEngine();
    const pet = createTestCompanion();

    // 1. Issue ATTACK_TARGET
    const cmd1 = engine.issueCommand(pet, 'ATTACK_TARGET', 'monster_99');
    expect(cmd1.success).toBe(true);
    expect(pet.targetEntityId).toBe('monster_99');

    // 2. Issue RETURN_TO_ME
    pet.x = 20;
    pet.y = 20;
    const cmd2 = engine.issueCommand(pet, 'RETURN_TO_ME');
    expect(cmd2.success).toBe(true);
    expect(pet.targetEntityId).toBeNull();
    expect(pet.x).toBe(10);
    expect(pet.y).toBe(10);

    // 3. Issue USE_SPECIAL_ABILITY
    const cmd3 = engine.issueCommand(pet, 'USE_SPECIAL_ABILITY');
    expect(cmd3.success).toBe(true);
    expect(pet.specialCooldownUntil).toBeGreaterThan(Date.now());

    // Immediate re-use fails due to active cooldown
    const cmd4 = engine.issueCommand(pet, 'USE_SPECIAL_ABILITY');
    expect(cmd4.success).toBe(false);
    expect(cmd4.reason).toContain('cooldown');
  });

  it('evaluates stances accurately: AGGRESSIVE vs DEFENSIVE vs PASSIVE', () => {
    const engine = new CompanionAiEngine();
    const pet = createTestCompanion({ stance: 'DEFENSIVE' });

    const hostiles = [
      { id: 'mob_peaceful', x: 12, y: 10, isAttackingOwnerOrPet: false },
      { id: 'mob_aggressive', x: 14, y: 10, isAttackingOwnerOrPet: true },
    ];

    // DEFENSIVE: attacks only mob_aggressive
    const decDef = engine.evaluateTick(pet, hostiles, 1.0);
    expect(pet.targetEntityId).toBe('mob_aggressive');
    expect(decDef.action).toBe('MOVE');

    // Switch to AGGRESSIVE: immediately locks onto first available hostile
    engine.setStance(pet, 'AGGRESSIVE');
    pet.targetEntityId = null;
    const decAgg = engine.evaluateTick(pet, hostiles, 1.0);
    expect(pet.targetEntityId).toBe('mob_peaceful');

    // Switch to PASSIVE: clears target and follows owner
    engine.setStance(pet, 'PASSIVE');
    pet.x = 15;
    pet.y = 15;
    const decPass = engine.evaluateTick(pet, hostiles, 1.0);
    expect(pet.targetEntityId).toBeNull();
    expect(decPass.action).toBe('MOVE');
    expect(decPass.reason).toBe('Following owner');
  });

  it('triggers leash teleport when companion drifts beyond maximum range', () => {
    const engine = new CompanionAiEngine();
    const pet = createTestCompanion({ x: 30, y: 30, ownerX: 10, ownerY: 10 }); // Dist ~28 > 12

    const dec = engine.evaluateTick(pet, [], 1.0);
    expect(dec.action).toBe('TELEPORT_LEASH');
    expect(pet.x).toBe(10);
    expect(pet.y).toBe(10);
  });

  it('triggers emergency guardian heal when owner HP is critical and loyalty is high', () => {
    const engine = new CompanionAiEngine();
    const pet = createTestCompanion({ loyaltyLevel: 85, specialCooldownUntil: 0 });

    // Critical HP: 20%
    const dec = engine.evaluateTick(pet, [], 0.2);
    expect(dec.action).toBe('CAST_SPECIAL');
    expect(dec.specialAbilityName).toBe('Guardian Salve');

    // Loyalty Synergy Perks
    const perk = engine.evaluateLoyaltySynergy(85);
    expect(perk.damageMultiplier).toBeGreaterThan(1.1);
    expect(perk.emergencyHealUnlocked).toBe(true);
    expect(perk.speedBonus).toBe(1);
  });
});
