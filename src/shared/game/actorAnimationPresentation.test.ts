import { describe, expect, it } from 'vitest';
import { resolveActorAnimationPresentation } from './actorAnimationPresentation';
import { QUATERNIUS_UNIVERSAL_BONE_NAMES } from './animationProfiles';

describe('actor animation hydration', () => {
  it('fills profile slots when saved actors include an empty embedded animation table', () => {
    const result = resolveActorAnimationPresentation({ modelUrl: '/models/quaternius/quaternius_base_male.glb', animations: { source: 'embedded', mapped: {} } });
    expect(result.animations?.mapped.idle.clip).toBe('Idle_Loop');
    expect(result.animations?.mapped.run_fwd.clip).toBe('Jog_Fwd_Loop');
  });
  it('merges source metadata after a saved model URL has resolved and keeps actor overrides', () => {
    const result = resolveActorAnimationPresentation({ assetId: 'uploaded-model-id', modelUrl: '/uploads/body.glb', animations: { mapped: { emote: { clip: 'Yes', sourcePath: '/models/quaternius/ual2_standard.glb' } } } }, { source: '/uploads/body.glb', metadata: { presentation: { animationProfileId: 'quaternius_native' } } });
    expect(result.animations?.mapped.run_fwd.clip).toBe('Jog_Fwd_Loop');
    expect(result.animations?.mapped.emote.clip).toBe('Yes');
  });
  it('assigns Universal locomotion only to a measured compatible uploaded humanoid', () => {
    const imported = { modelUrl: '/uploads/custom.glb', rigAnalysis: { family: 'HUMANOID_BIPED' }, animations: { boneNames: [...QUATERNIUS_UNIVERSAL_BONE_NAMES] } };
    expect(resolveActorAnimationPresentation(imported).animationProfileId).toBe('quaternius_native');
    expect(resolveActorAnimationPresentation({ ...imported, rigAnalysis: { family: 'QUADRUPED_BEAST' } }).animationProfileId).toBeUndefined();
  });
});
