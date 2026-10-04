'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Bounds, useBounds, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';
import { resolveEntitySpriteUrl } from '@/shared/game/creatureCatalog';
import { resolveModelAssetUrl, getWorldModelPresentation } from '@/shared/game/worldModelPresentation';
import { applyAnimationProfileFallback } from '@/shared/game/animationProfiles';
import { getDefaultModelWardrobeAttachmentMode, getDefaultModelWardrobeSocket } from '@/shared/game/modelWardrobe';
import { normalizeBoneName } from '@/engine/animationRetarget';
import { AssetManager } from '@/engine/assets/AssetManager';
import { getCharacterModelProfile } from '@/shared/game/characterProfiles';
import { getHiddenWardrobeAttachmentIndexes, getQuaterniusBodyRegionFromMeshName, getQuaterniusBodyRegionsToHide, shouldHideBaseMesh } from '@/shared/game/quaterniusCharacter';
import { captureThreeRestPose, retargetThreeAnimationClip, selectThreeAnimationClip } from '@/web/lib/threeAnimationRetarget';
import { discoverModelParts } from '@/shared/game/modelPartDiscovery';
import type { ModularAttachmentDef } from '@/shared/game/canonicalAsset';
import { WorldModelValue, STANDARD_SOCKET_OPTIONS } from '../components/WorldModelSelector';
import { Play, Pause, RotateCw, Bone, Layers, EyeOff, Shield } from 'lucide-react';

export type ArchetypePreviewAttachment = (WorldModelValue | ModularAttachmentDef) & {
  tint?: string;
  textureVariantUrl?: string;
};

const QUATERNIUS_TEXTURE_VARIANT_FAMILIES = {
  '/models/quaternius/textures/T_Peasant_2_BaseColor.png': 'peasant',
  '/models/quaternius/textures/T_Ranger_3_BaseColor.png': 'ranger',
} as const;

type QuaterniusOutfitFamily = (typeof QUATERNIUS_TEXTURE_VARIANT_FAMILIES)[keyof typeof QUATERNIUS_TEXTURE_VARIANT_FAMILIES];

function materialMatchesQuaterniusFamily(material: THREE.Material, family: QuaterniusOutfitFamily): boolean {
  const materialName = material.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (materialName.includes(family)) return true;

  const map = (material as THREE.MeshStandardMaterial).map;
  const image = map?.image as { currentSrc?: string; src?: string } | undefined;
  const textureName = [map?.name, image?.currentSrc, image?.src].filter(Boolean).join(' ').toLowerCase();
  return textureName.includes(`t_${family}_basecolor`) || textureName.includes(`${family}_basecolor`);
}

/** Applies one verified Quaternius outfit color map without mutating the loaded source materials. */
export function applyQuaterniusTextureVariant(
  scene: THREE.Object3D,
  texture: THREE.Texture,
  family: QuaterniusOutfitFamily,
): () => void {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.needsUpdate = true;

  const originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  const variantMaterials: THREE.Material[] = [];
  scene.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;

    const original = mesh.material;
    const sourceMaterials = Array.isArray(original) ? original : [original];
    let changed = false;
    const replacements = sourceMaterials.map((material) => {
      if (!('map' in material) || !materialMatchesQuaterniusFamily(material, family)) return material;
      const clone = material.clone() as THREE.MeshStandardMaterial;
      clone.map = texture;
      clone.needsUpdate = true;
      variantMaterials.push(clone);
      changed = true;
      return clone;
    });

    if (changed) {
      originalMaterials.set(mesh, original);
      mesh.material = Array.isArray(original) ? replacements : replacements[0];
    }
  });

  let cleaned = false;
  return () => {
    if (cleaned) return;
    cleaned = true;
    originalMaterials.forEach((material, mesh) => {
      mesh.material = material;
    });
    variantMaterials.forEach((material) => material.dispose());
  };
}

interface ArchetypeModelPreview3DProps {
  worldModel?: WorldModelValue;
  baseAssetId?: string;
  baseModelUrl?: string;
  modelScale?: number;
  modularAttachments?: ArchetypePreviewAttachment[];
  className?: string;
  hideToolbar?: boolean;
  showAnimationControls?: boolean;
  autoRotateDefault?: boolean;
  showHint?: boolean;
  disableBackground?: boolean;
}

interface LoadedSubModel {
  scene: THREE.Group;
  attachment: ArchetypePreviewAttachment;
}

type PreviewAnimationClip = THREE.AnimationClip & { userData?: { loop: boolean; speed: number } };

