/**
 * Camera Manager — Orthographic follow camera.
 */
import * as BABYLON from '@babylonjs/core';
import { usePlayerStore } from '../state/usePlayerStore';

export class CameraManager {
  public camera: BABYLON.TargetCamera | null = null;
  private scene: BABYLON.Scene | null = null;

  public initialize(scene: BABYLON.Scene, canvas: HTMLCanvasElement) {
    this.scene = scene;
    
    // Orthographic camera looking down
    this.camera = new BABYLON.TargetCamera('mainCamera', new BABYLON.Vector3(0, 50, -20), scene);
    this.camera.setTarget(new BABYLON.Vector3(0, 0, 0));
    
    this.camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
    this.updateOrthoSize();

    // Attach control for manual panning (optional/debug)
    // this.camera.attachControl(canvas, true);

    // Register before render to follow player
    scene.onBeforeRenderObservable.add(this.update);
  }

  private updateOrthoSize() {
    if (!this.camera || !this.scene) return;
    
    const engine = this.scene.getEngine();
    const width = engine.getRenderWidth();
    const height = engine.getRenderHeight();
    
    if (width === 0 || height === 0) return;
    
    // Scale viewport based on aspect ratio
    const aspect = width / height;
    const viewSize = 15; // Number of tiles visible vertically
    
    this.camera.orthoTop = viewSize;
    this.camera.orthoBottom = -viewSize;
    this.camera.orthoLeft = -viewSize * aspect;
    this.camera.orthoRight = viewSize * aspect;
  }

  private update = () => {
    this.updateOrthoSize();
    if (!this.camera) return;

    // Follow local player
    const player = usePlayerStore.getState().player;
    if (player && player.position) {
      // Smooth lerp camera position
      const targetX = player.position.x;
      const targetZ = -player.position.y; // Babylon Z is inverted 2D Y
      
      this.camera.position.x = BABYLON.Scalar.Lerp(this.camera.position.x, targetX, 0.1);
      this.camera.position.z = BABYLON.Scalar.Lerp(this.camera.position.z, targetZ - 20, 0.1); // -20 to maintain angle
      
      this.camera.setTarget(new BABYLON.Vector3(this.camera.position.x, 0, this.camera.position.z + 20));
    }
  };

  public dispose() {
    if (this.scene) {
      this.scene.onBeforeRenderObservable.removeCallback(this.update);
    }
    this.camera?.dispose();
    this.camera = null;
    this.scene = null;
  }
}

export const cameraManager = new CameraManager();
