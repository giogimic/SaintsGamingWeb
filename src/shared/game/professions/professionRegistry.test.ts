import { describe, it, expect } from 'vitest';
import {
  CANONICAL_PROFESSIONS,
  getProfessionDef,
  getAllProfessionDefs,
  getProfessionsByStationTag,
} from './professionRegistry';

describe('Canonical Profession Registry Engine (Bible 25 §3.6)', () => {
  it('defines all core gathering and artisan professions with valid station tags', () => {
    const list = getAllProfessionDefs();
    expect(list.length).toBeGreaterThanOrEqual(8);

    for (const prof of list) {
      expect(prof.id).toBeDefined();
      expect(prof.name.length).toBeGreaterThan(0);
      expect(prof.primarySkillId.length).toBeGreaterThan(0);
      expect(prof.stationTags.length).toBeGreaterThan(0);
      expect(prof.relatedRecipeKinds.length).toBeGreaterThan(0);
    }
  });

  it('allows looking up professions by station tag', () => {
    const anvilProfessions = getProfessionsByStationTag('anvil');
    expect(anvilProfessions.some((p) => p.id === 'smithing')).toBe(true);

    const fishingProfessions = getProfessionsByStationTag('fishing_spot');
    expect(fishingProfessions.some((p) => p.id === 'fishing')).toBe(true);
  });
});
