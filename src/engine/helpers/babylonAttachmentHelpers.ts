import * as BABYLON from '@babylonjs/core';
import { normalizeBoneName } from '../animationRetarget';
import type { ModularAttachmentDef } from '@/shared/game/canonicalAsset';
import { getDefaultModelWardrobeSocket } from '@/shared/game/modelWardrobe';

/** Standard socket pattern matching table mapping canonical sockets to common skeleton bone names. */
const SOCKET_MATCHERS: Record<string, string[]> = {
  righthandmount: ['righthand', 'hand_r', 'hand.r', 'r_hand', 'r-hand', 'wrist_r', 'bip01 r hand', 'mixamorigrighthand'],
  lefthandmount: ['lefthand', 'hand_l', 'hand.l', 'l_hand', 'l-hand', 'wrist_l', 'bip01 l hand', 'mixamoriglefthand'],
  twohandedgrip: ['righthand', 'hand_r', 'hand.r', 'r_hand', 'wrist_r', 'mixamorigrighthand'],
  headmount: ['head', 'bip01 head', 'mixamorighead', 'neck', 'bip01 neck', 'mixamorigneck'],
  chestmount: ['spine2', 'upperchest', 'mixamorigupperchest', 'spine1', 'chest', 'spine', 'mixamorigspine2', 'mixamorigchest', 'pelvis'],
  sheathedback: ['spine2', 'upperchest', 'chest', 'spine1', 'spine', 'mixamorigspine2'],
  sheathedhip_l: ['leftupleg', 'thigh_l', 'pelvis', 'hips', 'mixamorigleftupleg'],
  sheathedhip_r: ['rightupleg', 'thigh_r', 'pelvis', 'hips', 'mixamorigrightupleg'],
};

/**
 * Searches a Babylon.js skeleton for a bone matching a socket identifier or bone pattern.
 */
export function findBabylonBone(
  skeleton?: BABYLON.Skeleton | null,
  socketName?: string
): BABYLON.Bone | null {
  if (!skeleton || !socketName) return null;
  const s = socketName.toLowerCase().trim();
  const patterns = SOCKET_MATCHERS[s] || [s];
  const normPatterns = patterns.map((p) => normalizeBoneName(p));

  for (let i = 0; i < patterns.length; i++) {
    const pat = patterns[i];
    const normPat = normPatterns[i];
    const found = skeleton.bones.find((b: any) => {
      const bn = (b.name || '').toLowerCase().replace(/[^a-z0-9_.]/g, '');
      const normBn = normalizeBoneName(b.name || '');
      return bn.includes(pat) || normBn.includes(normPat);
    });
    if (found) return found;
  }
  return null;
}

export interface AttachModularComponentParams {
  scene: BABYLON.Scene;
  id: string;
  attIndex: number;
  attachment: ModularAttachmentDef;
  importedResult: BABYLON.ISceneLoaderAsyncResult;
  modelWrapper: BABYLON.TransformNode;
  baseSkeleton?: BABYLON.Skeleton | null;
}

export interface AttachModularComponentResult {
  rootNodes: (BABYLON.AbstractMesh | BABYLON.TransformNode)[];
  isSkinned: boolean;
  socketWrapper?: BABYLON.TransformNode;
}

/**
 * Attaches an imported modular GLB/model onto a character base model.
 * Handles both skinned mesh retargeting (clothing/armor/outfits) and rigid socket parenting (hats/weapons/props).
 * Also performs anti-clipping component hiding (hidesComponents).
 */
