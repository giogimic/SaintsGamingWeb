import { describe, expect, it } from 'vitest';
import {
  ParentPetGenetics,
  PetBreedingEngine,
} from './petBreedingEngine';

describe('Master Player Pet Breeding & Genetic Incubation Engine (Phase 51)', () => {
  const parentA: ParentPetGenetics = {
    petId: 'pet_hound_infernal',
    name: 'Infernal Hellhound',
    speciesGroup: 'CANINE',
    elementGene: { allele1: 'F', allele2: 'F', expressedValue: 'FIRE' },
    temperamentGene: { allele1: 'A', allele2: 'a', expressedValue: 'AGGRESSIVE' },
    statPotentialIv: { strength: 31, vitality: 28, agility: 25, arcana: 10 },
    isShiny: false,
  };

  const parentB: ParentPetGenetics = {
    petId: 'pet_wolf_timber',
    name: 'Timber Wolf',
    speciesGroup: 'CANINE',
    elementGene: { allele1: 'e', allele2: 'e', expressedValue: 'EARTH' },
    temperamentGene: { allele1: 'L', allele2: 'L', expressedValue: 'LOYAL' },
    statPotentialIv: { strength: 24, vitality: 30, agility: 29, arcana: 12 },
    isShiny: true,
  };

  const parentDragon: ParentPetGenetics = {
    petId: 'pet_drake_fire',
    name: 'Fire Drake',
    speciesGroup: 'DRACONIC',
    elementGene: { allele1: 'F', allele2: 'F', expressedValue: 'FIRE' },
    temperamentGene: { allele1: 'A', allele2: 'A', expressedValue: 'AGGRESSIVE' },
    statPotentialIv: { strength: 31, vitality: 31, agility: 20, arcana: 30 },
  };

  const parentSpectralWildcard: ParentPetGenetics = {
    petId: 'pet_spectral_wisp',
    name: 'Spectral Wisp',
    speciesGroup: 'SPECTRAL',
    elementGene: { allele1: 'S', allele2: 'S', expressedValue: 'SHADOW' },
    temperamentGene: { allele1: 'S', allele2: 'S', expressedValue: 'STOIC' },
    statPotentialIv: { strength: 20, vitality: 20, agility: 20, arcana: 20 },
  };

  it('validates species compatibility and spectral wildcard breeding', () => {
    const engine = new PetBreedingEngine();

    // 1. Same group (Canine + Canine) -> Compatible
    expect(engine.validateCompatibility(parentA, parentB).compatible).toBe(true);

    // 2. Incompatible groups (Canine + Draconic) -> Incompatible
    const checkBad = engine.validateCompatibility(parentA, parentDragon);
    expect(checkBad.compatible).toBe(false);
    expect(checkBad.error).toContain('Incompatible breeding groups');

    // 3. Spectral wildcard compatibility (Canine + Spectral) -> Compatible
    expect(engine.validateCompatibility(parentA, parentSpectralWildcard).compatible).toBe(true);
  });

  it('breeds parents, determines thermal climate, and hatches eggs with inherited traits', () => {
    const engine = new PetBreedingEngine();

    const now = 1000000;
    // 1. Breed Hellhound + Timber Wolf (dominant Fire allele -> required Hot climate)
    const egg = engine.breedParents(parentA, parentB, true, now);
    expect(egg.speciesGroup).toBe('CANINE');
    expect(egg.requiredTemperature).toBe('HOT');
    expect(egg.isShiny).toBe(true);

    // 2. Early hatch attempt (only 1 min elapsed, requires 5 min) -> Rejected
    const earlyHatch = engine.hatchEgg(egg, 'HOT', now + 60000);
    expect(earlyHatch.success).toBe(false);
    expect(earlyHatch.error).toContain('incubation timer is not complete');

    // 3. Wrong temperature attempt (Cold climate instead of Hot) -> Rejected
    const coldHatch = engine.hatchEgg(egg, 'COLD', now + 350000);
    expect(coldHatch.success).toBe(false);
    expect(coldHatch.error).toContain('Incorrect incubation climate');

    // 4. Valid Hatch at 5+ minutes with Hot climate -> Successful
    const hatch = engine.hatchEgg(egg, 'HOT', now + 350000);
    expect(hatch.success).toBe(true);
    expect(hatch.hatchling?.isShiny).toBe(true);
    expect(hatch.hatchling?.speciesGroup).toBe('CANINE');
    expect(hatch.hatchling?.element).toBe('FIRE');
    expect(egg.isHatched).toBe(true);
  });
});
