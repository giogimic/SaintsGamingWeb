/**
 * Saints Gaming — Highscores & Mastery Leaderboard Engine (Bible 25 & 26)
 * Calculates total levels, authoritative combat level formulas (1-126), and rank ordering.
 */

export interface HighscoreEntry {
  playerId: string;
  name: string;
  totalLevel: number;
  totalXp: number;
  combatLevel: number;
  skillLevels: Record<string, number>;
  rank: number;
}

/**
 * Calculates authoritative 1-126 combat level formula.
 */
export function calculateCombatLevel(skills: {
  attack?: number;
  strength?: number;
  defence?: number;
  hitpoints?: number;
  prayer?: number;
  ranged?: number;
  magic?: number;
}): number {
  const atk = skills.attack ?? 1;
  const str = skills.strength ?? 1;
  const def = skills.defence ?? 1;
  const hp = skills.hitpoints ?? 10;
  const pray = skills.prayer ?? 1;
  const range = skills.ranged ?? 1;
  const mage = skills.magic ?? 1;

  const base = 0.25 * (def + hp + Math.floor(pray / 2));
  const melee = 0.325 * (atk + str);
  const ranger = 0.325 * Math.floor((3 * range) / 2);
  const wizard = 0.325 * Math.floor((3 * mage) / 2);

  const combat = Math.floor(base + Math.max(melee, ranger, wizard));
  return Math.max(3, Math.min(126, combat));
}

/**
 * Sums all individual skill levels to determine total level.
 */
export function calculateTotalLevel(skillLevels: Record<string, number>): number {
  return Object.values(skillLevels).reduce((acc, lvl) => acc + (lvl || 1), 0);
}

/**
 * Sums total XP across all skills.
 */
export function calculateTotalXp(skillXpMap: Record<string, number>): number {
  return Object.values(skillXpMap).reduce((acc, xp) => acc + (xp || 0), 0);
}

/**
 * Ranks a list of player highscore entries:
 * 1. Total Level (descending)
 * 2. Total XP (descending)
 * 3. Combat Level (descending)
 */
export function rankHighscoreEntries(
  entries: Array<{
    playerId: string;
    name: string;
    skillLevels: Record<string, number>;
    skillXpMap: Record<string, number>;
  }>
): HighscoreEntry[] {
  const calculated = entries.map((e) => {
    const totalLevel = calculateTotalLevel(e.skillLevels);
    const totalXp = calculateTotalXp(e.skillXpMap);
    const combatLevel = calculateCombatLevel({
      attack: e.skillLevels.attack,
      strength: e.skillLevels.strength,
      defence: e.skillLevels.defence,
      hitpoints: e.skillLevels.hitpoints,
      prayer: e.skillLevels.prayer,
      ranged: e.skillLevels.ranged,
      magic: e.skillLevels.magic,
    });

    return {
      playerId: e.playerId,
      name: e.name,
      totalLevel,
      totalXp,
      combatLevel,
      skillLevels: e.skillLevels,
      rank: 0,
    };
  });

  calculated.sort((a, b) => {
    if (b.totalLevel !== a.totalLevel) {
      return b.totalLevel - a.totalLevel;
    }
    if (b.totalXp !== a.totalXp) {
      return b.totalXp - a.totalXp;
    }
    return b.combatLevel - a.combatLevel;
  });

  return calculated.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}
