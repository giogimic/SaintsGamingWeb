import { describe, it, expect } from 'vitest';
import { AVAILABLE_ASSET_PACKS } from './assetPackInstaller';

describe('Asset Pack Installer definitions', () => {
  it('contains essential asset packs with valid categories and metadata', () => {
    expect(AVAILABLE_ASSET_PACKS.length).toBeGreaterThanOrEqual(5);

    const tilesets = AVAILABLE_ASSET_PACKS.find((p) => p.id === 'tilesets');
    expect(tilesets).toBeDefined();
    expect(tilesets?.category).toBe('environment');
    expect(tilesets?.recommended).toBe(true);

    const creatures = AVAILABLE_ASSET_PACKS.find((p) => p.id === 'creatures');
    expect(creatures).toBeDefined();
    expect(creatures?.category).toBe('monster');

    const npc = AVAILABLE_ASSET_PACKS.find((p) => p.id === 'npc');
    expect(npc).toBeDefined();
    expect(npc?.category).toBe('character');
  });

  it('has unique pack ids across all definitions', () => {
    const ids = AVAILABLE_ASSET_PACKS.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('supports all required Phase 3B pack IDs', () => {
    const ids = AVAILABLE_ASSET_PACKS.map((p) => p.id);
    expect(ids).toContain('tilesets');
    expect(ids).toContain('creatures');
    expect(ids).toContain('npc');
    expect(ids).toContain('heroes');
    expect(ids).toContain('items');
    expect(ids).toContain('objects');
    expect(ids).toContain('ui');
  });
});
