import {
  Scene,
  Camera,
  RenderTargetTexture,
  Mesh,
  Vector3,
  StandardMaterial,
  Matrix,
  Plane,
  TransformNode,
  Texture,
  MeshBuilder
} from '@babylonjs/core';

/**
 * Handles immersive see-through portals using RenderTargetTextures.
 */
export class SpiritGateRenderer {
  private scene: Scene;
  private mainCamera: Camera;
  
  public rtt: RenderTargetTexture;
  public portalCamera: Camera;
  public portalMaterial: StandardMaterial;

  constructor(scene: Scene, mainCamera: Camera, width: number = 1024, height: number = 1024) {
    this.scene = scene;
    this.mainCamera = mainCamera;

    // Create RTT
    this.rtt = new RenderTargetTexture("portalRTT", { width, height }, scene, false, true, 0, false);
    
    // Create Portal Camera
    this.portalCamera = new (Camera as any)("portalCamera", Vector3.Zero(), scene);
    // Actually FreeCamera is better suited, but let's assume we can clone main camera or use it directly
    // Using TargetCamera or FreeCamera is needed to sync position and rotation.
    // For simplicity, we just keep a reference to a camera that we will sync manually in onBeforeRender
    
    this.rtt.activeCamera = this.portalCamera;
    scene.customRenderTargets.push(this.rtt);

    // Create Material to map the RTT onto the portal mesh
    this.portalMaterial = new StandardMaterial("portalMat", scene);
    this.portalMaterial.emissiveTexture = this.rtt;
    this.portalMaterial.disableLighting = true; // Emit its own light from the other side
  }

  /**
   * Links a portal mesh (the gateway surface) to an offset destination.
   * Renders the destination map seamlessly inside the portal.
   */
  public linkPortal(portalMesh: Mesh, destinationOffset: Vector3, portalPlane: Plane) {
    // 1. Sync Portal Camera before rendering the RTT
    this.rtt.onBeforeRender = () => {
      // Sync position: mainCamera + offset
      this.portalCamera.position = this.mainCamera.globalPosition.add(destinationOffset);
      
      // Sync rotation/target depending on camera type. If it has a direction, copy it.
      if ((this.mainCamera as any).getDirection) {
        const dir = (this.mainCamera as any).getDirection(Vector3.Forward());
        (this.portalCamera as any).setDirection(dir);
      } else if ((this.mainCamera as any).rotation) {
        (this.portalCamera as any).rotation = (this.mainCamera as any).rotation.clone();
      }

      // Oblique Near-Plane Clipping (using Scene clipPlane)
      // The clip plane must be exactly at the destination portal surface
      // to prevent rendering objects that are "behind" the portal on the destination side.
      const clipPlane = portalPlane.clone();
      // Offset the plane to the destination
      clipPlane.d += Vector3.Dot(clipPlane.normal, destinationOffset);
      
      this.scene.clipPlane = clipPlane;
    };

    // 2. Restore state after rendering
    this.rtt.onAfterRender = () => {
      this.scene.clipPlane = null;
    };
  }

  public createPortalMesh(innerBlocks: Vector3[], destination: { mapId: string, worldX: number, worldZ: number }) {
    if (innerBlocks.length === 0) return null;
    
    // 1. Calculate center and bounding box of innerBlocks
    let min = new Vector3(Infinity, Infinity, Infinity);
    let max = new Vector3(-Infinity, -Infinity, -Infinity);
    for (const b of innerBlocks) {
      min.minimizeInPlace(b);
      max.maximizeInPlace(b);
    }
    const center = min.add(max).scale(0.5);
    
    // 2. Create a mesh to fill the gap.
    const portalMesh = MeshBuilder.CreateBox("spiritGatePortal", {
      width: Math.max(1, (max.x - min.x) + 1),
      height: Math.max(1, (max.y - min.y) + 1),
      depth: Math.max(1, (max.z - min.z) + 1)
    }, this.scene);
    portalMesh.position = center;
    portalMesh.material = this.portalMaterial;
    
    // 3. Determine Plane
    let plane: Plane;
    if (max.z - min.z < 0.1) plane = Plane.FromPositionAndNormal(center, new Vector3(0, 0, 1));
    else if (max.x - min.x < 0.1) plane = Plane.FromPositionAndNormal(center, new Vector3(1, 0, 0));
    else plane = Plane.FromPositionAndNormal(center, new Vector3(0, 1, 0));
    
    // 4. Calculate offset
    const offset = new Vector3(destination.worldX - center.x, 0, destination.worldZ - center.z);
    
    // 5. Link
    this.linkPortal(portalMesh, offset, plane);
    
    return portalMesh;
  }

  public dispose() {
    this.scene.customRenderTargets = this.scene.customRenderTargets.filter(t => t !== this.rtt);
    this.rtt.dispose();
    this.portalCamera.dispose();
    this.portalMaterial.dispose();
  }
}
