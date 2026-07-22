/**
 * Battle Engine - Core battle logic and state machine
 */

export type BattlePhase = 
  | 'intro'
  | 'player_turn'
  | 'enemy_turn'
  | 'execute'
  | 'check_faint'
  | 'switch'
  | 'result';

export interface BattleMove {
  techniqueSlug: string;
  name: string;
  type: string;
  power: number;
  accuracy: number;
  pp: number;
  maxPp: number;
  target: 'enemy' | 'self' | 'ally';
}

export interface BattleMonster {
  id: string;
  speciesSlug: string;
  nickname: string;
  level: number;
  currentHp: number;
  maxHp: number;
  stats: {
    meleeAtk: number;
    meleeDef: number;
    rangedAtk: number;
    rangedDef: number;
    speed: number;
  };
  moves: BattleMove[];
  status: string | null;
  types: string[];
}

export interface BattleState {
  phase: BattlePhase;
  playerTeam: BattleMonster[];
  enemyTeam: BattleMonster[];
  activePlayerMonster: BattleMonster | null;
  activeEnemyMonster: BattleMonster | null;
  turnQueue: string[];
  currentTurn: number;
  log: string[];
  result: 'win' | 'lose' | 'flee' | 'capture' | null;
}

// Type effectiveness chart (14 elements)
const TYPE_CHART: Record<string, Record<string, number>> = {
  fire: { water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, fire: 0.5 },
  water: { fire: 2, grass: 0.5, ground: 2, rock: 2, dragon: 0.5, water: 0.5 },
  grass: { water: 2, fire: 0.5, ground: 2, rock: 2, flying: 0.5, poison: 0.5, dragon: 0.5, grass: 0.5 },
  electric: { water: 2, flying: 2, ground: 0, electric: 0.5, grass: 0.5, dragon: 0.5 },
  ice: { grass: 2, ground: 2, flying: 2, dragon: 2, fire: 0.5, water: 0.5, ice: 0.5 },
  ground: { fire: 2, electric: 2, poison: 2, rock: 2, grass: 0.5, flying: 0, bug: 0.5 },
  flying: { grass: 2, fighting: 2, bug: 2, electric: 0.5, rock: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5 },
  bug: { grass: 2, psychic: 2, fire: 0.5, fighting: 0.5, flying: 0.5, poison: 0.5, bug: 0.5 },
  rock: { fire: 2, ice: 2, flying: 2, bug: 2, fighting: 0.5, ground: 0.5 },
  dragon: { dragon: 2 },
  dark: { psychic: 2, ghost: 2, fighting: 0.5, dark: 0.5 },
  ghost: { psychic: 2, ghost: 2, dark: 0.5 },
  normal: { ghost: 0, rock: 0.5 },
};

export function getTypeEffectiveness(attackType: string, defenderTypes: string[]): number {
  let multiplier = 1;
  for (const defType of defenderTypes) {
    const effectiveness = TYPE_CHART[attackType]?.[defType] ?? 1;
    multiplier *= effectiveness;
  }
  return multiplier;
}

export function calculateDamage(
  attacker: BattleMonster,
  defender: BattleMonster,
  move: BattleMove
): { damage: number; effectiveness: number; critical: boolean } {
  // Base damage formula
  const levelFactor = (2 * attacker.level) / 5 + 2;
  const attackStat = move.type === 'physical' ? attacker.stats.meleeAtk : attacker.stats.rangedAtk;
  const defenseStat = move.type === 'physical' ? defender.stats.meleeDef : defender.stats.rangedDef;
  
  let damage = ((levelFactor * move.power * attackStat) / defenseStat) / 50 + 2;
  
  // Type effectiveness
  const effectiveness = getTypeEffectiveness(move.type, defender.types);
  damage *= effectiveness;
  
  // Critical hit (6.25% chance)
  const critical = Math.random() < 0.0625;
  if (critical) {
    damage *= 1.5;
  }
  
  // Random factor (0.85 - 1.0)
  const randomFactor = 0.85 + Math.random() * 0.15;
  damage *= randomFactor;
  
  return {
    damage: Math.max(1, Math.floor(damage)),
    effectiveness,
    critical,
  };
}

export function calculateCatchRate(
  monster: BattleMonster,
  ballType: string
): number {
  // Base catch rates by ball type
  const ballMultipliers: Record<string, number> = {
    tuxeball: 1.0,
    grand_ball: 1.5,
    mega_ball: 2.0,
    ultra_ball: 2.5,
    master_ball: 255, // Always catches
  };
  
  const ballMultiplier = ballMultipliers[ballType] || 1.0;
  
  // HP factor (lower HP = easier to catch)
  const hpFactor = (3 * monster.maxHp - 2 * monster.currentHp) / (3 * monster.maxHp);
  
  // Status bonus
  const statusBonus = monster.status ? 1.5 : 1.0;
  
  // Base catch rate (species-specific, using 100 as default)
  const baseCatchRate = 100;
  
  // Calculate catch chance
  const catchChance = (baseCatchRate * ballMultiplier * hpFactor * statusBonus) / 255;
  
  return Math.min(1, Math.max(0, catchChance));
}

export function attemptCapture(monster: BattleMonster, ballType: string): boolean {
  const catchRate = calculateCatchRate(monster, ballType);
  return Math.random() < catchRate;
}

export function createBattleState(
  playerTeam: BattleMonster[],
  enemyTeam: BattleMonster[]
): BattleState {
  // Sort by speed for turn order
  const allMonsters = [...playerTeam, ...enemyTeam].sort((a, b) => b.stats.speed - a.stats.speed);
  const turnQueue = allMonsters.map(m => m.id);
  
  return {
    phase: 'intro',
    playerTeam,
    enemyTeam,
    activePlayerMonster: playerTeam[0] || null,
    activeEnemyMonster: enemyTeam[0] || null,
    turnQueue,
    currentTurn: 0,
    log: ['Battle started!'],
    result: null,
  };
}

export function checkFainted(monster: BattleMonster): boolean {
  return monster.currentHp <= 0;
}

export function getNextActiveMonster(
  team: BattleMonster[],
  currentMonsterId: string
): BattleMonster | null {
  const currentIndex = team.findIndex(m => m.id === currentMonsterId);
  for (let i = currentIndex + 1; i < team.length; i++) {
    if (!checkFainted(team[i])) {
      return team[i];
    }
  }
  return null;
}