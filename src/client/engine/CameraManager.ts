/**
 * Camera Manager — Multi-mode camera system for the ClientApp engine.
 *
 * Ported from the monolith's Renderer.ts camera logic. Supports:
 * - Isometric (orthographic, angled down)
 * - Top-down (orthographic, straight down)
 * - Follow45 (perspective, 45-degree chase)
 * - First-person (perspective, eye-level)
 * - Free (perspective, user-controlled orbit)
 * - Dynamic (auto-switches based on zoom level)
 *
 * Reads initial settings from localStorage key `saints_camera_settings`.
 * Subscribes to usePlayerStore for follow-target position.
 */
import * as BABYLON from '@babylonjs/core';
import { usePlayerStore } from '../state/usePlayerStore';
import { useWorldStore } from '../state/useWorldStore';
import { mapMesher } from './MapMesher';
import { inputManager } from '../input/InputManager';
import { KEYBINDS } from '../input/InputConstants';
import { entityRenderer } from './EntityRenderer';

export type CameraStyle = 'follow45' | 'firstperson';

export interface CameraSettings {
  fov: number;
  orbitSensitivity: number;
  panSensitivity: number;
  damping: number;
  invertOrbitX: boolean;
  invertOrbitY: boolean;
  cursorAnchoredZoom: boolean;
  isometricPitch: number;
  isometricDistance: number;
  playerFollowSmoothing: number;
  playerCameraStyle: CameraStyle;
  borderClamping: boolean;
  vignetteEnabled: boolean;
  vignetteWeight: number;
  mouseLookEnabled?: boolean;
}

const DEFAULT_CAMERA_SETTINGS: CameraSettings = {
  fov: 0.8,
  orbitSensitivity: 1.0,
  panSensitivity: 1.0,
  damping: 0.90,
  invertOrbitX: false,
  invertOrbitY: false,
  cursorAnchoredZoom: true,
  isometricPitch: Math.PI / 4,
  isometricDistance: 14,
  playerFollowSmoothing: 0.35,
  playerCameraStyle: 'follow45',
  borderClamping: true,
  vignetteEnabled: true,
  vignetteWeight: 1.5,
  mouseLookEnabled: true,
};

const LS_KEY = 'saints_camera_settings';

export class CameraManager {
  public camera: BABYLON.FreeCamera | null = null;
  private scene: BABYLON.Scene | null = null;
  private canvas: HTMLCanvasElement | null = null;

  // Camera orbit state
  public yaw: number = 0;
  public pitch: number = Math.PI / 4;
  public distance: number = 14;
  public currentZoom: number = 10;
  public currentFov: number = 0.8;

  // Smooth-follow target
  public targetX: number = 0;
  public targetY: number = 0;
  public targetZ: number = 0;
  private focusPoint: BABYLON.Vector3 = new BABYLON.Vector3(0, 0, 0);
  private snapped: boolean = false;

  // Active profile (computed from style)
  private profile = { pitch: Math.PI / 4, distance: 14, lerpFactor: 0.15 };
  
  // Smoothly interpolated actual values
  private currentActualPitch: number = Math.PI / 4;
  private currentActualDistance: number = 14;

  // Settings
  public settings: CameraSettings = { ...DEFAULT_CAMERA_SETTINGS };

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  public initialize(scene: BABYLON.Scene, canvas: HTMLCanvasElement) {
    this.scene = scene;
    this.canvas = canvas;

    // Load persisted camera settings from localStorage
    this.loadSettingsFromStorage();

    // Create camera at default position
    this.camera = new BABYLON.FreeCamera('mainCamera', new BABYLON.Vector3(0, 50, -20), scene);
    this.camera.setTarget(new BABYLON.Vector3(0, 0, 0));
    this.camera.minZ = 0.1;
    this.camera.maxZ = 500;

    // Apply the initial style
    this.applyStyle(this.settings.playerCameraStyle);

    // Register before-render to follow player
    scene.onBeforeRenderObservable.add(this.update);

    // Register scroll event
    if (this.canvas) {
      this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    }
    // Listen for unified client settings updates
    if (typeof window !== 'undefined') {
      window.addEventListener('client_settings_updated', this.onUnifiedSettingsUpdated);
    }
  }

