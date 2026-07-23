import { prisma } from '@/lib/prisma';

export type ElementType = 
  | 'fire' | 'water' | 'earth' | 'wood' | 'metal' | 'lightning' 
  | 'aether' | 'cosmic' | 'frost' | 'heroic' | 'normal' 
  | 'shadow' | 'sky' | 'venom' | 'none';

export interface CreatureStatProfile {
  HP: number;
  ATK: number;
  DEF: number;
  SPD: number;
  RATK: number;
  RDEF: number;
}

export interface TuxemonCreature {
  id: string;
  txmnId: number;
  name: string;
  species: string;
  type_primary: ElementType;
  type_secondary: ElementType;
  stat_profile: CreatureStatProfile;
  catchRate: number;
  stage: string;
  shape: string;
  spriteFront: string;
  spriteBack: string;
  spriteOverworld: string;
  passive_ability: string;
  world_skill: string;
  moveset: Array<{
    technique: string;
    level: number;
    name: string;
    power: number | null;
    accuracy: number | null;
    type: string;
  }>;
  evolutions: Array<{
    target: string;
    atLevel: number | null;
    itemRequired: string | null;
  }>;
}

// Type effectiveness chart for all 14 elements
export const TYPE_CHART: Record<string, Record<string, number>> = {
  fire: { water: 0.5, earth: 2, wood: 2, frost: 2, metal: 0.5, fire: 0.5 },
  water: { fire: 2, earth: 2, lightning: 2, wood: 0.5, water: 0.5 },
  earth: { water: 2, lightning: 2, frost: 2, venom: 2, wood: 0.5, sky: 0 },
  wood: { water: 2, earth: 2, fire: 0.5, frost: 0.5, venom: 0.5, wood: 0.5 },
  metal: { fire: 2, lightning: 2, frost: 2, water: 0.5, metal: 0.5 },
  lightning: { water: 2, sky: 2, earth: 0, metal: 0.5, lightning: 0.5 },
  aether: { shadow: 2, heroic: 2, cosmic: 2, aether: 0.5 },
  cosmic: { aether: 2, heroic: 2, cosmic: 0.5 },
  frost: { wood: 2, earth: 2, sky: 2, fire: 0.5, frost: 0.5, water: 0.5 },
  heroic: { shadow: 2, venom: 2, aether: 0.5, heroic: 0.5 },
  normal: { shadow: 0, cosmic: 0.5 },
  shadow: { heroic: 2, aether: 2, normal: 2, shadow: 0.5 },
  sky: { wood: 2, venom: 2, earth: 2, lightning: 0.5, sky: 0.5 },
  venom: { wood: 2, heroic: 2, earth: 0.5, venom: 0.5 },
};

export function getTypeEffectiveness(attackType: string, defenderTypes: string[]): number {
  let multiplier = 1;
  for (const defType of defenderTypes) {
    const effectiveness = TYPE_CHART[attackType]?.[defType] ?? 1;
    multiplier *= effectiveness;
  }
  return multiplier;
}

// Fetch all creatures from database
export async function getAllCreatures(): Promise<TuxemonCreature[]> {
  const species = await prisma.tuxemonSpecies.findMany({
    include: {
      moveset: {
        include: {
          species: true,
        },
      },
      evolutions: true,
    },
    orderBy: { txmnId: 'asc' },
  });

  const techniques = await prisma.tuxemonTechnique.findMany();
  const techniqueMap = new Map(techniques.map(t => [t.slug, t]));

  return species.map(s => {
    const types = JSON.parse(s.types) as string[];
    const moveset = s.moveset.map(m => {
      const tech = techniqueMap.get(m.techniqueSlug);
      return {
        technique: m.techniqueSlug,
        level: m.levelLearned,
        name: tech?.name || m.techniqueSlug,
        power: tech?.power || null,
        accuracy: tech?.accuracy || null,
        type: tech?.type || 'normal',
      };
    });

    return {
      id: s.slug,
      txmnId: s.txmnId,
      name: s.slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      species: s.species,
      type_primary: (types[0] || 'normal') as ElementType,
      type_secondary: (types[1] || 'none') as ElementType,
      stat_profile: {
        HP: s.height * 10,
        ATK: s.weight * 2,
        DEF: s.weight * 1.5,
        SPD: s.height * 2,
        RATK: s.weight * 1.8,
        RDEF: s.weight * 1.6,
      },
      catchRate: s.catchRate,
      stage: s.stage,
      shape: s.shape,
      spriteFront: s.spriteFront || '',
      spriteBack: s.spriteBack || '',
      spriteOverworld: s.spriteOverworld || '',
      passive_ability: `Unique ability for ${s.species}`,
      world_skill: `World skill for ${s.species}`,
      moveset,
      evolutions: s.evolutions.map(e => ({
        target: e.targetSlug,
        atLevel: e.atLevel,
        itemRequired: e.itemRequired,
      })),
    };
  });
}

