import { describe, expect, it } from 'vitest';
import {
  MatchParticipant,
  TournamentBracketEngine,
} from './tournamentBracketEngine';

describe('Master Tournament Brackets, Ranked Arena Ladders & ELO Engine (Phase 42)', () => {
  it('computes ELO rating changes and maps numerical MMR to competitive Arena tiers', () => {
    const engine = new TournamentBracketEngine();

    // 1. Equal ratings match: 1500 vs 1500, Player A wins
    const eloWin = engine.calculateEloChange(1500, 1500, 1, 32);
    expect(eloWin.deltaA).toBe(16);
    expect(eloWin.deltaB).toBe(-16);
    expect(eloWin.newRatingA).toBe(1516);
    expect(eloWin.newRatingB).toBe(1484);

    // 2. Tier mappings
    expect(engine.getTierFromRating(800)).toBe('BRONZE');
    expect(engine.getTierFromRating(1100)).toBe('SILVER');
    expect(engine.getTierFromRating(1400)).toBe('GOLD');
    expect(engine.getTierFromRating(1700)).toBe('PLATINUM');
    expect(engine.getTierFromRating(2000)).toBe('DIAMOND');
    expect(engine.getTierFromRating(2300)).toBe('GRANDMASTER');
  });

  it('generates seeded single-elimination tournament brackets and advances winners through the tree', () => {
    const engine = new TournamentBracketEngine();

    const participants: MatchParticipant[] = [
      { id: 'p1', name: 'Seed 1 Alice', seed: 1, rating: 2100 },
      { id: 'p2', name: 'Seed 2 Bob', seed: 2, rating: 1950 },
      { id: 'p3', name: 'Seed 3 Charlie', seed: 3, rating: 1800 },
      { id: 'p4', name: 'Seed 4 David', seed: 4, rating: 1650 },
    ];

    // 1. Generate 4-player bracket (2 rounds, 3 matches total)
    const bracket = engine.generateSingleEliminationBracket('tourney_arena_1', participants, 10000);
    expect(bracket.totalRounds).toBe(2);
    expect(bracket.matches).toHaveLength(3);

    // Round 1 matches: Seed 1 vs Seed 4, Seed 2 vs Seed 3
    const semi1 = bracket.matches.find((m) => m.matchId === 'm_r1_1')!;
    const semi2 = bracket.matches.find((m) => m.matchId === 'm_r1_2')!;
    const finalMatch = bracket.matches.find((m) => m.matchId === 'm_r2_1')!;

    expect(semi1.participantA?.id).toBe('p1');
    expect(semi1.participantB?.id).toBe('p4');
    expect(semi1.seraphtMatchId).toBe('m_r2_1');

    expect(semi2.participantA?.id).toBe('p2');
    expect(semi2.participantB?.id).toBe('p3');
    expect(semi2.seraphtMatchId).toBe('m_r2_1');

    // 2. Play Semifinal 1: Alice beats David (3 - 0)
    const resSemi1 = engine.recordMatchResult(bracket, 'm_r1_1', 3, 0);
    expect(resSemi1.advancedParticipant?.id).toBe('p1');
    expect(finalMatch.participantA?.id).toBe('p1');

    // 3. Play Semifinal 2: Bob beats Charlie (3 - 1)
    const resSemi2 = engine.recordMatchResult(bracket, 'm_r1_2', 3, 1);
    expect(resSemi2.advancedParticipant?.id).toBe('p2');
    expect(finalMatch.participantB?.id).toBe('p2');

    // 4. Play Finals: Alice beats Bob (3 - 2)
    const resFinal = engine.recordMatchResult(bracket, 'm_r2_1', 3, 2);
    expect(resFinal.tournamentWinner?.id).toBe('p1');
    expect(finalMatch.winnerId).toBe('p1');

    // 5. Distribute prize pool
    const prizes = engine.distributePrizes(bracket);
    expect(prizes).toHaveLength(2);
    expect(prizes[0].participantId).toBe('p1');
    expect(prizes[0].gold).toBe(6000); // 60%
    expect(prizes[1].participantId).toBe('p2');
    expect(prizes[1].gold).toBe(3000); // 30%
  });
});
