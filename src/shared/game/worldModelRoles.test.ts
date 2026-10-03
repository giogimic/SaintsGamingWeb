import { describe, expect, it } from 'vitest';
import { isWorldModelEligibleForRole, normalizeModelUploadRole } from './worldModelRoles';
import { getWorldModelPresentation, resolveWorldModelAssetValue } from './worldModelPresentation';

describe('world model role and binding policy', () => {
  const full = { id: 'uploaded-rig', type: 'MODEL', source: '/uploads/rig.glb', metadata: { presentation: { assetDefinition: { structure: 'Complete' } } } };
  const playable = { id: 'quat-quaternius_base_male', type: 'CHARACTER', source: '/models/quaternius/quaternius_base_male.glb', metadata: { isPlayable: true, presentation: { character: { type: '3D_MODEL', isCustomizable: true } } } };

  it('allows complete custom MODEL uploads for monsters and creatures without creature tags', () => {
    expect(isWorldModelEligibleForRole(full, 'monster')).toBe(true);
    expect(isWorldModelEligibleForRole(full, 'creature')).toBe(true);
    expect(isWorldModelEligibleForRole({ ...full, source: '/models/quaternius/imp.glb' }, 'creature')).toBe(true);
  });

  it('keeps playable bases and modular items out of both nonplayer roles', () => {
    for (const role of ['monster', 'creature'] as const) {
      expect(isWorldModelEligibleForRole(playable, role)).toBe(false);
      expect(isWorldModelEligibleForRole({ ...full, metadata: { isModularComponent: true }, tags: ['monster'] }, role)).toBe(false);
      expect(isWorldModelEligibleForRole({ ...full, metadata: { presentation: { assetDefinition: { structure: 'Modular' } } } }, role)).toBe(false);
      expect(isWorldModelEligibleForRole({ ...full, type: 'ANIMATION' }, role)).toBe(false);
    }
    expect(isWorldModelEligibleForRole(playable, 'archetype')).toBe(true);
    expect(isWorldModelEligibleForRole(playable, 'npc')).toBe(true);
    expect(isWorldModelEligibleForRole({ ...full, metadata: { rigAnalysis: { family: 'QUADRUPED' } } }, 'npc')).toBe(false);
  });

  it('normalizes upload roles from authored roles and rejects modular nonplayer models', () => {
    expect(normalizeModelUploadRole('MODEL', { roles: ['Monster'], structure: 'Complete' })).toMatchObject({ type: 'CREATURE', isPlayable: false });
    expect(normalizeModelUploadRole('MODEL', { roles: ['Archetype'], structure: 'Modular' })).toMatchObject({ type: 'CHARACTER', isPlayable: true });
    expect(() => normalizeModelUploadRole('CREATURE', { roles: ['Creature'], structure: 'Modular' })).toThrow(/complete/i);
  });

  it('copies the full selected asset definition and resets prior base configuration', () => {
    const definition = { structure: 'Complete', transform: { scale: 0.25, rotationY: 1, grounding: -0.1, cameraYOffset: 1.8 }, skeleton: { boneMap: { Head: 'head' } }, animations: { mapped: { idle: { clip: 'Idle' } } } };
    const binding = resolveWorldModelAssetValue({ ...full, metadata: { presentation: { assetDefinition: definition } } }, 2);
    expect(binding).toMatchObject({ assetId: full.id, modelUrl: full.source, scale: 2, modelScale: 0.25, modelRotationY: 1, grounding: -0.1, cameraHeightOffset: 1.8, assetDefinition: definition, skeleton: definition.skeleton, animations: definition.animations });
    const presentation = getWorldModelPresentation(binding);
    expect(presentation?.modelScale).toBe(0.25);
    expect(presentation).toMatchObject({ assetId: full.id, modelRotationY: 1, grounding: -0.1, cameraHeightOffset: 1.8, assetDefinition: definition });
  });
});