// Fetch creature by ID
export async function getCreatureById(id: string): Promise<TuxemonCreature | null> {
  const s = await prisma.tuxemonSpecies.findUnique({
    where: { slug: id },
    include: {
      moveset: true,
      evolutions: true,
    },
  });

  if (!s) return null;

  const techniques = await prisma.tuxemonTechnique.findMany({
    where: { slug: { in: s.moveset.map(m => m.techniqueSlug) } },
  });
  const techniqueMap = new Map(techniques.map(t => [t.slug, t]));

  const types = JSON.parse(s.types) as string[];
  const moveset = s.moveset.map(m => {
    const tech = techniqueMap.get(m.techniqueSlug);
    return {
      technique: m.techniqueSlug,
      level: m.levelLearned,
      name: tech?.name || m.techniqueSlug,
      power: tech?.power || null,
      accuracy: tech?.accuracy || null,
      type: tech?.type || 'normal',
    };
  });

  return {
    id: s.slug,
    txmnId: s.txmnId,
    name: s.slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    species: s.species,
    type_primary: (types[0] || 'normal') as ElementType,
    type_secondary: (types[1] || 'none') as ElementType,
    stat_profile: {
      HP: s.height * 10,
      ATK: s.weight * 2,
      DEF: s.weight * 1.5,
      SPD: s.height * 2,
      RATK: s.weight * 1.8,
      RDEF: s.weight * 1.6,
    },
    catchRate: s.catchRate,
    stage: s.stage,
    shape: s.shape,
    spriteFront: s.spriteFront || '',
    spriteBack: s.spriteBack || '',
    spriteOverworld: s.spriteOverworld || '',
    passive_ability: `Unique ability for ${s.species}`,
    world_skill: `World skill for ${s.species}`,
    moveset,
    evolutions: s.evolutions.map(e => ({
      target: e.targetSlug,
      atLevel: e.atLevel,
      itemRequired: e.itemRequired,
    })),
  };
}

// Get random encounter based on map
export async function getRandomEncounter(mapSlug: string): Promise<TuxemonCreature | null> {
  const encounter = await prisma.tuxemonEncounter.findFirst({
    where: { mapName: { contains: mapSlug } },
  });

  if (!encounter) {
    // Fallback to random low-level creature
    const count = await prisma.tuxemonSpecies.count({
      where: { stage: 'basic' },
    });
    const skip = Math.floor(Math.random() * count);
    const species = await prisma.tuxemonSpecies.findFirst({
      where: { stage: 'basic' },
      skip,
      include: { moveset: true, evolutions: true },
    });
    
    if (!species) return null;
    return getCreatureById(species.slug);
  }

  // Parse encounter data and pick random creature
  const data = JSON.parse(encounter.data);
  const monsters = data.monsters || [];
  if (monsters.length === 0) return null;

  const randomMonster = monsters[Math.floor(Math.random() * monsters.length)];
  return getCreatureById(randomMonster.monster || randomMonster);
}

// Calculate damage
export function calculateDamage(
  attacker: TuxemonCreature,
  defender: TuxemonCreature,
  move: { power: number | null; type: string; accuracy: number | null }
): { damage: number; effectiveness: number; critical: boolean; missed: boolean } {
  // Check accuracy
  if (move.accuracy && Math.random() * 100 > move.accuracy) {
    return { damage: 0, effectiveness: 1, critical: false, missed: true };
  }

  const basePower = move.power || 50;
  const levelFactor = (2 * 50) / 5 + 2; // Assume level 50 for now
  const attackStat = attacker.stat_profile.ATK;
  const defenseStat = defender.stat_profile.DEF;

  let damage = ((levelFactor * basePower * attackStat) / defenseStat) / 50 + 2;

  // Type effectiveness
  const effectiveness = getTypeEffectiveness(move.type, [defender.type_primary, defender.type_secondary]);
  damage *= effectiveness;

  // Critical hit (6.25% chance)
  const critical = Math.random() < 0.0625;
  if (critical) damage *= 1.5;

  // Random factor (0.85 - 1.0)
  damage *= 0.85 + Math.random() * 0.15;

  return {
    damage: Math.max(1, Math.floor(damage)),
    effectiveness,
    critical,
    missed: false,
  };
}

// Calculate catch rate
export function calculateCatchRate(
  creature: TuxemonCreature,
  currentHp: number,
  maxHp: number,
  status: string | null = null,
  ballType: string = 'standard'
): number {
  const ballMultipliers: Record<string, number> = {
    standard: 1.0,
    great: 1.5,
    ultra: 2.0,
    master: 255,
  };

  const ballMultiplier = ballMultipliers[ballType] || 1.0;
  const hpFactor = (3 * maxHp - 2 * currentHp) / (3 * maxHp);
  const statusBonus = status ? 1.5 : 1.0;

  const catchChance = (creature.catchRate * ballMultiplier * hpFactor * statusBonus) / 255;
  return Math.min(1, Math.max(0, catchChance));
}