import { describe, it, expect } from 'vitest';
import { AVAILABLE_STARTER_PACKS } from './prepackagedPacks';

describe('prepackagedPacks', () => {
  it('defines available starter packs with clean canvas', () => {
    expect(AVAILABLE_STARTER_PACKS.length).toBeGreaterThanOrEqual(1);
    const blank = AVAILABLE_STARTER_PACKS.find((p) => p.id === 'blank-canvas');
    expect(blank).toBeDefined();
    expect(blank?.mapCount).toBe(0);
    expect(blank?.recommended).toBe(true);
  });
});
