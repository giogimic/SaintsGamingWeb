import { describe, expect, it } from 'vitest';
import { RealmHallOfFameEngine } from './realmHallOfFameEngine';

describe('Master Realm Leaderboards, Season Archive & Hall of Fame Engine (Phase 29)', () => {
  it('indexes and sorts highscore rankings across XP and Speedrun categories', () => {
    const engine = new RealmHallOfFameEngine();

    // 1. Submit XP scores (descending)
    engine.submitScore({ playerId: 'p1', playerName: 'Alice', score: 150000, category: 'TOTAL_XP', seasonId: 's1' });
    engine.submitScore({ playerId: 'p2', playerName: 'Bob', score: 300000, category: 'TOTAL_XP', seasonId: 's1' });
    engine.submitScore({ playerId: 'p3', playerName: 'Charlie', score: 200000, category: 'TOTAL_XP', seasonId: 's1' });

    const xpBoard = engine.getLeaderboard('s1', 'TOTAL_XP');
    expect(xpBoard[0].playerName).toBe('Bob'); // 300k
    expect(xpBoard[0].rank).toBe(1);
    expect(xpBoard[1].playerName).toBe('Charlie'); // 200k
    expect(xpBoard[2].playerName).toBe('Alice'); // 150k

    // 2. Submit Speedrun times in seconds (ascending - fastest first)
    engine.submitScore({ playerId: 'p1', playerName: 'Alice', score: 120, category: 'DUNGEON_SPEEDRUN', seasonId: 's1' });
    engine.submitScore({ playerId: 'p2', playerName: 'Bob', score: 95, category: 'DUNGEON_SPEEDRUN', seasonId: 's1' });

    const speedBoard = engine.getLeaderboard('s1', 'DUNGEON_SPEEDRUN');
    expect(speedBoard[0].playerName).toBe('Bob'); // 95s is faster than 120s
    expect(speedBoard[0].rank).toBe(1);
  });

  it('rejects impossible score delta progression anomalies', () => {
    const engine = new RealmHallOfFameEngine();

    // Alice starts with 1,000 XP
    engine.submitScore({ playerId: 'p1', playerName: 'Alice', score: 1000, category: 'TOTAL_XP', seasonId: 's1' });

    // Alice immediately attempts to submit 50,000,000 XP within 100ms
    const anomaly = engine.submitScore(
      { playerId: 'p1', playerName: 'Alice', score: 50000000, category: 'TOTAL_XP', seasonId: 's1' },
      10000 // 10k max delta / sec
    );

    expect(anomaly.success).toBe(false);
    expect(anomaly.reason).toContain('anomaly');
  });

  it('freezes seasonal standings into immutable Hall of Fame archives with podium titles', () => {
    const engine = new RealmHallOfFameEngine();

    engine.submitScore({ playerId: 'p1', playerName: 'Vanguard', score: 500, category: 'BOSS_KILLS', seasonId: 'season_genesis' });
    engine.submitScore({ playerId: 'p2', playerName: 'Shadow', score: 400, category: 'BOSS_KILLS', seasonId: 'season_genesis' });
    engine.submitScore({ playerId: 'p3', playerName: 'Healer', score: 300, category: 'BOSS_KILLS', seasonId: 'season_genesis' });

    const archive = engine.archiveSeason('season_genesis', 'Genesis Season 1');

    expect(archive.seasonName).toBe('Genesis Season 1');
    expect(archive.podiumWinners.length).toBeGreaterThanOrEqual(3);

    const bossWinner = archive.podiumWinners.find((w) => w.category === 'BOSS_KILLS' && w.rank === 1);
    expect(bossWinner).toBeDefined();
    expect(bossWinner?.playerName).toBe('Vanguard');
    expect(bossWinner?.awardTitle).toContain('Grand Champion');

    // Archive persists in engine
    const retrieved = engine.getHallOfFameArchive('season_genesis');
    expect(retrieved?.seasonId).toBe('season_genesis');
  });
});
