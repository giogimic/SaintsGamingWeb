import { describe, it, expect } from 'vitest';
import { normalizeBoneName, findAllMatchingTargetNodes, selectAnimationGroupByName } from './animationRetarget';

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
    expect(findAllMatchingTargetNodes('mixamorig:Hips', unrealNodes)[0]?.name).toBe('pelvis');
    expect(findAllMatchingTargetNodes('mixamorig:Spine', unrealNodes)[0]?.name).toBe('spine_01');
    expect(findAllMatchingTargetNodes('mixamorig:Spine1', unrealNodes)[0]?.name).toBe('spine_02');
    expect(findAllMatchingTargetNodes('mixamorig:Neck', unrealNodes)[0]?.name).toBe('neck_01');
    expect(findAllMatchingTargetNodes('mixamorig:Head', unrealNodes)[0]?.name).toBe('head');
    expect(findAllMatchingTargetNodes('mixamorig:LeftShoulder', unrealNodes)[0]?.name).toBe('clavicle_l');
    expect(findAllMatchingTargetNodes('mixamorig:LeftArm', unrealNodes)[0]?.name).toBe('upperarm_l');
    expect(findAllMatchingTargetNodes('mixamorig:LeftForeArm', unrealNodes)[0]?.name).toBe('lowerarm_l');
    expect(findAllMatchingTargetNodes('mixamorig:LeftHand', unrealNodes)[0]?.name).toBe('hand_l');
    expect(findAllMatchingTargetNodes('mixamorig:LeftUpLeg', unrealNodes)[0]?.name).toBe('thigh_l');
    expect(findAllMatchingTargetNodes('mixamorig:LeftLeg', unrealNodes)[0]?.name).toBe('calf_l');
    expect(findAllMatchingTargetNodes('mixamorig:LeftFoot', unrealNodes)[0]?.name).toBe('foot_l');
    expect(findAllMatchingTargetNodes('mixamorig:LeftToeBase', unrealNodes)[0]?.name).toBe('ball_l');
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

    expect(findAllMatchingTargetNodes('pelvis', mixamoNodes)[0]?.name).toBe('mixamorig:Hips');
    expect(findAllMatchingTargetNodes('spine_01', mixamoNodes)[0]?.name).toBe('mixamorig:Spine');
    expect(findAllMatchingTargetNodes('upperarm_l', mixamoNodes)[0]?.name).toBe('mixamorig:LeftArm');
    expect(findAllMatchingTargetNodes('lowerarm_l', mixamoNodes)[0]?.name).toBe('mixamorig:LeftForeArm');
    expect(findAllMatchingTargetNodes('hand_l', mixamoNodes)[0]?.name).toBe('mixamorig:LeftHand');
    expect(findAllMatchingTargetNodes('thigh_r', mixamoNodes)[0]?.name).toBe('mixamorig:RightUpLeg');
  });

  it('selects the requested embedded bank clip and does not silently use the first clip for a bad name', () => {
    const groups = [{ name: 'A_TPose' }, { name: 'Idle_Loop' }, { name: 'Walk_Loop' }];
    expect(selectAnimationGroupByName(groups, 'Walk_Loop')?.name).toBe('Walk_Loop');
    expect(selectAnimationGroupByName(groups, 'Missing_Clip')).toBeNull();
    expect(selectAnimationGroupByName(groups)?.name).toBe('A_TPose');
  });
});
