/**
 * Saints Gaming — Master Realm Leaderboards, Season Archive & Hall of Fame Engine (Bible 16 & 28)
 * Manages multi-category highscores, anti-anomaly verification, immutable season archives, and podium title awards.
 */

export type LeaderboardCategory =
  | 'TOTAL_XP'
  | 'BOSS_KILLS'
  | 'PVP_ELO'
  | 'CLUE_SCROLLS'
  | 'RAID_CLEARS'
  | 'DUNGEON_SPEEDRUN';

export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  score: number;
  category: LeaderboardCategory;
  seasonId: string;
  rank?: number;
  lastUpdated: number;
}

export interface PodiumWinner {
  category: LeaderboardCategory;
  rank: number;
  playerId: string;
  playerName: string;
  awardTitle: string;
}

export interface HallOfFameArchive {
  seasonId: string;
  seasonName: string;
  archivedAt: number;
  categories: Partial<Record<LeaderboardCategory, LeaderboardEntry[]>>;
  podiumWinners: PodiumWinner[];
}

export class RealmHallOfFameEngine {
  private activeEntries = new Map<string, LeaderboardEntry>(); // key: `${seasonId}_${category}_${playerId}`
  private archives = new Map<string, HallOfFameArchive>();

  private getEntryKey(seasonId: string, category: LeaderboardCategory, playerId: string): string {
    return `${seasonId}_${category}_${playerId}`;
  }

  /**
   * Submits or updates a player's score with rate-of-progression anomaly protection.
   */
  public submitScore(
    input: Omit<LeaderboardEntry, 'rank' | 'lastUpdated'>,
    maxAllowedDeltaPerSecond: number = 50000
  ): { success: boolean; entry?: LeaderboardEntry; reason?: string } {
    const key = this.getEntryKey(input.seasonId, input.category, input.playerId);
    const existing = this.activeEntries.get(key);
    const now = Date.now();

    if (existing) {
      const elapsedSeconds = Math.max(0.1, (now - existing.lastUpdated) / 1000);
      const scoreDelta = input.score - existing.score;

      // Anomaly check: if score increased impossibly fast, reject submission
      if (scoreDelta > 0 && scoreDelta / elapsedSeconds > maxAllowedDeltaPerSecond) {
        return {
          success: false,
          reason: `Score progression anomaly detected (+${scoreDelta} in ${elapsedSeconds.toFixed(1)}s)`,
        };
      }
    }

    const entry: LeaderboardEntry = {
      ...input,
      lastUpdated: now,
    };

    this.activeEntries.set(key, entry);
    return { success: true, entry };
  }

  /**
   * Retrieves sorted top N leaderboard entries for a given season and category.
   */
  public getLeaderboard(
    seasonId: string,
    category: LeaderboardCategory,
    limit: number = 100
  ): LeaderboardEntry[] {
    const matching: LeaderboardEntry[] = [];
    for (const entry of this.activeEntries.values()) {
      if (entry.seasonId === seasonId && entry.category === category) {
        matching.push({ ...entry });
      }
    }

    // Sort order: speedruns sort ASCENDING (lower time is better), all others sort DESCENDING
    if (category === 'DUNGEON_SPEEDRUN') {
      matching.sort((a, b) => a.score - b.score);
    } else {
      matching.sort((a, b) => b.score - a.score);
    }

    return matching.slice(0, limit).map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
    }));
  }

  /**
   * Freezes active season standings into an immutable Hall of Fame Archive and awards podium titles.
   */
  public archiveSeason(seasonId: string, seasonName: string): HallOfFameArchive {
    const categories: LeaderboardCategory[] = [
      'TOTAL_XP',
      'BOSS_KILLS',
      'PVP_ELO',
      'CLUE_SCROLLS',
      'RAID_CLEARS',
      'DUNGEON_SPEEDRUN',
    ];

    const categorySnapshots: Partial<Record<LeaderboardCategory, LeaderboardEntry[]>> = {};
    const podiumWinners: PodiumWinner[] = [];

    for (const cat of categories) {
      const topEntries = this.getLeaderboard(seasonId, cat, 100);
      categorySnapshots[cat] = topEntries;

      // Top 3 in each category receive Hall of Fame Titles
      if (topEntries.length >= 1) {
        podiumWinners.push({
          category: cat,
          rank: 1,
          playerId: topEntries[0].playerId,
          playerName: topEntries[0].playerName,
          awardTitle: `Grand Champion of ${cat.replace('_', ' ')}`,
        });
      }
      if (topEntries.length >= 2) {
        podiumWinners.push({
          category: cat,
          rank: 2,
          playerId: topEntries[1].playerId,
          playerName: topEntries[1].playerName,
          awardTitle: `Master Contender of ${cat.replace('_', ' ')}`,
        });
      }
      if (topEntries.length >= 3) {
        podiumWinners.push({
          category: cat,
          rank: 3,
          playerId: topEntries[2].playerId,
          playerName: topEntries[2].playerName,
          awardTitle: `Honored Victor of ${cat.replace('_', ' ')}`,
        });
      }
    }

    const archive: HallOfFameArchive = {
      seasonId,
      seasonName,
      archivedAt: Date.now(),
      categories: categorySnapshots,
      podiumWinners,
    };

    this.archives.set(seasonId, archive);
    return archive;
  }

  /**
   * Retrieves an archived Hall of Fame season record.
   */
  public getHallOfFameArchive(seasonId: string): HallOfFameArchive | null {
    return this.archives.get(seasonId) || null;
  }
}