export function attachModularComponent({
  scene,
  id,
  attIndex,
  attachment,
  importedResult,
  modelWrapper,
  baseSkeleton,
}: AttachModularComponentParams): AttachModularComponentResult {
  // Never block cursor selection or camera raycasts
  importedResult.meshes.forEach((m) => {
    m.isPickable = false;
  });

  const rootMeshes = importedResult.meshes.filter((m) => !m.parent);
  const targetRoots = rootMeshes.length > 0 ? rootMeshes : importedResult.meshes;

  // Collect any skeletons from the imported attachment
  const clothingSkeletons = [...(importedResult.skeletons || [])];
  if (clothingSkeletons.length === 0) {
    importedResult.meshes.forEach((m: any) => {
      if (m.skeleton && !clothingSkeletons.includes(m.skeleton)) {
        clothingSkeletons.push(m.skeleton);
      }
    });
  }

  let isSkinned = attachment.attachmentMode === 'SKINNED' || Boolean((attachment as any).isModular);
  if (isSkinned && clothingSkeletons.length === 0) {
    const hasRiggedMesh = importedResult.meshes.some(
      (m: any) => m.skeleton || (m.numBoneInfluencers && m.numBoneInfluencers > 0)
    );
    if (!hasRiggedMesh) {
      isSkinned = false;
    }
  }

  let socketWrapper: BABYLON.TransformNode | undefined;

  if (isSkinned && baseSkeleton) {
    // 1. Skinned Wearable Attachment: Sync clothing bones to base skeleton transform nodes
    targetRoots.forEach((r) => {
      r.parent = modelWrapper;
      r.position = BABYLON.Vector3.Zero();
      r.rotation = BABYLON.Vector3.Zero();
      r.scaling = BABYLON.Vector3.One();
      r.computeWorldMatrix(true);
    });

    if (clothingSkeletons.length > 0) {
      clothingSkeletons.forEach((clothingSkeleton) => {
        const boneMap: { clothingBone: BABYLON.Bone; baseBone: BABYLON.Bone }[] = [];
        
        clothingSkeleton.bones.forEach((clothingBone: any) => {
          const normClothing = normalizeBoneName(clothingBone.name);
          const baseBone = baseSkeleton.bones.find((b: any) =>
            normalizeBoneName(b.name) === normClothing ||
            b.name === clothingBone.name ||
            b.id === clothingBone.id
          );
          if (baseBone) {
            boneMap.push({ clothingBone, baseBone });
          }
        });

        // Sync clothing bones to base bones every frame, after animations are evaluated
        const obs = scene.onBeforeRenderObservable.add(() => {
          for (let i = 0; i < boneMap.length; i++) {
            const { clothingBone, baseBone } = boneMap[i];
            clothingBone.getLocalMatrix().copyFrom(baseBone.getLocalMatrix());
            clothingBone.markAsDirty();
          }
        });

        // Ensure the observer is removed if the clothing mesh is disposed
        if (targetRoots[0]) {
          targetRoots[0].onDisposeObservable.add(() => {
            scene.onBeforeRenderObservable.remove(obs);
          });
        }
      });
    } else {
      importedResult.meshes.forEach((m: any) => {
        if (m.skeleton) m.skeleton = baseSkeleton;
      });
    }

    // Wearable attachments are driven by the base skeleton; stop independent accessory animations
    importedResult.animationGroups?.forEach((ag) => ag.stop());
  } else {
    // 2. Rigid Socket Attachment (hats, helmets, masks, weapons, shields, wings, props)
    const socketName = attachment.socket || getDefaultModelWardrobeSocket(attachment as any);
    const targetBone = findBabylonBone(baseSkeleton, socketName);
    socketWrapper = new BABYLON.TransformNode(`socketWrapper_${id}_${attIndex}`, scene);
    const boneNode = targetBone?.getTransformNode?.();

    if (boneNode) {
      socketWrapper.parent = boneNode;
    } else if (targetBone) {
      let newBoneNode = targetBone.getTransformNode();
      if (!newBoneNode) {
        newBoneNode = new BABYLON.TransformNode(`boneNode_${targetBone.name}`, scene);
        newBoneNode.parent = modelWrapper;
        targetBone.linkTransformNode(newBoneNode);
      }
      socketWrapper.parent = newBoneNode;
    } else {
      socketWrapper.parent = modelWrapper;
    }

    const posX = attachment.attachOffset?.position?.[0] ?? 0;
    const posY = attachment.attachOffset?.position?.[1] ?? 0;
    const posZ = attachment.attachOffset?.position?.[2] ?? 0;

    const rotX = ((attachment.attachOffset?.rotation?.[0] ?? 0) * Math.PI) / 180;
    const rotY = ((attachment.attachOffset?.rotation?.[1] ?? 0) * Math.PI) / 180;
    const rotZ = ((attachment.attachOffset?.rotation?.[2] ?? 0) * Math.PI) / 180;

    const attScale = Number(attachment.scale ?? attachment.attachOffset?.scale ?? 1);
    socketWrapper.position = new BABYLON.Vector3(posX, posY, posZ);
    socketWrapper.rotation = new BABYLON.Vector3(rotX, rotY, rotZ);
    socketWrapper.scaling = new BABYLON.Vector3(attScale, attScale, attScale);

    const wrapperNode = socketWrapper;
    targetRoots.forEach((r) => {
      r.parent = wrapperNode;
    });
    socketWrapper.computeWorldMatrix(true);

    importedResult.animationGroups?.forEach((ag) => ag.stop());
  }

  // 3. Anti-clipping Component Hiding (hidesComponents)
  if (attachment.hidesComponents && attachment.hidesComponents.length > 0) {
    const attMeshSet = new Set(importedResult.meshes);
    attachment.hidesComponents.forEach((hideWord: string) => {
      const hw = hideWord.toLowerCase().trim();
      if (!hw) return;
      modelWrapper.getChildMeshes(false).forEach((bm: any) => {
        if (attMeshSet.has(bm)) return;
        const mn = (bm.name || '').toLowerCase();
        if (mn.includes(hw)) {
          bm.setEnabled(false);
        }
      });
    });
  }

  return {
    rootNodes: targetRoots,
    isSkinned,
    socketWrapper,
  };
}
