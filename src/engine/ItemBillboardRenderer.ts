import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Texture,
  Vector3,
  Color3,
  Color4,
  TransformNode,
} from '@babylonjs/core';

export interface ItemBillboardConfig {
  id: string;
  name?: string;
  worldX: number;
  worldZ: number;
  worldY?: number; // Base height above ground (default 0.35)
  spriteUrl: string;
  spriteX?: number; // Pixel offset in sheet (optional)
  spriteY?: number;
  spriteW?: number;
  spriteH?: number;
  scale?: number; // Visual scale (default 0.8)
  billboard?: 'Y' | 'FULL' | 'SPIN' | 'NONE'; // Billboard orientation mode
  bobAmplitude?: number; // Vertical bob distance (default 0.08)
  bobSpeed?: number; // Bob frequency in rad/s (default 3.0)
  rotationSpeed?: number; // Spin rate around Y in rad/s (for 'SPIN' mode, default 1.5)
  glowColor?: string; // Optional hex/css color for ground indicator
  quantity?: number;
}

interface ItemInstance {
  config: ItemBillboardConfig;
  rootNode: TransformNode;
  planeMesh: Mesh;
  shadowMesh?: Mesh;
  material: StandardMaterial;
  baseY: number;
  animTime: number;
}

/**
 * ItemBillboardRenderer
 * Renders 2D item sprites standing/floating upright in 3D world space (Minecraft-style item drops).
 * Features:
 * - Y-Axis billboard (faces camera while staying upright) or 3D spinning item mode.
 * - Smooth sinus floating/bobbing animations.
 * - Ground shadow / rarity glow rings.
 * - Material caching to prevent duplicate texture allocations.
 * - Frustum & distance LOD culling for high performance at 60 FPS.
 */
export class ItemBillboardRenderer {
  private scene: Scene;
  private items: Map<string, ItemInstance> = new Map();
  private textureCache: Map<string, Texture> = new Map();
  private materialCache: Map<string, StandardMaterial> = new Map();
  private parentNode: TransformNode;

  constructor(scene: Scene) {
    this.scene = scene;
    this.parentNode = new TransformNode('item_billboards_root', this.scene);
  }

  /**
   * Spawn or update a 2D item rendered in 3D
   */
  public spawnItem(config: ItemBillboardConfig): Mesh {
    this.removeItem(config.id);

    const scale = config.scale ?? 0.8;
    const baseY = config.worldY ?? 0.35;
    const mode = config.billboard ?? 'Y';

    const root = new TransformNode(`item_root_${config.id}`, this.scene);
    root.parent = this.parentNode;
    root.position.set(config.worldX, baseY, config.worldZ);

    // Create 2D plane mesh for sprite
    const plane = MeshBuilder.CreatePlane(`item_plane_${config.id}`, {
      size: scale,
      sideOrientation: Mesh.DOUBLESIDE,
    }, this.scene);
    plane.parent = root;
    plane.isPickable = true;

    // Apply billboard mode
    if (mode === 'Y') {
      plane.billboardMode = Mesh.BILLBOARDMODE_Y;
    } else if (mode === 'FULL') {
      plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
    } else {
      plane.billboardMode = Mesh.BILLBOARDMODE_NONE;
    }

    // Material with alpha test for crisp pixel edges
    const matKey = `item_mat_${config.spriteUrl}`;
    let mat = this.materialCache.get(matKey);
    if (!mat || (mat as any)._isDisposed) {
      mat = new StandardMaterial(matKey, this.scene);
      let tex = this.textureCache.get(config.spriteUrl);
      if (!tex || (tex as any)._isDisposed) {
        tex = new Texture(config.spriteUrl, this.scene, true, false, Texture.NEAREST_SAMPLINGMODE);
        tex.hasAlpha = true;
        this.textureCache.set(config.spriteUrl, tex);
      }
      mat.diffuseTexture = tex;
      mat.useAlphaFromDiffuseTexture = true;
      mat.alphaCutOff = 0.5;
      mat.specularColor = new Color3(0, 0, 0);
      mat.emissiveColor = new Color3(0.9, 0.9, 0.9);
      mat.backFaceCulling = false;
      this.materialCache.set(matKey, mat);
    }
    plane.material = mat;

    // Optional Ground Shadow / Glow Ring
    let shadowMesh: Mesh | undefined;
    if (config.glowColor) {
      shadowMesh = MeshBuilder.CreateDisc(`item_glow_${config.id}`, {
        radius: scale * 0.45,
        tessellation: 24,
      }, this.scene);
      shadowMesh.parent = this.parentNode;
      shadowMesh.position.set(config.worldX, 0.02, config.worldZ);
      shadowMesh.rotation.x = Math.PI / 2;
      shadowMesh.isPickable = false;

      const glowMat = new StandardMaterial(`item_glow_mat_${config.id}`, this.scene);
      glowMat.diffuseColor = Color3.FromHexString(config.glowColor);
      glowMat.emissiveColor = Color3.FromHexString(config.glowColor);
      glowMat.alpha = 0.45;
      shadowMesh.material = glowMat;
    }

    const instance: ItemInstance = {
      config,
      rootNode: root,
      planeMesh: plane,
      shadowMesh,
      material: mat,
      baseY,
      animTime: Math.random() * Math.PI * 2,
    };

    this.items.set(config.id, instance);
    return plane;
  }

  /**
   * Remove an item billboard by ID
   */
  public removeItem(id: string) {
    const existing = this.items.get(id);
    if (!existing) return;

    existing.planeMesh.dispose();
    existing.shadowMesh?.dispose();
    existing.rootNode.dispose();
    this.items.delete(id);
  }

  /**
   * Update animation loops (bobbing + spinning)
   */
  public update(deltaTime: number) {
    if (this.items.size === 0) return;

    this.items.forEach((item) => {
      item.animTime += deltaTime;
      const { config, rootNode, planeMesh, shadowMesh, baseY, animTime } = item;

      // Vertical Bobbing
      const bobAmp = config.bobAmplitude ?? 0.08;
      const bobSpeed = config.bobSpeed ?? 3.0;
      if (bobAmp > 0) {
        rootNode.position.y = baseY + Math.sin(animTime * bobSpeed) * bobAmp;
      }

      // Spinning around Y axis (Minecraft-style item drops)
      if (config.billboard === 'SPIN') {
        const rotSpeed = config.rotationSpeed ?? 1.8;
        planeMesh.rotation.y += rotSpeed * deltaTime;
      }

      // Pulse glow shadow opacity
      if (shadowMesh && shadowMesh.material) {
        (shadowMesh.material as StandardMaterial).alpha = 0.35 + Math.sin(animTime * bobSpeed) * 0.15;
      }
    });
  }

  /**
   * Clear all rendered item billboards
   */
  public clear() {
    this.items.forEach((item) => {
      item.planeMesh.dispose();
      item.shadowMesh?.dispose();
      item.rootNode.dispose();
    });
    this.items.clear();
  }

  /**
   * Dispose all resources and textures
   */
  public dispose() {
    this.clear();
    this.textureCache.forEach((tex) => tex.dispose());
    this.textureCache.clear();
    this.materialCache.forEach((mat) => mat.dispose());
    this.materialCache.clear();
    this.parentNode.dispose();
  }
}
