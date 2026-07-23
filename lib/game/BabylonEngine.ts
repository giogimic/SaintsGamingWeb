import {
  Engine,
  Scene,
  FreeCamera,
  Vector3,
  Color3,
  Color4,
  HemisphericLight,
  MeshBuilder,
  StandardMaterial,
  Texture,
  Mesh,
  TransformNode
} from '@babylonjs/core';

export interface BabylonTileMapData {
  width: number;
  height: number;
  tileSize: number;
  tiles: number[][]; // 2D array of tile IDs
  tilesetUrl?: string;
}

export interface BabylonEntityData {
  id: string;
  name: string;
  x: number;
  y: number;
  spriteUrl: string;
  isPlayer?: boolean;
  isNpc?: boolean;
  isTuxemon?: boolean;
}

export class BabylonEngine {
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private scene: Scene;
  private camera: FreeCamera;
  private rootNode: TransformNode;
  private tileMeshes: Mesh[] = [];
  private entityMeshes: Map<string, Mesh> = new Map();
  private isRunning: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.engine = new Engine(this.canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true
    });

    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.04, 0.04, 0.06, 1.0); // Dark sleek background

    // Create Root Node for 2.5D Isometric Transform
    this.rootNode = new TransformNode('rootNode', this.scene);

    // Set up 2.5D Orthographic Camera looking down at a 45 degree angle
    this.camera = new FreeCamera('camera2D', new Vector3(0, 15, -15), this.scene);
    this.camera.setTarget(Vector3.Zero());
    this.camera.mode = FreeCamera.ORTHOGRAPHIC_CAMERA;

    // Adjust Orthographic frustum for pixel crispness
    const aspect = this.engine.getRenderWidth() / this.engine.getRenderHeight();
    const orthoSize = 10;
    this.camera.orthoLeft = -orthoSize * aspect;
    this.camera.orthoRight = orthoSize * aspect;
    this.camera.orthoTop = orthoSize;
    this.camera.orthoBottom = -orthoSize;

    // Ambient Lighting
    const light = new HemisphericLight('ambientLight', new Vector3(0, 1, 0), this.scene);
    light.intensity = 1.0;

    // Window Resize Handler
    window.addEventListener('resize', this.onResize);
  }

  private onResize = () => {
    if (!this.engine) return;
    this.engine.resize();
    const aspect = this.engine.getRenderWidth() / this.engine.getRenderHeight();
    const orthoSize = 10;
    this.camera.orthoLeft = -orthoSize * aspect;
    this.camera.orthoRight = orthoSize * aspect;
  };

  public startRenderLoop(onTick?: (deltaTime: number) => void) {
    if (this.isRunning) return;
    this.isRunning = true;

    this.engine.runRenderLoop(() => {
      const deltaTime = this.engine.getDeltaTime() / 1000;
      if (onTick) onTick(deltaTime);
      this.scene.render();
    });
  }

  public stopRenderLoop() {
    this.isRunning = false;
    this.engine.stopRenderLoop();
  }

  public setCameraPosition(targetX: number, targetZ: number, lerpFactor: number = 0.1) {
    const targetVector = new Vector3(targetX, 15, targetZ - 15);
    this.camera.position = Vector3.Lerp(this.camera.position, targetVector, lerpFactor);
    this.camera.setTarget(new Vector3(targetX, 0, targetZ));
  }

  public loadTilemap(mapData: BabylonTileMapData) {
    // Clear old tiles
    this.tileMeshes.forEach((mesh) => mesh.dispose());
    this.tileMeshes = [];

    const { width, height, tileSize, tiles } = mapData;

    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const tileId = tiles[r]?.[c] || 0;
        const ground = MeshBuilder.CreatePlane(
          `tile_${r}_${c}`,
          { size: tileSize },
          this.scene
        );

        ground.rotation.x = Math.PI / 2; // Flat on ground (XZ plane)
        ground.position = new Vector3(
          (c - width / 2) * tileSize,
          0,
          (height / 2 - r) * tileSize
        );
        ground.parent = this.rootNode;

        const mat = new StandardMaterial(`tileMat_${r}_${c}`, this.scene);
        this.applyTileMaterial(mat, tileId);
        ground.material = mat;

        this.tileMeshes.push(ground);
      }
    }
  }

  private applyTileMaterial(mat: StandardMaterial, tileId: number) {
    switch (tileId) {
      case 1: mat.diffuseColor = new Color3(0.1, 0.4, 0.15); break; // Grass
      case 2: mat.diffuseColor = new Color3(0.45, 0.3, 0.15); break; // Dirt Path
      case 3: mat.diffuseColor = new Color3(0.05, 0.5, 0.1); break; // Tall Grass
      case 4: mat.diffuseColor = new Color3(0.1, 0.3, 0.6); break; // Water
      case 5: mat.diffuseColor = new Color3(0.35, 0.35, 0.4); break; // Rock Wall
      case 6: mat.diffuseColor = new Color3(0.4, 0.25, 0.1); break; // Wood Floor
      case 7: mat.diffuseColor = new Color3(0.3, 0.3, 0.3); break; // Cobblestone
      case 8: mat.diffuseColor = new Color3(0.5, 0.45, 0.25); break; // Sand
      default: mat.diffuseColor = new Color3(0.2, 0.2, 0.25); break;
    }
  }

  public updateSingleTile(r: number, c: number, tileId: number) {
    const tileMesh = this.scene.getMeshByName(`tile_${r}_${c}`) as Mesh;
    if (tileMesh && tileMesh.material) {
      this.applyTileMaterial(tileMesh.material as StandardMaterial, tileId);
    }
  }

  public enableTilePicking(onTileClick: (r: number, c: number) => void) {
    this.scene.onPointerDown = (evt, pickResult) => {
      if (pickResult.hit && pickResult.pickedMesh && pickResult.pickedMesh.name.startsWith('tile_')) {
        const parts = pickResult.pickedMesh.name.split('_');
        if (parts.length === 3) {
          const r = parseInt(parts[1], 10);
          const c = parseInt(parts[2], 10);
          onTileClick(r, c);
        }
      }
    };
  }

  public disableTilePicking() {
    this.scene.onPointerDown = undefined;
  }

  public updateEntity(entity: BabylonEntityData) {
    let spriteMesh = this.entityMeshes.get(entity.id);

    if (!spriteMesh) {
      // Create 2.5D Billboard Sprite Plane
      spriteMesh = MeshBuilder.CreatePlane(
        `entity_${entity.id}`,
        { width: 1.2, height: 1.5 },
        this.scene
      );

      // Set Billboard Mode so sprite always faces 2.5D camera
      spriteMesh.billboardMode = Mesh.BILLBOARDMODE_Y;

      const mat = new StandardMaterial(`entityMat_${entity.id}`, this.scene);
      mat.useAlphaFromDiffuseTexture = true;
      if (entity.spriteUrl) {
        mat.diffuseTexture = new Texture(entity.spriteUrl, this.scene);
        mat.diffuseTexture.hasAlpha = true;
      }
      spriteMesh.material = mat;
      this.entityMeshes.set(entity.id, spriteMesh);
    }

    // Smooth position interpolation
    const targetPos = new Vector3(entity.x, 0.75, entity.y);
    spriteMesh.position = Vector3.Lerp(spriteMesh.position, targetPos, 0.2);
  }

  public removeEntity(id: string) {
    const mesh = this.entityMeshes.get(id);
    if (mesh) {
      mesh.dispose();
      this.entityMeshes.delete(id);
    }
  }

  public dispose() {
    window.removeEventListener('resize', this.onResize);
    this.stopRenderLoop();
    this.scene.dispose();
    this.engine.dispose();
  }
}
