import { describe, it, expect } from 'vitest';
import {
  CANONICAL_STUDIO_MODES_LIST,
  mapLegacyStudioMode,
  CanonicalResourceRef,
} from './studioGlossary';

describe('Studio Canonical Glossary (Bible 29)', () => {
  it('defines the 6 canonical studio modes with labels and hotkeys', () => {
    expect(CANONICAL_STUDIO_MODES_LIST.length).toBe(6);
    const ids = CANONICAL_STUDIO_MODES_LIST.map((m) => m.id);
    expect(ids).toEqual(['walk', 'paint', 'place', 'populate', 'script', 'catalog']);
  });

  it('maps legacy mode aliases to canonical modes correctly', () => {
    expect(mapLegacyStudioMode('test')).toBe('walk');
    expect(mapLegacyStudioMode('develop')).toBe('paint');
    expect(mapLegacyStudioMode('build')).toBe('paint');
    expect(mapLegacyStudioMode('npc')).toBe('populate');
    expect(mapLegacyStudioMode('quest')).toBe('populate');
    expect(mapLegacyStudioMode('creature')).toBe('populate');
    expect(mapLegacyStudioMode('catalog')).toBe('catalog');
  });

  it('structures canonical resource references with gameId scoping', () => {
    const ref: CanonicalResourceRef = {
      type: 'loot',
      id: 'dungeon_boss_pool',
      gameId: 'world_custom_1',
    };
    expect(ref.type).toBe('loot');
    expect(ref.gameId).toBe('world_custom_1');
  });
});
