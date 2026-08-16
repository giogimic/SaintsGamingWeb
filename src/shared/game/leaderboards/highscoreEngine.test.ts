import { describe, it, expect } from 'vitest';
import {
  calculateCombatLevel,
  calculateTotalLevel,
  calculateTotalXp,
  rankHighscoreEntries,
} from './highscoreEngine';

describe('Highscores & Mastery Leaderboard Engine (Bible 25 & 26)', () => {
  it('calculates combat level formulas accurately', () => {
    // Level 3 starter
    const starterCombat = calculateCombatLevel({
      attack: 1,
      strength: 1,
      defence: 1,
      hitpoints: 10,
      prayer: 1,
      ranged: 1,
      magic: 1,
    });
    expect(starterCombat).toBe(3);

    // Maxed 99s combat
    const maxedCombat = calculateCombatLevel({
      attack: 99,
      strength: 99,
      defence: 99,
      hitpoints: 99,
      prayer: 99,
      ranged: 99,
      magic: 99,
    });
    expect(maxedCombat).toBe(126);
  });

  it('computes total levels and total xp sums', () => {
    const skills = { attack: 50, strength: 50, defence: 50 };
    const xp = { attack: 100000, strength: 100000, defence: 100000 };

    expect(calculateTotalLevel(skills)).toBe(150);
    expect(calculateTotalXp(xp)).toBe(300000);
  });

  it('ranks highscore entries by total level, then total xp, and assigns 1-based ranks', () => {
    const players = [
      {
        playerId: 'p2',
        name: 'Player Two',
        skillLevels: { attack: 40, defence: 40 },
        skillXpMap: { attack: 40000, defence: 40000 },
      },
      {
        playerId: 'p1',
        name: 'Player One (Maxed)',
        skillLevels: { attack: 99, defence: 99 },
        skillXpMap: { attack: 13000000, defence: 13000000 },
      },
      {
        playerId: 'p3',
        name: 'Player Three (Same Level More XP)',
        skillLevels: { attack: 40, defence: 40 },
        skillXpMap: { attack: 50000, defence: 50000 },
      },
    ];

    const ranked = rankHighscoreEntries(players);

    expect(ranked[0].playerId).toBe('p1');
    expect(ranked[0].rank).toBe(1);

    expect(ranked[1].playerId).toBe('p3');
    expect(ranked[1].rank).toBe(2);

    expect(ranked[2].playerId).toBe('p2');
    expect(ranked[2].rank).toBe(3);
  });
});
