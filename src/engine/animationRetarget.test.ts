import { describe, it, expect } from 'vitest';
import { normalizeBoneName, findMatchingTargetNode } from './animationRetarget';

describe('animationRetarget', () => {
  it('normalizes bone names correctly across namespaces and prefixes', () => {
    expect(normalizeBoneName('mixamorig:Hips')).toBe('hips');
    expect(normalizeBoneName('mixamorig:LeftArm')).toBe('leftarm');
    expect(normalizeBoneName('Bip01 Pelvis')).toBe('pelvis');
    expect(normalizeBoneName('bip01_spine')).toBe('spine');
    expect(normalizeBoneName('root_pelvis')).toBe('pelvis');
    expect(normalizeBoneName('spine_01')).toBe('spine01');
    expect(normalizeBoneName('clavicle_l')).toBe('claviclel');
    expect(normalizeBoneName('upperarm_l')).toBe('upperarml');
    expect(normalizeBoneName('lowerarm_l')).toBe('lowerarml');
    expect(normalizeBoneName('hand_l')).toBe('handl');
  });

  it('matches Mixamo bones to Unreal Manny bones using equivalence aliases', () => {
    const unrealNodes = [
      { name: 'root' },
      { name: 'pelvis' },
      { name: 'spine_01' },
      { name: 'spine_02' },
      { name: 'spine_03' },
      { name: 'neck_01' },
      { name: 'head' },
      { name: 'clavicle_l' },
      { name: 'upperarm_l' },
      { name: 'lowerarm_l' },
      { name: 'hand_l' },
      { name: 'thigh_l' },
      { name: 'calf_l' },
      { name: 'foot_l' },
      { name: 'ball_l' },
    ] as any[];

    // Mixamo source names
    expect(findMatchingTargetNode('mixamorig:Hips', unrealNodes)?.name).toBe('pelvis');
    expect(findMatchingTargetNode('mixamorig:Spine', unrealNodes)?.name).toBe('spine_01');
    expect(findMatchingTargetNode('mixamorig:Spine1', unrealNodes)?.name).toBe('spine_02');
    expect(findMatchingTargetNode('mixamorig:Neck', unrealNodes)?.name).toBe('neck_01');
    expect(findMatchingTargetNode('mixamorig:Head', unrealNodes)?.name).toBe('head');
    expect(findMatchingTargetNode('mixamorig:LeftShoulder', unrealNodes)?.name).toBe('clavicle_l');
    expect(findMatchingTargetNode('mixamorig:LeftArm', unrealNodes)?.name).toBe('upperarm_l');
    expect(findMatchingTargetNode('mixamorig:LeftForeArm', unrealNodes)?.name).toBe('lowerarm_l');
    expect(findMatchingTargetNode('mixamorig:LeftHand', unrealNodes)?.name).toBe('hand_l');
    expect(findMatchingTargetNode('mixamorig:LeftUpLeg', unrealNodes)?.name).toBe('thigh_l');
    expect(findMatchingTargetNode('mixamorig:LeftLeg', unrealNodes)?.name).toBe('calf_l');
    expect(findMatchingTargetNode('mixamorig:LeftFoot', unrealNodes)?.name).toBe('foot_l');
    expect(findMatchingTargetNode('mixamorig:LeftToeBase', unrealNodes)?.name).toBe('ball_l');
  });

  it('matches Unreal bone names to Mixamo destination nodes', () => {
    const mixamoNodes = [
      { name: 'mixamorig:Hips' },
      { name: 'mixamorig:Spine' },
      { name: 'mixamorig:Spine1' },
      { name: 'mixamorig:LeftArm' },
      { name: 'mixamorig:LeftForeArm' },
      { name: 'mixamorig:LeftHand' },
      { name: 'mixamorig:RightUpLeg' },
    ] as any[];

    expect(findMatchingTargetNode('pelvis', mixamoNodes)?.name).toBe('mixamorig:Hips');
    expect(findMatchingTargetNode('spine_01', mixamoNodes)?.name).toBe('mixamorig:Spine');
    expect(findMatchingTargetNode('upperarm_l', mixamoNodes)?.name).toBe('mixamorig:LeftArm');
    expect(findMatchingTargetNode('lowerarm_l', mixamoNodes)?.name).toBe('mixamorig:LeftForeArm');
    expect(findMatchingTargetNode('hand_l', mixamoNodes)?.name).toBe('mixamorig:LeftHand');
    expect(findMatchingTargetNode('thigh_r', mixamoNodes)?.name).toBe('mixamorig:RightUpLeg');
  });
});
