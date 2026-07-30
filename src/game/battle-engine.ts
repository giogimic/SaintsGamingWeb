/**
 * Battle Engine - Core battle logic and state machine for Tuxemon 15-Type System
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
  category?: 'physical' | 'special' | 'status';
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
    // Tuxemon stat aliases
    hp?: number;
    atk?: number;
    def?: number;
    spd?: number;
    ratk?: number;
    rdef?: number;
  };
  moves: BattleMove[];
  status: string | null;
  types: string[];
  baseCatchRate?: number;
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

// Tuxemon 15 Elemental Type Effectiveness Chart
const TUXEMON_TYPE_CHART: Record<string, Record<string, number>> = {
  fire: { water: 0.5, earth: 0.5, wood: 2, frost: 2, metal: 2, fire: 0.5 },
  water: { fire: 2, earth: 2, wood: 0.5, lightning: 0.5, water: 0.5 },
  earth: { fire: 2, lightning: 2, wood: 0.5, metal: 2, earth: 0.5 },
  wood: { water: 2, earth: 2, fire: 0.5, metal: 0.5, venom: 0.5, wood: 0.5 },
  metal: { wood: 2, frost: 2, fire: 0.5, lightning: 0.5, metal: 0.5 },
  lightning: { water: 2, metal: 2, earth: 0.5, wood: 0.5, lightning: 0.5 },
  aether: { cosmic: 2, shadow: 2, heroic: 0.5, aether: 0.5 },
  cosmic: { aether: 2, heroic: 2, shadow: 0.5, cosmic: 0.5 },
  frost: { wood: 2, sky: 2, fire: 0.5, metal: 0.5, frost: 0.5 },
  heroic: { shadow: 2, venom: 2, cosmic: 0.5, heroic: 0.5 },
  normal: { shadow: 0.5, normal: 1 },
  shadow: { normal: 2, aether: 2, heroic: 0.5, shadow: 0.5 },
  sky: { wood: 2, venom: 2, lightning: 0.5, frost: 0.5, sky: 0.5 },
  venom: { wood: 2, heroic: 2, metal: 0.5, venom: 0.5 },
  none: {}
};

export function getTypeEffectiveness(attackType: string, defenderTypes: string[]): number {
  let multiplier = 1;
  const attackKey = attackType.toLowerCase();
  for (const defType of defenderTypes) {
    const defKey = defType.toLowerCase();
    const effectiveness = TUXEMON_TYPE_CHART[attackKey]?.[defKey] ?? 1;
    multiplier *= effectiveness;
  }
  return multiplier;
}

export function calculateDamage(
  attacker: BattleMonster,
  defender: BattleMonster,
  move: BattleMove
): { damage: number; effectiveness: number; critical: boolean } {
  // Base damage formula using Tuxemon stats
  const levelFactor = (2 * attacker.level) / 5 + 2;
  const attackStat = move.category === 'special' 
    ? (attacker.stats.rangedAtk || attacker.stats.ratk || 10) 
    : (attacker.stats.meleeAtk || attacker.stats.atk || 10);
  const defenseStat = move.category === 'special' 
    ? (defender.stats.rangedDef || defender.stats.rdef || 10) 
    : (defender.stats.meleeDef || defender.stats.def || 10);
  
  let damage = ((levelFactor * move.power * attackStat) / Math.max(1, defenseStat)) / 50 + 2;
  
  // Type effectiveness
  const effectiveness = getTypeEffectiveness(move.type, defender.types);
  damage *= effectiveness;
  
  // Critical hit (6.25% chance)
  const critical = Math.random() < 0.0625;
  if (critical) {
    damage *= 1.5;
  }
  
  // Random variance factor (0.85 - 1.0)
  const randomFactor = 0.85 + Math.random() * 0.15;
  damage *= randomFactor;
  
  return {
    damage: Math.max(1, Math.floor(damage)),
    effectiveness,
    critical,
  };
}

export function executeMove(
  attacker: BattleMonster,
  defender: BattleMonster,
  moveIndex: number
): { success: boolean; damage: number; effectiveness: number; critical: boolean; message: string } {
  const move = attacker.moves[moveIndex];
  if (!move || move.pp <= 0) {
    return {
      success: false,
      damage: 0,
      effectiveness: 1,
      critical: false,
      message: `${attacker.nickname} has no PP left for this move!`
    };
  }

  // Deduct 1 PP
  move.pp = Math.max(0, move.pp - 1);

  // Check move accuracy
  const hit = Math.random() * 100 < move.accuracy;
  if (!hit) {
    return {
      success: false,
      damage: 0,
      effectiveness: 1,
      critical: false,
      message: `${attacker.nickname}'s ${move.name} missed!`
    };
  }

  const result = calculateDamage(attacker, defender, move);
  defender.currentHp = Math.max(0, defender.currentHp - result.damage);

  let msg = `${attacker.nickname} used ${move.name}!`;
  if (result.critical) msg += ' Critical Hit!';
  if (result.effectiveness > 1) msg += ' Super Effective!';
  if (result.effectiveness < 1 && result.effectiveness > 0) msg += ' Not Very Effective...';

  return {
    success: true,
    damage: result.damage,
    effectiveness: result.effectiveness,
    critical: result.critical,
    message: msg
  };
}

export function calculateCatchRate(
  monster: BattleMonster,
  ballType: string
): number {
  // Tuxeball Multipliers
  const ballMultipliers: Record<string, number> = {
    tuxeball: 1.0,
    grand_ball: 1.5,
    mega_ball: 2.0,
    ultra_ball: 2.5,
    master_ball: 255, // 100% catch rate
  };
  
  const ballMultiplier = ballMultipliers[ballType] || 1.0;
  if (ballMultiplier >= 255) return 1.0;

  // HP factor (lower HP = higher catch chance)
  const hpFactor = (3 * monster.maxHp - 2 * monster.currentHp) / (3 * monster.maxHp);
  
  // Status bonus multiplier
  const statusBonus = monster.status ? 1.5 : 1.0;
  
  // Species Base Catch Rate
  const baseCatch = monster.baseCatchRate || 100;
  
  // Calculate catch probability
  const catchChance = (baseCatch * ballMultiplier * hpFactor * statusBonus) / 255;
  
  return Math.min(1, Math.max(0.05, catchChance));
}

export function attemptCapture(monster: BattleMonster, ballType: string): boolean {
  const catchRate = calculateCatchRate(monster, ballType);
  return Math.random() < catchRate;
}

export function checkEvolutionTrigger(
  level: number,
  targetLevel?: number,
  itemUsed?: string,
  requiredItem?: string
): boolean {
  if (targetLevel && level >= targetLevel) return true;
  if (itemUsed && requiredItem && itemUsed === requiredItem) return true;
  return false;
}

export function createBattleState(
  playerTeam: BattleMonster[],
  enemyTeam: BattleMonster[]
): BattleState {
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
    log: ['Wild encounter started!'],
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

/**
 * Direct Player vs Keeper Combat Math (Phase B Dual Combat)
 */
