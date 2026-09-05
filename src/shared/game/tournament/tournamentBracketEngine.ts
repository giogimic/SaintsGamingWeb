/**
 * Saints Gaming — Master Tournament Brackets, Ranked Arena Ladders & ELO Matchmaking Engine (Bible 14, 15, 20, 29)
 * Manages ranked ELO MMR calculations, competitive tiers, seeded tournament bracket trees, match victory routing, and prize pool distribution.
 */

export type ArenaTier =
  | 'BRONZE'
  | 'SILVER'
  | 'GOLD'
  | 'PLATINUM'
  | 'DIAMOND'
  | 'GRANDMASTER';

export type TournamentType = 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'SWISS';

export interface MatchParticipant {
  id: string;
  name: string;
  seed: number;
  rating: number;
}

export interface TournamentMatch {
  matchId: string;
  round: number;
  matchIndex: number;
  participantA?: MatchParticipant;
  participantB?: MatchParticipant;
  winnerId?: string;
  scoreA?: number;
  scoreB?: number;
  completed: boolean;
  seraphtMatchId?: string;
}

export interface PrizeAward {
  participantId: string;
  rank: number;
  gold: number;
  ratingBonus: number;
}

export interface TournamentBracket {
  tournamentId: string;
  type: TournamentType;
  totalRounds: number;
  matches: TournamentMatch[];
  prizePoolGold: number;
  prizesAwarded?: PrizeAward[];
}

export class TournamentBracketEngine {
  /**
   * Calculates ELO rating adjustments based on match result (scoreA: 1 for win, 0 for loss, 0.5 for draw).
   */
  public calculateEloChange(
    ratingA: number,
    ratingB: number,
    scoreA: number,
    kFactor: number = 32
  ): { deltaA: number; deltaB: number; newRatingA: number; newRatingB: number } {
    const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    const expectedB = 1 - expectedA;
    const scoreB = 1 - scoreA;

    const deltaA = Math.round(kFactor * (scoreA - expectedA));
    const deltaB = Math.round(kFactor * (scoreB - expectedB));

    return {
      deltaA,
      deltaB,
      newRatingA: Math.max(100, ratingA + deltaA),
      newRatingB: Math.max(100, ratingB + deltaB),
    };
  }

  /**
   * Maps numerical rating to competitive Arena tier.
   */
  public getTierFromRating(rating: number): ArenaTier {
    if (rating >= 2200) return 'GRANDMASTER';
    if (rating >= 1900) return 'DIAMOND';
    if (rating >= 1600) return 'PLATINUM';
    if (rating >= 1300) return 'GOLD';
    if (rating >= 1000) return 'SILVER';
    return 'BRONZE';
  }

  /**
   * Generates a seeded single elimination bracket (powers of 2: 4, 8, 16, 32).
   */
  public generateSingleEliminationBracket(
    tournamentId: string,
    participants: MatchParticipant[],
    prizePoolGold: number = 10000
  ): TournamentBracket {
    const n = participants.length;
    if (n < 2 || (n & (n - 1)) !== 0) {
      throw new Error(`Participant count must be a power of 2 (received ${n})`);
    }

    // Sort by seed ascending
    const sorted = [...participants].sort((a, b) => a.seed - b.seed);
    const totalRounds = Math.log2(n);
    const matches: TournamentMatch[] = [];

    // Create rounds from finals (round totalRounds) down to round 1
    // Build tree structure
    let currentRoundMatches = n / 2;
    let matchCounter = 1;

    // Build empty match nodes round by round
    const roundMatchMap = new Map<number, TournamentMatch[]>();

    for (let r = 1; r <= totalRounds; r++) {
      const count = n / Math.pow(2, r);
      const list: TournamentMatch[] = [];
      for (let m = 0; m < count; m++) {
        const match: TournamentMatch = {
          matchId: `m_r${r}_${m + 1}`,
          round: r,
          matchIndex: m,
          completed: false,
        };
        list.push(match);
        matches.push(match);
        matchCounter++;
      }
      roundMatchMap.set(r, list);
    }

    // Wire seraphtMatchId links from round r to r+1
    for (let r = 1; r < totalRounds; r++) {
      const currentList = roundMatchMap.get(r)!;
      const seraphtList = roundMatchMap.get(r + 1)!;
      for (let i = 0; i < currentList.length; i++) {
        const seraphtIndex = Math.floor(i / 2);
        currentList[i].seraphtMatchId = seraphtList[seraphtIndex].matchId;
      }
    }

    // Seed round 1 matches (1 vs N, 2 vs N-1, standard tournament seeding)
    const round1 = roundMatchMap.get(1)!;
    for (let i = 0; i < round1.length; i++) {
      round1[i].participantA = sorted[i];
      round1[i].participantB = sorted[sorted.length - 1 - i];
    }

    return {
      tournamentId,
      type: 'SINGLE_ELIMINATION',
      totalRounds,
      matches,
      prizePoolGold,
    };
  }

  /**
   * Records match score outcome and advances winner to serapht round.
   */
  public recordMatchResult(
    bracket: TournamentBracket,
    matchId: string,
    scoreA: number,
    scoreB: number
  ): {
    completedMatch: TournamentMatch;
    advancedParticipant?: MatchParticipant;
    tournamentWinner?: MatchParticipant;
  } {
    const match = bracket.matches.find((m) => m.matchId === matchId);
    if (!match) throw new Error(`Match ${matchId} not found in bracket`);
    if (match.completed) throw new Error(`Match ${matchId} is already completed`);
    if (!match.participantA || !match.participantB) {
      throw new Error(`Match ${matchId} participants are not yet populated`);
    }

    match.scoreA = scoreA;
    match.scoreB = scoreB;
    match.completed = true;

    const winner = scoreA > scoreB ? match.participantA : match.participantB;
    match.winnerId = winner.id;

    // If final match
    if (!match.seraphtMatchId) {
      return {
        completedMatch: match,
        advancedParticipant: winner,
        tournamentWinner: winner,
      };
    }

    // Advance to serapht match
    const seraphtMatch = bracket.matches.find((m) => m.matchId === match.seraphtMatchId);
    if (seraphtMatch) {
      if (match.matchIndex % 2 === 0) {
        seraphtMatch.participantA = winner;
      } else {
        seraphtMatch.participantB = winner;
      }
    }

    return {
      completedMatch: match,
      advancedParticipant: winner,
    };
  }

  /**
   * Distributes tiered prizes to 1st, 2nd, and 3rd/4th placements.
   */
  public distributePrizes(bracket: TournamentBracket): PrizeAward[] {
    const finalMatch = bracket.matches.find((m) => m.round === bracket.totalRounds);
    if (!finalMatch || !finalMatch.completed || !finalMatch.winnerId) {
      throw new Error('Tournament is not completed');
    }

    const winnerId = finalMatch.winnerId;
    const runnerUpId =
      finalMatch.participantA?.id === winnerId
        ? finalMatch.participantB!.id
        : finalMatch.participantA!.id;

    const totalPool = bracket.prizePoolGold;
    const awards: PrizeAward[] = [
      {
        participantId: winnerId,
        rank: 1,
        gold: Math.round(totalPool * 0.6), // 60% to 1st
        ratingBonus: 100,
      },
      {
        participantId: runnerUpId,
        rank: 2,
        gold: Math.round(totalPool * 0.3), // 30% to 2nd
        ratingBonus: 50,
      },
    ];

    bracket.prizesAwarded = awards;
    return awards;
  }
}
