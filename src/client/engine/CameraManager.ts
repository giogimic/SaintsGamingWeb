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

export type CameraStyle = 'isometric' | 'follow45' | 'topdown' | 'free' | 'firstperson' | 'dynamic';

/** Eye level for a 2-block-tall player character (~81% of height) */
const PLAYER_EYE_HEIGHT = 1.62;
/** Chest height for third-person orbit target */
const PLAYER_CHEST_HEIGHT = 1.0;

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
  playerCameraStyle: 'dynamic',
  borderClamping: true,
  vignetteEnabled: true,
  vignetteWeight: 1.5,
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
         playerCameraStyle: settings.camera.profile || this.settings.playerCameraStyle,
         playerFollowSmoothing: settings.camera.smoothing ?? this.settings.playerFollowSmoothing,
         borderClamping: settings.camera.borderClamping ?? this.settings.borderClamping,
         vignetteEnabled: settings.camera.vignetteEnabled ?? this.settings.vignetteEnabled
       });
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
        this.settings = { ...DEFAULT_CAMERA_SETTINGS, ...parsed };
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
    this.settings.playerCameraStyle = style;
    if (style === 'dynamic') {
      this.updateDynamicCamera();
    } else {
      this.applyInternalStyle(style);
    }
  }

  public updateDynamicCamera() {
    if (this.settings.playerCameraStyle !== 'dynamic') return;
    const zoom = this.currentZoom || 10;

    let targetMode: Exclude<CameraStyle, 'dynamic'> = 'isometric';
    if (zoom < 6.5) {
      targetMode = 'firstperson';
    } else if (zoom < 12.0) {
      targetMode = 'follow45';
    }

    this.applyInternalStyle(targetMode);

    if (targetMode === 'follow45') {
      // Scale distance dynamically based on zoom (e.g. from 2 to 10)
      this.profile.distance = (zoom - 6.5) * 1.5 + 2.0;
      this.profile.pitch = Math.PI / 6; // Standard 3rd person pitch
    }
  }

  private applyInternalStyle(style: Exclude<CameraStyle, 'dynamic'>) {
    if (!this.camera) return;

    switch (style) {
      case 'topdown':
        this.camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
        this.profile.pitch = Math.PI / 2 - 0.01;
        this.profile.distance = 14;
        this.yaw = 0;
        this.updateOrthoSize(this.currentZoom);
        break;

      case 'follow45':
        this.camera.mode = BABYLON.Camera.PERSPECTIVE_CAMERA;
        this.camera.fov = this.currentFov;
        this.profile.distance = 16;
        // Don't reset yaw or pitch
        break;

      case 'firstperson':
        this.camera.mode = BABYLON.Camera.PERSPECTIVE_CAMERA;
        this.camera.fov = this.currentFov;
        this.profile.pitch = 0;
        this.profile.distance = 0;
        break;

      case 'free':
        this.camera.mode = BABYLON.Camera.PERSPECTIVE_CAMERA;
        this.camera.fov = this.currentFov;
        this.profile.pitch = this.pitch || Math.PI / 4;
        this.profile.distance = this.distance || 18;
        break;

      case 'isometric':
      default:
        this.camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
        this.profile.pitch = this.settings.isometricPitch || Math.PI / 4;
        this.profile.distance = this.settings.isometricDistance || 14;
        this.yaw = 0;
        this.updateOrthoSize(this.currentZoom);
        break;
    }

    this.snapCameraTo(this.targetX, this.targetZ, this.targetY);
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

    if (this.settings.playerCameraStyle === 'dynamic') {
      // Dynamic mode transitions between first-person, third-person, and isometric based on zoom level
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      const newZoom = Math.max(3, Math.min(15, this.currentZoom * zoomFactor));
      this.updateOrthoSize(newZoom);
      this.updateDynamicCamera();
    } else if (this.camera?.mode === BABYLON.Camera.ORTHOGRAPHIC_CAMERA) {
      // Zoom ortho for fixed 2.5d modes
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      const newZoom = Math.max(3, Math.min(15, this.currentZoom * zoomFactor));
      this.updateOrthoSize(newZoom);
    } else {
      // Zoom distance for fixed 3D modes (third-person/free)
      if (this.settings.playerCameraStyle === 'follow45' || this.settings.playerCameraStyle === 'free') {
        const distFactor = e.deltaY > 0 ? 1.1 : 0.9;
        this.profile.distance = Math.max(2, Math.min(50, this.profile.distance * distFactor));
        this.saveSettingsToStorage();
      }
    }
  };

  // ── Snap / Follow ──────────────────────────────────────────────────────────

  public snapCameraTo(x: number, z: number, y: number = 0, is3D: boolean = false) {
    if (!this.camera) return;

    let terrainY = y;
    if (!is3D) {
      const world = mapMesher.getVoxelWorld();
      if (world) {
        terrainY = world.getTopSolidVoxelY(x, z) + world.originOffsetY;
      }
    }
    
    this.targetX = x;
    this.targetY = terrainY;
    this.targetZ = z;
    this.focusPoint.copyFromFloats(x, terrainY, z);

    const currentPitch = this.profile.pitch ?? Math.PI / 4;
    const dist = this.profile.distance ?? 14;
    const currentYaw = this.yaw || 0;
    const isFirstPerson = this.profile.distance === 0;
    
    const camY = isFirstPerson ? PLAYER_EYE_HEIGHT : Math.max(1.0, dist * Math.sin(currentPitch));
    const horizDist = isFirstPerson ? 0 : dist * Math.cos(currentPitch);
    const offsetX = -horizDist * Math.sin(currentYaw);
    const offsetZ = -horizDist * Math.cos(currentYaw);

    this.camera.position = new BABYLON.Vector3(x + offsetX, y + camY, z + offsetZ);
    this.camera.setTarget(
      isFirstPerson
        ? new BABYLON.Vector3(
            x + Math.sin(currentYaw) * Math.cos(currentPitch) * 10,
            y + PLAYER_EYE_HEIGHT + Math.sin(currentPitch) * 10,
            z + Math.cos(currentYaw) * Math.cos(currentPitch) * 10
          )
        : new BABYLON.Vector3(x, y + PLAYER_CHEST_HEIGHT, z)
    );
    this.snapped = true;
  }

  // ── Per-Frame Update ───────────────────────────────────────────────────────

  private update = () => {
    if (!this.camera || !this.scene) return;

    // Handle Mouse Look
    if (this.canvas && document.pointerLockElement === this.canvas) {
      const delta = inputManager.consumeMouseDelta();
      if (delta.x !== 0 || delta.y !== 0) {
        const sens = (this.settings.orbitSensitivity || 1.0) * 0.002;
        this.yaw += delta.x * sens * (this.settings.invertOrbitX ? -1 : 1);
        
        // Only allow pitch to change when not in isometric mode
        const style = this.settings.playerCameraStyle;
        const isIsometric = (style === 'dynamic' && this.currentZoom >= 12.0) || style === 'topdown' || style === 'isometric';
        if (!isIsometric) {
          this.pitch += delta.y * sens * (this.settings.invertOrbitY ? 1 : -1);
          this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.pitch));
          this.profile.pitch = this.pitch;
        }
      }
    } else {
      inputManager.consumeMouseDelta(); // discard delta when not locked
    }

    // Follow local player position from store
    const player = usePlayerStore.getState().player;
    if (player && player.position) {
      const activeMap = useWorldStore.getState().activeMapData;
      const is3D = activeMap && (activeMap.mapType === 'VOXEL' || activeMap.mapType === 'FRACTAL' || activeMap.mapType === 'HYBRID');
      
      const px = player.position.x;
      // If the map is 3D but the player position doesn't have a Z coordinate (e.g. legacy 2D protocol),
      // we must map the 2D Y coordinate to Z in the exact same way EntityRenderer does.
      // EntityRenderer: is3D ? data.y : -data.y. Since data.y gets player.position.y, targetZ = player.position.y.
      const pz = is3D ? (player.position.z !== undefined ? player.position.z : player.position.y) : -player.position.y;
      const py = is3D ? (player.position.z !== undefined ? player.position.y : 0) : 0;

      if (!this.snapped) {
        this.snapCameraTo(px, pz, py, is3D);
        return;
      }

      // Smooth camera follow (spring-damper)
      const engine = this.scene.getEngine();
      const dt = engine.getDeltaTime() / 1000.0;
      const factor = this.settings.playerFollowSmoothing ?? this.profile.lerpFactor ?? 0.35;
      const smoothFactor = 1.0 - Math.exp(-factor * 60 * dt);

      let terrainY = this.targetY;
      if (is3D) {
        terrainY = py;
      } else {
        const world = mapMesher.getVoxelWorld();
        if (world) {
          terrainY = world.getTopSolidVoxelY(px, pz) + world.originOffsetY;
        }
      }
      
      this.targetX = px;
      this.targetY = terrainY;
      this.targetZ = pz;

      const idealFocus = new BABYLON.Vector3(px, terrainY, pz);
      this.focusPoint = BABYLON.Vector3.Lerp(this.focusPoint, idealFocus, smoothFactor);

      const currentPitch = this.profile.pitch ?? Math.PI / 4;
      const dist = this.profile.distance ?? 14;
      const currentYaw = this.yaw || 0;
      const isFirstPerson = this.settings.playerCameraStyle === 'firstperson';
      
      const camY = isFirstPerson ? PLAYER_EYE_HEIGHT : Math.max(1.0, dist * Math.sin(currentPitch));
      const horizDist = isFirstPerson ? 0 : dist * Math.cos(currentPitch);
      const offsetX = -horizDist * Math.sin(currentYaw);
      const offsetZ = -horizDist * Math.cos(currentYaw);

      const targetCamPos = new BABYLON.Vector3(this.focusPoint.x + offsetX, this.focusPoint.y + camY, this.focusPoint.z + offsetZ);
      this.camera.position = targetCamPos;
      
      const targetLookAt = isFirstPerson
        ? new BABYLON.Vector3(
            this.focusPoint.x + Math.sin(currentYaw) * Math.cos(currentPitch) * 10,
            this.focusPoint.y + PLAYER_EYE_HEIGHT + Math.sin(currentPitch) * 10,
            this.focusPoint.z + Math.cos(currentYaw) * Math.cos(currentPitch) * 10
          )
        : new BABYLON.Vector3(this.focusPoint.x, this.focusPoint.y + PLAYER_CHEST_HEIGHT, this.focusPoint.z);

      this.camera.setTarget(targetLookAt);
    }

    // Keep ortho aspect in sync on every frame (resize-safe)
    if (this.camera.mode === BABYLON.Camera.ORTHOGRAPHIC_CAMERA) {
      this.updateOrthoSize(this.camera.orthoTop || 10);
    }
  };
}

export const cameraManager = new CameraManager();