function findBone(scene: THREE.Group, socketName?: string): THREE.Bone | null {
  if (!socketName) return null;
  const s = socketName.toLowerCase();

  const matchers: Record<string, string[]> = {
    righthandmount: ['righthand', 'hand_r', 'hand.r', 'r_hand', 'r-hand', 'wrist_r', 'bip01 r hand', 'mixamorigrighthand'],
    lefthandmount: ['lefthand', 'hand_l', 'hand.l', 'l_hand', 'l-hand', 'wrist_l', 'bip01 l hand', 'mixamoriglefthand'],
    twohandedgrip: ['righthand', 'hand_r', 'hand.r', 'r_hand', 'wrist_r', 'mixamorigrighthand'],
    headmount: ['head', 'bip01 head', 'mixamorighead', 'neck', 'bip01 neck', 'mixamorigneck'],
    chestmount: ['spine2', 'upperchest', 'mixamorigupperchest', 'spine1', 'chest', 'spine', 'mixamorigspine2', 'mixamorigchest', 'pelvis'],
    sheathedback: ['spine2', 'upperchest', 'chest', 'spine1', 'spine', 'mixamorigspine2'],
    sheathedhip_l: ['leftupleg', 'thigh_l', 'pelvis', 'hips', 'mixamorigleftupleg'],
    sheathedhip_r: ['rightupleg', 'thigh_r', 'pelvis', 'hips', 'mixamorigrightupleg'],
  };

  const patterns = matchers[s] || [s];
  const normPatterns = patterns.map(p => normalizeBoneName(p));
  let found: THREE.Bone | null = null;

  scene.traverse((child) => {
    if (found) return;
    if ((child as THREE.Bone).isBone) {
      const bn = child.name.toLowerCase().replace(/[^a-z0-9_.]/g, '');
      const normBn = normalizeBoneName(child.name);
      if (patterns.some((pat) => bn.includes(pat)) || normPatterns.some((pat) => normBn.includes(pat))) {
        found = child as THREE.Bone;
      }
    }
  });

  return found;
}

