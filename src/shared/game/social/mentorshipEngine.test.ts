import { describe, expect, it } from 'vitest';
import { MentorshipEngine } from './mentorshipEngine';

describe('Master Player Mentorship, Apprentice Contracts & Rewards Engine (Phase 47)', () => {
  it('validates level eligibility and creates mentorship contracts', () => {
    const engine = new MentorshipEngine();

    const veteran = engine.createProfile('player_sage', 75);
    const novice = engine.createProfile('player_rookie', 15);
    const midLevel = engine.createProfile('player_mid', 35);

    expect(veteran.isMentorEligible).toBe(true);
    expect(novice.isApprenticeEligible).toBe(true);
    expect(midLevel.isMentorEligible).toBe(false);
    expect(midLevel.isApprenticeEligible).toBe(false);

    // 1. Valid contract creation
    const contract = engine.createContract(veteran, novice, 1000);
    expect(contract.status).toBe('ACTIVE');
    expect(contract.milestones).toHaveLength(4);

    // 2. Invalid contract attempts
    expect(() => engine.createContract(midLevel, novice)).toThrow('does not meet level requirements');
    expect(() => engine.createContract(veteran, midLevel)).toThrow('does not meet level requirements');
  });

  it('calculates co-op party XP and drop rate synergy multipliers', () => {
    const engine = new MentorshipEngine();

    const mentor = engine.createProfile('mentor_1', 60);
    const apprentice = engine.createProfile('apprentice_1', 10);
    const contract = engine.createContract(mentor, apprentice);

    // 1. Same zone -> Active buff (+15% XP, +10% drops)
    const synergySameZone = engine.calculatePartySynergyBoost(
      contract,
      'lumbridge_catacombs',
      'LUMBRIDGE_CATACOMBS'
    );
    expect(synergySameZone.isBuffActive).toBe(true);
    expect(synergySameZone.xpMultiplier).toBe(1.15);
    expect(synergySameZone.dropRateMultiplier).toBe(1.1);

    // 2. Different zone -> Inactive buff (1.0x)
    const synergyDiffZone = engine.calculatePartySynergyBoost(
      contract,
      'lumbridge_catacombs',
      'varrock_grand_exchange'
    );
    expect(synergyDiffZone.isBuffActive).toBe(false);
    expect(synergyDiffZone.xpMultiplier).toBe(1.0);
    expect(synergyDiffZone.dropRateMultiplier).toBe(1.0);
  });

  it('progresses milestones and executes contract graduation rewards and titles', () => {
    const engine = new MentorshipEngine();

    const mentor = engine.createProfile('mentor_sage', 80);
    const apprentice = engine.createProfile('apprentice_tim', 5);
    const contract = engine.createContract(mentor, apprentice, 1000);

    // 1. Complete milestones sequentially
    expect(engine.recordMilestoneProgress(contract, 'DUNGEON_CLEAR').isGraduated).toBe(false);
    expect(engine.recordMilestoneProgress(contract, 'COMPANION_CAPTURE').isGraduated).toBe(false);
    expect(engine.recordMilestoneProgress(contract, 'REACH_LEVEL_30').isGraduated).toBe(false);

    const finalStep = engine.recordMilestoneProgress(contract, 'CAMPAIGN_QUEST_CHAPTER_1');
    expect(finalStep.isGraduated).toBe(true);

    // 2. Graduate 1st apprentice -> +5 Commendation Badges
    const grad1 = engine.graduateContract(contract, mentor, apprentice, 2000);
    expect(grad1.success).toBe(true);
    expect(mentor.commendationBadges).toBe(5);
    expect(mentor.graduatedApprenticesCount).toBe(1);
    expect(mentor.unlockedTitles).toHaveLength(0);

    // 3. Graduate 2 more apprentices to trigger "The Venerable Sage" title
    const apprentice2 = engine.createProfile('apprentice_2', 10);
    const c2 = engine.createContract(mentor, apprentice2);
    c2.milestones.forEach((m) => (m.completed = true));
    engine.graduateContract(c2, mentor, apprentice2);

    const apprentice3 = engine.createProfile('apprentice_3', 12);
    const c3 = engine.createContract(mentor, apprentice3);
    c3.milestones.forEach((m) => (m.completed = true));
    engine.graduateContract(c3, mentor, apprentice3);

    expect(mentor.graduatedApprenticesCount).toBe(3);
    expect(mentor.commendationBadges).toBe(15);
    expect(mentor.unlockedTitles).toContain('The Venerable Sage');
  });
});
