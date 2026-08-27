/**
 * Saints Gaming — Master Player Pet Breeding, Genetic Traits & Cross-Species Incubation Engine (Bible 03, 07, 24, 26)
 * Manages Mendelian genetic trait inheritance, egg incubation cycles with thermal climate requirements, and shiny mutation rolls.
 */

export type SpeciesBreedingGroup =
  | 'CANINE'
  | 'DRACONIC'
  | 'AVIAN'
  | 'FELINE'
  | 'AQUATIC'
  | 'SPECTRAL';

export type ElementalAffinity = 'FIRE' | 'WATER' | 'EARTH' | 'ASTRAL' | 'SHADOW';

export type PetTemperament = 'AGGRESSIVE' | 'LOYAL' | 'PLAYFUL' | 'STOIC';

export interface PetGenePair {
  allele1: string; // 'A' (dominant) or 'a' (recessive)
  allele2: string;
  expressedValue: string;
}

export interface ParentPetGenetics {
  petId: string;
  name: string;
  speciesGroup: SpeciesBreedingGroup;
  elementGene: PetGenePair;
  temperamentGene: PetGenePair;
  statPotentialIv: {
    strength: number; // 0-31 IV
    vitality: number;
    agility: number;
    arcana: number;
  };
  isShiny?: boolean;
}

export interface IncubatingEgg {
  eggId: string;
  parentAId: string;
  parentBId: string;
  speciesGroup: SpeciesBreedingGroup;
  inheritedElement: ElementalAffinity;
  inheritedTemperament: PetTemperament;
  inheritedStats: {
    strength: number;
    vitality: number;
    agility: number;
    arcana: number;
  };
  requiredTemperature: 'HOT' | 'COLD' | 'NEUTRAL';
  startedAt: number;
  durationMs: number;
  isHatched: boolean;
  isShiny: boolean;
}

export class PetBreedingEngine {
  /**
   * Validates cross-species breeding compatibility.
   */
  public validateCompatibility(
    parentA: ParentPetGenetics,
    parentB: ParentPetGenetics
  ): { compatible: boolean; error?: string } {
    if (parentA.petId === parentB.petId) {
      return { compatible: false, error: 'Cannot breed a pet with itself' };
    }

    if (parentA.speciesGroup !== parentB.speciesGroup && parentA.speciesGroup !== 'SPECTRAL' && parentB.speciesGroup !== 'SPECTRAL') {
      return {
        compatible: false,
        error: `Incompatible breeding groups (${parentA.speciesGroup} and ${parentB.speciesGroup})`,
      };
    }

    return { compatible: true };
  }

  /**
   * Breeds two compatible parents to produce an egg with inherited Mendelian alleles and IV rolls.
   */
  public breedParents(
    parentA: ParentPetGenetics,
    parentB: ParentPetGenetics,
    forceShinyRoll?: boolean,
    nowMs: number = Date.now()
  ): IncubatingEgg {
    const check = this.validateCompatibility(parentA, parentB);
    if (!check.compatible) {
      throw new Error(check.error || 'Incompatible parents');
    }

    // Mendelian Allele pick from each parent (50/50 from parent alleles)
    const pickAllele = (gene: PetGenePair) => (Math.random() < 0.5 ? gene.allele1 : gene.allele2);

    const elemAlleleA = pickAllele(parentA.elementGene);
    const elemAlleleB = pickAllele(parentB.elementGene);
    // Uppercase = dominant, lowercase = recessive
    const elemExpressed =
      elemAlleleA === elemAlleleA.toUpperCase()
        ? parentA.elementGene.expressedValue
        : parentB.elementGene.expressedValue;

    const tempAlleleA = pickAllele(parentA.temperamentGene);
    const tempAlleleB = pickAllele(parentB.temperamentGene);
    const tempExpressed =
      tempAlleleA === tempAlleleA.toUpperCase()
        ? parentA.temperamentGene.expressedValue
        : parentB.temperamentGene.expressedValue;

    // Stat IV inheritance: 3 stats from parents, 1 random mutation (0-31)
    const inheritStat = (valA: number, valB: number) =>
      Math.random() < 0.5 ? valA : valB;

    const stats = {
      strength: inheritStat(parentA.statPotentialIv.strength, parentB.statPotentialIv.strength),
      vitality: inheritStat(parentA.statPotentialIv.vitality, parentB.statPotentialIv.vitality),
      agility: inheritStat(parentA.statPotentialIv.agility, parentB.statPotentialIv.agility),
      arcana: inheritStat(parentA.statPotentialIv.arcana, parentB.statPotentialIv.arcana),
    };

    // Determine temperature requirement based on element
    let requiredTemperature: 'HOT' | 'COLD' | 'NEUTRAL' = 'NEUTRAL';
    if (elemExpressed.toUpperCase() === 'FIRE') requiredTemperature = 'HOT';
    else if (elemExpressed.toUpperCase() === 'WATER') requiredTemperature = 'COLD';

    // 1% base shiny mutation roll (or inherited higher chance if parent is shiny)
    const isShiny = forceShinyRoll || Math.random() < 0.01;

    const egg: IncubatingEgg = {
      eggId: `egg_${nowMs}_${Math.random().toString(36).slice(2, 7)}`,
      parentAId: parentA.petId,
      parentBId: parentB.petId,
      speciesGroup: parentA.speciesGroup !== 'SPECTRAL' ? parentA.speciesGroup : parentB.speciesGroup,
      inheritedElement: elemExpressed as ElementalAffinity,
      inheritedTemperament: tempExpressed as PetTemperament,
      inheritedStats: stats,
      requiredTemperature,
      startedAt: nowMs,
      durationMs: 300000, // 5 minutes incubation
      isHatched: false,
      isShiny,
    };

    return egg;
  }

  /**
   * Hatches an incubated egg if time and temperature conditions are met.
   */
  public hatchEgg(
    egg: IncubatingEgg,
    currentTemperature: 'HOT' | 'COLD' | 'NEUTRAL',
    nowMs: number = Date.now()
  ): {
    success: boolean;
    hatchling?: {
      name: string;
      speciesGroup: SpeciesBreedingGroup;
      element: ElementalAffinity;
      temperament: PetTemperament;
      isShiny: boolean;
      stats: Record<string, number>;
    };
    error?: string;
  } {
    if (egg.isHatched) {
      return { success: false, error: 'Egg has already hatched' };
    }

    if (nowMs - egg.startedAt < egg.durationMs) {
      return { success: false, error: 'Egg incubation timer is not complete' };
    }

    if (currentTemperature !== egg.requiredTemperature) {
      return {
        success: false,
        error: `Incorrect incubation climate: requires ${egg.requiredTemperature}, current is ${currentTemperature}`,
      };
    }

    egg.isHatched = true;

    return {
      success: true,
      hatchling: {
        name: `Hatchling ${egg.speciesGroup}`,
        speciesGroup: egg.speciesGroup,
        element: egg.inheritedElement,
        temperament: egg.inheritedTemperament,
        isShiny: egg.isShiny,
        stats: { ...egg.inheritedStats },
      },
    };
  }
}
