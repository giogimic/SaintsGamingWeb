/**
 * Entity Renderer — Sprite billboards and smooth interpolation for
 * local player, remote players, and map entities (NPCs, Creatures).
 *
 * Ported from the monolith's BabylonEngine entity rendering.
 * Uses billboard planes with sprite sheet textures when available,
 * falling back to colored placeholder billboards.
 *
 * Position interpolation uses framerate-independent Vector3.Lerp with
 * exponential smoothing (spring-damper) matching the Renderer.ts follow logic.
 */
import * as BABYLON from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock, Rectangle } from '@babylonjs/gui';
import { useWorldStore } from '../state/useWorldStore';
import { useMultiplayerStore } from '../state/useMultiplayerStore';
import { usePlayerStore } from '../state/usePlayerStore';
import { useSessionStore } from '../state/useSessionStore';
import { resolveEntitySpriteUrl } from '@/shared/game/creatureCatalog';
import { getWorldModelPresentation, resolveModelAssetUrl, getModelModularComponents } from '@/shared/game/worldModelPresentation';
import { mapMesher } from './MapMesher';
import { cameraManager } from './CameraManager';
import { localMovementSystem } from './physics/LocalMovementSystem';
import { WrappedCharacterMesher } from './rendering/WrappedCharacterMesher';
import { AssetManager } from '@/engine/assets/AssetManager';
import { loadAndRetargetAnimation } from '@/engine/animationRetarget';
import { getCharacterModelProfile } from '@/shared/game/characterProfiles';
import { applyAnimationProfileFallback } from '@/shared/game/animationProfiles';
import { selectAnimationGroup } from '@/engine/animationSelection';
import { getCameraFacingAngle } from '@/shared/game/cameraFacing';
import { isMovingBackward } from '@/shared/game/locomotionDirection';
import { attachModularComponent } from '@/engine/helpers/babylonAttachmentHelpers';
import type { ModularAttachmentDef } from '@/shared/game/canonicalAsset';

// Player is 2 blocks tall (like a classic voxel game character)
const PLAYER_HEIGHT = 2.0;
const PLAYER_WIDTH = 1.0;

// NPCs / creatures keep their original compact sizing
const ENTITY_HEIGHT = 1.2;
const ENTITY_WIDTH = 1.2;

const INTERPOLATION_SPEED = 12; // Higher = snappier

interface ManagedSprite {
  mesh: BABYLON.TransformNode;
  label?: BABYLON.Mesh;
  gui?: AdvancedDynamicTexture;
  targetX: number;
  targetZ: number;
  targetY: number;
  targetRotationY: number;
  lastRotationY: number;
  direction?: string;
  isGuarding?: boolean;
  lastSeen: number;
  modelUrl?: string;
  spriteUrl?: string;
  presentationSignature?: string;
  animationGroups?: BABYLON.AnimationGroup[];
  currentAnimationName?: string;
  computedHeight?: number;
  cameraYOffset?: number;
  attachmentAnimationGroups?: BABYLON.AnimationGroup[];
  attachmentSkeletons?: BABYLON.Skeleton[];
}

export class EntityRenderer {
  private scene: BABYLON.Scene | null = null;
  private entityRoot: BABYLON.TransformNode | null = null;

  // Track active sprite meshes
  private sprites: Map<string, ManagedSprite> = new Map();

  // Sprite texture cache (avoid re-loading the same URLs)
  private textureCache: Map<string, BABYLON.Texture> = new Map();

  private _diagnosticKeydown?: (e: KeyboardEvent) => void;

