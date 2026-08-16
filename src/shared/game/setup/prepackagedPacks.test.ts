import { describe, it, expect } from 'vitest';
import {
  AVAILABLE_STARTER_PACKS,
  getCommunityStarterPackManifest,
} from './prepackagedPacks';

describe('prepackagedPacks', () => {
  it('defines available starter packs with recommended flags', () => {
    expect(AVAILABLE_STARTER_PACKS.length).toBeGreaterThanOrEqual(2);
    const recommended = AVAILABLE_STARTER_PACKS.find((p) => p.recommended);
    expect(recommended).toBeDefined();
    expect(recommended?.id).toBe('saints-community-starter');

    const blank = AVAILABLE_STARTER_PACKS.find((p) => p.id === 'blank-canvas');
    expect(blank).toBeDefined();
    expect(blank?.mapCount).toBe(0);
  });

  it('builds community starter pack manifest with complete maps and items', () => {
    const manifest = getCommunityStarterPackManifest();
    expect(manifest.maps.length).toBe(8);
    expect(manifest.items.length).toBeGreaterThan(0);
    expect(manifest.recipes.length).toBeGreaterThan(0);

    const haven = manifest.maps.find((m) => m.id === 'SAINTS_HAVEN');
    expect(haven).toBeDefined();
    expect(haven?.gates?.length).toBeGreaterThan(0);
    expect(haven?.npcs?.length).toBeGreaterThan(0);

    const demo = manifest.maps.find((m) => m.id === 'DEMO_SANDBOX');
    expect(demo).toBeDefined();
  });
});
