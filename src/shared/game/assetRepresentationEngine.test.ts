import { describe, expect, it } from 'vitest';
import {
  AssetRepresentationEngine,
  AssetRepresentationProfile,
  SILHOUETTE_FALLBACK_PROFILE,
} from './assetRepresentationEngine';

describe('Unified Asset Representation Profiles & Dynamic Visual Pipeline Engine (Phase 26)', () => {
  it('registers visual profiles and resolves directional animation frames', () => {
    const engine = new AssetRepresentationEngine();

    const heroBaseProfile: AssetRepresentationProfile = {
      profileId: 'profile_hero_base',
      type: 'SPRITE_SHEET_2D',
      assetUrl: '/assets/sprites/heroes/warrior_sheet.png',
      frameWidth: 48,
      frameHeight: 48,
      scale: 1.0,
      animations: {
        WALK: {
          DOWN: { frameIndices: [0, 1, 2, 3], frameDurationMs: 120, loop: true, pivotOffset: { x: 0.5, y: 0.5 } },
          LEFT: { frameIndices: [4, 5, 6, 7], frameDurationMs: 120, loop: true, pivotOffset: { x: 0.5, y: 0.5 } },
          RIGHT: { frameIndices: [8, 9, 10, 11], frameDurationMs: 120, loop: true, pivotOffset: { x: 0.5, y: 0.5 } },
          UP: { frameIndices: [12, 13, 14, 15], frameDurationMs: 120, loop: true, pivotOffset: { x: 0.5, y: 0.5 } },
        },
        ATTACK: {
          DOWN: { frameIndices: [16, 17, 18], frameDurationMs: 80, loop: false, pivotOffset: { x: 0.5, y: 0.5 } },
        },
      },
    };

    engine.registerProfile(heroBaseProfile);

    // 1. Direct match: WALK LEFT
    const walkLeft = engine.resolveAnimation('profile_hero_base', 'WALK', 'LEFT');
    expect(walkLeft.profile.profileId).toBe('profile_hero_base');
    expect(walkLeft.frames.frameIndices).toEqual([4, 5, 6, 7]);

    // 2. Cardinal fallback: ATTACK UP (not explicitly defined) -> falls back to ATTACK DOWN
    const attackUp = engine.resolveAnimation('profile_hero_base', 'ATTACK', 'UP');
    expect(attackUp.frames.frameIndices).toEqual([16, 17, 18]);
  });

  it('traverses multi-tier fallback chains when animations or profiles are missing', () => {
    const engine = new AssetRepresentationEngine();

    const baseProfile: AssetRepresentationProfile = {
      profileId: 'base_mon',
      type: 'SPRITE_SHEET_2D',
      assetUrl: '/base.png',
      frameWidth: 32,
      frameHeight: 32,
      scale: 1.0,
      animations: {
        DIE: {
          DOWN: { frameIndices: [90, 91, 92], frameDurationMs: 100, loop: false, pivotOffset: { x: 0.5, y: 0.5 } },
        },
      },
    };

    const hdSkinProfile: AssetRepresentationProfile = {
      profileId: 'hd_skin_mon',
      type: 'SPRITE_SHEET_2D',
      assetUrl: '/hd_skin.png',
      frameWidth: 64,
      frameHeight: 64,
      scale: 1.2,
      fallbackProfileId: 'base_mon',
      animations: {
        WALK: {
          DOWN: { frameIndices: [0, 1, 2], frameDurationMs: 100, loop: true, pivotOffset: { x: 0.5, y: 0.5 } },
        },
      },
    };

    engine.registerProfile(baseProfile);
    engine.registerProfile(hdSkinProfile);

    // 1. hd_skin_mon has WALK DOWN -> returns hd_skin_mon
    const walk = engine.resolveAnimation('hd_skin_mon', 'WALK', 'DOWN');
    expect(walk.profile.profileId).toBe('hd_skin_mon');

    // 2. hd_skin_mon lacks DIE -> falls back to base_mon which has DIE DOWN
    const die = engine.resolveAnimation('hd_skin_mon', 'DIE', 'DOWN');
    expect(die.profile.profileId).toBe('base_mon');
    expect(die.frames.frameIndices).toEqual([90, 91, 92]);

    // 3. Chain inspection
    const chain = engine.resolveFallbackChain('hd_skin_mon');
    expect(chain).toHaveLength(3); // hd_skin_mon -> base_mon -> silhouette
    expect(chain[0].profileId).toBe('hd_skin_mon');
    expect(chain[1].profileId).toBe('base_mon');
    expect(chain[2].profileId).toBe(SILHOUETTE_FALLBACK_PROFILE.profileId);
  });
});