function CompositeCharacter({
  baseUrl,
  modelScale = 0.8,
  modularAttachments = [],
  activeAnimationIndex,
  isPlaying,
  showSkeleton,
  autoRotate,
  onLoadedAnimations,
  animationConfig,
  modelRotationY = 0,
  assetDefinition,
  onStatus,
}: {
  baseUrl: string;
  modelScale?: number;
  modularAttachments?: ArchetypePreviewAttachment[];
  activeAnimationIndex: number;
  isPlaying: boolean;
  showSkeleton: boolean;
  autoRotate: boolean;
  onLoadedAnimations: (anims: { name: string; duration: number }[]) => void;
  animationConfig?: Record<string, any>;
  modelRotationY?: number;
  assetDefinition?: Record<string, any>;
  onStatus: (status: string | null, error?: boolean) => void;
}) {
  const bounds = useBounds();
  const rootGroup = useRef<THREE.Group>(null);
  const [baseScene, setBaseScene] = useState<THREE.Group | null>(null);
  const [animations, setAnimations] = useState<PreviewAnimationClip[]>([]);
  const [loadedAttachments, setLoadedAttachments] = useState<LoadedSubModel[]>([]);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const skeletonHelperRef = useRef<THREE.SkeletonHelper | null>(null);

  // Load Base Model
  useEffect(() => {
    if (!baseUrl) return;
    let isCancelled = false;
    const loader = new GLTFLoader();
    setBaseScene(null);
    setAnimations([]);
    onLoadedAnimations([]);
    onStatus('Loading model…');

    loader.load(
      baseUrl,
      (gltf) => {
        if (isCancelled) return;
        const restPose = captureThreeRestPose(gltf.scene);
        setBaseScene(gltf.scene);
        onStatus(null);
        const validAnims = (gltf.animations || []).filter((a) => a.tracks && a.tracks.length > 0);
        if (validAnims.length > 0) {
          setAnimations(validAnims as PreviewAnimationClip[]);
          onLoadedAnimations(
            validAnims.map((a) => ({ name: a.name || 'Animation', duration: a.duration }))
          );
        } else {
          setAnimations([]);
          onLoadedAnimations([]);
        }
        const mappings = Object.entries(animationConfig?.mapped || {}) as Array<[string, any]>;
        const sources = new Map<string, Promise<Awaited<ReturnType<GLTFLoader['loadAsync']>>>>();
        const externalClips: PreviewAnimationClip[] = [];
        const loadMappings = async () => {
          for (const [slot, mapping] of mappings) {
            if (isCancelled) return;
            if (!mapping.sourcePath || mapping.sourceKind === 'embedded') {
              const embedded = selectThreeAnimationClip(validAnims, mapping.clip);
              if (embedded) externalClips.push(new THREE.AnimationClip(slot, embedded.duration, embedded.tracks.map((track) => track.clone())) as PreviewAnimationClip);
              continue;
            }
            try {
              let promise = sources.get(mapping.sourcePath);
              if (!promise) {
                promise = loader.loadAsync(mapping.sourcePath);
                sources.set(mapping.sourcePath, promise);
              }
              const source = await promise;
              if (isCancelled) return;
              const clip = selectThreeAnimationClip(source.animations, mapping.clip);
              if (!clip) continue;
              const retargeted = retargetThreeAnimationClip(clip, source.scene, gltf.scene, restPose, slot) as PreviewAnimationClip | undefined;
              if (retargeted) {
                retargeted.userData = { loop: mapping.loop !== false, speed: mapping.speed || 1 };
                externalClips.push(retargeted);
              }
            } catch (error) {
              console.warn('[ArchetypeModelPreview3D] Animation load failed:', mapping.sourcePath, error);
            }
          }
          if (isCancelled || !externalClips.length) return;
          const clips = [...externalClips, ...validAnims.filter((clip) => !externalClips.some((external) => external.name === clip.name))];
          setAnimations(clips as PreviewAnimationClip[]);
          onLoadedAnimations(clips.map((clip) => ({ name: clip.name, duration: clip.duration })));
        };
        void loadMappings();
      },
      undefined,
      (err) => {
        if (!isCancelled) onStatus('Could not load this model. Check its saved file or select it again.', true);
        console.error('[ArchetypeModelPreview3D] Base load error:', err);
      }
    );

    return () => {
      isCancelled = true;
    };
  }, [baseUrl, animationConfig, onLoadedAnimations, onStatus]);

  // Load Modular Attachments
  useEffect(() => {
    // Deduplicate attachments by category (keep the last one), but keep all non-categorized items
    const activeAttachments = [...modularAttachments].filter((att) => att.defaultVisible !== false).reverse().filter((att, index, self) => {
      if (!att.category) return true;
      return self.findIndex(a => a.category === att.category) === index;
    }).reverse();

    if (activeAttachments.length === 0) {
      setLoadedAttachments((prev) => prev.length === 0 ? prev : []);
      return;
    }

    let isCancelled = false;
    let resolvedAttachments: LoadedSubModel[] = [];
    const loader = new GLTFLoader();

    const resolveAndLoad = async () => {
      const assetManager = AssetManager.getInstance();
      const normUrl = (u?: string | null) => (u ? u.trim().toLowerCase().replace(/^.*[\\/]/, '').replace(/\.(glb|gltf)$/i, '') : '');
      const cleanBase = normUrl(baseUrl);

      const promises = activeAttachments.map(async (att) => {
        // If this attachment is an internal submesh or canonical built-in piece, NEVER load a duplicate GLB instance
        if (att.isSubmesh) return null;
        if (typeof att.assetId === 'string' && att.assetId.startsWith('builtin-piece-')) return null;

        let url = att.modelUrl || ('source' in att ? (att as any).source : undefined);
        if (!url && att.assetId) {
          url = resolveModelAssetUrl(att.assetId);
          if (!url) {
            try {
              const asset = await assetManager.getAsset(att.assetId);
              if (asset?.source) url = asset.source;
            } catch {}
          }
        }
        if (!url && att.assetId && /\.(glb|gltf)$/i.test(att.assetId)) {
          url = resolveEntitySpriteUrl(att.assetId);
        }
        if (!url) return null;

        const cleanUrl = normUrl(url);
        // If the attachment URL points to the same model file as the base model, skip loading duplicate instance
        if (cleanBase && cleanUrl === cleanBase) {
          return null;
        }

        return new Promise<LoadedSubModel | null>((resolve) => {
          loader.load(
            url,
            (gltf) => {
              if (isCancelled) resolve(null);
              else resolve({ scene: gltf.scene, attachment: att });
            },
            undefined,
            (err) => {
              console.warn('[ArchetypeModelPreview3D] Failed to load modular attachment:', url, err);
              resolve(null);
            }
          );
        });
      });

      const results = await Promise.all(promises);
      if (!isCancelled) {
        resolvedAttachments = results.filter((r): r is LoadedSubModel => r !== null);
        setLoadedAttachments(resolvedAttachments);
        onStatus(null);
      }
    };

    onStatus('Loading attachments…');
    void resolveAndLoad();

    return () => {
      isCancelled = true;
      resolvedAttachments.forEach(({ scene }) => scene.parent?.remove(scene));
    };
  }, [baseUrl, modularAttachments]);

  // Apply only alternate maps that are confirmed in the user's supplied Standard archive.
  useEffect(() => {
    const variants = loadedAttachments.flatMap(({ scene, attachment }) => {
      const url = typeof attachment.textureVariantUrl === 'string' ? attachment.textureVariantUrl : '';
      const family = QUATERNIUS_TEXTURE_VARIANT_FAMILIES[url as keyof typeof QUATERNIUS_TEXTURE_VARIANT_FAMILIES];
      return family ? [{ scene, url, family }] : [];
    });
    if (variants.length === 0) return;

    let isCancelled = false;
    const loader = new THREE.TextureLoader();
    const textures = new Map<string, THREE.Texture>();
    const restoreMaterials: Array<() => void> = [];

    for (const url of new Set(variants.map((variant) => variant.url))) {
      const texture = loader.load(
        url,
        (loadedTexture) => {
          if (isCancelled) {
            loadedTexture.dispose();
            return;
          }
          loadedTexture.colorSpace = THREE.SRGBColorSpace;
          loadedTexture.flipY = false;
          loadedTexture.needsUpdate = true;
          variants
            .filter((variant) => variant.url === url)
            .forEach((variant) => {
              restoreMaterials.push(applyQuaterniusTextureVariant(variant.scene, loadedTexture, variant.family));
            });
        },
        undefined,
        (error) => console.warn('[ArchetypeModelPreview3D] Failed to load Quaternius color variant:', url, error),
      );
      textures.set(url, texture);
    }

    return () => {
      isCancelled = true;
      restoreMaterials.reverse().forEach((restore) => restore());
      textures.forEach((texture) => texture.dispose());
    };
  }, [loadedAttachments]);

  // Animation Mixer
  useEffect(() => {
    if (!baseScene || animations.length === 0) return;
    mixerRef.current = new THREE.AnimationMixer(baseScene);

    if (activeAnimationIndex >= 0 && animations[activeAnimationIndex]) {
      const originalClip = animations[activeAnimationIndex];
      // Gather existing node names to prevent Three.js PropertyBinding warning spam
      const existingNodes = new Set<string>();
      baseScene.traverse((child) => {
        existingNodes.add(child.uuid);
        if (child.name) {
          existingNodes.add(child.name);
          const leaf = child.name.split(/[:\/|]/).pop();
          if (leaf) existingNodes.add(leaf);
        }
      });

      const validTracks = originalClip.tracks.filter((track) => {
        const targetName = track.name.split('.')[0];
        const leaf = targetName.split(/[:\/|]/).pop() || targetName;
        return existingNodes.has(targetName) || existingNodes.has(leaf);
      });

      let clipToPlay = originalClip;
      if (validTracks.length !== originalClip.tracks.length) {
        clipToPlay = originalClip.clone();
        clipToPlay.tracks = validTracks;
      }

      const action = mixerRef.current.clipAction(clipToPlay);
      action.setLoop(originalClip.userData?.loop === false ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = originalClip.userData?.loop === false;
      action.timeScale = originalClip.userData?.speed || 1;
      if (isPlaying) {
        action.play();
      } else {
        action.play();
        action.paused = true;
      }
    }

    return () => {
      mixerRef.current?.stopAllAction();
      mixerRef.current = null;
    };
  }, [baseScene, animations, activeAnimationIndex, isPlaying]);

  // Skeleton Helper
  useEffect(() => {
    if (baseScene && showSkeleton) {
      skeletonHelperRef.current = new THREE.SkeletonHelper(baseScene);
      baseScene.add(skeletonHelperRef.current);
    }
    return () => {
      if (skeletonHelperRef.current && baseScene) {
        baseScene.remove(skeletonHelperRef.current);
        skeletonHelperRef.current = null;
      }
    };
  }, [baseScene, showSkeleton]);

  // Anti-clipping and Socket Attachment Logic
  useEffect(() => {
    if (!baseScene) return;

    // Anti-clipping, Modular Submesh Activation & Socket Attachment Logic
    const canonicalParts = discoverModelParts(baseUrl, assetDefinition, baseScene);
    const norm = (s: string) => s.toLowerCase().replace(/[-_\s.]/g, '');

    const partByMesh = new Map<string, any>();
    for (const p of canonicalParts) {
      const nm = norm(p.meshName);
      partByMesh.set(nm, p);
      if (p.meshName.toLowerCase().includes('outwear')) {
        partByMesh.set(norm(p.meshName.replace(/outwear/i, 'outerwear')), p);
      }
    }

    // Configure base mesh visibility according to canonical defaults and equipped attachments
    baseScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const cName = norm(child.name);
        const part = partByMesh.get(cName);
        if (part) {
          // Check if an equipped attachment corresponds to this canonical part
          const matchingAttachment = modularAttachments.find((att: any) => {
            const rawId = norm(String(att.assetId || att.id || ''));
            const meshName = norm(String(att.meshName || ''));
            const modelUrl = norm(String(att.modelUrl || att.source || ''));
            return (
              (rawId && (rawId === norm(part.id) || rawId.endsWith(norm(part.id)))) ||
              (meshName && meshName === cName) ||
              (modelUrl && modelUrl.includes(cName))
            );
          });

          if (matchingAttachment) {
            child.visible = (matchingAttachment as any).defaultVisible !== false;
          } else {
            // If another face variant is equipped, don't fallback to defaultVisible for this face
            if (part.isFaceVariant) {
              const activeFace = modularAttachments.some((att: any) => {
                const rawId = norm(String(att.assetId || att.id || ''));
                const mName = norm(String(att.meshName || ''));
                const p = partByMesh.get(mName) || canonicalParts.find(cp => norm(cp.id) === rawId);
                return p?.isFaceVariant && (att as any).defaultVisible !== false;
              });
              child.visible = activeFace ? false : Boolean(part.defaultVisible);
            } else {
              child.visible = Boolean(part.defaultVisible);
            }
          }
        } else {
          // Non-modular base mesh: visible by default
          child.visible = true;
        }
      }
    });

    // Ensure facial sub-elements (eyes, teeth) follow head mesh visibility
    let headVisible: boolean | null = null;
    baseScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const cName = norm(child.name);
        if (cName === 'head1' || cName === 'manheadmesh') {
          headVisible = child.visible;
        }
      }
    });
    if (headVisible !== null) {
      baseScene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const cName = norm(child.name);
          if (cName === 'head1eyes' || cName === 'head1teeth' || cName === 'maneyesmesh') {
            child.visible = headVisible!;
          }
        }
      });
    }

    // Check all component hiding rules
    const hiddenKeywords = new Set<string>();
    loadedAttachments.forEach((sub) => {
      (sub.attachment.hidesComponents || []).forEach((c) => hiddenKeywords.add(c.toLowerCase()));
    });
    
    // Use activeAttachments here because we deduplicated them earlier
    const activeAttachments = [...modularAttachments].filter((att) => att.defaultVisible !== false).reverse().filter((att, index, self) => {
      if (!att.category) return true;
      return self.findIndex(a => a.category === att.category) === index;
    }).reverse();

    activeAttachments.forEach((att: any) => {
      (att.hidesComponents || []).forEach((c: string) => hiddenKeywords.add(c.toLowerCase()));
    });

    const hiddenBodyRegions = new Set(getQuaterniusBodyRegionsToHide(activeAttachments));
    const hiddenAttachmentIndexes = getHiddenWardrobeAttachmentIndexes(activeAttachments);
    const hiddenAttachmentIds = new Set(
      hiddenAttachmentIndexes
        .map((index) => String(activeAttachments[index]?.assetId || ''))
        .filter(Boolean),
    );
    baseScene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const region = getQuaterniusBodyRegionFromMeshName(child.name);
      if (region && hiddenBodyRegions.has(region)) child.visible = false;
    });
    loadedAttachments.forEach(({ scene: attachmentScene, attachment }) => {
      const assetId = String(attachment.assetId || '');
      if (assetId && hiddenAttachmentIds.has(assetId)) attachmentScene.visible = false;
    });

    if (hiddenKeywords.size > 0) {
      baseScene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          for (const kw of hiddenKeywords) {
            if (shouldHideBaseMesh(child.name, kw)) {
              child.visible = false;
              break;
            }
          }
        }
      });
    }

    let baseSkeleton: THREE.Skeleton | null = null;
    baseScene.traverse((child) => {
      if (!baseSkeleton && (child as THREE.SkinnedMesh).isSkinnedMesh) {
        baseSkeleton = (child as THREE.SkinnedMesh).skeleton;
      }
    });

    // Wearables share the base rig; rigid props attach to the configured socket.
    loadedAttachments.forEach((sub) => {
      const { scene: attScene, attachment } = sub;
      const attachmentMode = attachment.attachmentMode || getDefaultModelWardrobeAttachmentMode(attachment as any);
      let attachedToSkeleton = false;

      // Apply tint if specified
      if (attachment.tint) {
        attScene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (mesh.material) {
              const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              materials.forEach((mat) => {
                if ('color' in mat && typeof (mat as any).color?.set === 'function') {
                  (mat as any).color.set(attachment.tint);
                }
              });
            }
          }
        });
      }

      if (attachmentMode === 'SKINNED' || ('isModular' in attachment && Boolean((attachment as any).isModular))) {
        attScene.traverse((child) => {
          if ((child as THREE.SkinnedMesh).isSkinnedMesh && baseSkeleton) {
            attachedToSkeleton = true;
            const clothingMesh = child as THREE.SkinnedMesh;
            // Use base bones AND base inverse bind matrices together.
            // Mixing bones from skeleton A with inverses from skeleton B is
            // mathematically invalid: the skinning equation is
            //   final_vertex = vertex × inverse_bind_pose × current_bone_transform
            // so the inverse and the bone MUST come from the same source.
            const newBones: THREE.Bone[] = [];
            const newInverses: THREE.Matrix4[] = [];
            clothingMesh.skeleton.bones.forEach((clothingBone, i) => {
              const normClothing = normalizeBoneName(clothingBone.name);
              const baseIdx = baseSkeleton!.bones.findIndex(
                (b) => normalizeBoneName(b.name) === normClothing || b.name === clothingBone.name
              );
              if (baseIdx >= 0) {
                newBones.push(baseSkeleton!.bones[baseIdx]);
                newInverses.push(baseSkeleton!.boneInverses[baseIdx]);
              } else {
                newBones.push(clothingBone);
                newInverses.push(clothingMesh.skeleton.boneInverses[i]);
              }
            });
            const newSkeleton = new THREE.Skeleton(newBones, newInverses);
            clothingMesh.bind(newSkeleton, clothingMesh.matrixWorld);
          }
        });
        if (attachedToSkeleton) {
          baseScene.add(attScene);
          return;
        }
      }

      const socket = attachment.socket || getDefaultModelWardrobeSocket(attachment as any);
      const targetBone = findBone(baseScene, socket);

      if (targetBone) {
        // Socket parenting
        targetBone.add(attScene);

        // Apply offsets
        const pos = attachment.attachOffset?.position ?? [0, 0, 0];
        const rot = attachment.attachOffset?.rotation ?? [0, 0, 0];
        const scale = (attachment.scale || 1) * (attachment.attachOffset?.scale || 1);

        attScene.position.set(pos[0], pos[1], pos[2]);
        attScene.rotation.set(
          (rot[0] * Math.PI) / 180,
          (rot[1] * Math.PI) / 180,
          (rot[2] * Math.PI) / 180
        );
        attScene.scale.set(scale, scale, scale);
      } else {
        // Fallback root attachment
        baseScene.add(attScene);
      }
    });

    return () => {
      loadedAttachments.forEach(({ scene: attScene }) => {
        attScene.parent?.remove(attScene);
      });
    };
  }, [baseScene, loadedAttachments, modularAttachments, assetDefinition]);

  useEffect(() => {
    if (!baseScene || !rootGroup.current) return;
    const frame = requestAnimationFrame(() => {
      if (rootGroup.current) bounds.refresh(rootGroup.current).clip().fit();
    });
    return () => cancelAnimationFrame(frame);
  }, [baseScene, loadedAttachments, modelScale]);

  useFrame((_, delta) => {
    if (mixerRef.current && isPlaying) {
      mixerRef.current.update(delta);
    }
    if (autoRotate && rootGroup.current) {
      rootGroup.current.rotation.y += delta * 0.5;
    }
  });

  if (!baseScene) return null;

  return (
    <group ref={rootGroup} scale={[modelScale, modelScale, modelScale]} rotation={[0, modelRotationY * Math.PI / 180, 0]}>
      <primitive object={baseScene} />
    </group>
  );
}

