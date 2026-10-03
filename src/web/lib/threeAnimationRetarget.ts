import * as THREE from 'three';
import { areRigBoneNamesEquivalent } from '@/shared/game/modelRigTaxonomy';

export type ThreeRestPose = Map<string, { position: THREE.Vector3; quaternion: THREE.Quaternion }>;

export function captureThreeRestPose(scene: THREE.Object3D): ThreeRestPose {
  const pose: ThreeRestPose = new Map();
  scene.traverse((node) => pose.set(node.uuid, { position: node.position.clone(), quaternion: node.quaternion.clone() }));
  return pose;
}

/** Copies tracks onto the destination rig; source meshes never enter the preview. */
export function retargetThreeAnimationClip(
  clip: THREE.AnimationClip,
  source: THREE.Object3D,
  target: THREE.Object3D,
  restPose: ThreeRestPose,
  slot: string,
): THREE.AnimationClip | undefined {
  const destinations: THREE.Object3D[] = [];
  target.traverse((node) => { if ((node as THREE.Bone).isBone) destinations.push(node); });
  const tracks: THREE.KeyframeTrack[] = [];
  const sourceBones = new Set<string>();
  const matchedBones = new Set<string>();
  for (const track of clip.tracks) {
    const binding = THREE.PropertyBinding.parseTrackName(track.name);
    const sourceNode = source.getObjectByName(binding.nodeName);
    if (!sourceNode || !(sourceNode as THREE.Bone).isBone) continue;
    sourceBones.add(sourceNode.uuid);
    const destination = destinations.find((node) => node.name === sourceNode.name)
      || destinations.find((node) => areRigBoneNamesEquivalent(node.name, sourceNode.name));
    if (!destination) continue;
    const rest = restPose.get(destination.uuid);
    if (!rest) continue;
    const pelvis = areRigBoneNamesEquivalent(destination.name, 'pelvis');
    if (binding.propertyName !== 'quaternion' && !(pelvis && binding.propertyName === 'position')) continue;
    matchedBones.add(sourceNode.uuid);
    const copy = track.clone();
    copy.name = `${destination.uuid}.${binding.propertyName}`;
    if (binding.propertyName === 'quaternion') {
      const correction = rest.quaternion.clone().multiply(sourceNode.quaternion.clone().invert());
      const quaternion = new THREE.Quaternion();
      for (let index = 0; index < copy.values.length; index += 4) {
        quaternion.fromArray(copy.values, index).premultiply(correction).normalize().toArray(copy.values, index);
      }
    } else {
      // Keep the destination proportions and vertical stepping/jump motion. The
      // game owns world movement, so previews also remove horizontal root drift.
      const heightRatio = Math.abs(sourceNode.position.y) > 0.001
        ? Math.abs(rest.position.y / sourceNode.position.y) : 1;
      const firstX = copy.values[0];
      const firstZ = copy.values[2];
      const lastIndex = copy.values.length - 3;
      const duration = copy.times[copy.times.length - 1] - copy.times[0];
      for (let index = 0; index < copy.values.length; index += 3) {
        const progress = duration > 0 ? (copy.times[index / 3] - copy.times[0]) / duration : 0;
        copy.values[index] = rest.position.x + (copy.values[index] - firstX - progress * (copy.values[lastIndex] - firstX)) * heightRatio;
        copy.values[index + 1] = rest.position.y + (copy.values[index + 1] - sourceNode.position.y) * heightRatio;
        copy.values[index + 2] = rest.position.z + (copy.values[index + 2] - firstZ - progress * (copy.values[lastIndex + 2] - firstZ)) * heightRatio;
      }
    }
    tracks.push(copy);
  }
  if (!tracks.length || matchedBones.size / Math.max(1, sourceBones.size) < 0.7) return undefined;
  return new THREE.AnimationClip(slot, clip.duration, tracks, clip.blendMode);
}

export function selectThreeAnimationClip(clips: THREE.AnimationClip[], name?: string): THREE.AnimationClip | undefined {
  if (!name) return clips[0];
  const normalized = name.trim().toLowerCase();
  return clips.find((clip) => clip.name.trim().toLowerCase() === normalized)
    || (clips.length === 1 ? clips[0] : undefined);
}
