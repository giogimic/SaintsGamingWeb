'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';
import { resolveEntitySpriteUrl } from '@/shared/game/creatureCatalog';
import { resolveModelAssetUrl, getModelModularComponents } from '@/shared/game/worldModelPresentation';
import { getDefaultModelWardrobeAttachmentMode, getDefaultModelWardrobeSocket } from '@/shared/game/modelWardrobe';
import { normalizeBoneName } from '@/engine/animationRetarget';
import { AssetManager } from '@/engine/assets/AssetManager';
import type { ModularAttachmentDef } from '@/shared/game/canonicalAsset';
import { WorldModelValue, STANDARD_SOCKET_OPTIONS } from '../components/WorldModelSelector';
import { Play, Pause, RotateCw, Bone, Layers, EyeOff, Shield } from 'lucide-react';

export type ArchetypePreviewAttachment = WorldModelValue | ModularAttachmentDef;

interface ArchetypeModelPreview3DProps {
  baseAssetId?: string;
  baseModelUrl?: string;
  modelScale?: number;
  modularAttachments?: ArchetypePreviewAttachment[];
  className?: string;
  hideToolbar?: boolean;
  autoRotateDefault?: boolean;
  showHint?: boolean;
}

interface LoadedSubModel {
  scene: THREE.Group;
  attachment: ArchetypePreviewAttachment;
}

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
}: {
  baseUrl: string;
  modelScale?: number;
  modularAttachments?: ArchetypePreviewAttachment[];
  activeAnimationIndex: number;
  isPlaying: boolean;
  showSkeleton: boolean;
  autoRotate: boolean;
  onLoadedAnimations: (anims: { name: string; duration: number }[]) => void;
}) {
  const rootGroup = useRef<THREE.Group>(null);
  const [baseScene, setBaseScene] = useState<THREE.Group | null>(null);
  const [animations, setAnimations] = useState<THREE.AnimationClip[]>([]);
  const [loadedAttachments, setLoadedAttachments] = useState<LoadedSubModel[]>([]);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const skeletonHelperRef = useRef<THREE.SkeletonHelper | null>(null);

  // Load Base Model
  useEffect(() => {
    if (!baseUrl) return;
    let isCancelled = false;
    const loader = new GLTFLoader();

    loader.load(
      baseUrl,
      (gltf) => {
        if (isCancelled) return;
        setBaseScene(gltf.scene);
        const anims = gltf.animations || [];
        setAnimations(anims);
        onLoadedAnimations(
          anims.map((a) => ({ name: a.name || 'Animation', duration: a.duration }))
        );
      },
      undefined,
      (err) => console.error('[ArchetypeModelPreview3D] Base load error:', err)
    );

    return () => {
      isCancelled = true;
    };
  }, [baseUrl]);

  // Load Modular Attachments
  useEffect(() => {
    if (modularAttachments.length === 0) {
      setLoadedAttachments([]);
      return;
    }

    let isCancelled = false;
    let resolvedAttachments: LoadedSubModel[] = [];
    const loader = new GLTFLoader();

    const resolveAndLoad = async () => {
      const assetManager = AssetManager.getInstance();
      const promises = modularAttachments.map(async (att) => {
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
      }
    };

    void resolveAndLoad();

    return () => {
      isCancelled = true;
      resolvedAttachments.forEach(({ scene }) => scene.parent?.remove(scene));
    };
  }, [modularAttachments]);

  // Animation Mixer
  useEffect(() => {
    if (!baseScene || animations.length === 0) return;
    mixerRef.current = new THREE.AnimationMixer(baseScene);

    if (activeAnimationIndex >= 0 && animations[activeAnimationIndex]) {
      const clip = animations[activeAnimationIndex];
      const action = mixerRef.current.clipAction(clip);
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
    const canonicalParts = getModelModularComponents(baseUrl);
    const norm = (s: string) => s.toLowerCase().replace(/[-_\s]/g, '');

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
            child.visible = Boolean(part.defaultVisible);
          }
        } else {
          // Non-modular base mesh: visible by default
          child.visible = true;
        }
      }
    });

    // Check all component hiding rules
    const hiddenKeywords = new Set<string>();
    loadedAttachments.forEach((sub) => {
      (sub.attachment.hidesComponents || []).forEach((c) => hiddenKeywords.add(c.toLowerCase()));
    });
    modularAttachments.forEach((att: any) => {
      (att.hidesComponents || []).forEach((c: string) => hiddenKeywords.add(c.toLowerCase()));
    });

    if (hiddenKeywords.size > 0) {
      baseScene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const meshName = child.name.toLowerCase();
          const normMesh = norm(child.name);
          for (const kw of hiddenKeywords) {
            const normKw = norm(kw);
            if (meshName.includes(kw) || normMesh.includes(normKw)) {
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

      if (attachmentMode === 'SKINNED' || ('isModular' in attachment && Boolean((attachment as any).isModular))) {
        attScene.traverse((child) => {
          if ((child as THREE.SkinnedMesh).isSkinnedMesh && baseSkeleton) {
            attachedToSkeleton = true;
            const clothingMesh = child as THREE.SkinnedMesh;
            const newBones = clothingMesh.skeleton.bones.map((clothingBone) => {
              const normClothing = normalizeBoneName(clothingBone.name);
              const baseBone = baseSkeleton!.bones.find(
                (b) => normalizeBoneName(b.name) === normClothing || b.name === clothingBone.name
              );
              return baseBone || clothingBone;
            });
            const newSkeleton = new THREE.Skeleton(newBones, clothingMesh.skeleton.boneInverses);
            clothingMesh.bind(newSkeleton, clothingMesh.bindMatrix);
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
  }, [baseScene, loadedAttachments]);

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
    <group ref={rootGroup} scale={[modelScale, modelScale, modelScale]}>
      <primitive object={baseScene} />
    </group>
  );
}

export function ArchetypeModelPreview3D({
  baseAssetId,
  baseModelUrl,
  modelScale = 0.8,
  modularAttachments = [],
  className = 'h-72',
  hideToolbar = false,
  autoRotateDefault = false,
  showHint = false,
}: ArchetypeModelPreview3DProps) {
  const [animations, setAnimations] = useState<{ name: string; duration: number }[]>([]);
  const [activeAnimIndex, setActiveAnimIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [autoRotate, setAutoRotate] = useState(autoRotateDefault);

  const [resolvedBaseUrl, setResolvedBaseUrl] = useState<string | null>(() => {
    if (baseModelUrl) return baseModelUrl;
    if (baseAssetId) return resolveModelAssetUrl(baseAssetId) || null;
    return null;
  });

  useEffect(() => {
    if (baseModelUrl) {
      setResolvedBaseUrl(baseModelUrl);
      return;
    }
    if (!baseAssetId) {
      setResolvedBaseUrl(null);
      return;
    }
    const syncUrl = resolveModelAssetUrl(baseAssetId);
    if (syncUrl) {
      setResolvedBaseUrl(syncUrl);
      return;
    }
    let cancelled = false;
    AssetManager.getInstance().getAsset(baseAssetId).then((asset) => {
      if (!cancelled && asset?.source) {
        const assetUrl = resolveModelAssetUrl(asset.source) || asset.source;
        setResolvedBaseUrl(assetUrl);
      }
    }).catch(() => {
      // Do not assign 2D sprite URLs to a 3D GLTF renderer
    });
    return () => { cancelled = true; };
  }, [baseAssetId, baseModelUrl]);

  const effectiveBaseUrl = resolvedBaseUrl || (baseAssetId ? resolveModelAssetUrl(baseAssetId) : null);

  const handleLoadedAnimations = (loaded: { name: string; duration: number }[]) => {
    setAnimations(loaded);
    const idleIdx = loaded.findIndex((a) => /idle|stand|wait|breath|rest/i.test(a.name));
    if (idleIdx >= 0) {
      setActiveAnimIndex(idleIdx);
    } else {
      setActiveAnimIndex(0);
    }
  };

  if (!effectiveBaseUrl) {
    return null;
  }

  return (
    <div className={`w-full ${className} bg-[#050b14] border border-primary/30 rounded-2xl overflow-hidden relative shadow-2xl flex flex-col`}>
      {/* Top Header Controls */}
      {!hideToolbar && (
        <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">
              3D Compositor
            </span>
            {modularAttachments.length > 0 && (
              <span className="text-[9px] font-mono bg-primary/20 text-primary border border-primary/40 px-1.5 py-0.5 rounded">
                +{modularAttachments.length} attachments
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
      <div className="flex-1 w-full h-full">
        <Canvas camera={{ position: [0, 1.4, 2.8], fov: 42 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[6, 10, 6]} intensity={1.3} />
          <directionalLight position={[-6, 4, -4]} intensity={0.5} />
          <Environment preset="city" />

          <CompositeCharacter
            baseUrl={effectiveBaseUrl}
            modelScale={modelScale}
            modularAttachments={modularAttachments}
            activeAnimationIndex={activeAnimIndex}
            isPlaying={isPlaying}
            showSkeleton={showSkeleton}
            autoRotate={autoRotate}
            onLoadedAnimations={handleLoadedAnimations}
          />

          <OrbitControls makeDefault target={[0, 0.9 * modelScale, 0]} maxPolarAngle={Math.PI / 2 + 0.1} />
          <Grid infiniteGrid sectionColor="#eab308" cellColor="#1e293b" fadeDistance={12} />
        </Canvas>
      </div>

      {/* Bottom Hint */}
      {showHint && (
        <div className="absolute bottom-2 left-3 right-3 flex justify-between items-center pointer-events-none text-[9px] text-slate-500">
          <span>Full 3D character composite with live bone attachment & anti-clipping</span>
          <span>Left-click drag: Rotate • Right-click drag: Pan • Scroll: Zoom</span>
        </div>
      )}
    </div>
  );
}
