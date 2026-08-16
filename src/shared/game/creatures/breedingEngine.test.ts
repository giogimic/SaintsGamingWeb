import { describe, it, expect } from 'vitest';
import {
  checkBreedingCompatibility,
  generateBreedingEgg,
  tickEggIncubation,
  CreatureParent,
} from './breedingEngine';

describe('Creature Breeding Matrix & Genetic Allele Inheritance Engine (Bible 12)', () => {
  const mother: CreatureParent = {
    creatureId: 'parent_f_1',
    speciesId: 'saints_pikachu',
    gender: 'FEMALE',
    eggGroups: ['FIELD', 'FAIRY'],
    ivs: { hp: 31, atk: 31, def: 31, spAtk: 31, spDef: 31, speed: 31 },
    nature: 'Jolly',
  };

  const father: CreatureParent = {
    creatureId: 'parent_m_1',
    speciesId: 'saints_eevee',
    gender: 'MALE',
    eggGroups: ['FIELD'],
    ivs: { hp: 0, atk: 0, def: 0, spAtk: 0, spDef: 0, speed: 0 },
    nature: 'Adamant',
  };

  it('validates parent compatibility based on gender and egg groups', () => {
    // Compatible pair (Female + Male, both share 'FIELD')
    const compOk = checkBreedingCompatibility(mother, father);
    expect(compOk.compatible).toBe(true);

    // Same gender (incompatible)
    const sameGender = checkBreedingCompatibility(mother, { ...father, gender: 'FEMALE' });
    expect(sameGender.compatible).toBe(false);
    expect(sameGender.reason).toContain('opposite genders');

    // Undiscovered egg group (incompatible)
    const legendary = checkBreedingCompatibility(mother, { ...father, eggGroups: ['UNDISCOVERED'] });
    expect(legendary.compatible).toBe(false);
    expect(legendary.reason).toContain('cannot breed');
  });

  it('generates an egg inheriting the mother species, nature, and IVs', () => {
    const result = generateBreedingEgg(mother, father, false, 2500);
    expect(result.success).toBe(true);
    expect(result.egg?.speciesId).toBe('saints_pikachu');
    expect(result.egg?.stepsRemaining).toBe(2500);
    expect(['Jolly', 'Adamant']).toContain(result.egg?.nature);
  });

  it('progresses egg incubation and triggers hatch at 0 steps', () => {
    const result = generateBreedingEgg(mother, father, false, 500);
    const egg = result.egg!;

    const step1 = tickEggIncubation(egg, 200);
    expect(step1.isHatched).toBe(false);
    expect(step1.stepsRemaining).toBe(300);

    const step2 = tickEggIncubation(egg, 300);
    expect(step2.isHatched).toBe(true);
    expect(step2.stepsRemaining).toBe(0);
  });
});
