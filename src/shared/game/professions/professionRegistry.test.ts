import { describe, it, expect } from 'vitest';
import {
  CANONICAL_PROFESSIONS,
  getAllProfessionDefs,
  getAllCombatProfessions,
  getAllLifeProfessions,
  getProfessionDef,
  getProfessionsByStationTag,
  getProfessionsBySubCategory,
} from './professionRegistry';

describe('professionRegistry', () => {
  it('defines all 27 canonical combat and life professions', () => {
    const all = getAllProfessionDefs();
    expect(all.length).toBe(27);

    for (const prof of all) {
      expect(prof.id).toBeDefined();
      expect(prof.name).toBeDefined();
      expect(prof.description.length).toBeGreaterThan(0);
      expect(prof.themeColor.startsWith('#')).toBe(true);
      expect(prof.primarySkillId.length).toBeGreaterThan(0);
      expect(['COMBAT', 'LIFE']).toContain(prof.category);
      expect(['Combat', 'Gathering', 'Artisan', 'Support']).toContain(prof.subCategory);
    }
  });

  it('separates combat and life professions accurately', () => {
    const combat = getAllCombatProfessions();
    const life = getAllLifeProfessions();

    expect(combat.length).toBe(9);
    expect(life.length).toBe(18);

    const gathering = getProfessionsBySubCategory('Gathering');
    const artisan = getProfessionsBySubCategory('Artisan');
    const support = getProfessionsBySubCategory('Support');

    expect(gathering.length).toBe(5);
    expect(artisan.length).toBe(8);
    expect(support.length).toBe(5);
  });

  it('allows looking up professions by station tag', () => {
    const anvilUsers = getProfessionsByStationTag('anvil');
    expect(anvilUsers.some((p) => p.id === 'smithing')).toBe(true);

    const rockNodes = getProfessionsByStationTag('rock_node');
    expect(rockNodes.some((p) => p.id === 'mining')).toBe(true);
  });

  it('finds individual professions case-insensitively', () => {
    expect(getProfessionDef('WOODCUTTING')?.primarySkillId).toBe('woodcutting');
    expect(getProfessionDef('Attack')?.category).toBe('COMBAT');
    expect(getProfessionDef('UnknownSkill')).toBeUndefined();
  });
});
