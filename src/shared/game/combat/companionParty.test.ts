import { describe, it, expect } from 'vitest';
import {
  createEmptyParty,
  addCompanionToParty,
  setActiveCompanion,
  swapPartySlots,
  awardCompanionXp,
  getXpForLevel,
  CompanionInstance,
} from './companionParty';

describe('Companion Party & Progression Manager (Bible 11 & Bible 07)', () => {
  const createMockCompanion = (id: string, level: number = 1): CompanionInstance => ({
    id,
    speciesSlug: 'rockitten',
    level,
    currentXp: getXpForLevel(level),
    element: 'Geo',
    maxHp: 25,
    currentHp: 25,
    attack: 12,
    defense: 10,
    speed: 10,
    moves: [],
  });

  it('manages 6-slot party capacity correctly', () => {
    const party = createEmptyParty();
    expect(party.slots.length).toBe(6);

    for (let i = 0; i < 6; i++) {
      const added = addCompanionToParty(party, createMockCompanion(`comp_${i}`));
      expect(added).toBe(true);
    }

    // 7th companion should fail (party full)
    const overflow = addCompanionToParty(party, createMockCompanion('comp_overflow'));
    expect(overflow).toBe(false);
  });

  it('swaps active companion and reorders slots', () => {
    const party = createEmptyParty();
    addCompanionToParty(party, createMockCompanion('lead_comp'));
    addCompanionToParty(party, createMockCompanion('reserve_comp'));

    expect(party.slots[0]?.id).toBe('lead_comp');
    expect(party.slots[1]?.id).toBe('reserve_comp');

    // Set slot 1 as active lead
    setActiveCompanion(party, 1);
    expect(party.slots[0]?.id).toBe('reserve_comp');
    expect(party.slots[1]?.id).toBe('lead_comp');

    // Swap slots back
    swapPartySlots(party, 0, 1);
    expect(party.slots[0]?.id).toBe('lead_comp');
  });

  it('awards XP and processes single and multi-level level-ups with stat increases', () => {
    const comp = createMockCompanion('tamer_buddy', 1);
    const xpNeededForLevel3 = getXpForLevel(3); // Level 3 threshold

    const result = awardCompanionXp(comp, xpNeededForLevel3);

    expect(result.leveledUp).toBe(true);
    expect(result.newLevel).toBe(3);
    expect(result.levelsGained).toBe(2);
    expect(comp.maxHp).toBeGreaterThan(25);
    expect(comp.attack).toBeGreaterThan(12);
    expect(result.statGains.hp).toBe(6); // +3 * 2
    expect(result.statGains.attack).toBe(4); // +2 * 2
  });
});
