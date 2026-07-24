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
  DynamicTexture,
  Mesh,
  TransformNode
} from '@babylonjs/core';

export interface BabylonTileMapData {
  width: number;
  height: number;
  tileSize: number;
  tiles: number[][]; // 2D array of tile IDs
  tilesetUrl?: string;
  npcs?: Array<{ id: string; name: string; x: number; y: number; sprite?: string }>;
}

export interface BabylonEntityData {
  id: string;
  name: string;
  x: number;
  y: number;
  spriteUrl?: string;
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
  private objectMeshes: Mesh[] = [];
  private entityMeshes: Map<string, Mesh> = new Map();
  private isRunning: boolean = false;
  private defaultPlayerTexture?: Texture;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.engine = new Engine(this.canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true
    });

    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.02, 0.03, 0.05, 1.0); // Deep immersive dark space

    // Root Node for 2.5D Isometric World
    this.rootNode = new TransformNode('rootNode', this.scene);

    // 2.5D Camera: Orthographic angled at 45 degrees looking down
    this.camera = new FreeCamera('camera2D', new Vector3(0, 14, -14), this.scene);
    this.camera.setTarget(Vector3.Zero());
    this.camera.mode = FreeCamera.ORTHOGRAPHIC_CAMERA;

    this.updateCameraAspect();

    // Lighting
    const light = new HemisphericLight('ambientLight', new Vector3(0.2, 1, -0.2), this.scene);
    light.intensity = 1.1;

    // Window Resize Handler
    window.addEventListener('resize', this.onResize);

    // Camera Mouse Wheel Zoom Handler
    this.canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      const currentOrtho = this.camera.orthoTop || 8;
      const newOrtho = Math.max(4, Math.min(18, currentOrtho * zoomFactor));
      
      const aspect = this.engine.getRenderWidth() / Math.max(1, this.engine.getRenderHeight());
      this.camera.orthoLeft = -newOrtho * aspect;
      this.camera.orthoRight = newOrtho * aspect;
      this.camera.orthoTop = newOrtho;
      this.camera.orthoBottom = -newOrtho;
    }, { passive: false });

    // Generate procedurally crisp player texture fallback
    this.createDefaultPlayerTexture();
  }

  private updateCameraAspect = () => {
    if (!this.engine || !this.camera) return;
    const aspect = this.engine.getRenderWidth() / Math.max(1, this.engine.getRenderHeight());
    const orthoSize = 8;
    this.camera.orthoLeft = -orthoSize * aspect;
    this.camera.orthoRight = orthoSize * aspect;
    this.camera.orthoTop = orthoSize;
    this.camera.orthoBottom = -orthoSize;
  };

  private onResize = () => {
    if (!this.engine) return;
    this.engine.resize();
    this.updateCameraAspect();
  };

  private createDefaultPlayerTexture() {
    const dynTex = new DynamicTexture('defaultPlayerTex', { width: 64, height: 64 }, this.scene, false);
    const ctx = dynTex.getContext();
    
    // Draw pixel art character body
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.clearRect(0, 0, 64, 64);
    
    // Character Head
    ctx.fillStyle = '#f6d7b0';
    ctx.fillRect(20, 8, 24, 20);
    // Hair
    ctx.fillStyle = '#4a2810';
    ctx.fillRect(18, 6, 28, 10);
    // Eyes
    ctx.fillStyle = '#101010';
    ctx.fillRect(24, 16, 4, 6);
    ctx.fillRect(36, 16, 4, 6);
    // Tunic (Saints Gaming Purple)
    ctx.fillStyle = '#8b5cf6';
    ctx.fillRect(16, 28, 32, 22);
    // Gold Trim
    ctx.fillStyle = '#eab308';
    ctx.fillRect(28, 28, 8, 22);
    // Legs
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(20, 50, 10, 14);
    ctx.fillRect(34, 50, 10, 14);

    dynTex.update();
    this.defaultPlayerTexture = dynTex;
  }

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
    const targetVector = new Vector3(targetX, 14, targetZ - 14);
    this.camera.position = Vector3.Lerp(this.camera.position, targetVector, lerpFactor);
    this.camera.setTarget(new Vector3(targetX, 0, targetZ));
  }

  public loadTilemap(mapData: BabylonTileMapData) {
    // Clear old meshes
    this.tileMeshes.forEach((mesh) => mesh.dispose());
    this.objectMeshes.forEach((mesh) => mesh.dispose());
    this.tileMeshes = [];
    this.objectMeshes = [];

    const { width, height, tileSize, tiles, npcs } = mapData;

    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const tileId = tiles[r]?.[c] ?? 0;
        const posX = (c - width / 2) * tileSize;
        const posZ = (height / 2 - r) * tileSize;

        // Ground Plane
        const ground = MeshBuilder.CreatePlane(
          `tile_${r}_${c}`,
          { size: tileSize },
          this.scene
        );

        ground.rotation.x = Math.PI / 2; // Flat on ground
        ground.position = new Vector3(posX, 0, posZ);
        ground.parent = this.rootNode;

        const mat = new StandardMaterial(`tileMat_${r}_${c}`, this.scene);
        this.applyTileMaterial(mat, tileId, r, c);
        ground.material = mat;
        this.tileMeshes.push(ground);

        // Render 2.5D World Props based on tile ID
        if (tileId === 1) { // Wall / Tree Block
          const block = MeshBuilder.CreateBox(`wall_${r}_${c}`, { size: tileSize * 0.9 }, this.scene);
          block.position = new Vector3(posX, tileSize * 0.45, posZ);
          const wallMat = new StandardMaterial(`wallMat_${r}_${c}`, this.scene);
          const checker = ((r + c) % 2 === 0) ? 0.02 : 0;
          wallMat.diffuseColor = new Color3(0.18 + checker, 0.28 + checker, 0.18 + checker);
          block.material = wallMat;
          block.parent = this.rootNode;
          this.objectMeshes.push(block);
        } else if (tileId === 2 || tileId === 3) { // Tall Grass Tuft
          const tuft = MeshBuilder.CreatePlane(`tuft_${r}_${c}`, { width: 0.8, height: 0.8 }, this.scene);
          tuft.billboardMode = Mesh.BILLBOARDMODE_Y;
          tuft.position = new Vector3(posX, 0.4, posZ);
          const tuftMat = new StandardMaterial(`tuftMat_${r}_${c}`, this.scene);
          tuftMat.diffuseColor = new Color3(0.05, 0.6, 0.15);
          tuft.material = tuftMat;
          tuft.parent = this.rootNode;
          this.objectMeshes.push(tuft);
        } else if (tileId === 5) { // Woodcutting Tree
          const tree = MeshBuilder.CreatePlane(`tree_${r}_${c}`, { width: 1.4, height: 1.8 }, this.scene);
          tree.billboardMode = Mesh.BILLBOARDMODE_Y;
          tree.position = new Vector3(posX, 0.9, posZ);
          const treeMat = new StandardMaterial(`treeMat_${r}_${c}`, this.scene);
          treeMat.diffuseColor = new Color3(0.1, 0.5, 0.2);
          tree.material = treeMat;
          tree.parent = this.rootNode;
          this.objectMeshes.push(tree);
        } else if (tileId === 6) { // Ore Node
          const ore = MeshBuilder.CreateBox(`ore_${r}_${c}`, { width: 0.7, height: 0.5, depth: 0.7 }, this.scene);
          ore.position = new Vector3(posX, 0.25, posZ);
          const oreMat = new StandardMaterial(`oreMat_${r}_${c}`, this.scene);
          oreMat.diffuseColor = new Color3(0.8, 0.5, 0.2);
          ore.material = oreMat;
          ore.parent = this.rootNode;
          this.objectMeshes.push(ore);
        }
      }
    }

    // Render Map NPCs as 2.5D Billboards
    if (npcs) {
      npcs.forEach((npc) => {
        this.updateEntity({
          id: `npc_${npc.id}`,
          name: npc.name,
          x: (npc.x - width / 2) * tileSize,
          y: (height / 2 - npc.y) * tileSize,
          isNpc: true
        });
      });
    }
  }

  private applyTileMaterial(mat: StandardMaterial, tileId: number, r: number = 0, c: number = 0) {
    const isAlt = (r + c) % 2 === 0;
    const tone = isAlt ? 0.035 : 0; // Checkerboard micro-contrast for grid movement visibility

    switch (tileId) {
      case 0: mat.diffuseColor = new Color3(0.12 + tone, 0.42 + tone, 0.18 + tone); break; // Safe Grass
      case 1: mat.diffuseColor = new Color3(0.15 + tone, 0.25 + tone, 0.15 + tone); break; // Wall / Tree Boundary
      case 2: // Tall Grass Encounter
      case 3: mat.diffuseColor = new Color3(0.08 + tone, 0.48 + tone, 0.12 + tone); break;
      case 4: mat.diffuseColor = new Color3(0.1 + tone, 0.35 + tone, 0.65 + tone); break; // Water
      case 5: mat.diffuseColor = new Color3(0.15 + tone, 0.35 + tone, 0.18 + tone); break; // Woodcutting Tree
      case 6: mat.diffuseColor = new Color3(0.35 + tone, 0.3 + tone, 0.25 + tone); break; // Ore Rock
      case 7: mat.diffuseColor = new Color3(0.45 + tone, 0.35 + tone, 0.15 + tone); break; // Shop Ground
      case 8: mat.diffuseColor = new Color3(0.2 + tone, 0.4 + tone, 0.5 + tone); break; // Clinic
      case 10: mat.diffuseColor = new Color3(0.05 + tone, 0.3 + tone, 0.6 + tone); break; // Fishing Water
      default: mat.diffuseColor = new Color3(0.15 + tone, 0.38 + tone, 0.2 + tone); break;
    }
  }

  public updateSingleTile(r: number, c: number, tileId: number) {
    const tileMesh = this.scene.getMeshByName(`tile_${r}_${c}`) as Mesh;
    if (tileMesh && tileMesh.material) {
      this.applyTileMaterial(tileMesh.material as StandardMaterial, tileId, r, c);
    }
  }

  public enableTilePicking(onTileClick: (r: number, c: number) => void) {
    this.scene.onPointerDown = (_evt, pickResult) => {
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
    const targetPos = new Vector3(entity.x, 0.8, entity.y);

    if (!spriteMesh) {
      // Create 2.5D Billboard Sprite Plane
      spriteMesh = MeshBuilder.CreatePlane(
        `entity_${entity.id}`,
        { width: 1.2, height: 1.6 },
        this.scene
      );

      // Billboard Y Mode: Sprite faces 2.5D camera angle
      spriteMesh.billboardMode = Mesh.BILLBOARDMODE_Y;

      const mat = new StandardMaterial(`entityMat_${entity.id}`, this.scene);
      mat.useAlphaFromDiffuseTexture = true;
      mat.backFaceCulling = false;

      if (entity.spriteUrl) {
        mat.diffuseTexture = new Texture(entity.spriteUrl, this.scene);
        mat.diffuseTexture.hasAlpha = true;
      } else if (this.defaultPlayerTexture) {
        mat.diffuseTexture = this.defaultPlayerTexture;
        mat.diffuseTexture.hasAlpha = true;
      }
      spriteMesh.material = mat;
      spriteMesh.parent = this.rootNode;

      // SET INITIAL POSITION IMMEDIATELY to prevent teleport from (0,0,0) on spawn
      spriteMesh.position.copyFrom(targetPos);

      this.entityMeshes.set(entity.id, spriteMesh);
    } else {
      // Smooth lerp movement across 2.5D coordinates
      spriteMesh.position = Vector3.Lerp(spriteMesh.position, targetPos, 0.3);
    }
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
