import { describe, it, expect } from 'vitest';
import {
  SLAYER_MASTERS,
  SLAYER_MONSTER_CATALOG,
  calculateSlayerPoints,
  canAssignFromMaster,
  assignSlayerTask,
  recordSlayerKill,
  resetTaskWithNovice Broker,
  type SlayerPlayerProfile,
} from './slayerTaskEngine';

describe('Slayer Task Assignment & Extension Matrix Engine', () => {
  it('enforces combat and slayer level prerequisites for masters', () => {
    // Grandmaster Broker requires Combat 100, Slayer 50
    expect(canAssignFromMaster('grandmaster_broker', 90, 80).eligible).toBe(false);
    expect(canAssignFromMaster('grandmaster_broker', 105, 40).eligible).toBe(false);
    expect(canAssignFromMaster('grandmaster_broker', 105, 75).eligible).toBe(true);

    // Novice Broker has no prerequisites
    expect(canAssignFromMaster('novice_broker', 3, 1).eligible).toBe(true);

    // Master Broker requires Combat 85
    expect(canAssignFromMaster('master_broker', 80, 70).eligible).toBe(false);
    expect(canAssignFromMaster('master_broker', 95, 70).eligible).toBe(true);
  });

  it('calculates streak point milestone multipliers accurately', () => {
    // Grandmaster Broker base points = 15
    expect(calculateSlayerPoints('grandmaster_broker', 1)).toBe(15);
    expect(calculateSlayerPoints('grandmaster_broker', 9)).toBe(15);
    expect(calculateSlayerPoints('grandmaster_broker', 10)).toBe(75); // 5x
    expect(calculateSlayerPoints('grandmaster_broker', 50)).toBe(225); // 15x
    expect(calculateSlayerPoints('grandmaster_broker', 100)).toBe(375); // 25x
    expect(calculateSlayerPoints('grandmaster_broker', 250)).toBe(525); // 35x
    expect(calculateSlayerPoints('grandmaster_broker', 1000)).toBe(750); // 50x

    // Novice Broker awards 0 points always
    expect(calculateSlayerPoints('novice_broker', 10)).toBe(0);
    expect(calculateSlayerPoints('novice_broker', 50)).toBe(0);
  });

  it('filters blocked monsters and respects slayer level requirements on assignment', () => {
    const profile: SlayerPlayerProfile = {
      combatLevel: 110,
      slayerLevel: 85, // can kill Void Fiends (85), but not Dark Beasts (90) or Hydras (95)
      activeTask: null,
      completedTasksStreak: 12,
      slayerPoints: 120,
      blockedMonsters: ['gargoyle', 'nechryael'],
      extendedMonsters: ['void_fiend'],
    };

    const res = assignSlayerTask('grandmaster_broker', profile, 0.1);
    expect(res.ok).toBe(true);
    expect(res.task).toBeDefined();
    // Gargoyles and Nechryael are blocked, Dark Beasts and Hydras are too high level, so it must assign Void Fiends
    expect(res.task?.monsterId).toBe('void_fiend');
    expect(res.task?.isExtended).toBe(true);
    expect(res.task?.initialAmount).toBeGreaterThanOrEqual(130);
  });

  it('tracks kills, awards slayer XP, and handles task completion with streak points', () => {
    const profile: SlayerPlayerProfile = {
      combatLevel: 90,
      slayerLevel: 75,
      activeTask: {
        monsterId: 'gargoyle',
        monsterName: 'Gargoyle',
        assignedBy: 'master_broker',
        initialAmount: 2,
        remainingAmount: 2,
        isExtended: false,
        slayerLevelReq: 75,
        baseHp: 105,
      },
      completedTasksStreak: 9, // Next completion is 10th milestone (5x Master Broker 12 base = 60 points)
      slayerPoints: 100,
      blockedMonsters: [],
      extendedMonsters: [],
    };

    // Kill wrong monster
    const wrongKill = recordSlayerKill(profile, 'crawling_hand');
    expect(wrongKill.validKill).toBe(false);
    expect(profile.activeTask?.remainingAmount).toBe(2);

    // 1st valid kill
    const kill1 = recordSlayerKill(profile, 'gargoyle');
    expect(kill1.validKill).toBe(true);
    expect(kill1.taskCompleted).toBe(false);
    expect(kill1.xpGranted).toBe(105);
    expect(kill1.remainingAmount).toBe(1);
    expect(profile.activeTask?.remainingAmount).toBe(1);

    // 2nd kill -> Completes task
    const kill2 = recordSlayerKill(profile, 'gargoyle');
    expect(kill2.validKill).toBe(true);
    expect(kill2.taskCompleted).toBe(true);
    expect(kill2.pointsEarned).toBe(60); // 10th milestone bonus
    expect(kill2.newStreak).toBe(10);
    expect(profile.activeTask).toBeNull();
    expect(profile.completedTasksStreak).toBe(10);
    expect(profile.slayerPoints).toBe(160);
  });

  it('resets task and streaks when using Novice Broker reset', () => {
    const profile: SlayerPlayerProfile = {
      combatLevel: 90,
      slayerLevel: 75,
      activeTask: {
        monsterId: 'bloodveld',
        monsterName: 'Bloodveld',
        assignedBy: 'expert_broker',
        initialAmount: 120,
        remainingAmount: 110,
        isExtended: false,
        slayerLevelReq: 50,
        baseHp: 120,
      },
      completedTasksStreak: 24,
      slayerPoints: 500,
      blockedMonsters: [],
      extendedMonsters: [],
    };

    const resetRes = resetTaskWithNovice Broker(profile);
    expect(resetRes.ok).toBe(true);
    expect(resetRes.newStreak).toBe(0);
    expect(profile.activeTask).toBeNull();
    expect(profile.completedTasksStreak).toBe(0);
  });
});
