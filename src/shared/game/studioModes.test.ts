import { describe, expect, it } from 'vitest';
import {
  STUDIO_MODE_DEFAULTS,
  STUDIO_MODE_META,
  STUDIO_MODE_TO_CANONICAL,
} from './studioModes';

describe('studio develop mode defaults', () => {
  it('opens World + Inspector for develop workspace', () => {
    expect(STUDIO_MODE_DEFAULTS.develop).toEqual(['build', 'properties']);
    expect(STUDIO_MODE_DEFAULTS.test).toEqual([]);
  });

  it('uses canonical engine-editor labels', () => {
    expect(STUDIO_MODE_META.develop.label).toBe('Paint');
    expect(STUDIO_MODE_META.test.label).toBe('Play');
    expect(STUDIO_MODE_META.npc.label).toBe('Populate');
    expect(STUDIO_MODE_META.quest.label).toBe('Script');
    expect(STUDIO_MODE_META.creature.label).toBe('Catalog');
    expect(STUDIO_MODE_META.test.blurb.toLowerCase()).toContain('playtest');
    expect(STUDIO_MODE_TO_CANONICAL.develop).toBe('paint');
    expect(STUDIO_MODE_TO_CANONICAL.test).toBe('walk');
  });
});
