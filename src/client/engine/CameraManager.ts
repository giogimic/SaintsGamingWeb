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

export type CameraStyle = 'isometric' | 'follow45' | 'topdown' | 'free' | 'firstperson' | 'dynamic';

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
  playerCameraStyle: 'isometric',
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

  // Smooth-follow target
  public targetX: number = 0;
  public targetY: number = 0;
  public targetZ: number = 0;
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
  }

  public dispose() {
    if (this.scene) {
      this.scene.onBeforeRenderObservable.removeCallback(this.update);
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
    const ortho = this.camera?.orthoTop || 10;

    let targetMode: 'firstperson' | 'follow45' | 'isometric' = 'isometric';
    if (ortho < 6.5) {
      targetMode = 'firstperson';
    } else if (ortho < 9.0) {
      targetMode = 'follow45';
    }

    this.applyInternalStyle(targetMode);
  }

  private applyInternalStyle(style: Exclude<CameraStyle, 'dynamic'>) {
    if (!this.camera) return;

    switch (style) {
      case 'topdown':
        this.camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
        this.profile.pitch = Math.PI / 2 - 0.01;
        this.profile.distance = 14;
        this.yaw = 0;
        this.updateOrthoSize();
        break;

      case 'follow45':
        this.camera.mode = BABYLON.Camera.PERSPECTIVE_CAMERA;
        this.camera.fov = this.settings.fov || 0.8;
        this.profile.pitch = Math.PI / 4;
        this.profile.distance = 16;
        this.yaw = 0;
        break;

      case 'firstperson':
        this.camera.mode = BABYLON.Camera.PERSPECTIVE_CAMERA;
        this.camera.fov = this.settings.fov || 1.0;
        this.profile.pitch = 0;
        this.profile.distance = 0;
        break;

      case 'free':
        this.camera.mode = BABYLON.Camera.PERSPECTIVE_CAMERA;
        this.camera.fov = this.settings.fov || 0.8;
        this.profile.pitch = this.pitch || Math.PI / 4;
        this.profile.distance = this.distance || 18;
        break;

      case 'isometric':
      default:
        this.camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
        this.profile.pitch = this.settings.isometricPitch || Math.PI / 4;
        this.profile.distance = this.settings.isometricDistance || 14;
        this.yaw = 0;
        this.updateOrthoSize();
        break;
    }

    this.snapCameraTo(this.targetX, this.targetZ, this.targetY);
  }

  // ── Ortho Sizing ──────────────────────────────────────────────────────────

  private updateOrthoSize(orthoSize: number = 10) {
    if (!this.camera || !this.scene) return;

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

  // ── Snap / Follow ──────────────────────────────────────────────────────────

  public snapCameraTo(x: number, z: number, y: number = 0) {
    if (!this.camera) return;

    this.targetX = x;
    this.targetY = y;
    this.targetZ = z;

    const currentPitch = this.profile.pitch ?? Math.PI / 4;
    const dist = this.profile.distance ?? 14;
    const currentYaw = this.yaw || 0;
    const camY = Math.max(1.5, dist * Math.sin(currentPitch));
    const horizDist = dist * Math.cos(currentPitch);
    const offsetX = -horizDist * Math.sin(currentYaw);
    const offsetZ = -horizDist * Math.cos(currentYaw);

    const isFirstPerson = this.settings.playerCameraStyle === 'firstperson';
    const targetYWithOffset = isFirstPerson ? y + 1.2 : y;

    this.camera.position = new BABYLON.Vector3(x + offsetX, y + camY, z + offsetZ);
    this.camera.setTarget(
      isFirstPerson
        ? new BABYLON.Vector3(x + Math.sin(currentYaw) * 10, targetYWithOffset, z + Math.cos(currentYaw) * 10)
        : new BABYLON.Vector3(x, y, z)
    );
    this.snapped = true;
  }

  // ── Per-Frame Update ───────────────────────────────────────────────────────

  private update = () => {
    if (!this.camera || !this.scene) return;

    // Follow local player position from store
    const player = usePlayerStore.getState().player;
    if (player && player.position) {
      const px = player.position.x;
      const pz = -player.position.y; // Babylon Z is inverted 2D Y

      if (!this.snapped) {
        this.snapCameraTo(px, pz);
        return;
      }

      // Smooth camera follow (spring-damper)
      const engine = this.scene.getEngine();
      const dt = engine.getDeltaTime() / 1000.0;
      const factor = this.settings.playerFollowSmoothing ?? this.profile.lerpFactor ?? 0.35;
      const smoothFactor = 1.0 - Math.exp(-factor * 60 * dt);

      this.targetX = px;
      this.targetZ = pz;

      const currentPitch = this.profile.pitch ?? Math.PI / 4;
      const dist = this.profile.distance ?? 14;
      const currentYaw = this.yaw || 0;
      const camY = Math.max(1.5, dist * Math.sin(currentPitch));
      const horizDist = dist * Math.cos(currentPitch);
      const offsetX = -horizDist * Math.sin(currentYaw);
      const offsetZ = -horizDist * Math.cos(currentYaw);

      const targetCamPos = new BABYLON.Vector3(px + offsetX, this.targetY + camY, pz + offsetZ);
      const isFirstPerson = this.settings.playerCameraStyle === 'firstperson';
      const targetYWithOffset = isFirstPerson ? this.targetY + 1.2 : this.targetY;

      this.camera.position = BABYLON.Vector3.Lerp(this.camera.position, targetCamPos, smoothFactor);
      this.camera.setTarget(BABYLON.Vector3.Lerp(
        this.camera.getTarget(),
        isFirstPerson
          ? new BABYLON.Vector3(px + Math.sin(currentYaw) * 10, targetYWithOffset, pz + Math.cos(currentYaw) * 10)
          : new BABYLON.Vector3(px, this.targetY, pz),
        smoothFactor
      ));
    }

    // Keep ortho aspect in sync on every frame (resize-safe)
    if (this.camera.mode === BABYLON.Camera.ORTHOGRAPHIC_CAMERA) {
      this.updateOrthoSize(this.camera.orthoTop || 10);
    }
  };
}

export const cameraManager = new CameraManager();
