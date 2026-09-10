/**
 * Engine Core — Babylon.js Initialization & Subsystem Orchestrator.
 *
 * Sets up the Engine, Scene, lighting, and initializes all subsystems:
 * - CameraManager (multi-mode camera)
 * - MapMesher (tile/voxel rendering)
 * - EntityRenderer (player/NPC sprite billboards)
 * - InputManager (DOM event listeners)
 */
import * as BABYLON from '@babylonjs/core';
import { cameraManager } from './CameraManager';
import { mapMesher } from './MapMesher';
import { entityRenderer } from './EntityRenderer';
import { inputManager } from '../input/InputManager';

export class EngineCore {
  public engine: BABYLON.Engine | null = null;
  public scene: BABYLON.Scene | null = null;
  public hemiLight: BABYLON.HemisphericLight | null = null;
  public dirLight: BABYLON.DirectionalLight | null = null;
  public shadowGen: BABYLON.ShadowGenerator | null = null;

  private isInitialized = false;
  private resizeObserver: ResizeObserver | null = null;

  public initialize(canvas: HTMLCanvasElement) {
    if (this.isInitialized) return;

    this.engine = new BABYLON.Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      disableWebGL2Support: false,
    });

    this.scene = new BABYLON.Scene(this.engine);
    this.scene.clearColor = new BABYLON.Color4(0.02, 0.04, 0.08, 1); // #050b14 Dark background
    this.scene.ambientColor = new BABYLON.Color3(0.15, 0.15, 0.15);

    // ── Lighting ─────────────────────────────────────────────────────────────

    // Hemisphere light (ambient fill from above)
    this.hemiLight = new BABYLON.HemisphericLight('hemiLight', new BABYLON.Vector3(0, 1, 0), this.scene);
    this.hemiLight.intensity = 0.7;
    this.hemiLight.groundColor = new BABYLON.Color3(0.15, 0.15, 0.2);
    this.hemiLight.diffuse = new BABYLON.Color3(0.95, 0.93, 0.88); // Warm sunlight tint

    // Directional light (sun, for shadows)
    this.dirLight = new BABYLON.DirectionalLight('dirLight', new BABYLON.Vector3(-1, -2, -1.5), this.scene);
    this.dirLight.intensity = 0.5;
    this.dirLight.diffuse = new BABYLON.Color3(1, 0.95, 0.85);
    this.dirLight.position = new BABYLON.Vector3(30, 60, 30);

    // Shadow generator (moderate quality, cascaded later if needed)
    try {
      this.shadowGen = new BABYLON.ShadowGenerator(1024, this.dirLight);
      this.shadowGen.useBlurExponentialShadowMap = true;
      this.shadowGen.blurBoxOffset = 2;
      this.shadowGen.setDarkness(0.4);
    } catch {
      console.warn('[EngineCore] Shadow generator failed to initialize');
    }

    // ── Fog ──────────────────────────────────────────────────────────────────
    this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    this.scene.fogDensity = 0.005;
    this.scene.fogColor = new BABYLON.Color3(0.02, 0.04, 0.08);

    // ── Initialize Subsystems ────────────────────────────────────────────────
    cameraManager.initialize(this.scene, canvas);
    mapMesher.initialize(this.scene);
    entityRenderer.initialize(this.scene);
    inputManager.attach(canvas);

    // ── Render Loop ──────────────────────────────────────────────────────────
    this.engine.runRenderLoop(() => {
      this.scene?.render();
    });

    // ── Resize Handling ──────────────────────────────────────────────────────
    this.resizeObserver = new ResizeObserver(() => {
      this.engine?.resize();
    });
    this.resizeObserver.observe(canvas);
    window.addEventListener('resize', this.onResize);

    this.isInitialized = true;
    console.log('[EngineCore] Initialized Babylon.js with lighting & shadows');
  }

  private onResize = () => {
    this.engine?.resize();
  };

  public dispose() {
    if (!this.isInitialized) return;

    window.removeEventListener('resize', this.onResize);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    inputManager.detach();

    cameraManager.dispose();
    mapMesher.dispose();
    entityRenderer.dispose();

    this.shadowGen?.dispose();
    this.dirLight?.dispose();
    this.hemiLight?.dispose();

    this.scene?.dispose();
    this.engine?.dispose();

    this.scene = null;
    this.engine = null;
    this.shadowGen = null;
    this.dirLight = null;
    this.hemiLight = null;
    this.isInitialized = false;
    console.log('[EngineCore] Disposed Babylon.js');
  }
}

export const engineCore = new EngineCore();
