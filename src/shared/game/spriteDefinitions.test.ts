import { describe, it, expect } from 'vitest';
import {
  resolveSpriteDefinition,
  spriteDefinitionToBabylonConfig,
  LEGACY_3X4_PROFILE,
  MULTI_FRAME_DIRECTIONAL_PROFILE,
  DIRECTIONAL_WALK_PROFILE,
  PORTRAIT_1X1_PROFILE,
} from './spriteDefinitions';

describe('Sprite Definitions & Animation Profiles', () => {
  it('resolves explicit tuxemon-3x4 animation profile', () => {
    const def = resolveSpriteDefinition({ animationProfile: 'tuxemon-3x4' });
    expect(def.profile).toBe('tuxemon-3x4');
    expect(def.columns).toBe(3);
    expect(def.rows).toBe(4);
    expect(def.walkCycle).toEqual([0, 1, 2, 1]);
    expect(def.directions.down).toBe(0);
    expect(def.directions.up).toBe(3);
  });

  it('resolves explicit lpc-full animation profile', () => {
    const def = resolveSpriteDefinition({ animationProfile: 'multi_frame_directional' });
    expect(def.profile).toBe('multi_frame_directional');
    expect(def.columns).toBe(13);
    expect(def.rows).toBe(21);
    expect(def.frameWidth).toBe(64);
    expect(def.frameHeight).toBe(64);
    expect(def.isLpc).toBe(true);
    expect(def.walkCycle).toHaveLength(9);
    expect(def.directions.up).toBe(8);
    expect(def.directions.down).toBe(10);
    expect(def.actions?.slash).toBeDefined();
    expect(def.actions?.slash.startRow).toBe(12);
  });

  it('resolves explicit lpc-walk animation profile', () => {
    const def = resolveSpriteDefinition({ animationProfile: 'directional_walk' });
    expect(def.profile).toBe('directional_walk');
    expect(def.columns).toBe(9);
    expect(def.rows).toBe(4);
    expect(def.isLpc).toBe(true);
    expect(def.directions.up).toBe(0);
    expect(def.directions.left).toBe(1);
    expect(def.directions.down).toBe(2);
    expect(def.directions.right).toBe(3);
  });

  it('resolves explicit portrait-1x1 profile', () => {
    const def = resolveSpriteDefinition({ animationProfile: 'portrait-1x1' });
    expect(def.profile).toBe('portrait-1x1');
    expect(def.columns).toBe(1);
    expect(def.rows).toBe(1);
    expect(def.walkSpeed).toBe(0);
  });

  it('infers lpc-full from dimensions 832x1344 when profile is absent', () => {
    const def = resolveSpriteDefinition({ width: 832, height: 1344 });
    expect(def.profile).toBe('multi_frame_directional');
    expect(def.columns).toBe(13);
    expect(def.rows).toBe(21);
    expect(def.isLpc).toBe(true);
  });

  it('infers lpc-walk from dimensions 576x256 when profile is absent', () => {
    const def = resolveSpriteDefinition({ width: 576, height: 256 });
    expect(def.profile).toBe('directional_walk');
    expect(def.columns).toBe(9);
    expect(def.rows).toBe(4);
  });

  it('infers tuxemon-3x4 from dimensions 96x128 when profile is absent', () => {
    const def = resolveSpriteDefinition({ width: 96, height: 128 });
    expect(def.profile).toBe('tuxemon-3x4');
    expect(def.columns).toBe(3);
    expect(def.rows).toBe(4);
  });

  it('infers portrait from -ow.png url', () => {
    const def = resolveSpriteDefinition({ spriteUrl: '/npc/scout_mira-ow.png' });
    expect(def.profile).toBe('portrait-1x1');
    expect(def.columns).toBe(1);
    expect(def.rows).toBe(1);
  });

  it('infers lpc-full from extended height 832x3456 when profile is absent', () => {
    const def = resolveSpriteDefinition({ width: 832, height: 3456 });
    expect(def.profile).toBe('multi_frame_directional');
    expect(def.columns).toBe(13);
    expect(def.rows).toBe(54);
    expect(def.isLpc).toBe(true);
  });

  it('infers lpc-full from item- prefix in URL', () => {
    const def = resolveSpriteDefinition({ spriteUrl: '/game-assets/npc/item-hat-hood-white.png' });
    expect(def.profile).toBe('multi_frame_directional');
    expect(def.columns).toBe(13);
    expect(def.isLpc).toBe(true);
  });

  it('converts definition to Babylon SpriteSheetConfig', () => {
    const lpcConfig = spriteDefinitionToBabylonConfig(MULTI_FRAME_DIRECTIONAL_PROFILE);
    expect(lpcConfig.columns).toBe(13);
    expect(lpcConfig.rows).toBe(21);
    expect(lpcConfig.directions.up).toBe(8);
    expect(lpcConfig.walkCycle).toHaveLength(9);

    const tuxConfig = spriteDefinitionToBabylonConfig(LEGACY_3X4_PROFILE);
    expect(tuxConfig.columns).toBe(3);
    expect(tuxConfig.rows).toBe(4);
    expect(tuxConfig.directions.down).toBe(0);
    expect(tuxConfig.walkCycle).toEqual([0, 1, 2, 1]);
  });
});