  private onUnifiedSettingsUpdated = (e: Event) => {
    const customEvent = e as CustomEvent;
    const settings = customEvent.detail;
    if (settings && settings.camera) {
       this.setCameraSettings({
         fov: settings.camera.fov !== undefined ? settings.camera.fov * (Math.PI / 180) : this.settings.fov,
         playerCameraStyle: settings.camera.profile === 'firstperson' ? 'firstperson' : 'follow45',
         playerFollowSmoothing: settings.camera.smoothing ?? this.settings.playerFollowSmoothing,
         borderClamping: settings.camera.borderClamping ?? this.settings.borderClamping,
         vignetteEnabled: settings.camera.vignetteEnabled ?? this.settings.vignetteEnabled
       });
       if (typeof settings.controls?.mouseLookEnabled === 'boolean') {
         this.settings.mouseLookEnabled = settings.controls.mouseLookEnabled;
       }
       if (settings.camera.thirdPersonDistance && this.settings.playerCameraStyle === 'follow45') {
          this.profile.distance = settings.camera.thirdPersonDistance;
       }
    }
  };

  public dispose() {
    if (this.scene) {
      this.scene.onBeforeRenderObservable.removeCallback(this.update);
    }
    if (this.canvas) {
      this.canvas.removeEventListener('wheel', this.onWheel);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('client_settings_updated', this.onUnifiedSettingsUpdated);
    }
    this.camera?.dispose();
    this.camera = null;
    this.scene = null;
    this.canvas = null;
  }

  // ── Settings Persistence ───────────────────────────────────────────────────

