import { describe, expect, it } from 'vitest';
import {
  CREATURE_CATEGORIES,
  CreatureCategory,
  CreatureDefData,
  emptyCreatureDef,
} from '../creatureCatalog';

describe('creatureCategoryEngine', () => {
  it('defines the 3 core taxonomy categories', () => {
    const ids = CREATURE_CATEGORIES.map((c) => c.id);
    expect(ids).toContain('beast');
    expect(ids).toContain('monster');
    expect(ids).toContain('mercenary');
  });

  it('emptyCreatureDef defaults to beast category with appropriate attributes', () => {
    const def = emptyCreatureDef();
    expect(def.category).toBe('beast');
    expect(def.catchRate).toBeGreaterThan(0);
    expect(def.aggroRadius).toBeDefined();
    expect(def.respawnSec).toBeDefined();
  });

  it('allows configuring monster-specific combat encounter attributes', () => {
    const monster: CreatureDefData = {
      ...emptyCreatureDef(),
      slug: 'shadow_stalker',
      name: 'Shadow Stalker',
      category: 'monster',
      aggroRadius: 8,
      respawnSec: 45,
    };

    expect(monster.category).toBe('monster');
    expect(monster.aggroRadius).toBe(8);
    expect(monster.respawnSec).toBe(45);
  });

  it('allows configuring mercenary companion recruitment attributes', () => {
    const merc: CreatureDefData = {
      ...emptyCreatureDef(),
      slug: 'vanguard_knight',
      name: 'Vanguard Knight',
      category: 'mercenary',
      hireCost: 250,
      factionId: 'iron_vanguard',
    };

    expect(merc.category).toBe('mercenary');
    expect(merc.hireCost).toBe(250);
    expect(merc.factionId).toBe('iron_vanguard');
  });

  it('filters lists by category cleanly', () => {
    const list: CreatureDefData[] = [
      { ...emptyCreatureDef(), slug: 'pet_cat', name: 'Rockitten', category: 'beast' },
      { ...emptyCreatureDef(), slug: 'goblin', name: 'Goblin Scout', category: 'monster' },
      { ...emptyCreatureDef(), slug: 'archer', name: 'Ranger Merc', category: 'mercenary' },
      { ...emptyCreatureDef(), slug: 'legacy_beast', name: 'Old Beast' }, // legacy without explicit category
    ];

    const beasts = list.filter((c) => (c.category || 'beast') === 'beast');
    const monsters = list.filter((c) => c.category === 'monster');
    const mercs = list.filter((c) => c.category === 'mercenary');

    expect(beasts.length).toBe(2);
    expect(monsters.length).toBe(1);
    expect(mercs.length).toBe(1);
  });
});
