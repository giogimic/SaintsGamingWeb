/**
 * Saints Gaming — Babylon.js Animation Retargeting & External Clip Loader
 * 
 * Enables retargeting animation clips between different character rigs
 * (Mixamo, Unreal Engine Manny/Quinn, Paragon, Blender, Biped) by matching bone names
 * across alias dictionaries and creating clean AnimationGroups bound to target nodes.
 * 
 * Prevents disposed-node runtime crashes by building new AnimationGroups referencing
 * only verified target transform nodes/bones, then safely disposing source containers.
 */

import * as BABYLON from '@babylonjs/core';

// Normalizes bone names by stripping namespaces, common prefixes, and punctuation
export function normalizeBoneName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/^.*[:|]/, '') // Strip namespaces like "mixamorig:" or "Armature|"
    .replace(/^(bip01[_\s-]?|(root|rig|def)[_\s-]+)/, '') // Strip common prefixes
    .replace(/[_\s-]+/g, ''); // Strip underscores, dashes, spaces: "spine_01" -> "spine01"
}

// Equivalence groups across common rig standards (Unreal Manny, Mixamo, Biped, Humanoid)
const BONE_EQUIVALENCE_GROUPS: string[][] = [
  // Pelvis / Hips (primary locomotion & torso pivot)
  ['pelvis', 'hips', 'hip', 'bip01pelvis', 'body'], // 'body' is often the root/pelvis in Quaternius rigs

  // Root origin
  ['root', 'armature', 'origin', 'bip01', 'characterarmature'], // 'characterarmature' is the common glTF root for Quaternius

  // Spine / Chest / Torso
  ['spine', 'spine01', 'spine1', 'lowerspine', 'spine0', 'abdomenlower'],
  ['spine1', 'spine02', 'spine2', 'chest', 'midspine', 'abdomenupper', 'chestlower'],
  ['spine2', 'spine03', 'spine3', 'upperchest', 'chest', 'chestupper'],

  // Neck & Head
  ['neck', 'neck01', 'neck1', 'necklower', 'neckupper'],
  ['head', 'head01', 'headtop_end'],

  // Left Shoulder / Clavicle
  ['leftshoulder', 'claviclel', 'lclavicle', 'shoulderl', 'lshoulder', 'lcollar'],
  // Left Upper Arm
  ['leftarm', 'upperarml', 'lupperarm', 'arml', 'larm', 'lshldr', 'lshldrbend', 'lshldrtwist'],
  // Left Forearm / Lower Arm
  ['leftforearm', 'lowerarml', 'llowerarm', 'forearml', 'lforearm', 'leftarmroll', 'lforearmbend', 'lforearmtwist'],
  // Left Hand
  ['lefthand', 'handl', 'lhand', 'wristl'],

  // Right Shoulder / Clavicle
  ['rightshoulder', 'clavicler', 'rclavicle', 'shoulderr', 'rshoulder', 'rcollar'],
  // Right Upper Arm
  ['rightarm', 'upperarmr', 'rupperarm', 'armr', 'rarm', 'rshldr', 'rshldrbend', 'rshldrtwist'],
  // Right Forearm / Lower Arm
  ['rightforearm', 'lowerarmr', 'rlowerarm', 'forearmr', 'rforearm', 'rightarmroll', 'rforearmbend', 'rforearmtwist'],
  // Right Hand
  ['righthand', 'handr', 'rhand', 'wristr'],

  // Left Thigh / Upper Leg
  ['leftupleg', 'thighl', 'lthigh', 'legl', 'lupleg', 'upperlegl', 'lthighbend', 'lthightwist'],
  // Left Calf / Lower Leg
  ['leftleg', 'calfl', 'lcalf', 'shinl', 'lowerlegl', 'lleg', 'lshinbend'],
  // Left Foot
  ['leftfoot', 'footl', 'lfoot', 'anklel', 'footl'],
  // Left Toe
  ['lefttoebase', 'balll', 'ltoe', 'toel', 'lefttoe'],

  // Right Thigh / Upper Leg
  ['rightupleg', 'thighr', 'rthigh', 'legr', 'rupleg', 'upperlegr', 'rthighbend', 'rthightwist'],
  // Right Calf / Lower Leg
  ['rightleg', 'calfr', 'rcalf', 'shinr', 'lowerlegr', 'rleg', 'rshinbend'],
  // Right Foot
  ['rightfoot', 'footr', 'rfoot', 'ankler', 'footr'],
  // Right Toe
  ['righttoebase', 'ballr', 'rtoe', 'toer', 'righttoe'],

  // Fingers (Left)
  ['leftthumb1', 'thumbl01', 'thumbl1', 'thumb01l'],
  ['leftthumb2', 'thumbl02', 'thumbl2', 'thumb02l'],
  ['leftthumb3', 'thumbl03', 'thumbl3', 'thumb03l'],
  ['leftindex1', 'indexl01', 'indexl1', 'index01l'],
  ['leftindex2', 'indexl02', 'indexl2', 'index02l'],
  ['leftindex3', 'indexl03', 'indexl3', 'index03l'],
  ['leftmiddle1', 'middlel01', 'middlel1', 'middle01l'],
  ['leftmiddle2', 'middlel02', 'middlel2', 'middle02l'],
  ['leftmiddle3', 'middlel03', 'middlel3', 'middle03l'],
  ['leftring1', 'ringl01', 'ringl1', 'ring01l'],
  ['leftring2', 'ringl02', 'ringl2', 'ring02l'],
  ['leftring3', 'ringl03', 'ringl3', 'ring03l'],
  ['leftpinky1', 'pinkyl01', 'pinkyl1', 'pinky01l'],
  ['leftpinky2', 'pinkyl02', 'pinkyl2', 'pinky02l'],
  ['leftpinky3', 'pinkyl03', 'pinkyl3', 'pinky03l'],

  // Fingers (Right)
  ['rightthumb1', 'thumbr01', 'thumbr1', 'thumb01r'],
  ['rightthumb2', 'thumbr02', 'thumbr2', 'thumb02r'],
  ['rightthumb3', 'thumbr03', 'thumbr3', 'thumb03r'],
  ['rightindex1', 'indexr01', 'indexr1', 'index01r'],
  ['rightindex2', 'indexr02', 'indexr2', 'index02r'],
  ['rightindex3', 'indexr03', 'indexr3', 'index03r'],
  ['rightmiddle1', 'middler01', 'middler1', 'middle01r'],
  ['rightmiddle2', 'middler02', 'middler2', 'middle02r'],
  ['rightmiddle3', 'middler03', 'middler3', 'middle03r'],
  ['rightring1', 'ringr01', 'ringr1', 'ring01r'],
  ['rightring2', 'ringr02', 'ringr2', 'ring02r'],
  ['rightring3', 'ringr03', 'ringr3', 'ring03r'],
  ['rightpinky1', 'pinkyr01', 'pinkyr1', 'pinky01r'],
  ['rightpinky2', 'pinkyr02', 'pinkyr2', 'pinky02r'],
  ['rightpinky3', 'pinkyr03', 'pinkyr3', 'pinky03r'],
];

