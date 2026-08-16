/**
 * Saints Gaming — Creature Breeding Matrix & Genetic Allele Inheritance Engine (Bible 12)
 * Evaluates parent compatibility, IV allele inheritance, shiny mutations, and egg incubation steps.
 */

export type EggGroup =
  | 'FIELD'
  | 'MONSTER'
  | 'DRAGON'
  | 'WATER'
  | 'FLYING'
  | 'FAIRY'
  | 'UNDISCOVERED';

export type Gender = 'MALE' | 'FEMALE';

export interface CreatureIVs {
  hp: number; // 0 to 31
  atk: number;
  def: number;
  spAtk: number;
  spDef: number;
  speed: number;
}

export interface CreatureParent {
  creatureId: string;
  speciesId: string;
  gender: Gender;
  eggGroups: EggGroup[];
  ivs: CreatureIVs;
  nature: string;
  isShiny?: boolean;
}

export interface BreedingEgg {
  eggId: string;
  speciesId: string;
  stepsRemaining: number;
  totalStepsRequired: number;
  inheritedIvs: CreatureIVs;
  nature: string;
  isShiny: boolean;
}

/**
 * Checks whether two creature parents can produce an egg.
 */
export function checkBreedingCompatibility(
  parentA: CreatureParent,
  parentB: CreatureParent
): { compatible: boolean; reason?: string } {
  if (parentA.gender === parentB.gender) {
    return { compatible: false, reason: 'Parents must be of opposite genders.' };
  }

  if (
    parentA.eggGroups.includes('UNDISCOVERED') ||
    parentB.eggGroups.includes('UNDISCOVERED')
  ) {
    return { compatible: false, reason: 'These creatures cannot breed.' };
  }

  const sharesEggGroup = parentA.eggGroups.some((group) =>
    parentB.eggGroups.includes(group)
  );

  if (!sharesEggGroup) {
    return { compatible: false, reason: 'Creatures do not share an egg group.' };
  }

  return { compatible: true };
}

/**
 * Generates an egg from compatible parents with genetic IV inheritance and shiny roll.
 */
export function generateBreedingEgg(
  parentA: CreatureParent,
  parentB: CreatureParent,
  hasShinyCharm: boolean = false,
  totalStepsRequired: number = 2500,
  randomFloatFn: () => number = Math.random
): { success: boolean; egg?: BreedingEgg; reason?: string } {
  const comp = checkBreedingCompatibility(parentA, parentB);
  if (!comp.compatible) {
    return { success: false, reason: comp.reason };
  }

  const mother = parentA.gender === 'FEMALE' ? parentA : parentB;
  const father = parentA.gender === 'MALE' ? parentA : parentB;

  // IV inheritance: Pick 3 stats from parents, roll 3 randomly (0-31)
  const statKeys: (keyof CreatureIVs)[] = ['hp', 'atk', 'def', 'spAtk', 'spDef', 'speed'];
  const shuffledKeys = [...statKeys].sort(() => randomFloatFn() - 0.5);
  const inheritedStats = shuffledKeys.slice(0, 3);

  const inheritedIvs: CreatureIVs = {
    hp: Math.floor(randomFloatFn() * 32),
    atk: Math.floor(randomFloatFn() * 32),
    def: Math.floor(randomFloatFn() * 32),
    spAtk: Math.floor(randomFloatFn() * 32),
    spDef: Math.floor(randomFloatFn() * 32),
    speed: Math.floor(randomFloatFn() * 32),
  };

  for (const stat of inheritedStats) {
    // 50% chance from mother, 50% from father
    const fromMother = randomFloatFn() < 0.5;
    inheritedIvs[stat] = fromMother ? mother.ivs[stat] : father.ivs[stat];
  }

  // Shiny roll: 1/512 without charm, 1/256 with charm
  const shinyThreshold = hasShinyCharm ? 1 / 256 : 1 / 512;
  const isShiny = randomFloatFn() < shinyThreshold;

  // Nature: 50% mother, 50% father
  const nature = randomFloatFn() < 0.5 ? mother.nature : father.nature;

  const egg: BreedingEgg = {
    eggId: `egg_${mother.speciesId}_${Date.now()}`,
    speciesId: mother.speciesId,
    stepsRemaining: totalStepsRequired,
    totalStepsRequired,
    inheritedIvs,
    nature,
    isShiny,
  };

  return { success: true, egg };
}

/**
 * Ticks egg incubation steps.
 */
export function tickEggIncubation(
  egg: BreedingEgg,
  stepsWalked: number
): { isHatched: boolean; stepsRemaining: number } {
  egg.stepsRemaining = Math.max(0, egg.stepsRemaining - stepsWalked);
  return {
    isHatched: egg.stepsRemaining === 0,
    stepsRemaining: egg.stepsRemaining,
  };
}
