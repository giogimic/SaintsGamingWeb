import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  getAnimationProfile,
  applyAnimationProfileFallback,
  resolveAnimationUrl,
  getProfileSlotUrls,
  resolveAnimationProfileId,
  ANIMATION_PROFILES,
} from './animationProfiles';
import { getWorldModelPresentation, CANONICAL_BUILTIN_MODELS } from './worldModelPresentation';

describe('Animation Profiles & World Model Presentation', () => {
  it('has every native companion clip registered in its bundled model directory', () => {
    const publicRoot = path.resolve(process.cwd(), 'public');
    for (const profileId of ['boy_native', 'girl_native']) {
      const profile = getAnimationProfile(profileId)!;
      for (const clip of profile.availableClips) {
        const clipUrl = resolveAnimationUrl(profileId, profileId === 'boy_native'
          ? clip === 'Breathing Idle' ? 'idle' : clip === 'Walking' ? 'walk_fwd' : clip === 'Running' ? 'run_fwd' : 'sit'
          : clip === 'Idle' ? 'idle' : clip === 'Walking' ? 'walk_fwd' : clip === 'Running' ? 'run_fwd' : clip === 'Jumping' ? 'jump_start' : clip === 'Talking' ? 'talk' : 'sit');
        const filePath = path.join(publicRoot, decodeURIComponent(clipUrl!.replace(/^\//, '')));
        expect(fs.existsSync(filePath), `${profileId} ${clip}`).toBe(true);
      }
    }
  });

  it('registers all canonical animation profiles', () => {
    const greystone = getAnimationProfile('GreystoneManny');
    expect(greystone).toBeDefined();
    expect(greystone?.id).toBe('GreystoneManny');

    const mocap = getAnimationProfile('MocapMobility');
    expect(mocap).toBeDefined();
    expect(mocap?.id).toBe('MocapMobility');
  });

  it('resolves GreystoneManny slot mappings to actual glb locations', () => {
    const idleUrl = resolveAnimationUrl('GreystoneManny', 'idle');
    expect(idleUrl).toBe('/animations/Paragon/GreystoneManny/IdleAO/Idle.glb');

    const runFwdUrl = resolveAnimationUrl('GreystoneManny', 'run_fwd');
    expect(runFwdUrl).toBe('/animations/Paragon/GreystoneManny/Jog/Jog_Fwd.glb');

    const jumpStartUrl = resolveAnimationUrl('GreystoneManny', 'jump_start');
    expect(jumpStartUrl).toBe('/animations/Paragon/GreystoneManny/Jump_Start.glb');

    const deathUrl = resolveAnimationUrl('GreystoneManny', 'death');
    expect(deathUrl).toBe('/animations/Paragon/GreystoneManny/Death.glb');
  });

  it('correctly builds fallback animation mappings for GreystoneManny', () => {
    const mapped = applyAnimationProfileFallback(null, 'GreystoneManny');
    expect(mapped).toBeDefined();
    expect(mapped?.mapped?.idle?.sourcePath).toBe('/animations/Paragon/GreystoneManny/IdleAO/Idle.glb');
    expect(mapped?.mapped?.run_fwd?.sourcePath).toBe('/animations/Paragon/GreystoneManny/Jog/Jog_Fwd.glb');
  });

  it('getWorldModelPresentation resolves fallback animationProfileId from CANONICAL_BUILTIN_MODELS', () => {
    const brutePresentation = getWorldModelPresentation({
      type: '3D Model',
      assetId: 'brute',
      modelUrl: '/game-assets/models/humanoids/brute/brute.glb',
    });
    expect(brutePresentation).toBeDefined();
    expect(brutePresentation?.animationProfileId).toBe('GreystoneManny');

    const builtinBrutePresentation = getWorldModelPresentation({
      type: '3D Model',
      assetId: 'builtin-model-brute',
    });
    expect(builtinBrutePresentation).toBeDefined();
    expect(builtinBrutePresentation?.animationProfileId).toBe('GreystoneManny');

    const jsonBrutePresentation = getWorldModelPresentation(JSON.stringify({
      worldModel: {
        type: '3D Model',
        assetId: 'builtin-model-brute',
      }
    }));
    expect(jsonBrutePresentation).toBeDefined();
    expect(jsonBrutePresentation?.animationProfileId).toBe('GreystoneManny');
  });

  it('COMMON_SLOT_MAP defaults use Jog/Jog_Fwd for running slots', () => {
    const aurora = getAnimationProfile('AuroraManny');
    expect(aurora?.slotMap?.run_fwd?.clip).toBe('Jog/Jog_Fwd');
    expect(aurora?.slotMap?.run_bwd?.clip).toBe('Jog/Jog_Bwd');
  });

  it('links native Boy and Girl animation profiles to their bundled companion clips', () => {
    expect(getAnimationProfile('boy_native')?.availableClips).toEqual([
      'Breathing Idle', 'Walking', 'Running', 'Sitting',
    ]);
    expect(resolveAnimationUrl('boy_native', 'walk_fwd')).toBe('/game-assets/models/humanoids/boy/anims/Walking.glb');
    expect(resolveAnimationUrl('boy_native', 'run_fwd')).toBe('/game-assets/models/humanoids/boy/anims/Running.glb');
    expect(getAnimationProfile('girl_native')?.availableClips).toEqual([
      'Idle', 'Walking', 'Running', 'Jumping', 'Talking', 'Sitting Idle',
    ]);
    expect(resolveAnimationUrl('girl_native', 'talk')).toBe('/game-assets/models/humanoids/girl/anims/Talking.glb');
    expect(resolveAnimationUrl('girl_native', 'sit')).toBe('/game-assets/models/humanoids/girl/anims/Sitting%20Idle.glb');
    expect(CANONICAL_BUILTIN_MODELS.asian_girl.defaultAnimationProfileId).toBeUndefined();
  });

  it('only applies the generic Manny profile to Manny rigs', () => {
    expect(resolveAnimationProfileId(undefined, 'manny', true)).toBe('GreystoneManny');
    expect(resolveAnimationProfileId(undefined, 'mixamo', true)).toBeUndefined();
    expect(resolveAnimationProfileId(undefined, 'daz_g8f', true)).toBeUndefined();
    expect(resolveAnimationProfileId(undefined, 'static', false)).toBeUndefined();
    expect(resolveAnimationProfileId('boy_native', 'mixamo', true)).toBe('boy_native');
  });
});
