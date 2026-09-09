/**
 * Engine Core — Babylon.js Initialization
 * 
 * Sets up the Engine, Scene, and basic lighting.
 */
import * as BABYLON from '@babylonjs/core';
import { cameraManager } from './CameraManager';
import { mapMesher } from './MapMesher';
import { entityRenderer } from './EntityRenderer';
import { inputManager } from '../input/InputManager';

export class EngineCore {
  public engine: BABYLON.Engine | null = null;
  public scene: BABYLON.Scene | null = null;
  public light: BABYLON.HemisphericLight | null = null;

  private isInitialized = false;

  public initialize(canvas: HTMLCanvasElement) {
    if (this.isInitialized) return;

    this.engine = new BABYLON.Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      disableWebGL2Support: false,
    });

    this.scene = new BABYLON.Scene(this.engine);
    this.scene.clearColor = new BABYLON.Color4(0.02, 0.04, 0.08, 1); // #050b14 Dark background

    // Basic Lighting
    this.light = new BABYLON.HemisphericLight('hemiLight', new BABYLON.Vector3(0, 1, 0), this.scene);
    this.light.intensity = 0.9;
    this.light.groundColor = new BABYLON.Color3(0.2, 0.2, 0.2);

    // Initialize subsystems
    cameraManager.initialize(this.scene, canvas);
    mapMesher.initialize(this.scene);
    entityRenderer.initialize(this.scene);
    inputManager.attach(canvas);

    // Render Loop (Tied to Babylon's internal loop, separate from our fixed GameLoop)
    this.engine.runRenderLoop(() => {
      this.scene?.render();
    });

    // Resize handler
    const resizeObserver = new ResizeObserver(() => {
      this.engine?.resize();
    });
    resizeObserver.observe(canvas);
    window.addEventListener('resize', this.onResize);

    this.isInitialized = true;
    console.log('[EngineCore] Initialized Babylon.js');
  }

  private onResize = () => {
    this.engine?.resize();
  };

  public dispose() {
    if (!this.isInitialized) return;
    
    window.removeEventListener('resize', this.onResize);
    inputManager.detach();
    
    cameraManager.dispose();
    mapMesher.dispose();
    entityRenderer.dispose();
    
    this.scene?.dispose();
    this.engine?.dispose();

    this.scene = null;
    this.engine = null;
    this.isInitialized = false;
    console.log('[EngineCore] Disposed Babylon.js');
  }
}

export const engineCore = new EngineCore();
