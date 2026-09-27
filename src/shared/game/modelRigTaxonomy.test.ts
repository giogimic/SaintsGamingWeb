import { describe, it, expect } from 'vitest';
import {
  classifySkeletonRig,
  extractBoneNamesFromTracks,
  inferExpandedAnimationSlots,
  analyzeAnimationClip,
  isAnimationFileName,
} from './modelRigTaxonomy';

describe('modelRigTaxonomy', () => {
  it('correctly classifies a Humanoid biped rig (Mixamo style)', () => {
    const mixamoBones = [
      'mixamorig:Hips',
      'mixamorig:Spine',
      'mixamorig:Spine1',
      'mixamorig:Spine2',
      'mixamorig:Neck',
      'mixamorig:Head',
      'mixamorig:LeftShoulder',
      'mixamorig:LeftArm',
      'mixamorig:LeftForeArm',
      'mixamorig:LeftHand',
      'mixamorig:RightShoulder',
      'mixamorig:RightArm',
      'mixamorig:RightForeArm',
      'mixamorig:RightHand',
      'mixamorig:LeftUpLeg',
      'mixamorig:LeftLeg',
      'mixamorig:LeftFoot',
      'mixamorig:RightUpLeg',
      'mixamorig:RightLeg',
      'mixamorig:RightFoot',
    ];

    const result = classifySkeletonRig(mixamoBones);
    expect(result.family).toBe('HUMANOID_BIPED');
    expect(result.isHumanoid).toBe(true);
    expect(result.missingEssentialBones).toEqual([]);
    expect(result.detectedStandardBones['Hips']).toBe('mixamorig:Hips');
    expect(result.detectedStandardBones['Head']).toBe('mixamorig:Head');
  });

  it('correctly classifies a Quadruped Beast rig', () => {
    const beastBones = [
      'Pelvis',
      'Spine_01',
      'Spine_02',
      'Neck',
      'Head',
      'FrontLeg_L',
      'FrontLeg_R',
      'HindLeg_L',
      'HindLeg_R',
      'Tail_01',
      'Tail_02',
    ];

    const result = classifySkeletonRig(beastBones);
    expect(result.family).toBe('QUADRUPED_BEAST');
    expect(result.isQuadruped).toBe(true);
    expect(result.hasTail).toBe(true);
  });

  it('correctly classifies a Winged Flyer rig', () => {
    const dragonBones = [
      'Root',
      'Spine',
      'Head',
      'Wing_L',
      'Wing_R',
      'WingMid_L',
      'WingMid_R',
      'Tail',
    ];

    const result = classifySkeletonRig(dragonBones);
    expect(result.family).toBe('WINGED_FLYER');
    expect(result.isFlyer).toBe(true);
    expect(result.hasWings).toBe(true);
  });

  it('correctly analyzes an animation clip with tracks and model compatibility', () => {
    const tracks = [
      'mixamorig:Hips.position',
      'mixamorig:Hips.quaternion',
      'mixamorig:Spine.quaternion',
      'mixamorig:LeftArm.quaternion',
      'mixamorig:RightArm.quaternion',
      'mixamorig:LeftUpLeg.quaternion',
      'mixamorig:RightUpLeg.quaternion',
    ];

    const modelBones = [
      'mixamorig:Hips',
      'mixamorig:Spine',
      'mixamorig:LeftArm',
      'mixamorig:RightArm',
      'mixamorig:LeftUpLeg',
      'mixamorig:RightUpLeg',
    ];

    const analysis = analyzeAnimationClip(
      {
        name: 'Take 001',
        duration: 1.25,
        tracks,
      },
      {
        fileName: 'Warrior_Run_Forward.fbx',
        modelBoneNames: modelBones,
      }
    );

    expect(analysis.targetRigFamily).toBe('HUMANOID_BIPED');
    expect(analysis.isRootMotion).toBe(true);
    expect(analysis.suggestedSlots).toContain('run_fwd');
    expect(analysis.category).toBe('Locomotion');
    expect(analysis.compatibilityWithModel?.isCompatible).toBe(true);
    expect(analysis.compatibilityWithModel?.score).toBe(100);
  });

  it('infers creature action slots properly (bite, roar, pounce, etc.)', () => {
    expect(inferExpandedAnimationSlots('Bite_Attack')).toContain('attack_light');
    expect(inferExpandedAnimationSlots('Heavy_Claw_Combo')).toContain('attack_heavy');
    expect(inferExpandedAnimationSlots('Dragon_Roar')).toContain('cast');
    expect(inferExpandedAnimationSlots('Take 001', 'DireWolf_Walk.fbx')).toContain('walk_fwd');
  });

  it('infers extended action slots (jog, bound, crouch, ability, cardcast, deflect, stumble)', () => {
    expect(inferExpandedAnimationSlots('Jog_Fwd')).toContain('run_fwd');
    expect(inferExpandedAnimationSlots('Hero_Bound')).toContain('bound');
    expect(inferExpandedAnimationSlots('Crouch_Walk_Fwd')).toContain('crouch_walk');
    expect(inferExpandedAnimationSlots('Crouch_Idle')).toContain('crouch_idle');
    expect(inferExpandedAnimationSlots('CardCast_Fireball')).toContain('cast');
    expect(inferExpandedAnimationSlots('Hero_Deflect')).toContain('attack_light');
    expect(inferExpandedAnimationSlots('Hit_Stumble_Bwd')).toContain('hit_react_back');
    expect(inferExpandedAnimationSlots('Level_Start_Intro')).toContain('level_start');
  });

  it('correctly validates animation filenames with isAnimationFileName', () => {
    expect(isAnimationFileName('Jump_Melee.FBX')).toBe(true);
    expect(isAnimationFileName('Attack_A_Fast.FBX')).toBe(true);
    expect(isAnimationFileName('01_04_001_Jog.fbx')).toBe(true);
    expect(isAnimationFileName('CardCast.fbx')).toBe(true);
    expect(isAnimationFileName('Deflect.fbx')).toBe(true);
    expect(isAnimationFileName('SKM_DKM_Armor.obj')).toBe(false);
    expect(isAnimationFileName('Basemesh.fbx')).toBe(false);
  });
});