  public initialize(scene: BABYLON.Scene) {
    this.scene = scene;
    this.entityRoot = new BABYLON.TransformNode('entityRoot', scene);

    // Register render loop updates
    scene.onBeforeRenderObservable.add(this.update);

    this._diagnosticKeydown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'f' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        const state = usePlayerStore.getState();
        if (state.player.animationState !== 'attack_light') {
          state.hydratePlayer({ animationState: 'attack_light' });
        }
      }
    };
    window.addEventListener('keydown', this._diagnosticKeydown);
  }

  public getSprite(id: string) {
    return this.sprites.get(id);
  }

  // ── Per-Frame Update ───────────────────────────────────────────────────────

  private update = () => {
    if (!this.scene) return;

    const engine = this.scene.getEngine();
    const dt = engine.getDeltaTime() / 1000.0;
    const smoothFactor = 1.0 - Math.exp(-INTERPOLATION_SPEED * dt);
    const now = Date.now();

    const getEntityAssetInfo = (profileId: string | undefined, defaultKind: string, visualData?: unknown) => {
      let effectiveProfileId = profileId;
      let visualTransform: any = undefined;
      let visualAnimations: any = undefined;
      let visualAnimationProfileId: string | undefined;
      const worldPresentation = getWorldModelPresentation(visualData)
        || getWorldModelPresentation(profileId)
        || (defaultKind === 'player' ? getWorldModelPresentation('brute') : undefined);
      const modularAttachments: ModularAttachmentDef[] = worldPresentation?.modularAttachments || [];

      if (worldPresentation && worldPresentation.mode === '3D') {
        effectiveProfileId = worldPresentation.modelUrl || worldPresentation.assetId || effectiveProfileId;
        if (worldPresentation.animations) visualAnimations = worldPresentation.animations;
        if (worldPresentation.animationProfileId) visualAnimationProfileId = worldPresentation.animationProfileId;
        if (worldPresentation.modelScale || worldPresentation.cameraHeightOffset) {
          visualTransform = {
            scale: worldPresentation.modelScale,
            cameraYOffset: worldPresentation.cameraHeightOffset,
          };
        }
      } else if (visualData) {
        try {
          const parsed = typeof visualData === 'string' ? JSON.parse(visualData) : visualData;
          const wm = (parsed as any)?.worldModel || parsed;
          const candidateModelUrl = wm?.modelUrl || wm?.source || wm?.url;
          if (wm?.type === '3D Model' || wm?.type === 'MODEL' || (candidateModelUrl && /\.(glb|gltf|fbx)(\?.*)?$/i.test(candidateModelUrl))) {
            effectiveProfileId = candidateModelUrl || wm?.assetId || effectiveProfileId;
          }
          if (wm?.animations) visualAnimations = wm.animations;
          if (typeof wm?.animationProfileId === 'string') visualAnimationProfileId = wm.animationProfileId;
          if (wm?.transform) visualTransform = wm.transform;
        } catch {}
      }

      let isModel = (worldPresentation?.mode === '3D') || (effectiveProfileId ? /\.(glb|gltf|fbx)(\?.*)?$/i.test(effectiveProfileId) : false);
      let resolvedUrl = effectiveProfileId ? resolveEntitySpriteUrl(effectiveProfileId, { kind: defaultKind as any }) : undefined;
      let presentationType = effectiveProfileId?.includes('wrapped') ? '2D_WRAPPED' : (isModel ? '3D_MODEL' : '2D_SPRITE');
      let transform: any = visualTransform;
      
      const profile = getCharacterModelProfile(effectiveProfileId);
      if (profile?.baseScale && transform?.scale) {
        transform.scale *= profile.baseScale;
      } else if (profile?.baseScale && !transform) {
        transform = { scale: profile.baseScale };
      } else if (profile?.baseScale && transform && !transform.scale) {
        transform.scale = profile.baseScale;
      }

      let animations: any = visualAnimations;

      if (effectiveProfileId && effectiveProfileId.length >= 20 && !effectiveProfileId.includes('.')) {
        const asset = AssetManager.getInstance().getAssetSync(effectiveProfileId);
        if (asset) {
          isModel = asset.type === 'MODEL' || !!(asset.source && /\.(glb|gltf|fbx)(\?.*)?$/i.test(asset.source));
          if (asset.source) resolvedUrl = resolveEntitySpriteUrl(asset.source);
          if (asset.presentation) {
            const pres = asset.presentation as any;
            if (pres.characterPresentationType) presentationType = pres.characterPresentationType;
            else if (isModel) presentationType = '3D_MODEL';
            
            // Search in assetDefinition.transform, transform, and direct properties
            const t = pres.assetDefinition?.transform || pres.transform || pres;
            const parsedScale = t.scale !== undefined ? Number(t.scale) : (pres.modelScale !== undefined ? Number(pres.modelScale) : undefined);
            const parsedRotY = t.rotationY !== undefined ? Number(t.rotationY) : (pres.modelRotationY !== undefined ? Number(pres.modelRotationY) : undefined);
            const parsedGrounding = t.grounding !== undefined ? Number(t.grounding) : (pres.grounding !== undefined ? Number(pres.grounding) : undefined);
            const parsedCamOffset = t.cameraYOffset !== undefined ? Number(t.cameraYOffset) : (t.cameraHeightOffset !== undefined ? Number(t.cameraHeightOffset) : (pres.cameraHeightOffset !== undefined ? Number(pres.cameraHeightOffset) : undefined));

            if (parsedScale !== undefined || parsedRotY !== undefined || parsedGrounding !== undefined || parsedCamOffset !== undefined) {
              transform = {
                scale: parsedScale !== undefined && Number.isFinite(parsedScale) && parsedScale > 0 ? parsedScale : transform?.scale,
                rotationY: parsedRotY !== undefined && Number.isFinite(parsedRotY) ? parsedRotY : transform?.rotationY,
                grounding: parsedGrounding !== undefined && Number.isFinite(parsedGrounding) ? parsedGrounding : transform?.grounding,
                cameraYOffset: parsedCamOffset !== undefined && Number.isFinite(parsedCamOffset) && parsedCamOffset > 0 ? parsedCamOffset : transform?.cameraYOffset
              };
            }
            const assetAnimations = pres.animations || pres.assetDefinition?.animations || asset.metadata?.animations;
            const actorAnimationProfileId = visualAnimationProfileId
              || pres.animationProfileId
              || pres.assetDefinition?.animationProfileId
              || asset.metadata?.animationProfileId
              || asset.metadata?.assetDefinition?.animationProfileId;
            if (assetAnimations || animations || actorAnimationProfileId) {
              const baseMappings = assetAnimations?.mapped || {};
              const actorMappings = animations?.mapped || {};
              animations = applyAnimationProfileFallback({
                ...(assetAnimations || {}),
                ...(animations || {}),
                mapped: { ...baseMappings, ...actorMappings },
              }, actorAnimationProfileId);
            }
          } else if (isModel) {
            presentationType = '3D_MODEL';
          }
        }
      }
      if (visualAnimationProfileId && !animations) {
        animations = applyAnimationProfileFallback(undefined, visualAnimationProfileId);
      }

      const presentationSignature = JSON.stringify({
        isModel,
        resolvedUrl,
        transform,
        modularAttachments: modularAttachments.map((att) => ({
          assetId: att.assetId,
          modelUrl: att.modelUrl,
          attachmentMode: att.attachmentMode,
          socket: att.socket,
          attachOffset: att.attachOffset,
          scale: att.scale,
          hidesComponents: att.hidesComponents,
        })),
      });

      return {
        isModel: !!isModel,
        resolvedUrl,
        presentationType,
        transform,
        animations,
        modularAttachments,
        presentationSignature,
      };
    };

    const getActorScale = (visualData?: unknown): number | undefined => {
      try {
        const parsed = typeof visualData === 'string' ? JSON.parse(visualData) : visualData;
        const scale = Number((parsed as any)?.worldModel?.scale ?? (parsed as any)?.scale ?? (parsed as any)?.modelScale);
        return Number.isFinite(scale) && scale > 0 ? Math.min(100, scale) : undefined;
      } catch {
        return undefined;
      }
    };

    // 1. Local Player
    const player = usePlayerStore.getState().player;
    const is3D = player.position.z !== undefined;
    const pAssetInfo = getEntityAssetInfo(player.assetProfileId, 'player', player.visualData);
    const playerScale = getActorScale(player.visualData);
    if (pAssetInfo.isModel && playerScale !== undefined) {
      pAssetInfo.transform = {
        ...(pAssetInfo.transform || {}),
        scale: (pAssetInfo.transform?.scale ?? 0.75) * playerScale,
      };
    }

    let localRotationY: number;
    const moveAngle = localMovementSystem.getCurrentMoveAngle();
    const isPointerLocked = typeof document !== 'undefined' && document.pointerLockElement !== null;
    const isMovingBackwardRelativeToCamera = is3D && moveAngle !== null &&
      isMovingBackward(moveAngle, cameraManager.yaw);
    const locomotionAnimationState = isMovingBackwardRelativeToCamera ? 'run_bwd' : undefined;

    if (is3D) {
      localRotationY = getCameraFacingAngle(cameraManager.yaw);
      localMovementSystem.setLastFacingAngle(localRotationY);
    } else if (moveAngle !== null) {
      localRotationY = moveAngle;
    } else if (isPointerLocked || cameraManager.isFirstPerson()) {
      localRotationY = getCameraFacingAngle(cameraManager.yaw);
      localMovementSystem.setLastFacingAngle(localRotationY);
    } else if (player.rotationY !== undefined) {
      localRotationY = player.rotationY;
    } else if (player.direction) {
      switch (player.direction) {
        case 'down': localRotationY = Math.PI; break;
        case 'up': localRotationY = 0; break;
        case 'left': localRotationY = Math.PI / 2; break;
        case 'right': localRotationY = -Math.PI / 2; break;
        default: localRotationY = localMovementSystem.getLastFacingAngle();
      }
    } else {
      localRotationY = localMovementSystem.getLastFacingAngle();
    }

    this.upsertSprite('local_player', {
      x: player.position.x,
      y: is3D ? (player.position.z as number) : player.position.y,
      z: is3D ? player.position.y : undefined,
      name: player.name || 'You',
      color: new BABYLON.Color3(0.2, 0.6, 1),
      spriteUrl: pAssetInfo.isModel ? undefined : pAssetInfo.resolvedUrl,
      modelUrl: pAssetInfo.isModel ? pAssetInfo.resolvedUrl : undefined,
      isPlayer: true,
      presentationType: pAssetInfo.presentationType,
      transform: pAssetInfo.transform,
      animations: pAssetInfo.animations,
      isMoving: player.isMoving,
      animationState: player.animationState || locomotionAnimationState,
      modularAttachments: pAssetInfo.modularAttachments,
      presentationSignature: pAssetInfo.presentationSignature,
      rotationY: localRotationY,
      direction: player.direction,
    }, now);

    // 2. Remote Players
    const remotePlayers = useMultiplayerStore.getState().otherPlayers as Record<string, any>;
    const myAccountId = useSessionStore.getState().accountId;
    
    for (const [id, rp] of Object.entries(remotePlayers)) {
      if (rp.accountId && rp.accountId === myAccountId) continue;
      
      // Dead reckoning: predict position based on velocity
      let px = rp.x ?? 0;
      let py = rp.z !== undefined ? rp.z : (rp.y ?? 0);
      const vx = rp.vx ?? 0;
      const vz = rp.vz !== undefined ? rp.vz : (rp.vy ?? 0);
      if (rp.vx !== undefined && rp.vy !== undefined && rp.lastUpdateMs) {
        const elapsed = (now - rp.lastUpdateMs) / 1000.0;
        if (elapsed > 0 && elapsed < 2) {
          px += rp.vx * elapsed;
          py += vz * elapsed;
        }
      }

      let remoteRotY: number | undefined = undefined;
      if (vx * vx + vz * vz > 0.01) {
        remoteRotY = Math.atan2(-vx, vz);
      } else if (rp.rotationY !== undefined) {
        remoteRotY = rp.rotationY;
      } else if (rp.direction) {
        switch (rp.direction) {
          case 'down': remoteRotY = Math.PI; break;
          case 'up': remoteRotY = 0; break;
          case 'left': remoteRotY = Math.PI / 2; break;
          case 'right': remoteRotY = -Math.PI / 2; break;
        }
      }

      const rpAssetInfo = getEntityAssetInfo(rp.assetProfileId, 'player', rp.visualData);
      const remoteScale = getActorScale(rp.visualData);
      if (rpAssetInfo.isModel && remoteScale !== undefined) {
        rpAssetInfo.transform = {
          ...(rpAssetInfo.transform || {}),
          scale: (rpAssetInfo.transform?.scale ?? 0.75) * remoteScale,
        };
      }

      this.upsertSprite(`remote_${id}`, {
        x: px,
        y: py,
        z: rp.y,
        name: rp.name || 'Player',
        color: new BABYLON.Color3(1, 0.6, 0.2),
        spriteUrl: rpAssetInfo.isModel ? undefined : rpAssetInfo.resolvedUrl,
        modelUrl: rpAssetInfo.isModel ? rpAssetInfo.resolvedUrl : undefined,
        chatMessage: rp.chatMessage,
        isPlayer: true,
        presentationType: rpAssetInfo.presentationType,
        transform: rpAssetInfo.transform,
        animations: rpAssetInfo.animations,
        isMoving: rp.isMoving,
        isGuarding: rp.isGuarding,
        modularAttachments: rpAssetInfo.modularAttachments,
        presentationSignature: rpAssetInfo.presentationSignature,
        rotationY: remoteRotY,
        direction: rp.direction,
      }, now);
    }

    // 3. Map Entities (NPCs, Creatures)
    const mapEntities = useWorldStore.getState().mapEntities as any[];
    for (const ent of mapEntities) {
      let entRotY: number | undefined = undefined;
      const entFacing = ent.facing || ent.direction || ent.components?.facing || ent.components?.direction;
      if (ent.rotationY !== undefined) {
        entRotY = ent.rotationY;
      } else if (entFacing) {
        switch (entFacing) {
          case 'down': entRotY = Math.PI; break;
          case 'up': entRotY = 0; break;
          case 'left': entRotY = Math.PI / 2; break;
          case 'right': entRotY = -Math.PI / 2; break;
        }
      }

      const entAssetInfo = getEntityAssetInfo(ent.spriteKey, 'npc', ent.visualData ?? ent.components?.appearance);
      const entityScale = getActorScale(ent.visualData ?? ent.components?.appearance);
      if (entAssetInfo.isModel && entityScale !== undefined) {
        entAssetInfo.transform = {
          ...(entAssetInfo.transform || {}),
          scale: (entAssetInfo.transform?.scale ?? 0.75) * entityScale,
        };
      }
      const entityColor = ent.type === 'NPC'
        ? new BABYLON.Color3(0.2, 0.8, 0.3)
        : new BABYLON.Color3(0.8, 0.2, 0.2);

      this.upsertSprite(`entity_${ent.id}`, {
        x: ent.position.x,
        y: ent.position.z !== undefined ? ent.position.z : ent.position.y,
        name: ent.name || ent.type,
        color: entityColor,
        spriteUrl: entAssetInfo.isModel ? undefined : entAssetInfo.resolvedUrl,
        modelUrl: entAssetInfo.isModel ? entAssetInfo.resolvedUrl : undefined,
        transform: entAssetInfo.transform,
        animations: entAssetInfo.animations,
        isMoving: ent.isMoving,
        modularAttachments: entAssetInfo.modularAttachments,
        presentationSignature: entAssetInfo.presentationSignature,
        rotationY: entRotY,
        direction: entFacing,
      }, now);
    }

    // 4. Interpolate all sprites
    for (const [, sprite] of this.sprites) {
      sprite.mesh.position.x = BABYLON.Scalar.Lerp(sprite.mesh.position.x, sprite.targetX, smoothFactor);
      sprite.mesh.position.z = BABYLON.Scalar.Lerp(sprite.mesh.position.z, sprite.targetZ, smoothFactor);
      sprite.mesh.position.y = BABYLON.Scalar.Lerp(sprite.mesh.position.y, sprite.targetY, smoothFactor);

      if (sprite.targetRotationY !== undefined) {
        if (sprite.mesh.rotationQuaternion) {
          sprite.mesh.rotationQuaternion = null;
        }
        const turnSpeed = Math.min(1.0, 18.0 * dt);
        sprite.mesh.rotation.y = BABYLON.Scalar.LerpAngle(
          sprite.mesh.rotation.y,
          sprite.targetRotationY,
          turnSpeed
        );
      }
    }

    // 5. Clean up stale sprites (not seen for 5 seconds)
    const activeIds = new Set<string>();
    activeIds.add('local_player');
    for (const id of Object.keys(remotePlayers)) activeIds.add(`remote_${id}`);
    for (const ent of mapEntities) activeIds.add(`entity_${ent.id}`);

    for (const [id, sprite] of this.sprites.entries()) {
      if (!activeIds.has(id) || (now - sprite.lastSeen > 5000)) {
        sprite.attachmentAnimationGroups?.forEach((ag) => ag.dispose());
        sprite.attachmentSkeletons?.forEach((s) => s.dispose());
        sprite.mesh.dispose();
        sprite.label?.dispose();
        sprite.gui?.dispose();
        this.sprites.delete(id);
      }
    }
  };

  // ── Sprite Creation / Update ───────────────────────────────────────────────

  private upsertSprite(
    id: string,
    data: {
      x: number;
      y: number;
      z?: number;
      name?: string;
      color: BABYLON.Color3;
      spriteUrl?: string;
      modelUrl?: string;
      chatMessage?: string;
      isPlayer?: boolean;
      presentationType?: string;
      transform?: { scale?: number, rotationY?: number, grounding?: number, cameraYOffset?: number };
      animations?: any;
      isMoving?: boolean;
      animationState?: string;
      modularAttachments?: ModularAttachmentDef[];
      presentationSignature?: string;
      rotationY?: number;
      direction?: string;
      isGuarding?: boolean;
    },
    now: number
  ) {
    if (!this.scene || !this.entityRoot) return;

    let sprite = this.sprites.get(id);

    const spriteW = data.isPlayer ? PLAYER_WIDTH : ENTITY_WIDTH;
    const spriteH = data.isPlayer ? PLAYER_HEIGHT : ENTITY_HEIGHT;

    if (
      sprite &&
      (sprite.modelUrl !== data.modelUrl ||
       sprite.spriteUrl !== data.spriteUrl ||
       (data.presentationSignature && sprite.presentationSignature !== data.presentationSignature))
    ) {
      sprite.attachmentAnimationGroups?.forEach((ag) => ag.dispose());
      sprite.attachmentSkeletons?.forEach((s) => s.dispose());
      sprite.mesh.dispose(false, true);
      sprite.label?.dispose();
      sprite.gui?.dispose();
      this.sprites.delete(id);
      sprite = undefined;
    }

    if (!sprite) {
      let mesh: BABYLON.TransformNode;

      if (data.modelUrl) {
        mesh = new BABYLON.TransformNode(`sprite_${id}`, this.scene);
        mesh.parent = this.entityRoot;

        const lastSlash = data.modelUrl.lastIndexOf('/');
        const rootUrl = data.modelUrl.substring(0, lastSlash + 1);
        const filename = data.modelUrl.substring(lastSlash + 1);

        BABYLON.SceneLoader.ImportMeshAsync("", rootUrl, filename, this.scene).then(async (result) => {
          // Entity/model data can change while the network request is in flight.
          // Never attach a stale result to a replacement entity.
          const current = this.sprites.get(id);
          if (!current || current.mesh !== mesh) {
            result.meshes.forEach((loadedMesh) => loadedMesh.dispose());
            result.animationGroups.forEach((animation) => animation.dispose());
            result.transformNodes.forEach((t) => t.dispose());
            if (result.skeletons) result.skeletons.forEach((s) => s.dispose());
            return;
          }
          const grounding = data.transform?.grounding ?? 0;
          
          // Use a modelWrapper to isolate the scale from glTF animation root nodes
          const modelWrapper = new BABYLON.TransformNode(`modelWrapper_${id}`, this.scene);
          modelWrapper.parent = mesh;
          
          result.meshes.forEach((m) => {
            m.isPickable = false; // Never block camera raycast or cursor selection
            if (!m.parent) {
              m.parent = modelWrapper;
              m.position.y += grounding;
            }
          });
          result.transformNodes.forEach((t) => {
            if (!t.parent) {
              t.parent = modelWrapper;
              t.position.y += grounding;
            }
          });
          
          const scale = data.transform?.scale ?? 0.8;
          modelWrapper.scaling = new BABYLON.Vector3(scale, scale, scale);
          
          const rotY = data.transform?.rotationY ?? 0;
          if (rotY !== 0) {
            modelWrapper.rotation = new BABYLON.Vector3(0, (rotY * Math.PI) / 180, 0);
          }
          mesh.rotationQuaternion = null;
          mesh.rotation = new BABYLON.Vector3(0, current.targetRotationY ?? 0, 0);

          mesh.computeWorldMatrix(true);
          modelWrapper.computeWorldMatrix(true); // CRITICAL: Must compute wrapper matrix before children

          if (result.skeletons) {
            result.skeletons.forEach((s) => {
              s.useTextureToStoreBoneMatrices = true;
            });
          }
          const baseSkeleton = result.skeletons?.[0] || modelWrapper.getChildMeshes(false).find((m: any) => m.skeleton)?.skeleton;
          if (baseSkeleton) {
            baseSkeleton.useTextureToStoreBoneMatrices = true;
          }

          // Attach modular components (clothing, armor, hats, weapons, etc.)
          if (data.modularAttachments && data.modularAttachments.length > 0) {
            current.attachmentAnimationGroups = current.attachmentAnimationGroups || [];
            current.attachmentSkeletons = current.attachmentSkeletons || [];

            const normBase = (data.modelUrl || '').trim().toLowerCase().replace(/^.*[\\/]/, '').replace(/\.(glb|gltf)$/i, '');

            for (let attIdx = 0; attIdx < data.modularAttachments.length; attIdx++) {
              const att = data.modularAttachments[attIdx];
              // Never import a duplicate GLB if this is an internal submesh or canonical built-in piece
              if (att.isSubmesh) continue;
              if (typeof att.assetId === 'string' && att.assetId.startsWith('builtin-piece-')) continue;

              let attUrl: string | undefined = att.modelUrl || att.cdnUrl;
              if (!attUrl && att.assetId) {
                attUrl = resolveModelAssetUrl(att.assetId);
                if (!attUrl) {
                  const cachedAsset = AssetManager.getInstance().getAssetSync(att.assetId);
                  if (cachedAsset?.source) attUrl = cachedAsset.source;
                }
              }
              if (!attUrl) continue;

              const normAtt = attUrl.trim().toLowerCase().replace(/^.*[\\/]/, '').replace(/\.(glb|gltf)$/i, '');
              if (normBase && normAtt === normBase) continue;

              const activeSprite = this.sprites.get(id);
              if (!activeSprite || activeSprite.mesh !== mesh || !this.scene) break;

              const lastAttSlash = attUrl.lastIndexOf('/');
              const attRootUrl = attUrl.substring(0, lastAttSlash + 1);
              const attFilename = attUrl.substring(lastAttSlash + 1);

              try {
                const attResult = await BABYLON.SceneLoader.ImportMeshAsync("", attRootUrl, attFilename, this.scene);
                const stillActive = this.sprites.get(id);
                if (!stillActive || stillActive.mesh !== mesh || !this.scene) {
                  attResult.meshes.forEach((m) => m.dispose());
                  attResult.animationGroups?.forEach((ag) => ag.dispose());
                  attResult.transformNodes.forEach((t) => t.dispose());
                  attResult.skeletons?.forEach((s) => s.dispose());
                  break;
                }

                if (attResult.animationGroups) {
                  stillActive.attachmentAnimationGroups?.push(...attResult.animationGroups);
                }
                if (attResult.skeletons) {
                  stillActive.attachmentSkeletons?.push(...attResult.skeletons);
                }

                attachModularComponent({
                  scene: this.scene,
                  id,
                  attIndex: attIdx,
                  attachment: att,
                  importedResult: attResult,
                  modelWrapper,
                  baseSkeleton,
                });
              } catch (attErr) {
                console.warn(`[EntityRenderer] Failed to load modular attachment: ${attUrl}`, attErr);
              }
            }
          }
          const allMeshes = modelWrapper.getChildMeshes(false);
          
          if (id.includes('citizen') || data.modelUrl?.includes('citizens')) {
            allMeshes.forEach(m => {
              if (m.material) {
                const mat = m.material as any;
                if (mat.albedoTexture) {
                  mat.albedoTexture.updateSamplingMode(BABYLON.Texture.NEAREST_SAMPLINGMODE);
                }
              }
            });
          }

          allMeshes.forEach(m => {
            m.isPickable = false;
            m.computeWorldMatrix(true);
            const skeleton = (m as any).skeleton;
            if (skeleton && skeleton.computeAbsoluteTransforms) {
              skeleton.computeAbsoluteTransforms();
            }
            if ((m as any).refreshBoundingInfo) {
              (m as any).refreshBoundingInfo({ applySkeleton: true });
            }
          });

          // Configure modular submesh visibility for models with built-in modular pieces (e.g. Adventurer, Brute)
          const canonicalParts = getModelModularComponents(data.modelUrl);
          if (canonicalParts.length > 0) {
            const norm = (s: string) => s.toLowerCase().replace(/[-_\s.]/g, '');
            const partByMesh = new Map<string, any>();
            for (const p of canonicalParts) {
              partByMesh.set(norm(p.meshName), p);
              if (p.meshName.toLowerCase().includes('outwear')) {
                partByMesh.set(norm(p.meshName.replace(/outwear/i, 'outerwear')), p);
              }
            }

            const modularAtts = data.modularAttachments || [];
            for (const childMesh of allMeshes) {
              const cName = norm(childMesh.name);
              const part = partByMesh.get(cName);
              if (part) {
                const matchingAttachment = modularAtts.find((att: any) => {
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
                  childMesh.setEnabled((matchingAttachment as any).defaultVisible !== false);
                } else {
                  if (part.isFaceVariant) {
                    const activeFace = modularAtts.some((att: any) => {
                      const rawId = norm(String(att.assetId || att.id || ''));
                      const mName = norm(String(att.meshName || ''));
                      const p = partByMesh.get(mName) || canonicalParts.find(cp => norm(cp.id) === rawId);
                      return p?.isFaceVariant && (att as any).defaultVisible !== false;
                    });
                    childMesh.setEnabled(!activeFace && part.defaultVisible);
                  } else {
                    childMesh.setEnabled(part.defaultVisible);
                  }
                }
              }
            }

            // Ensure facial sub-elements (eyes, teeth) follow head mesh visibility
            let headEnabled: boolean | null = null;
            for (const childMesh of allMeshes) {
              const cName = norm(childMesh.name);
              if (cName === 'head1' || cName === 'manheadmesh') {
                headEnabled = childMesh.isEnabled();
                break;
              }
            }
            if (headEnabled !== null) {
              for (const childMesh of allMeshes) {
                const cName = norm(childMesh.name);
                if (cName === 'head1eyes' || cName === 'head1teeth' || cName === 'maneyesmesh') {
                  childMesh.setEnabled(headEnabled);
                }
              }
            }
          }

          let modelVisualHeight = 1.6;
          let headBoneHeight: number | null = null;
          
          // 1. Try skeleton-based Head bone detection using world coords relative to entity
          for (const childMesh of allMeshes) {
            const skeleton = (childMesh as any).skeleton;
            if (skeleton && skeleton.bones) {
              const headBone = skeleton.bones.find((b: any) => {
                const name = b.name?.toLowerCase() || '';
                return name === 'head' || name.includes('head') || name.includes('bip01 head');
              });
              if (headBone) {
                try {
                  if (skeleton.computeAbsoluteTransforms) {
                    skeleton.computeAbsoluteTransforms();
                  }
                  // getAbsolutePosition(childMesh) takes mesh rotation and wrapper scaling into account
                  const headWorldPos = headBone.getAbsolutePosition(childMesh);
                  const entityWorldPos = mesh.getAbsolutePosition();
                  const heightDiff = headWorldPos.y - entityWorldPos.y;
                  if (Number.isFinite(heightDiff) && heightDiff > 0.05) {
                    headBoneHeight = heightDiff;
                    modelVisualHeight = heightDiff;
                    break;
                  }
                } catch {}
              }
            }
          }
          
          // 2. Fallback to bounding box 
          if (headBoneHeight === null || headBoneHeight <= 0.05) {
            let minY = Infinity;
            let maxY = -Infinity;
            for (const childMesh of allMeshes) {
              if (!(childMesh as any).getBoundingInfo) continue;
              try {
                if ((childMesh as any).refreshBoundingInfo) {
                  (childMesh as any).refreshBoundingInfo({ applySkeleton: true });
                }
                const bi = (childMesh as any).getBoundingInfo();
                const worldMin = bi.boundingBox.minimumWorld;
                const worldMax = bi.boundingBox.maximumWorld;
                if (worldMin.y < minY) minY = worldMin.y;
                if (worldMax.y > maxY) maxY = worldMax.y;
              } catch {}
            }
            
            if (minY < Infinity && maxY > -Infinity) {
              const totalHeight = maxY - minY;
              if (totalHeight > 0.05) {
                modelVisualHeight = totalHeight * 0.85; // Eye level ~85% of total height
              }
            }
          }
          
          current.computedHeight = modelVisualHeight;
          if (data.transform?.cameraYOffset && data.transform.cameraYOffset > 0) {
            current.cameraYOffset = data.transform.cameraYOffset;
          }

          if (result.animationGroups.length > 0) {
            result.animationGroups.forEach((ag) => {
              if (ag.targetedAnimations) {
                for (let i = ag.targetedAnimations.length - 1; i >= 0; i--) {
                  const ta = ag.targetedAnimations[i];
                  if (ta.target === result.meshes[0] || ta.target?.name === '__root__') {
                    ag.targetedAnimations.splice(i, 1);
                  }
                }
              }
            });
            current.animationGroups = result.animationGroups.filter(
              (ag) => ag.targetedAnimations && ag.targetedAnimations.length > 0
            );
          } else {
            current.animationGroups = [];
          }

          if (data.animations && data.animations.mapped) {
            const mapped = data.animations.mapped;
            Object.entries(mapped).forEach(([slot, mapping]: [string, any]) => {
              if (mapping.sourceKind === 'embedded' && mapping.clip) {
                const embeddedAg = current.animationGroups?.find(ag => ag.name === mapping.clip);
                if (embeddedAg) {
                  embeddedAg.name = slot;
                  embeddedAg.loopAnimation = mapping.loop !== false;
                  if (mapping.speed) embeddedAg.speedRatio = mapping.speed;
                }
              } else if (mapping.sourcePath) {
                const isLocomotionSlot = slot === 'walk' || slot === 'walk_fwd' || slot === 'run' || slot === 'run_fwd' || slot.includes('walk') || slot.includes('run') || slot.includes('jog');
                loadAndRetargetAnimation(
                  mapping.sourcePath,
                  slot,
                  result.transformNodes,
                  this.scene!,
                  {
                    loop: mapping.loop !== false,
                    speed: mapping.speed,
                    lockRootHorizontalTranslation: mapping.lockRootHorizontalTranslation ?? isLocomotionSlot,
                  }
                ).then((ag) => {
                  if (!ag) return;
                  const latest = this.sprites.get(id);
                  if (!latest || latest.mesh !== mesh) {
                    ag.dispose();
                    return;
                  }
                  latest.animationGroups = latest.animationGroups || [];
                  latest.animationGroups = latest.animationGroups.filter(g => g.name !== slot);
                  latest.animationGroups.push(ag);

                  // Auto-start check: if active movement state matches this slot, or no clip is running
                  const isMoving = data.isMoving === true;
                  const isExplicitSlot = data.animationState === slot;
                  const selectedAnimation = selectAnimationGroup(
                    latest.animationGroups,
                    data.animationState,
                    isMoving,
                  );
                  const shouldPlay = isExplicitSlot || selectedAnimation === ag;

                  if (shouldPlay) {
                    latest.animationGroups.forEach(g => { if (g !== ag) g.stop(); });
                    ag.play(isExplicitSlot ? false : ag.loopAnimation);
                    latest.currentAnimationName = data.animationState || (isMoving ? "run_fwd" : "idle");

                    if (isExplicitSlot) {
                      ag.onAnimationEndObservable.addOnce(() => {
                        if (id === 'local_player') {
                          usePlayerStore.getState().hydratePlayer({ animationState: undefined });
                        }
                      });
                    }
                  }
                }).catch(e => console.error("[EntityRenderer] Failed to load external animation", mapping.sourcePath, e));
              }
            });
          }
          
          if (current.animationGroups && current.animationGroups.length > 0) {
            const targetAnimName = data.animationState || (data.isMoving ? "run_fwd" : "idle");
            const nextAnim = selectAnimationGroup(
              current.animationGroups,
              data.animationState,
              data.isMoving === true,
            );
            
            current.animationGroups.forEach(a => a.stop());
            if (nextAnim) {
              nextAnim.play(nextAnim.loopAnimation ?? true);
              console.warn(`[EntityRenderer] Playing animation: ${nextAnim.name}`);
            } else {
              console.warn(`[EntityRenderer] No initial animation found for state: ${data.isMoving ? "moving" : "idle"}`);
            }
            current.currentAnimationName = targetAnimName;
          }
          
          console.warn(`[EntityRenderer] Final Sprite Stats -> Scale: ${scale}, VisualHeight: ${modelVisualHeight}, AnimCount: ${current.animationGroups?.length}`);
        }).catch(async (err) => {
          let responseInfo: Record<string, unknown> = { url: data.modelUrl };
          try {
            const response = await fetch(data.modelUrl!, { cache: 'no-store' });
            responseInfo = {
              url: data.modelUrl,
              status: response.status,
              contentType: response.headers.get('content-type'),
              contentLength: response.headers.get('content-length'),
            };
            if (response.body) {
              const reader = response.body.getReader();
              const { value } = await reader.read();
              responseInfo.prefixBytes = value ? Array.from(value.slice(0, 16)) : [];
              await reader.cancel();
            }
          } catch (diagnosticError) {
            responseInfo.diagnosticFetchError = diagnosticError instanceof Error
              ? diagnosticError.message
              : String(diagnosticError);
          }
          console.error('[EntityRenderer] 3D model import failed; live asset response:', responseInfo, err);

          // Keep a visible in-world placeholder when an asset URL is broken;
          // an empty TransformNode makes the entity look as if it never spawned.
          const current = this.sprites.get(id);
          const loadedModelMeshes = mesh.getChildMeshes(false).filter((child) => !child.name.startsWith('label_'));
          if (current?.mesh === mesh && loadedModelMeshes.length === 0 && this.scene) {
            const fallback = BABYLON.MeshBuilder.CreatePlane(`model_error_${id}`, {
              width: PLAYER_WIDTH,
              height: PLAYER_HEIGHT,
            }, this.scene);
            fallback.parent = mesh;
            fallback.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
            const material = new BABYLON.StandardMaterial(`model_error_mat_${id}`, this.scene);
            material.diffuseColor = new BABYLON.Color3(0.8, 0.2, 0.2);
            material.emissiveColor = new BABYLON.Color3(0.25, 0.03, 0.03);
            material.backFaceCulling = false;
            fallback.material = material;
          }
        });

      } else if (data.presentationType === '2D_WRAPPED' && data.spriteUrl) {
        mesh = WrappedCharacterMesher.createCharacter(id, this.scene, data.spriteUrl);
        mesh.parent = this.entityRoot;
      } else {
        // Create billboard mesh
        const plane = BABYLON.MeshBuilder.CreatePlane(`sprite_${id}`, {
          width: spriteW,
          height: spriteH,
        }, this.scene);
        plane.isPickable = false;
        plane.parent = this.entityRoot;
        plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

        // Material
        const mat = new BABYLON.StandardMaterial(`mat_${id}`, this.scene);
        mat.emissiveColor = data.color.scale(0.3);
        mat.specularColor = new BABYLON.Color3(0, 0, 0);
        mat.backFaceCulling = false;

        // Try to load sprite texture
        if (data.spriteUrl) {
          const tex = this.getOrLoadTexture(data.spriteUrl);
          if (tex) {
            tex.hasAlpha = true;
            // Apply foundational 3x4 sprite formatting abstraction (Idle, Facing Down)
            // TODO: Read this dynamically from sprite definitions and action state
            tex.uScale = 1 / 3;
            tex.vScale = 1 / 4;
            tex.uOffset = 1 / 3; // Idle frame (col 1)
            tex.vOffset = 0;     // Facing down (row 0)
            
            mat.diffuseTexture = tex;
            mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHATEST;
            mat.alphaCutOff = 0.3;
          } else {
            mat.diffuseColor = data.color;
          }
        } else {
          mat.diffuseColor = data.color;
        }
        plane.material = mat;
        mesh = plane;
      }

      // Name label (floating GUI above head)
      let labelMesh: BABYLON.Mesh | undefined;
      let gui: AdvancedDynamicTexture | undefined;
      if (data.name && id !== 'local_player') {
        labelMesh = BABYLON.MeshBuilder.CreatePlane(`label_${id}`, { width: 2, height: 0.4 }, this.scene);
        labelMesh.isPickable = false;
        labelMesh.parent = mesh;
        labelMesh.position.y = spriteH / 2 + 0.3;
        labelMesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

        gui = AdvancedDynamicTexture.CreateForMesh(labelMesh, 256, 64);
        const rect = new Rectangle();
        rect.background = 'rgba(0, 0, 0, 0.6)';
        rect.cornerRadius = 8;
        rect.thickness = 0;
        gui.addControl(rect);

        const text = new TextBlock();
        text.text = data.name;
        text.color = '#ffffff';
        text.fontSize = 20;
        text.fontFamily = 'Inter, sans-serif';
        rect.addControl(text);
      }

      const activeMap = useWorldStore.getState().activeMapData;
      const mapType = String(activeMap?.mapType || 'TILE').toUpperCase();
      const is3D = mapType === 'VOXEL' || mapType === 'FRACTAL' || mapType === 'HYBRID';
      const is3DModel = Boolean(data.modelUrl || data.presentationType === '3D_MODEL');

      sprite = {
        mesh,
        label: labelMesh,
        gui,
        targetX: data.x,
        targetZ: is3D ? data.y : -data.y,
        targetY: is3DModel ? 0 : spriteH / 2,
        targetRotationY: data.rotationY ?? 0,
        lastRotationY: data.rotationY ?? 0,
        direction: data.direction,
        lastSeen: now,
        modelUrl: data.modelUrl,
        spriteUrl: data.spriteUrl,
        presentationSignature: data.presentationSignature,
        isGuarding: data.isGuarding,
      };
      mesh.rotationQuaternion = null;
      mesh.rotation = new BABYLON.Vector3(0, data.rotationY ?? 0, 0);
      this.sprites.set(id, sprite);
    }
    
    if (sprite.animationGroups && sprite.animationGroups.length > 0) {
      const targetAnimName = data.animationState || (data.isMoving ? "run_fwd" : "idle");
      const nextAnim = selectAnimationGroup(
        sprite.animationGroups,
        data.animationState,
        data.isMoving === true,
      );

      if (sprite.currentAnimationName !== targetAnimName || (nextAnim && !nextAnim.isPlaying)) {
        sprite.animationGroups.forEach(a => {
          if (a !== nextAnim) a.stop();
        });
        if (nextAnim && !nextAnim.isPlaying) {
          const isLocomotionState = /^((run|walk)_(fwd|bwd|left|right)|run|walk)$/.test(data.animationState || '');
          const shouldLoop = data.animationState && !isLocomotionState
            ? false
            : (nextAnim.loopAnimation ?? true);
          nextAnim.play(shouldLoop);

          if (data.animationState && !shouldLoop) {
            nextAnim.onAnimationEndObservable.addOnce(() => {
              if (id === 'local_player') {
                usePlayerStore.getState().hydratePlayer({ animationState: undefined });
              }
            });
          }
        }
        sprite.currentAnimationName = targetAnimName;
      }
    }

    // Update target position (interpolation happens in update loop)
    const activeMap = useWorldStore.getState().activeMapData;
    const mapType = String(activeMap?.mapType || 'TILE').toUpperCase();
    const is3D = mapType === 'VOXEL' || mapType === 'FRACTAL' || mapType === 'HYBRID';

    sprite.targetX = data.x;
    sprite.targetZ = is3D ? data.y : -data.y; // Babylon Z is inverted 2D Y only for 2D maps
    
    // Auto-resolve terrain height so sprites aren't trapped in the geometry floor
    // if a Z vertical position is provided by physics (e.g. jumping), use it instead
    let terrainY = 0;
    const world = mapMesher.getVoxelWorld();
    if (data.z !== undefined) {
      terrainY = data.z + (is3D ? (world?.originOffsetY ?? 0) : 0);
    } else if (world) {
      terrainY = world.getTopSolidVoxelY(data.x, sprite.targetZ) + 1 + world.originOffsetY;
    }
    // 3D models have origin at feet, so they rest directly on terrainY; 2D billboards center on origin
    const isModelEntity = Boolean(data.modelUrl || data.presentationType === '3D_MODEL');
    sprite.targetY = isModelEntity ? terrainY : terrainY + spriteH / 2;

    if (data.rotationY !== undefined) {
      sprite.targetRotationY = data.rotationY;
      sprite.lastRotationY = data.rotationY;
    }
    if (data.direction !== undefined) {
      sprite.direction = data.direction;
      if (sprite.spriteUrl && sprite.mesh instanceof BABYLON.Mesh) {
        const mat = sprite.mesh.material as BABYLON.StandardMaterial | null;
        const tex = mat?.diffuseTexture as BABYLON.Texture | null;
        if (tex) {
          switch (data.direction) {
            case 'down': tex.vOffset = 0; break;
            case 'left': tex.vOffset = 0.25; break;
            case 'right': tex.vOffset = 0.5; break;
            case 'up': tex.vOffset = 0.75; break;
          }
        }
      }
    }
    
    sprite.lastSeen = now;
    if (sprite.isGuarding !== data.isGuarding) {
      sprite.isGuarding = data.isGuarding;
      const label = sprite.label as BABYLON.Mesh & { __guardGui?: AdvancedDynamicTexture };
      let guardGui = label.__guardGui;
      if (data.isGuarding && !guardGui) {
        guardGui = AdvancedDynamicTexture.CreateForMesh(label, 256, 64);
        const text = new TextBlock('guard_indicator');
        text.text = 'DEFENDING';
        text.color = '#7dd3fc';
        text.fontSize = 14;
        text.fontWeight = 'bold';
        guardGui.addControl(text);
        label.__guardGui = guardGui;
      } else if (!data.isGuarding && guardGui) {
        guardGui.dispose();
        delete label.__guardGui;
      }
    }
  }

  // ── Texture Cache ──────────────────────────────────────────────────────────

  private getOrLoadTexture(url: string): BABYLON.Texture | null {
    if (!this.scene) return null;

    let tex = this.textureCache.get(url);
    if (tex) return tex;

    try {
      tex = new BABYLON.Texture(url, this.scene, true, false, BABYLON.Texture.NEAREST_SAMPLINGMODE);
      tex.hasAlpha = true;
      this.textureCache.set(url, tex);
      return tex;
    } catch {
      return null;
    }
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  public dispose() {
    if (this._diagnosticKeydown) {
      window.removeEventListener('keydown', this._diagnosticKeydown);
      this._diagnosticKeydown = undefined;
    }

    if (this.scene) {
      this.scene.onBeforeRenderObservable.removeCallback(this.update);
    }

    for (const [, sprite] of this.sprites) {
      sprite.attachmentAnimationGroups?.forEach((ag) => ag.dispose());
      sprite.attachmentSkeletons?.forEach((s) => s.dispose());
      sprite.mesh.dispose();
      sprite.label?.dispose();
      sprite.gui?.dispose();
    }
    this.sprites.clear();

    for (const [, tex] of this.textureCache) {
      tex.dispose();
    }
    this.textureCache.clear();

    this.entityRoot?.dispose();
    this.scene = null;
  }
}

export const entityRenderer = new EntityRenderer();