export function ArchetypeModelPreview3D({
  worldModel,
  baseAssetId,
  baseModelUrl,
  modelScale = 0.8,
  modularAttachments,
  className = 'h-72',
  hideToolbar = true,
  showAnimationControls = false,
  autoRotateDefault = false,
  showHint = false,
  disableBackground = true,
}: ArchetypeModelPreview3DProps) {
  const [animations, setAnimations] = useState<{ name: string; duration: number }[]>([]);
  const [activeAnimIndex, setActiveAnimIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [autoRotate, setAutoRotate] = useState(autoRotateDefault);
  const [status, setStatus] = useState<{ message: string; error: boolean } | null>(null);
  const inputSignature = JSON.stringify(worldModel || { type: '3D Model', assetId: baseAssetId, modelUrl: baseModelUrl, scale: modelScale });
  const inputModel = useMemo(() => JSON.parse(inputSignature) as WorldModelValue, [inputSignature]);
  const [resolvedModel, setResolvedModel] = useState<WorldModelValue>(inputModel);
  const onStatus = useCallback((message: string | null, error = false) => setStatus(message ? { message, error } : null), []);

  useEffect(() => {
    setResolvedModel(inputModel);
    setAnimations([]);
    const directUrl = inputModel.modelUrl || inputModel.source || resolveModelAssetUrl(inputModel.assetId);
    onStatus(directUrl ? 'Loading model…' : 'Finding model…');
    let cancelled = false;
    if (!inputModel.assetId) {
      if (!directUrl) onStatus('Select a character model to see its preview.');
      return;
    }
    AssetManager.getInstance().getAsset(inputModel.assetId).then((asset) => {
      if (cancelled) return;
      if (asset) {
        const imported = asset.presentation || asset.metadata?.presentation || {};
        setResolvedModel({
          ...imported,
          assetDefinition: imported.assetDefinition || asset.metadata?.assetDefinition,
          ...inputModel,
          modelUrl: directUrl || imported.modelUrl || asset.cdnUrl || asset.source,
        });
      } else if (!directUrl) {
        onStatus('This model is unavailable. Select its file again.', true);
      }
    }).catch(() => {
      if (!cancelled && !directUrl) onStatus('Could not find this model. Select its file again.', true);
    });
    return () => { cancelled = true; };
  }, [inputModel, onStatus]);

  const presentation = useMemo(() => getWorldModelPresentation(resolvedModel), [resolvedModel]);
  const effectiveBaseUrl = presentation?.modelUrl;
  const effectiveScale = (presentation?.modelScale || 1) * (resolvedModel.scale || 1);
  const modularAttachmentsSignature = JSON.stringify(modularAttachments || []);
  const resolvedModelAttachmentsSignature = JSON.stringify(resolvedModel.modularAttachments || []);
  const effectiveAttachments = useMemo(() => {
    const fromProps = JSON.parse(modularAttachmentsSignature);
    const fromModel = JSON.parse(resolvedModelAttachmentsSignature);
    return (fromProps.length > 0 ? fromProps : fromModel) || [];
  }, [modularAttachmentsSignature, resolvedModelAttachmentsSignature]);
  const animationSignature = JSON.stringify(presentation?.animations || {});
  const animationConfig = useMemo(() => applyAnimationProfileFallback(JSON.parse(animationSignature), presentation?.animationProfileId), [animationSignature, presentation?.animationProfileId]);

  const handleLoadedAnimations = useCallback((loaded: { name: string; duration: number }[]) => {
    setAnimations(loaded);
    const idleIdx = loaded.findIndex((a) => /idle|stand|wait|breath|rest/i.test(a.name));
    if (idleIdx >= 0) {
      setActiveAnimIndex(idleIdx);
    } else {
      setActiveAnimIndex(0);
    }
  }, []);

  return (
    <div className={`w-full ${className} ${disableBackground ? 'bg-transparent' : 'bg-[#050b14] border border-primary/30 shadow-2xl'} rounded-2xl overflow-hidden relative flex flex-col`}>
      {/* Optional Debug / Animation Controls Header */}
      {!hideToolbar && showAnimationControls && (
        <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">
              3D Compositor
            </span>
            {effectiveAttachments.length > 0 && (
              <span className="text-[9px] font-mono bg-primary/20 text-primary border border-primary/40 px-1.5 py-0.5 rounded">
                +{effectiveAttachments.length} attachments
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto bg-black/70 backdrop-blur-md p-1.5 rounded-xl border border-white/10">
            {/* Animation Selector */}
            {animations.length > 0 && (
              <select
                value={activeAnimIndex}
                onChange={(e) => setActiveAnimIndex(parseInt(e.target.value, 10))}
                className="bg-black/60 border border-slate-700 text-white text-[10px] font-mono px-2 py-1 rounded outline-none focus:border-primary"
              >
                {animations.map((anim, idx) => (
                  <option key={idx} value={idx}>
                    {anim.name} ({anim.duration.toFixed(1)}s)
                  </option>
                ))}
              </select>
            )}

            {/* Play / Pause */}
            {animations.length > 0 && (
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-1.5 rounded transition-colors ${isPlaying ? 'bg-primary text-primary-foreground' : 'bg-white/10 text-slate-400 hover:text-white'}`}
                title={isPlaying ? 'Pause Animation' : 'Play Animation'}
              >
                {isPlaying ? <Pause size={12} /> : <Play size={12} />}
              </button>
            )}

            {/* Skeleton Helper */}
            <button
              type="button"
              onClick={() => setShowSkeleton(!showSkeleton)}
              className={`p-1.5 rounded transition-colors ${showSkeleton ? 'bg-cyan-500 text-black' : 'bg-white/10 text-slate-400 hover:text-white'}`}
              title="Toggle Skeleton Bones"
            >
              <Bone size={12} />
            </button>

            {/* Turntable Auto Rotate */}
            <button
              type="button"
              onClick={() => setAutoRotate(!autoRotate)}
              className={`p-1.5 rounded transition-colors ${autoRotate ? 'bg-amber-500 text-black' : 'bg-white/10 text-slate-400 hover:text-white'}`}
              title="Toggle Turntable Rotation"
            >
              <RotateCw size={12} className={autoRotate ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      )}

      {/* 3D Canvas */}
      {status && (
        <div role={status.error ? 'alert' : 'status'} className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 text-center pointer-events-none bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0a101b]/90 border border-primary/30 shadow-[0_0_30px_rgba(219,39,119,0.2)] rounded-2xl p-6 flex flex-col items-center gap-4 max-w-[240px]">
            {!status.error && (
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 rounded-full border-2 border-primary/20"></div>
                <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
              </div>
            )}
            <div className="space-y-1">
              <div className={`text-sm font-black uppercase tracking-wider ${status.error ? 'text-red-400' : 'text-white sg-text-gradient'}`}>
                {status.message}
              </div>
              {!status.error && <div className="text-[10px] text-slate-400">Loading 3D assets...</div>}
            </div>
            {!status.error && (
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-primary/50 w-full animate-pulse rounded-full"></div>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="flex-1 min-h-0 w-full h-full">
        {effectiveBaseUrl && <>
        <Canvas camera={{ position: [0, 1.35, 2.7], fov: 40 }}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 8, 5]} intensity={1.4} />
          <directionalLight position={[-5, 4, -4]} intensity={0.5} />
          <Bounds margin={1.25}>
          <CompositeCharacter
            baseUrl={effectiveBaseUrl}
            modelScale={effectiveScale}
            modularAttachments={effectiveAttachments as ArchetypePreviewAttachment[]}
            animationConfig={animationConfig}
            modelRotationY={presentation?.modelRotationY}
            assetDefinition={presentation?.assetDefinition}
            activeAnimationIndex={activeAnimIndex}
            isPlaying={isPlaying}
            showSkeleton={showSkeleton}
            autoRotate={autoRotate}
            onLoadedAnimations={handleLoadedAnimations}
            onStatus={onStatus}
          />
          </Bounds>

          {/* Clean grounding contact shadow under the character's feet */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
            <circleGeometry args={[0.55 * effectiveScale, 32]} />
            <meshBasicMaterial color="#000000" opacity={0.35} transparent depthWrite={false} />
          </mesh>

          <OrbitControls
            makeDefault
            target={[0, 0.88 * effectiveScale, 0]}
            maxPolarAngle={Math.PI / 2}
            minDistance={0.05}
            maxDistance={1000}
            enablePan={false}
          />
          {!disableBackground && <Grid infiniteGrid sectionColor="#eab308" cellColor="#1e293b" fadeDistance={12} />}
        </Canvas>
        </>}
      </div>

      {/* Bottom Hint */}
      {showHint && (
        <div className="absolute bottom-2 left-3 right-3 flex justify-between items-center pointer-events-none text-[9px] text-slate-500">
          <span>Full 3D character composite</span>
          <span>Click & drag to rotate • Scroll to zoom</span>
        </div>
      )}
    </div>
  );
}
