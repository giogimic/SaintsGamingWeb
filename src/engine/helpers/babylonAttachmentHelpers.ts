import * as BABYLON from '@babylonjs/core';
import { normalizeBoneName } from '../animationRetarget';
import { areRigBoneNamesEquivalent } from '@/shared/game/modelRigTaxonomy';
import type { ModularAttachmentDef } from '@/shared/game/canonicalAsset';
import { getDefaultModelWardrobeSocket } from '@/shared/game/modelWardrobe';
import { shouldHideBaseMesh } from '@/shared/game/quaterniusCharacter';

/** Standard socket pattern matching table mapping canonical sockets to common skeleton bone names. */
const SOCKET_MATCHERS: Record<string, string[]> = {
  righthandmount: ['righthand', 'hand_r', 'hand.r', 'r_hand', 'r-hand', 'wrist_r', 'bip01 r hand', 'mixamorigrighthand', 'rhand', 'bip01rhand'],
  lefthandmount: ['lefthand', 'hand_l', 'hand.l', 'l_hand', 'l-hand', 'wrist_l', 'bip01 l hand', 'mixamoriglefthand', 'lhand', 'bip01lhand'],
  twohandedgrip: ['righthand', 'hand_r', 'hand.r', 'r_hand', 'wrist_r', 'mixamorigrighthand', 'rhand', 'bip01rhand'],
  headmount: ['head', 'bip01 head', 'mixamorighead', 'neck', 'bip01 neck', 'mixamorigneck'],
  chestmount: ['spine2', 'upperchest', 'mixamorigupperchest', 'spine1', 'chest', 'spine', 'mixamorigspine2', 'mixamorigchest', 'pelvis'],
  sheathedback: ['spine2', 'upperchest', 'chest', 'spine1', 'spine', 'mixamorigspine2'],
  sheathedhip_l: ['leftupleg', 'thigh_l', 'pelvis', 'hips', 'mixamorigleftupleg', 'lthighbend', 'lthigh', 'l_thigh'],
  sheathedhip_r: ['rightupleg', 'thigh_r', 'pelvis', 'hips', 'mixamorigrightupleg', 'rthighbend', 'rthigh', 'r_thigh'],
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

const ESSENTIAL_WARDROBE_BONE_GROUPS: RegExp[] = [
  /(pelvis|hips)/,
  /spine/,
  /head/,
  /(leftarm|upperarml|arml)/,
  /(rightarm|upperarmr|armr)/,
  /(leftupleg|thighl|legl)/,
  /(rightupleg|thighr|legr)/,
];

const HEAD_ONLY_WARDROBE_CATEGORIES = new Set([
  'beard',
  'face',
  'hair',
  'hat',
  'head_accessory',
  'mask',
]);

export function isWardrobeSkeletonCompatible(
  attachmentBoneNames: string[],
  baseBoneNames: string[],
  minimumMatchRatio = 0.7,
  category?: string,
): boolean {
  if (attachmentBoneNames.length === 0 || baseBoneNames.length === 0) return false;

  if (category && HEAD_ONLY_WARDROBE_CATEGORIES.has(category.trim().toLowerCase())) {
    return attachmentBoneNames.some((bone) => areRigBoneNamesEquivalent(bone, 'Head'))
      && baseBoneNames.some((bone) => areRigBoneNamesEquivalent(bone, 'Head'));
  }

  const matched = attachmentBoneNames.filter((attachmentBone) =>
    baseBoneNames.some((baseBone) => areRigBoneNamesEquivalent(attachmentBone, baseBone)),
  ).length;
  const matchRatio = matched / attachmentBoneNames.length;
  const attachment = attachmentBoneNames.map(normalizeBoneName);
  const base = baseBoneNames.map(normalizeBoneName);
  const requiredGroupsFound = ESSENTIAL_WARDROBE_BONE_GROUPS.every((pattern) =>
    attachment.some((bone) => pattern.test(bone)) && base.some((bone) => pattern.test(bone)),
  );
  return requiredGroupsFound && matchRatio >= minimumMatchRatio;
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
    m.metadata = {
      ...(m.metadata || {}),
      wardrobeAttachmentAssetId: attachment.assetId,
      wardrobeCategory: attachment.category,
    };
  });

  if (attachment.isSubmesh && attachment.meshName) {
    const normalize = (name: string) => name.toLowerCase().replace(/[-_\s]/g, '');
    const selectedMeshName = normalize(attachment.meshName);
    const selectedMeshes = new Set(
      importedResult.meshes.filter((mesh) => normalize(mesh.name) === selectedMeshName)
    );
    if (selectedMeshes.size > 0) {
      importedResult.meshes.forEach((mesh) => mesh.setEnabled(selectedMeshes.has(mesh)));
    }
  }

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
    const incompatibleSkeleton = clothingSkeletons.some((clothingSkeleton) =>
      !isWardrobeSkeletonCompatible(
        clothingSkeleton.bones.map((bone: any) => bone.name || ''),
        baseSkeleton.bones.map((bone: any) => bone.name || ''),
        0.7,
        attachment.category,
      ),
    );
    if (incompatibleSkeleton) {
      console.warn(`[Attachment] Skipped '${attachment.assetId || attachment.modelUrl || id}': clothing rig does not match the character skeleton.`);
      importedResult.meshes.forEach((mesh) => mesh.setEnabled(false));
      return { rootNodes: targetRoots, isSkinned: false };
    }

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
        if (shouldHideBaseMesh(bm.name || '', hw)) {
          bm.setEnabled(false);
        }
      });
    });
  }

  // 4. Apply Tint if provided
  const textureVariantUrl = attachment.textureVariantUrl;
  if (textureVariantUrl) {
    const visitedMaterials = new Set<BABYLON.Material>();
    let replacedTextureCount = 0;
    importedResult.meshes.forEach((mesh) => {
      const material = mesh.material as (BABYLON.Material & { subMaterials?: BABYLON.Material[] }) | null;
      if (!material) return;
      const materials = material.subMaterials || [material];
      materials.forEach((candidate) => {
        if (!candidate || visitedMaterials.has(candidate)) return;
        visitedMaterials.add(candidate);
        const variantMaterial = candidate as BABYLON.PBRMaterial | BABYLON.StandardMaterial;
        const isPbrMaterial = variantMaterial instanceof BABYLON.PBRMaterial;
        const isStandardMaterial = variantMaterial instanceof BABYLON.StandardMaterial;
        if (!isPbrMaterial && !isStandardMaterial) return;

        const originalTexture = isPbrMaterial
          ? variantMaterial.albedoTexture
          : variantMaterial.diffuseTexture;
        const replacement = new BABYLON.Texture(
          textureVariantUrl,
          scene,
          false,
          false,
          BABYLON.Texture.TRILINEAR_SAMPLINGMODE,
        );
        replacement.gammaSpace = true;
        if (originalTexture) {
          const sourceTexture = originalTexture as BABYLON.Texture;
          replacement.coordinatesIndex = sourceTexture.coordinatesIndex;
          replacement.uScale = sourceTexture.uScale;
          replacement.vScale = sourceTexture.vScale;
          replacement.uOffset = sourceTexture.uOffset;
          replacement.vOffset = sourceTexture.vOffset;
          replacement.uAng = sourceTexture.uAng;
          replacement.vAng = sourceTexture.vAng;
          replacement.wAng = sourceTexture.wAng;
          replacement.wrapU = sourceTexture.wrapU;
          replacement.wrapV = sourceTexture.wrapV;
        }
        if (isPbrMaterial) variantMaterial.albedoTexture = replacement;
        else variantMaterial.diffuseTexture = replacement;
        replacedTextureCount++;
      });
    });
    if (replacedTextureCount === 0) {
      console.warn(`[Attachment] '${attachment.assetId || attachment.modelUrl || id}' has a texture variant but no compatible color material.`);
    }
  }

  // 5. Apply Tint if provided
  if (attachment.tint) {
    importedResult.meshes.forEach((mesh: any) => {
      if (mesh.material) {
        // Handle Standard, PBR, and Multi materials
        const mats = mesh.material.subMaterials ? mesh.material.subMaterials : [mesh.material];
        mats.forEach((mat: any) => {
          if (!mat) return;
          try {
            const c = BABYLON.Color3.FromHexString(attachment.tint as string);
            if (mat.albedoColor !== undefined) {
              mat.albedoColor = c;
            } else if (mat.diffuseColor !== undefined) {
              mat.diffuseColor = c;
            }
          } catch (e) {
            console.warn("Failed to apply tint:", attachment.tint, e);
          }
        });
      }
    });
  }

  return {
    rootNodes: targetRoots,
    isSkinned,
    socketWrapper,
  };
}