// Pre-build reverse lookup table for fast alias resolution
const ALIAS_LOOKUP: Map<string, Set<string>> = new Map();
for (const group of BONE_EQUIVALENCE_GROUPS) {
  const set = new Set(group);
  for (const item of group) {
    ALIAS_LOOKUP.set(item, set);
  }
}

/**
 * Finds ALL corresponding destination nodes for a given source bone name.
 * Essential for modular avatars where clothing pieces have their own TransformNodes.
 */
export function findAllMatchingTargetNodes(
  sourceName: string,
  targetNodes: BABYLON.TransformNode[]
): BABYLON.TransformNode[] {
  if (!sourceName || !targetNodes || targetNodes.length === 0) return [];

  // 1. Direct exact match
  const exact = targetNodes.filter(n => n.name === sourceName);
  if (exact.length > 0) return exact;

  const normSource = normalizeBoneName(sourceName);
  if (!normSource) return [];

  // 2. Direct normalized match
  const directNorm = targetNodes.filter(n => normalizeBoneName(n.name) === normSource);
  if (directNorm.length > 0) return directNorm;

  // 3. Equivalence group match
  const aliases = ALIAS_LOOKUP.get(normSource);
  if (aliases) {
    const aliasMatches = targetNodes.filter(n => aliases.has(normalizeBoneName(n.name)));
    if (aliasMatches.length > 0) return aliasMatches;
  }

  // 4. Substring / suffix match
  const suffixMatches = targetNodes.filter(n => {
    const normTarget = normalizeBoneName(n.name);
    return normTarget.endsWith(normSource) || normSource.endsWith(normTarget);
  });
  return suffixMatches;
}

