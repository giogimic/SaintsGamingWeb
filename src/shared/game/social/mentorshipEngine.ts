/**
 * Saints Gaming — Master Player Mentorship, Apprentice Contracts & Realm Guide Rewards Engine (Bible 08, 12, 19, 28)
 * Manages mentor-apprentice contracts, co-op party XP synergy boosts, milestone progression, and graduation rewards.
 */

export type MentorshipMilestoneType =
  | 'DUNGEON_CLEAR'
  | 'COMPANION_CAPTURE'
  | 'REACH_LEVEL_30'
  | 'CAMPAIGN_QUEST_CHAPTER_1';

export interface MentorshipMilestone {
  id: MentorshipMilestoneType;
  name: string;
  description: string;
  completed: boolean;
  completedAt?: number;
}

export interface MentorshipContract {
  contractId: string;
  mentorId: string;
  apprenticeId: string;
  startedAt: number;
  status: 'ACTIVE' | 'GRADUATED' | 'CANCELLED';
  milestones: MentorshipMilestone[];
  graduatedAt?: number;
}

export interface MentorshipProfile {
  playerId: string;
  level: number;
  isMentorEligible: boolean;
  isApprenticeEligible: boolean;
  commendationBadges: number;
  unlockedTitles: string[];
  graduatedApprenticesCount: number;
}

export class MentorshipEngine {
  /**
   * Initializes a player's mentorship profile.
   * Mentor requires Level >= 50, Apprentice requires Level <= 25.
   */
  public createProfile(playerId: string, level: number): MentorshipProfile {
    return {
      playerId,
      level,
      isMentorEligible: level >= 50,
      isApprenticeEligible: level <= 25,
      commendationBadges: 0,
      unlockedTitles: [],
      graduatedApprenticesCount: 0,
    };
  }

  /**
   * Creates a formal mentorship contract between a qualified mentor and apprentice.
   */
  public createContract(
    mentor: MentorshipProfile,
    apprentice: MentorshipProfile,
    nowMs: number = Date.now()
  ): MentorshipContract {
    if (!mentor.isMentorEligible) {
      throw new Error(`Mentor ${mentor.playerId} does not meet level requirements (Lvl >= 50)`);
    }

    if (!apprentice.isApprenticeEligible) {
      throw new Error(
        `Apprentice ${apprentice.playerId} does not meet level requirements (Lvl <= 25)`
      );
    }

    const milestones: MentorshipMilestone[] = [
      {
        id: 'DUNGEON_CLEAR',
        name: 'First Dungeon Conquered',
        description: 'Complete any instanced party dungeon together.',
        completed: false,
      },
      {
        id: 'COMPANION_CAPTURE',
        name: 'Companion Beast Bound',
        description: 'Capture and bind a wild beast companion.',
        completed: false,
      },
      {
        id: 'REACH_LEVEL_30',
        name: 'Journeyman Saint',
        description: 'Apprentice reaches Level 30.',
        completed: false,
      },
      {
        id: 'CAMPAIGN_QUEST_CHAPTER_1',
        name: 'Hero of the Overworld',
        description: 'Complete Chapter 1 of the Story Campaign.',
        completed: false,
      },
    ];

    return {
      contractId: `contract_${mentor.playerId}_${apprentice.playerId}_${nowMs}`,
      mentorId: mentor.playerId,
      apprenticeId: apprentice.playerId,
      startedAt: nowMs,
      status: 'ACTIVE',
      milestones,
    };
  }

  /**
   * Computes party synergy boost when mentor and apprentice play in the same realm zone.
   */
  public calculatePartySynergyBoost(
    contract: MentorshipContract,
    mentorZone: string,
    apprenticeZone: string
  ): { xpMultiplier: number; dropRateMultiplier: number; isBuffActive: boolean } {
    if (contract.status !== 'ACTIVE') {
      return { xpMultiplier: 1.0, dropRateMultiplier: 1.0, isBuffActive: false };
    }

    const sameZone = mentorZone.toLowerCase() === apprenticeZone.toLowerCase();
    if (sameZone) {
      return {
        xpMultiplier: 1.15, // +15% XP gain
        dropRateMultiplier: 1.1, // +10% drop chance
        isBuffActive: true,
      };
    }

    return { xpMultiplier: 1.0, dropRateMultiplier: 1.0, isBuffActive: false };
  }

  /**
   * Records milestone completion and checks if all 4 graduation criteria are met.
   */
  public recordMilestoneProgress(
    contract: MentorshipContract,
    milestoneId: MentorshipMilestoneType,
    nowMs: number = Date.now()
  ): { milestoneCompleted: boolean; isGraduated: boolean } {
    if (contract.status !== 'ACTIVE') {
      return { milestoneCompleted: false, isGraduated: false };
    }

    const ms = contract.milestones.find((m) => m.id === milestoneId);
    if (!ms || ms.completed) {
      return { milestoneCompleted: false, isGraduated: false };
    }

    ms.completed = true;
    ms.completedAt = nowMs;

    const allCompleted = contract.milestones.every((m) => m.completed);

    return {
      milestoneCompleted: true,
      isGraduated: allCompleted,
    };
  }

  /**
   * Dispatches graduation rewards: 5 Commendation Badges to mentor (unlocking title at 3 graduates)
   * and graduate starter cache to apprentice.
   */
  public graduateContract(
    contract: MentorshipContract,
    mentorProfile: MentorshipProfile,
    apprenticeProfile: MentorshipProfile,
    nowMs: number = Date.now()
  ): { success: boolean; mentorBadgesAwarded: number; apprenticeCacheAwarded: boolean } {
    const allCompleted = contract.milestones.every((m) => m.completed);
    if (!allCompleted) {
      throw new Error('Cannot graduate contract: uncompleted milestones remain');
    }

    contract.status = 'GRADUATED';
    contract.graduatedAt = nowMs;

    // Award mentor commendation badges & increment graduate tally
    mentorProfile.commendationBadges += 5;
    mentorProfile.graduatedApprenticesCount += 1;

    if (
      mentorProfile.graduatedApprenticesCount >= 3 &&
      !mentorProfile.unlockedTitles.includes('The Venerable Sage')
    ) {
      mentorProfile.unlockedTitles.push('The Venerable Sage');
    }

    return {
      success: true,
      mentorBadgesAwarded: 5,
      apprenticeCacheAwarded: true,
    };
  }
}
