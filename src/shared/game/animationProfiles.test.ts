import { describe, it, expect } from 'vitest';
import {
  getAnimationProfile,
  applyAnimationProfileFallback,
  resolveAnimationUrl,
  getProfileSlotUrls,
  ANIMATION_PROFILES,
} from './animationProfiles';
import { getWorldModelPresentation, CANONICAL_BUILTIN_MODELS } from './worldModelPresentation';

describe('Animation Profiles & World Model Presentation', () => {
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
      modelUrl: '/game-assets/models/brute.glb',
    });
    expect(brutePresentation).toBeDefined();
    expect(brutePresentation?.animationProfileId).toBe('GreystoneManny');

    const citizenPresentation = getWorldModelPresentation({
      type: '3D Model',
      assetId: 'citizen',
      modelUrl: '/game-assets/models/citizen.glb',
    });
    expect(citizenPresentation).toBeDefined();
    expect(citizenPresentation?.animationProfileId).toBe('MocapMobility');
  });

  it('COMMON_SLOT_MAP defaults use Jog/Jog_Fwd for running slots', () => {
    const aurora = getAnimationProfile('AuroraManny');
    expect(aurora?.slotMap?.run_fwd?.clip).toBe('Jog/Jog_Fwd');
    expect(aurora?.slotMap?.run_bwd?.clip).toBe('Jog/Jog_Bwd');
  });
});