export interface RetargetOptions {
  loop?: boolean;
  speed?: number;
  lockRootHorizontalTranslation?: boolean;
  clipName?: string;
  /** Reject clips that map too few of their authored target tracks onto the selected rig. */
  minimumBoneMatchRatio?: number;
}

export interface RetargetResult {
  group: BABYLON.AnimationGroup;
  matchedBones: number;
  totalBones: number;
}

/**
 * Removes cumulative horizontal forward drift from root bone position tracks,
 * locking the cycle in-place while keeping cyclic vertical bobbing and stepping intact.
 */
function lockHorizontalTranslationKeys(anim: BABYLON.Animation): void {
  const keys = anim.getKeys();
  if (!keys || keys.length < 2) return;
  const first = keys[0];
  const last = keys[keys.length - 1];
  if (!first || !last || !first.value || !last.value) return;

  const totalFrames = last.frame - first.frame;
  if (totalFrames <= 0) return;

  const vFirst = first.value as BABYLON.Vector3;
  const vLast = last.value as BABYLON.Vector3;
  if (typeof vFirst.x !== 'number' || typeof vLast.x !== 'number') return;

  const dx = vLast.x - vFirst.x;
  const dy = vLast.y - vFirst.y;
  const dz = vLast.z - vFirst.z;

  // Check if there is meaningful drift (> 0.05 units)
  if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05 && Math.abs(dz) < 0.05) return;

  const newKeys = keys.map((k) => {
    const t = (k.frame - first.frame) / totalFrames;
    const val = (k.value as BABYLON.Vector3).clone();
    val.x -= t * dx;
    val.y -= t * dy;
    val.z -= t * dz;
    return {
      frame: k.frame,
      value: val,
      inTangent: k.inTangent ? (k.inTangent as BABYLON.Vector3).clone() : undefined,
      outTangent: k.outTangent ? (k.outTangent as BABYLON.Vector3).clone() : undefined,
    };
  });
  anim.setKeys(newKeys);
}

/**
 * Retargets a source BABYLON.AnimationGroup onto a destination set of transform nodes.
 * Creates a brand new AnimationGroup linked only to target nodes, completely isolating
 * it from the source container so the source can be safely disposed without null references.
 */
export function retargetAnimationGroup(
  sourceAg: BABYLON.AnimationGroup,
  slotName: string,
  targetNodes: BABYLON.TransformNode[],
  scene: BABYLON.Scene,
  options?: RetargetOptions
): RetargetResult | null {
  if (!sourceAg || !sourceAg.targetedAnimations || sourceAg.targetedAnimations.length === 0) {
    return null;
  }

  const newAg = new BABYLON.AnimationGroup(slotName, scene);
  const matchedBoneNames = new Set<string>();
  const totalBones = new Set(sourceAg.targetedAnimations
    .map((track) => normalizeBoneName(track.target?.name || ''))
    .filter((name) => name && name !== '__root__')).size;

  const ROOT_BONE_NAMES = ['root', 'armature', 'origin', 'bip01', 'pelvis', 'hips', 'hip', 'bip01pelvis'];

  for (const ta of sourceAg.targetedAnimations) {
    const sourceTarget = ta.target;
    const targetName = sourceTarget?.name;
    if (!targetName || targetName === '__root__') continue;

    const destNodes = findAllMatchingTargetNodes(targetName, targetNodes);
    for (const destNode of destNodes) {
      // Prevent limb detachment by stripping translation and scale keys from non-root bones
      const normalizedName = normalizeBoneName(destNode.name);
      const isPositionTrack = ta.animation.targetProperty === 'position';
      const isScaleTrack = ta.animation.targetProperty === 'scaling';
      const isRotationTrack = ta.animation.targetProperty === 'rotationQuaternion' || ta.animation.targetProperty === 'rotation';
      const isRootBone = ROOT_BONE_NAMES.includes(normalizedName);
      const isStructuralRoot = ['armature', 'origin', 'bip01'].includes(normalizedName);
      
      if ((isPositionTrack || isScaleTrack) && !isRootBone) {
        continue;
      }

      if (isRotationTrack && isStructuralRoot) {
        continue;
      }
      
      const animToTarget = ta.animation.clone();
      if (isPositionTrack && isRootBone && options?.lockRootHorizontalTranslation) {
        lockHorizontalTranslationKeys(animToTarget);
      }

      newAg.addTargetedAnimation(animToTarget, destNode);
      matchedBoneNames.add(normalizeBoneName(targetName));
    }
  }

  const matchedBones = matchedBoneNames.size;
  const matchRatio = totalBones > 0 ? matchedBones / totalBones : 0;
  if (matchedBones === 0 || matchRatio < (options?.minimumBoneMatchRatio ?? 0.3)) {
    console.warn(`[AnimationRetarget] ${matchedBones} of ${totalBones} animated bones matched for slot '${slotName}'. Source: ${sourceAg.name}`);
    newAg.dispose();
    return null;
  }

  newAg.loopAnimation = options?.loop !== false;
  if (options?.speed && options.speed > 0) {
    newAg.speedRatio = options.speed;
  }

  return {
    group: newAg,
    matchedBones,
    totalBones,
  };
}

