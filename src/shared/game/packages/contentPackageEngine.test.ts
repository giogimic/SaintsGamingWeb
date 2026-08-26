import { describe, it, expect } from 'vitest';
import {
  createContentPackage,
  validatePackageDependencies,
  exportPackageToJson,
  importPackageFromJson,
} from './contentPackageEngine';
import { DefinitionType } from '../definitionRegistry';

describe('contentPackageEngine (Studio Plan Part 8 §5 & §6)', () => {
  it('creates and validates a self-contained package', () => {
    const pkg = createContentPackage(
      'starter_mounts',
      'Starter Mounts Pack',
      '1.0.0',
      [
        {
          type: 'mount',
          slug: 'swift_stallion',
          name: 'Swift Stallion',
          data: { speedMultiplier: 1.5 },
        },
      ],
      [],
      'A pack containing starter mounts'
    );

    const knownSlugs = new Map<DefinitionType, Set<string>>();
    const validation = validatePackageDependencies(pkg, knownSlugs);

    expect(validation.valid).toBe(true);
    expect(validation.contentCount).toBe(1);
    expect(validation.missingDependencies).toHaveLength(0);
  });

  it('detects missing external dependencies', () => {
    const pkg = createContentPackage(
      'dungeon_mines',
      'Copper Mines Dungeon Pack',
      '1.0.0',
      [
        {
          type: 'dungeon',
          slug: 'copper_mines',
          name: 'Copper Mines',
          data: {},
        },
      ],
      [
        {
          type: 'item',
          slug: 'copper_key',
        },
        {
          type: 'creature',
          slug: 'mine_golem',
        },
      ]
    );

    const knownSlugs = new Map<DefinitionType, Set<string>>();
    knownSlugs.set('item', new Set(['copper_key']));
    // creature 'mine_golem' is missing from knownSlugs

    const validation = validatePackageDependencies(pkg, knownSlugs);

    expect(validation.valid).toBe(false);
    expect(validation.missingDependencies).toHaveLength(1);
    expect(validation.missingDependencies[0]).toEqual({
      type: 'creature',
      slug: 'mine_golem',
    });
  });

  it('resolves internal package dependencies without error', () => {
    const pkg = createContentPackage(
      'combo_pack',
      'Combo Pack',
      '1.0.0',
      [
        {
          type: 'item',
          slug: 'magic_wand',
          name: 'Magic Wand',
          data: {},
        },
        {
          type: 'recipe',
          slug: 'craft_wand',
          name: 'Craft Wand',
          data: {},
        },
      ],
      [
        {
          type: 'item',
          slug: 'magic_wand', // required by recipe, but included in the same package!
        },
      ]
    );

    const knownSlugs = new Map<DefinitionType, Set<string>>();
    const validation = validatePackageDependencies(pkg, knownSlugs);

    expect(validation.valid).toBe(true);
    expect(validation.missingDependencies).toHaveLength(0);
  });

  it('exports and imports JSON package manifests round-trip', () => {
    const pkg = createContentPackage(
      'pet_pack',
      'Pet Pack',
      '2.0.0',
      [
        {
          type: 'creature',
          slug: 'mini_dragon',
          name: 'Mini Dragon',
          data: {},
        },
      ],
      [],
      'Cool pet dragons'
    );

    const json = exportPackageToJson(pkg);
    const parsed = importPackageFromJson(json);

    expect(parsed.success).toBe(true);
    expect(parsed.package?.id).toBe('pet_pack');
    expect(parsed.package?.contents).toHaveLength(1);
    expect(parsed.package?.contents[0].slug).toBe('mini_dragon');
  });
});