  private loadSettingsFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.settings = {
          ...DEFAULT_CAMERA_SETTINGS,
          ...parsed,
          playerCameraStyle: parsed.playerCameraStyle === 'firstperson' ? 'firstperson' : 'follow45',
        };
      }
    } catch {
      // Ignore corrupt localStorage
    }
  }

  public saveSettingsToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(this.settings));
    } catch {
      // Quota exceeded or private mode
    }
  }

  public setCameraSettings(partial: Partial<CameraSettings>) {
    this.settings = { ...this.settings, ...partial };

    if (partial.fov !== undefined && this.camera) {
      this.camera.fov = partial.fov;
    }
    if (partial.playerFollowSmoothing !== undefined) {
      this.profile.lerpFactor = partial.playerFollowSmoothing;
    }
    if (partial.playerCameraStyle !== undefined) {
      this.applyStyle(partial.playerCameraStyle);
    }
    if (partial.isometricPitch !== undefined && this.settings.playerCameraStyle !== 'firstperson') {
      this.profile.pitch = partial.isometricPitch;
      this.snapCameraTo(this.targetX, this.targetZ, this.targetY);
    }

    this.saveSettingsToStorage();
  }

  // ── Camera Style Application ───────────────────────────────────────────────

  public applyStyle(style: CameraStyle) {
    this.settings.playerCameraStyle = style === 'firstperson' ? 'firstperson' : 'follow45';
    this.applyInternalStyle(this.settings.playerCameraStyle, true);
  }

  private applyInternalStyle(style: CameraStyle, snap: boolean = true) {
    if (!this.camera) return;

    if (style === 'firstperson') {
      this.camera.mode = BABYLON.Camera.PERSPECTIVE_CAMERA;
      this.camera.fov = this.currentFov;
      this.profile.pitch = 0;
      this.profile.distance = 0;
    } else {
      this.camera.mode = BABYLON.Camera.PERSPECTIVE_CAMERA;
      this.camera.fov = this.currentFov;
      this.profile.distance = 16;
      this.profile.pitch = Math.PI / 6;
    }

    if (snap) {
      this.snapCameraTo(this.targetX, this.targetZ, this.targetY);
    }
  }

  // ── Ortho Sizing ──────────────────────────────────────────────────────────

  private updateOrthoSize(orthoSize: number = 10) {
    if (!this.camera || !this.scene) return;

    this.currentZoom = orthoSize;

    const engine = this.scene.getEngine();
    const width = engine.getRenderWidth();
    const height = engine.getRenderHeight();

    if (width === 0 || height === 0) return;

    const aspect = width / height;
    this.camera.orthoLeft = -orthoSize * aspect;
    this.camera.orthoRight = orthoSize * aspect;
    this.camera.orthoTop = orthoSize;
    this.camera.orthoBottom = -orthoSize;
  }

  // ── Wheel Input ────────────────────────────────────────────────────────────

  private onWheel = (e: WheelEvent) => {
    // Only intercept if we're focused on game canvas or body
    const target = e.target as HTMLElement;
    if (target.tagName !== 'CANVAS' && target !== document.body && target.tagName !== 'DIV') {
      return; 
    }
    
    e.preventDefault();

    if (this.settings.playerCameraStyle === 'follow45') {
      const distFactor = e.deltaY > 0 ? 1.1 : 0.9;
      this.profile.distance = Math.max(2, Math.min(50, this.profile.distance * distFactor));
      this.saveSettingsToStorage();
    }
  };

  // ── Snap / Follow ──────────────────────────────────────────────────────────

  public snapCameraTo(x: number, z: number, y?: number) {
    if (!this.camera) return;

    let terrainY = y ?? 0;
    if (y === undefined) {
      const world = mapMesher.getVoxelWorld();
      if (world) {
        terrainY = world.getTopSolidVoxelY(x, z) + 1 + world.originOffsetY;
      }
    }
    
    this.targetX = x;
    this.targetY = terrainY;
    this.targetZ = z;
    this.focusPoint.copyFromFloats(x, terrainY, z);

    this.currentActualPitch = this.profile.pitch ?? Math.PI / 4;
    this.currentActualDistance = this.profile.distance ?? 14;

    const currentPitch = this.currentActualPitch;
    const dist = this.currentActualDistance;
    const currentYaw = this.yaw || 0;
    
    const firstPersonWeight = Math.max(0, Math.min(1.0, 1.0 - (dist / 2.0)));
    
    const sprite = entityRenderer.getSprite('local_player');
    const playerHeight = sprite?.computedHeight ?? 1.6;
    const playerEyeHeight = sprite?.cameraYOffset ? sprite.cameraYOffset : (playerHeight * 0.88);
    const playerChestHeight = sprite?.cameraYOffset ? sprite.cameraYOffset * 0.75 : (playerHeight * 0.65);

    const targetHeight = BABYLON.Scalar.Lerp(playerChestHeight, playerEyeHeight, firstPersonWeight);
    const pivotY = terrainY + targetHeight;

    const camY = pivotY + dist * Math.sin(currentPitch) * (1.0 - firstPersonWeight);
    const horizDist = BABYLON.Scalar.Lerp(dist * Math.cos(currentPitch), 0, firstPersonWeight);
    const offsetX = -horizDist * Math.sin(currentYaw);
    const offsetZ = -horizDist * Math.cos(currentYaw);

    this.camera.position = new BABYLON.Vector3(x + offsetX, camY, z + offsetZ);
    
    const firstPersonTarget = new BABYLON.Vector3(
      x + Math.sin(currentYaw) * Math.cos(currentPitch) * 10,
      terrainY + playerEyeHeight + Math.sin(currentPitch) * 10,
      z + Math.cos(currentYaw) * Math.cos(currentPitch) * 10
    );
    const thirdPersonTarget = new BABYLON.Vector3(x, terrainY + playerChestHeight, z);

    const targetLookAt = BABYLON.Vector3.Lerp(thirdPersonTarget, firstPersonTarget, firstPersonWeight);
    this.camera.setTarget(targetLookAt);
    this.snapped = true;
  }

  // ── Per-Frame Update ───────────────────────────────────────────────────────

  private update = () => {
    if (!this.camera || !this.scene) return;

    // Handle Mouse Look
    if (this.settings.mouseLookEnabled && this.canvas && document.pointerLockElement === this.canvas) {
      const delta = inputManager.consumeMouseDelta();
      if (delta.x !== 0 || delta.y !== 0) {
        const sens = (this.settings.orbitSensitivity || 1.0) * 0.002;
        this.yaw += delta.x * sens * (this.settings.invertOrbitX ? -1 : 1);
        
        this.pitch += delta.y * sens * (this.settings.invertOrbitY ? 1 : -1);
        this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.pitch));
        this.profile.pitch = this.pitch;
      }
    } else {
      inputManager.consumeMouseDelta(); // discard delta when not locked
    }

    // Handle Keyboard Look
    const engine = this.scene.getEngine();
    const dt = engine.getDeltaTime() / 1000.0;
    
    let kbDeltaX = 0;
    let kbDeltaY = 0;
    const kbSens = 120.0; // Px per second equivalent
    
    if (inputManager.isAnyKeyPressed(KEYBINDS.CAMERA_LEFT)) kbDeltaX -= kbSens;
    if (inputManager.isAnyKeyPressed(KEYBINDS.CAMERA_RIGHT)) kbDeltaX += kbSens;
    if (inputManager.isAnyKeyPressed(KEYBINDS.CAMERA_UP)) kbDeltaY -= kbSens;
    if (inputManager.isAnyKeyPressed(KEYBINDS.CAMERA_DOWN)) kbDeltaY += kbSens;

    if (kbDeltaX !== 0 || kbDeltaY !== 0) {
      const sens = (this.settings.orbitSensitivity || 1.0) * 0.002 * dt * 60.0;
      this.yaw += kbDeltaX * sens * (this.settings.invertOrbitX ? -1 : 1);
      
      this.pitch += kbDeltaY * sens * (this.settings.invertOrbitY ? 1 : -1);
      this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.pitch));
      this.profile.pitch = this.pitch;
    }

    // Follow local player position from store
    const player = usePlayerStore.getState().player;
    if (player && player.position) {
      const activeMap = useWorldStore.getState().activeMapData;
      const mapType = String(activeMap?.mapType || 'TILE').toUpperCase();
      const is3D = mapType === 'VOXEL' || mapType === 'FRACTAL' || mapType === 'HYBRID';
      
      const px = player.position.x;
      const pz = is3D ? (player.position.z !== undefined ? player.position.z : player.position.y) : -player.position.y;
      const py = is3D ? (player.position.z !== undefined ? player.position.y : undefined) : undefined;

      if (!this.snapped) {
        const world = mapMesher.getVoxelWorld();
        this.snapCameraTo(px, pz, py !== undefined && world ? py + world.originOffsetY : py);
        return;
      }

      // Smooth camera follow (spring-damper)
      const engine = this.scene.getEngine();
      const dt = engine.getDeltaTime() / 1000.0;
      const factor = this.settings.playerFollowSmoothing ?? this.profile.lerpFactor ?? 0.35;
      const smoothFactor = 1.0 - Math.exp(-factor * 60 * dt);

      let terrainY = this.targetY;
      if (py !== undefined) {
        const world = mapMesher.getVoxelWorld();
        terrainY = py + (world?.originOffsetY ?? 0);
      } else {
        const world = mapMesher.getVoxelWorld();
        if (world) {
          terrainY = world.getTopSolidVoxelY(px, pz) + 1 + world.originOffsetY;
        }
      }
      
      this.targetX = px;
      this.targetY = terrainY;
      this.targetZ = pz;

      const idealFocus = new BABYLON.Vector3(px, terrainY, pz);
      this.focusPoint = BABYLON.Vector3.Lerp(this.focusPoint, idealFocus, smoothFactor);

      // Smoothly interpolate pitch and distance
      const pitchLerpFactor = Math.min(1.0, smoothFactor * 2.0); // Make camera distance/pitch respond a bit faster than follow
      this.currentActualPitch = BABYLON.Scalar.Lerp(this.currentActualPitch, this.profile.pitch ?? Math.PI / 4, pitchLerpFactor);
      this.currentActualDistance = BABYLON.Scalar.Lerp(this.currentActualDistance, this.profile.distance ?? 14, pitchLerpFactor);

      const currentPitch = this.currentActualPitch;
      const dist = this.currentActualDistance;
      const currentYaw = this.yaw || 0;
      
      // Smoothly blend to first-person when distance is small (< 2.0)
      const firstPersonWeight = Math.max(0, Math.min(1.0, 1.0 - (dist / 2.0)));
      
      const sprite = entityRenderer.getSprite('local_player');
      const playerHeight = sprite?.computedHeight ?? 1.6;
      const playerEyeHeight = sprite?.cameraYOffset ? sprite.cameraYOffset : (playerHeight * 0.88);
      const playerChestHeight = sprite?.cameraYOffset ? sprite.cameraYOffset * 0.75 : (playerHeight * 0.65);

      const targetHeight = BABYLON.Scalar.Lerp(playerChestHeight, playerEyeHeight, firstPersonWeight);
      const pivotY = this.focusPoint.y + targetHeight;

      const camY = pivotY + dist * Math.sin(currentPitch) * (1.0 - firstPersonWeight);
      const horizDist = BABYLON.Scalar.Lerp(dist * Math.cos(currentPitch), 0, firstPersonWeight);
      const offsetX = -horizDist * Math.sin(currentYaw);
      const offsetZ = -horizDist * Math.cos(currentYaw);

      let targetCamPos = new BABYLON.Vector3(this.focusPoint.x + offsetX, camY, this.focusPoint.z + offsetZ);
      
      // Raycast from player focus to ideal camera position to prevent clipping
      if (firstPersonWeight < 0.99 && this.camera.mode === BABYLON.Camera.PERSPECTIVE_CAMERA) {
        // Offset the origin to chest height (pivot point) to avoid hitting the ground immediately
        const origin = new BABYLON.Vector3(this.focusPoint.x, pivotY, this.focusPoint.z);
        const direction = targetCamPos.subtract(origin);
        const maxDist = direction.length();
        if (maxDist > 0.1) {
          direction.normalize();
          
          // Use a raycast to detect terrain or walls (ignoring player and entity meshes)
          const ray = new BABYLON.Ray(origin, direction, maxDist);
          const hit = this.scene.pickWithRay(ray, (mesh) => {
            if (!mesh.isPickable || !mesh.isVisible || mesh.name === 'skyBox') return false;
            // Ignore player and entity meshes so camera collision only tests terrain and obstacles
            if (
              mesh.name.startsWith('sprite_') ||
              mesh.name.startsWith('modelWrapper_') ||
              mesh.name.startsWith('entity_') ||
              mesh.name.startsWith('label_') ||
              mesh.name.startsWith('entity-') ||
              mesh.name.startsWith('model_error_mat_') ||
              (mesh.parent && (mesh.parent.name?.startsWith('modelWrapper_') || mesh.parent.name?.startsWith('sprite_') || mesh.parent.name?.startsWith('entity_')))
            ) {
              return false;
            }
            return true;
          });
          
          if (hit && hit.hit && hit.pickedPoint) {
            // Back up slightly from the hit point to prevent clipping into the wall
            const hitDist = hit.distance;
            const safeDist = Math.max(0.5, hitDist - 0.5);
            targetCamPos = origin.add(direction.scale(safeDist));
          }
        }
      }

      this.camera.position = targetCamPos;
      
      const firstPersonTarget = new BABYLON.Vector3(
        this.focusPoint.x + Math.sin(currentYaw) * Math.cos(currentPitch) * 10,
        this.focusPoint.y + playerEyeHeight + Math.sin(currentPitch) * 10,
        this.focusPoint.z + Math.cos(currentYaw) * Math.cos(currentPitch) * 10
      );
      const thirdPersonTarget = new BABYLON.Vector3(this.focusPoint.x, this.focusPoint.y + playerChestHeight, this.focusPoint.z);

      const targetLookAt = BABYLON.Vector3.Lerp(thirdPersonTarget, firstPersonTarget, firstPersonWeight);

      this.camera.setTarget(targetLookAt);
    }

    // Keep ortho aspect in sync on every frame (resize-safe)
    if (this.camera.mode === BABYLON.Camera.ORTHOGRAPHIC_CAMERA) {
      this.updateOrthoSize(this.camera.orthoTop || 10);
    }
  };

  public isFirstPerson(): boolean {
    return this.profile.distance <= 0.1 || this.settings.playerCameraStyle === 'firstperson';
  }
}

export const cameraManager = new CameraManager();