export function calculateKeeperCombatDamage(
  attackerLevel: number,
  weaponPower: number,
  defenderDefence: number,
  isActionBlock: boolean = false
): { damage: number; blocked: boolean } {
  const baseDamage = ((2 * attackerLevel / 5 + 2) * weaponPower * 12) / Math.max(1, defenderDefence) + 2;
  let finalDamage = Math.max(1, Math.floor(baseDamage * (0.85 + Math.random() * 0.15)));

  if (isActionBlock) {
    finalDamage = Math.max(1, Math.floor(finalDamage * 0.5)); // Halve damage on Spacebar timing block
  }

  return {
    damage: finalDamage,
    blocked: isActionBlock
  };
}

/**
 * ARPG Crafting Random Affix Generator (Smithing & Crafting Skills)
 */
export interface CraftedItemAffix {
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  affixName: string;
  bonusType: 'FIRE_DMG' | 'MAX_HP' | 'CRIT_CHANCE' | 'LIFESTEAL' | 'SPEED';
  bonusValue: number;
}

export function rollCraftedItemAffix(_craftingLevel: number): CraftedItemAffix {
  const roll = Math.random() * 100;
  let rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' = 'Common';

  if (roll > 95) rarity = 'Legendary';
  else if (roll > 85) rarity = 'Epic';
  else if (roll > 60) rarity = 'Rare';

  const bonusScale = rarity === 'Legendary' ? 4 : rarity === 'Epic' ? 3 : rarity === 'Rare' ? 2 : 1;
  const affixes: { name: string; type: CraftedItemAffix['bonusType']; baseVal: number }[] = [
    { name: 'Ignited', type: 'FIRE_DMG', baseVal: 5 },
    { name: 'Vital', type: 'MAX_HP', baseVal: 10 },
    { name: 'Keen', type: 'CRIT_CHANCE', baseVal: 5 },
    { name: 'Vampiric', type: 'LIFESTEAL', baseVal: 3 },
    { name: 'Fleet', type: 'SPEED', baseVal: 4 }
  ];

  const chosen = affixes[Math.floor(Math.random() * affixes.length)];
  return {
    rarity,
    affixName: `${rarity} ${chosen.name}`,
    bonusType: chosen.type,
    bonusValue: chosen.baseVal * bonusScale
  };
}