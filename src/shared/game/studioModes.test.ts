import { describe, expect, it } from 'vitest';
import { STUDIO_MODE_DEFAULTS, STUDIO_MODE_META } from './studioModes';

describe('studio develop mode defaults', () => {
  it('opens World + Inspector for develop workspace', () => {
    expect(STUDIO_MODE_DEFAULTS.develop).toEqual(['build', 'properties']);
    expect(STUDIO_MODE_DEFAULTS.test).toEqual([]);
  });

  it('labels Walk as testing-only copy', () => {
    expect(STUDIO_MODE_META.develop.label).toBe('Develop');
    expect(STUDIO_MODE_META.test.label).toBe('Walk');
    expect(STUDIO_MODE_META.test.blurb.toLowerCase()).toContain('play-test');
  });
});