export function selectAnimationGroupByName<T extends { name: string }>(
  groups: T[] | null | undefined,
  clipName?: string,
): T | null {
  if (!groups || groups.length === 0) return null;
  if (!clipName) return groups[0] || null;
  // Per-file profiles store a filename (for example Jog/Jog_Fwd), while
  // older exports retain generic embedded names such as "Unreal Take".
  // A bank must still select an exact named entry; a sole take is unambiguous.
  return groups.find((group) => group.name === clipName) || (groups.length === 1 ? groups[0] : null);
}

/**
 * Loads an external animation GLB file, retargets it onto targetNodes,
 * registers it into the scene, and cleanly disposes the container.
 */
export async function loadAndRetargetAnimation(
  sourcePath: string,
  slotName: string,
  targetNodes: BABYLON.TransformNode[],
  scene: BABYLON.Scene,
  options?: RetargetOptions
): Promise<BABYLON.AnimationGroup | null> {
  // Older Studio builds encoded an entire nested clip path as one segment
  // (for example `Jog%2FJog_Fwd.glb`). Restore separators so static hosts and
  // CDNs resolve nested animation files consistently.
  sourcePath = sourcePath.replace(/%2f/gi, '/');
  const lastSlash = sourcePath.lastIndexOf('/');
  const aRoot = lastSlash >= 0 ? sourcePath.substring(0, lastSlash + 1) : '';
  const aFile = lastSlash >= 0 ? sourcePath.substring(lastSlash + 1) : sourcePath;

  try {
    const container = await BABYLON.SceneLoader.LoadAssetContainerAsync(aRoot, aFile, scene);
    if (!container.animationGroups || container.animationGroups.length === 0) {
      container.dispose();
      console.warn(`[AnimationRetarget] No animation groups found in ${sourcePath}`);
      return null;
    }

    const sourceAg = selectAnimationGroupByName(container.animationGroups, options?.clipName);
    if (!sourceAg) {
      container.dispose();
      console.warn(`[AnimationRetarget] Clip '${options?.clipName}' not found in ${sourcePath}`);
      return null;
    }
    const retargetResult = retargetAnimationGroup(sourceAg, slotName, targetNodes, scene, options);

    // Clean up container resources completely so only the new retargeted AnimationGroup remains
    container.meshes.forEach(m => m.dispose());
    container.skeletons.forEach(s => s.dispose());
    container.transformNodes.forEach(t => t.dispose());
    container.animationGroups.forEach(ag => ag.dispose());

    if (!retargetResult) {
      return null;
    }

    return retargetResult.group;
  } catch (err) {
    console.error(`[AnimationRetarget] Failed to load external animation from ${sourcePath}:`, err);
    return null;
  }
}
