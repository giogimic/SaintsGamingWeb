import { type Document, type Root, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import {
  analyzeAnimationClip,
  classifySkeletonRig,
} from '../../src/shared/game/modelRigTaxonomy';
import { getAnimationProfile, isAnimationProfileCompatible } from '../../src/shared/game/animationProfiles';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

function getSkeletonData(document: Document) {
  const root = document.getRoot();
  const boneNames = Array.from(new Set(root.listSkins().flatMap((skin) => skin.listJoints().map((joint) => joint.getName()))));
  return { root, boneNames, rigAnalysis: boneNames.length ? classifySkeletonRig(boneNames) : undefined };
}

function getCategorizedAnimations(
  root: Root,
  boneNames: string[],
  rigAnalysis?: ReturnType<typeof classifySkeletonRig>,
) {
  return root.listAnimations().map((animation) => {
    const tracks = animation.listChannels().flatMap((channel) => {
      const boneName = channel.getTargetNode()?.getName();
      if (!boneName || !boneNames.includes(boneName)) return [];
      const property = channel.getTargetPath();
      const trackProperty = property === 'rotation' ? 'quaternion'
        : property === 'translation' ? 'position'
          : property === 'weights' ? 'morphTargetInfluences'
            : property;
      return [`${boneName}.${trackProperty}`];
    });
    const name = animation.getName().trim();
    return {
      ...analyzeAnimationClip(
        { name, duration: getClipDuration(animation), tracks },
        { modelBoneNames: boneNames },
      ),
      targetRigFamily: rigAnalysis?.family,
      targetRigLabel: rigAnalysis?.label,
    };
  });
}

function getClipDuration(animation: any): number {
  const inputTimes = animation.listChannels()
    .flatMap((channel: any) => Array.from(channel.getSampler()?.getInput()?.getArray() || []))
    .map(Number)
    .filter(Number.isFinite);
  if (inputTimes.length === 0) return 0;
  return Math.max(...inputTimes) - Math.min(...inputTimes);
}

/** Inspects an embedded Quaternius UAL bank and builds persistent picker metadata. */
export async function inspectQuaterniusAnimationBank(filePath: string) {
  const document = await io.read(filePath);
  const { root, boneNames, rigAnalysis } = getSkeletonData(document);
  if (boneNames.length === 0 || !rigAnalysis) throw new Error(`Animation bank has no skin joints: ${filePath}`);
  if (rigAnalysis.family !== 'HUMANOID_BIPED') {
    throw new Error(`Expected a humanoid animation bank at ${filePath}; detected ${rigAnalysis.family}.`);
  }
  const categorizedAnimations = getCategorizedAnimations(root, boneNames, rigAnalysis);
  const availableClips = categorizedAnimations.map((animation) => animation.clipName);
  if (availableClips.length === 0 || availableClips.some((name) => !name)) {
    throw new Error(`Animation bank has no named clips: ${filePath}`);
  }

  return {
    mode: '3D' as const,
    rigAnalysis,
    categorizedAnimations,
    animations: {
      source: 'embedded',
      targetSkeleton: 'quaternius_universal',
      boneNames,
      rigBoneNames: boneNames,
      availableClips,
    },
  };
}

/** Reads a rigged model's actual skeleton and exposes only animation banks its bone match supports. */
export async function inspectQuaterniusRiggedModel(filePath: string) {
  const document = await io.read(filePath);
  const { root, boneNames, rigAnalysis } = getSkeletonData(document);
  const categorizedAnimations = getCategorizedAnimations(root, boneNames, rigAnalysis);
  const compatibleProfiles = rigAnalysis
    ? ['quaternius_native', 'quaternius_2_native'].filter((profileId) =>
        isAnimationProfileCompatible(getAnimationProfile(profileId), rigAnalysis.family, boneNames),
      )
    : [];
  const targetSkeleton = compatibleProfiles.length > 0 ? 'quaternius_universal' : undefined;

  return {
    mode: '3D' as const,
    ...(compatibleProfiles[0] ? { animationProfileId: compatibleProfiles[0] } : {}),
    ...(rigAnalysis ? { rigAnalysis } : {}),
    ...(categorizedAnimations.length > 0 ? { categorizedAnimations } : {}),
    animations: {
      source: categorizedAnimations.length > 0 ? 'embedded' : 'retargeted',
      ...(targetSkeleton ? { targetSkeleton } : {}),
      boneNames,
      rigBoneNames: boneNames,
      availableClips: categorizedAnimations.map((animation) => animation.clipName),
      compatibleAnimationProfileIds: compatibleProfiles,
    },
  };
}
