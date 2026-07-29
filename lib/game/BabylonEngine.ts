import {
  Engine,
  Scene,
  FreeCamera,
  Vector3,
  Color3,
  Color4,
  HemisphericLight,
  DirectionalLight,
  ShadowGenerator,
  MeshBuilder,
  StandardMaterial,
  Texture,
  DynamicTexture,
  Mesh,
  TransformNode,
  VertexBuffer
} from '@babylonjs/core';
import { AdvancedDynamicTexture, Rectangle, TextBlock } from '@babylonjs/gui';
import { TILESET_SIZES } from "../../components/the-lobby/data/tileset-sizes";

export interface BabylonTileMapData {
  id?: string;
  width: number;
  height: number;
  tileSize: number;
  tiles: number[][]; // 2D array of tile IDs
  tilesetUrl?: string;
  tileLayers?: Array<{ name: string; grid: number[][] }>;
  tilesets?: Array<{ firstgid: number; imageSource: string; columns: number; tilewidth: number; tileheight: number; imageheight?: number; tilecount?: number }>;
  npcs?: Array<{ id: string; name: string; x: number; y: number; sprite?: string }>;
}

export interface BabylonEntityData {
  id: string;
  name: string;
  x: number;
  y: number;
  spriteUrl?: string;
  direction?: 'down' | 'up' | 'left' | 'right';
  isMoving?: boolean;
  frameIndex?: number;
  isPlayer?: boolean;
  isNpc?: boolean;
  isTuxemon?: boolean;
  chatMessage?: string;
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
  private shadowMeshes: Map<string, Mesh> = new Map();
  private isRunning: boolean = false;
  private defaultPlayerTexture?: DynamicTexture;
  private woodFloorTexture?: DynamicTexture;
  private indoorWallTexture?: DynamicTexture;
  private waterTexture?: DynamicTexture;
  private waterAnimTime: number = 0;
  private currentMapId: string = '';
  private currentMapWidth: number = 24;
  private currentMapHeight: number = 24;
  private currentTileSize: number = 1;
  private tilesetTextureCache: Map<string, Texture> = new Map();
  private tilesetMaterialCache: Map<string, StandardMaterial> = new Map();
  private waterMaterials: StandardMaterial[] = [];
  private guiTexture: AdvancedDynamicTexture;
  private chatBubbles: Map<string, Rectangle> = new Map();
  private shadowGen?: ShadowGenerator;
  private cameraTargetX: number = 0;
  private cameraTargetZ: number = 0;
  private cameraSnapped: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.engine = new Engine(this.canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: false // Keep pixel art crisp
    });

    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.02, 0.04, 0.06, 1.0);

    this.guiTexture = AdvancedDynamicTexture.CreateFullscreenUI('UI', true, this.scene);

    // Root Node for 2.5D Isometric World
    this.rootNode = new TransformNode('rootNode', this.scene);

    // 2.5D Camera: Orthographic angled at ~40 degrees looking down
    this.camera = new FreeCamera('camera2D', new Vector3(0, 14, -14), this.scene);
    this.camera.setTarget(Vector3.Zero());
    this.camera.mode = FreeCamera.ORTHOGRAPHIC_CAMERA;

    this.updateCameraAspect(10);

    // Primary ambient light
    const ambientLight = new HemisphericLight('ambientLight', new Vector3(0.2, 1, -0.3), this.scene);
    ambientLight.intensity = 0.85;
    ambientLight.diffuse = new Color3(0.95, 0.95, 1.0);
    ambientLight.groundColor = new Color3(0.15, 0.2, 0.15);

    // Directional sun light for 2.5D depth
    const dirLight = new DirectionalLight('sunLight', new Vector3(-0.5, -1.0, 0.5), this.scene);
    dirLight.intensity = 0.55;
    dirLight.diffuse = new Color3(1.0, 0.97, 0.88);
    dirLight.position = new Vector3(5, 15, -10);

    // Shadow Generator (soft shadows for 2.5D depth)
    this.shadowGen = new ShadowGenerator(512, dirLight);
    this.shadowGen.useBlurExponentialShadowMap = true;
    this.shadowGen.blurKernel = 16;
    this.shadowGen.darkness = 0.4;

    // Window Resize Handler
    window.addEventListener('resize', this.onResize);

    // Camera Mouse Wheel Zoom Handler
    this.canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      const currentOrtho = this.camera.orthoTop || 10;
      const newOrtho = Math.max(5, Math.min(22, currentOrtho * zoomFactor));
      const aspect = this.engine.getRenderWidth() / Math.max(1, this.engine.getRenderHeight());
      this.camera.orthoLeft = -newOrtho * aspect;
      this.camera.orthoRight = newOrtho * aspect;
      this.camera.orthoTop = newOrtho;
      this.camera.orthoBottom = -newOrtho;
    }, { passive: false });

    // Generate procedural textures
    this.createDefaultPlayerTexture();
    this.createProceduralTextures();
  }

  private createProceduralTextures() {
    // Wood Floor Texture
    const woodTex = new DynamicTexture('woodFloorTex', { width: 128, height: 128 }, this.scene, false);
    const wCtx = woodTex.getContext();
    wCtx.fillStyle = '#7a4f2a';
    wCtx.fillRect(0, 0, 128, 128);
    wCtx.fillStyle = '#5c3519';
    for (let i = 0; i < 8; i++) {
      wCtx.fillRect(0, i * 16, 128, 2);
      for (let j = 0; j < 25; j++) {
        wCtx.globalAlpha = 0.3;
        wCtx.fillRect(Math.random() * 128, i * 16 + Math.random() * 14, Math.random() * 30 + 5, 1);
      }
    }
    wCtx.globalAlpha = 1;
    woodTex.update();
    this.woodFloorTexture = woodTex;

    // Indoor Wall Texture
    const wallTex = new DynamicTexture('indoorWallTex', { width: 128, height: 128 }, this.scene, false);
    const pCtx = wallTex.getContext();
    pCtx.fillStyle = '#d4dae4';
    pCtx.fillRect(0, 0, 128, 128);
    pCtx.fillStyle = '#bdc5d1';
    pCtx.fillRect(0, 110, 128, 18);
    pCtx.fillRect(0, 0, 128, 10);
    pCtx.fillStyle = 'rgba(0,0,0,0.025)';
    for (let i = 0; i < 300; i++) {
      pCtx.fillRect(Math.random() * 128, Math.random() * 128, Math.random() * 3 + 1, Math.random() * 3 + 1);
    }
    wallTex.update();
    this.indoorWallTexture = wallTex;

    // Animated Water Base Texture
    const waterTex = new DynamicTexture('waterTex', { width: 128, height: 128 }, this.scene, true);
    this.waterTexture = waterTex;
    this.updateWaterTexture(0);
  }

  private updateWaterTexture(time: number) {
    if (!this.waterTexture) return;
    const ctx = this.waterTexture.getContext();
    const w = 128; const h = 128;
    // Base deep water
    ctx.fillStyle = '#1a4a7a';
    ctx.fillRect(0, 0, w, h);
    // Animated shimmer ripples
    ctx.strokeStyle = 'rgba(100,180,255,0.4)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const phase = (time * 0.8 + i * 0.9) % (Math.PI * 2);
      const y = (i / 6) * h + Math.sin(phase) * 8;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 4) {
        const wy = y + Math.sin(x * 0.15 + phase) * 4;
        if (x === 0) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }
    // Foam highlights
    ctx.fillStyle = 'rgba(200,230,255,0.15)';
    for (let i = 0; i < 12; i++) {
      const fx = (Math.sin(time * 0.3 + i) * 0.5 + 0.5) * w;
      const fy = (Math.cos(time * 0.4 + i * 1.3) * 0.5 + 0.5) * h;
      ctx.beginPath();
      ctx.arc(fx, fy, 4 + Math.sin(time + i) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    this.waterTexture.update();
    // Apply to water materials
    this.waterMaterials.forEach(m => {
      m.diffuseTexture = this.waterTexture!;
    });
  }

  private updateCameraAspect = (orthoSize: number = 10) => {
    if (!this.engine || !this.camera) return;
    const aspect = this.engine.getRenderWidth() / Math.max(1, this.engine.getRenderHeight());
    this.camera.orthoLeft = -orthoSize * aspect;
    this.camera.orthoRight = orthoSize * aspect;
    this.camera.orthoTop = orthoSize;
    this.camera.orthoBottom = -orthoSize;
  };

  private onResize = () => {
    if (!this.engine) return;
    this.engine.resize();
    // Re-apply current ortho size on resize
    const currentOrtho = this.camera.orthoTop || 10;
    this.updateCameraAspect(currentOrtho);
  };

  private createDefaultPlayerTexture() {
    const dynTex = new DynamicTexture('defaultPlayerTex', { width: 64, height: 64 }, this.scene, false);
    const ctx = dynTex.getContext();

    ctx.clearRect(0, 0, 64, 64);

    // Shadow (oval using scale trick — ICanvasRenderingContext lacks ellipse)
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.save();
    ctx.scale(1, 0.28);
    ctx.beginPath();
    ctx.arc(32, 60 / 0.28, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Legs
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(20, 46, 10, 16);
    ctx.fillRect(34, 46, 10, 16);

    // Boots
    ctx.fillStyle = '#3b2a1a';
    ctx.fillRect(19, 58, 12, 5);
    ctx.fillRect(33, 58, 12, 5);

    // Tunic Body (Saints purple)
    ctx.fillStyle = '#7c3aed';
    ctx.fillRect(14, 26, 36, 22);

    // Gold belt
    ctx.fillStyle = '#eab308';
    ctx.fillRect(14, 44, 36, 3);
    ctx.fillRect(29, 41, 6, 7);

    // Gold tunic trim center
    ctx.fillStyle = '#d4a017';
    ctx.fillRect(28, 26, 8, 18);

    // Cloak/cape sides
    ctx.fillStyle = '#5b21b6';
    ctx.fillRect(10, 28, 6, 18);
    ctx.fillRect(48, 28, 6, 18);

    // Arms / Gauntlets
    ctx.fillStyle = '#8b5cf6';
    ctx.fillRect(10, 26, 6, 14);
    ctx.fillRect(48, 26, 6, 14);

    // Hands
    ctx.fillStyle = '#f6c99a';
    ctx.fillRect(10, 38, 7, 7);
    ctx.fillRect(47, 38, 7, 7);

    // Neck
    ctx.fillStyle = '#f6c99a';
    ctx.fillRect(28, 20, 8, 7);

    // Head
    ctx.fillStyle = '#f6c99a';
    ctx.fillRect(18, 8, 28, 20);

    // Hair
    ctx.fillStyle = '#1a0a00';
    ctx.fillRect(16, 4, 32, 10);
    ctx.fillRect(16, 8, 4, 12);
    ctx.fillRect(44, 8, 4, 12);

    // Eyes (expressive)
    ctx.fillStyle = '#101828';
    ctx.fillRect(22, 16, 5, 6);
    ctx.fillRect(37, 16, 5, 6);
    ctx.fillStyle = '#3b82f6'; // Blue iris
    ctx.fillRect(23, 17, 3, 4);
    ctx.fillRect(38, 17, 3, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(24, 17, 1, 1);
    ctx.fillRect(39, 17, 1, 1);

    // Mouth
    ctx.fillStyle = '#c07050';
    ctx.fillRect(26, 24, 12, 2);

    dynTex.update();
    this.defaultPlayerTexture = dynTex;
  }

  public startRenderLoop(onTick?: (deltaTime: number) => void) {
    if (this.isRunning) return;
    this.isRunning = true;

    this.engine.runRenderLoop(() => {
      const deltaTime = this.engine.getDeltaTime() / 1000;
      this.waterAnimTime += deltaTime;

      // Animate water tiles every ~3 frames for performance
      if (Math.round(this.waterAnimTime * 30) % 3 === 0) {
        this.updateWaterTexture(this.waterAnimTime);
      }

      // Smooth Grid Interpolation & Walking Animations
      this.entityMeshes.forEach((mesh) => {
        const state = mesh.metadata;
        if (!state) return;

        // 1. Movement Interpolation
        if (state.isEditor) {
          mesh.position = state.targetPos;
        } else {
          const dist = Vector3.Distance(mesh.position, state.targetPos);
          if (dist > 0.005) {
            // Speed = 4 tiles per second (250ms per tile to match GameCanvasBabylon setTimeout)
            // If distance is large (> 1.5 tiles), rubber-band rapidly at 3x speed
            const speed = dist > 1.5 ? 12.0 : 4.0; 
            const moveStep = speed * deltaTime;
            if (moveStep >= dist) {
              mesh.position = state.targetPos;
            } else {
              const dir = state.targetPos.subtract(mesh.position).normalize();
              mesh.position.addInPlace(dir.scale(moveStep));
            }
          } else {
            mesh.position = state.targetPos;
          }
        }

        // 2. UV Frame Cycling (Animation)
        if (mesh.material) {
          const mat = mesh.material as StandardMaterial;
          const tex = mat.diffuseTexture as Texture;
          if (tex && (state.isNpc || state.isPlayer || tex.name.includes('/npc/'))) {
            // Update row (direction)
            const dirMap: Record<string, number> = { down: 3, left: 2, right: 1, up: 0 };
            const rowIdx = dirMap[state.direction || 'down'] ?? 3;
            tex.vOffset = rowIdx * (1 / 4);

            // Update column (animation frame)
            if (state.isMoving) {
              state.animTime += deltaTime * 6; // 6 frames per sec
              const frameSeq = [0, 1, 2, 1]; // walk cycle
              const f = frameSeq[Math.floor(state.animTime) % 4];
              tex.uOffset = f * (1 / 3);
            } else {
              state.animTime = 0;
              tex.uOffset = 1 * (1 / 3); // Idle frame is index 1
            }
          }
        }
      });

      if (onTick) onTick(deltaTime);
      this.scene.render();
    });
  }

  public stopRenderLoop() {
    this.isRunning = false;
    this.engine.stopRenderLoop();
  }

  /**
   * Move camera instantly to a world position (used on map load / spawn)
   */
  public snapCameraTo(worldX: number, worldZ: number) {
    const halfWidth = (this.currentMapWidth * this.currentTileSize) / 2;
    const halfHeight = (this.currentMapHeight * this.currentTileSize) / 2;
    const viewHalfWidth = this.camera?.orthoRight || 10;
    // Due to the camera's 45 degree pitch, the ground area seen is vertically elongated
    const viewHalfHeight = (this.camera?.orthoTop || 10) * 1.414;

    if (halfWidth > viewHalfWidth) {
      worldX = Math.max(-halfWidth + viewHalfWidth, Math.min(halfWidth - viewHalfWidth, worldX));
    } else {
      worldX = 0;
    }
    if (halfHeight > viewHalfHeight) {
      worldZ = Math.max(-halfHeight + viewHalfHeight, Math.min(halfHeight - viewHalfHeight, worldZ));
    } else {
      worldZ = 0;
    }

    this.cameraTargetX = worldX;
    this.cameraTargetZ = worldZ;
    this.camera.position = new Vector3(worldX, 14, worldZ - 14);
    this.camera.setTarget(new Vector3(worldX, 0, worldZ));
    this.cameraSnapped = true;
  }

  /**
   * Smoothly follow a world position each tick
   */
  public setCameraPosition(targetX: number, targetZ: number, lerpFactor: number = 0.08) {
    const halfWidth = (this.currentMapWidth * this.currentTileSize) / 2;
    const halfHeight = (this.currentMapHeight * this.currentTileSize) / 2;
    const viewHalfWidth = this.camera?.orthoRight || 10;
    // Due to the camera's 45 degree pitch, the ground area seen is vertically elongated
    const viewHalfHeight = (this.camera?.orthoTop || 10) * 1.414;

    if (halfWidth > viewHalfWidth) {
      targetX = Math.max(-halfWidth + viewHalfWidth, Math.min(halfWidth - viewHalfWidth, targetX));
    } else {
      targetX = 0;
    }
    if (halfHeight > viewHalfHeight) {
      targetZ = Math.max(-halfHeight + viewHalfHeight, Math.min(halfHeight - viewHalfHeight, targetZ));
    } else {
      targetZ = 0;
    }

    this.cameraTargetX = targetX;
    this.cameraTargetZ = targetZ;

    if (!this.cameraSnapped) {
      // Snap immediately on first call
      this.snapCameraTo(targetX, targetZ);
      return;
    }

    const targetCamPos = new Vector3(targetX, 14, targetZ - 14);
    this.camera.position = Vector3.Lerp(this.camera.position, targetCamPos, lerpFactor);
    this.camera.setTarget(Vector3.Lerp(
      this.camera.getTarget(),
      new Vector3(targetX, 0, targetZ),
      lerpFactor
    ));
  }

  public resetCameraSnap() {
    this.cameraSnapped = false;
  }

  public loadTilemap(mapData: BabylonTileMapData) {
    // Clear old meshes
    this.tileMeshes.forEach((mesh) => mesh.dispose());
    this.objectMeshes.forEach((mesh) => mesh.dispose());
    this.tileMeshes = [];
    this.objectMeshes = [];
    this.waterMaterials = [];
    this.cameraSnapped = false; // Force snap on next setCameraPosition

    const { width, height, tileSize, tiles, tileLayers, tilesets, npcs, id: mapId } = mapData;
    this.currentMapId = mapId || '';
    this.currentMapWidth = width;
    this.currentMapHeight = height;
    this.currentTileSize = tileSize;

    // Use a fixed zoom level for a classic GBA/SNES style RPG look (~6 tiles vertically)
    // rather than zooming way out for large maps.
    const targetOrtho = 6.0;
    this.updateCameraAspect(targetOrtho);

    // Rich multi-layer tileset rendering
    if (tileLayers && tileLayers.length > 0 && tilesets && tilesets.length > 0) {
      const sortedTilesets = [...tilesets].sort((a, b) => b.firstgid - a.firstgid);

      tileLayers.forEach((layer, layerIdx) => {
        const heightOffset = layerIdx * 0.02;

        for (let r = 0; r < height; r++) {
          for (let c = 0; c < width; c++) {
            const gid = layer.grid[r]?.[c] ?? 0;
            if (gid === 0) continue;

            const ts = sortedTilesets.find(t => gid >= t.firstgid);
            if (!ts || !ts.imageSource) continue;

            const posX = (c - width / 2) * tileSize;
            const posZ = (height / 2 - r) * tileSize;

            const localId = gid - ts.firstgid;
            const col = localId % ts.columns;
            const row = Math.floor(localId / ts.columns);
            
            // Calculate exact rows if possible
            let estimatedRows = 24;
            const rawSource = ts.imageSource.replace(/^(.*\/tilesets\/|tilesets\/)/i, '');
            const sizes = TILESET_SIZES[rawSource];
            if (sizes && sizes.h && ts.tileheight) {
              estimatedRows = Math.floor(sizes.h / ts.tileheight);
            } else if (ts.imageheight && ts.tileheight) {
              estimatedRows = Math.floor(ts.imageheight / ts.tileheight);
            } else if (ts.tilecount && ts.columns) {
              estimatedRows = Math.ceil(ts.tilecount / ts.columns);
            } else {
              if (ts.imageSource.includes("Terrain")) estimatedRows = 24;
              else if (ts.imageSource.includes("Furniture")) estimatedRows = 11;
              else if (ts.imageSource.includes("Interior_Walls")) estimatedRows = 12;
              else if (ts.imageSource.includes("Interior_Floors")) estimatedRows = 12;
              else if (ts.imageSource.includes("Vegetation")) estimatedRows = 4;
              else estimatedRows = Math.max(16, Math.ceil((localId + 1) / ts.columns));
            }

            // Half-pixel inset to prevent tile edge bleeding/seams
            const imgW = ts.columns * (ts.tilewidth || 16);
            const imgH = estimatedRows * (ts.tileheight || 16);
            const hpU = 0.5 / imgW;
            const hpV = 0.5 / imgH;

            // InvertY = false means Texture (0,0) is Top-Left
            const u0 = col / ts.columns + hpU;
            const u1 = (col + 1) / ts.columns - hpU;
            const v0 = row / estimatedRows + hpV; // Top of tile
            const v1 = (row + 1) / estimatedRows - hpV; // Bottom of tile

            const plane = MeshBuilder.CreatePlane(
              `tile_${layerIdx}_${r}_${c}`,
              { size: tileSize },
              this.scene
            );

            // Plane vertices: 0=Bottom-Left, 1=Bottom-Right, 2=Top-Right, 3=Top-Left
            const uvs = [
              u0, v1, // Bottom-Left Vertex -> Bottom of Tile
              u1, v1, // Bottom-Right Vertex -> Bottom of Tile
              u1, v0, // Top-Right Vertex -> Top of Tile
              u0, v0  // Top-Left Vertex -> Top of Tile
            ];
            plane.setVerticesData(VertexBuffer.UVKind, uvs);

            plane.rotation.x = Math.PI / 2;
            plane.position = new Vector3(posX, heightOffset, posZ);
            plane.parent = this.rootNode;

            let mat = this.tilesetMaterialCache.get(ts.imageSource);
            if (!mat) {
              mat = new StandardMaterial(`tileset_${ts.imageSource}`, this.scene);
              let tex = this.tilesetTextureCache.get(ts.imageSource);
              if (!tex) {
                // Normalize imageSource: strip any directory prefix the DB may have stored
                // to always resolve to /tuxemon-assets/tilesets/{filename.png}
                const tilesetPath = `/tuxemon-assets/tilesets/${rawSource}`;
                // Use Nearest sampling mode (1) for pixel-perfect crisp textures!
                // invertY = false so (0,0) is Top-Left
                tex = new Texture(tilesetPath, this.scene, true, false, 1);
                tex.hasAlpha = true;
                this.tilesetTextureCache.set(ts.imageSource, tex);
              }
              mat.diffuseTexture = tex;
              mat.useAlphaFromDiffuseTexture = true;
              mat.backFaceCulling = false;
              this.tilesetMaterialCache.set(ts.imageSource, mat);
            }
            plane.material = mat;
            this.tileMeshes.push(plane);
          }
        }
      });
    } else {
      // Fallback: simple colored grid rendering with 2.5D geometry
      for (let r = 0; r < height; r++) {
        for (let c = 0; c < width; c++) {
          const tileId = tiles[r]?.[c] ?? 0;
          const posX = (c - width / 2) * tileSize;
          const posZ = (height / 2 - r) * tileSize;

          // Ground plane for every tile
          const ground = MeshBuilder.CreatePlane(
            `tile_${r}_${c}`,
            { size: tileSize },
            this.scene
          );
          ground.rotation.x = Math.PI / 2;
          ground.position = new Vector3(posX, 0, posZ);
          ground.parent = this.rootNode;
          ground.receiveShadows = true;

          const mat = new StandardMaterial(`tileMat_${r}_${c}`, this.scene);
          this.applyTileMaterial(mat, tileId, r, c);
          ground.material = mat;
          this.tileMeshes.push(ground);

          // 3D geometry for walls / objects
          if (tileId === 1) {
            // Solid 3D wall block
            const block = MeshBuilder.CreateBox(`wall_${r}_${c}`, {
              width: tileSize * 0.95,
              height: tileSize * 0.9,
              depth: tileSize * 0.95
            }, this.scene);
            block.position = new Vector3(posX, tileSize * 0.45, posZ);
            const wallMat = new StandardMaterial(`wallMat_${r}_${c}`, this.scene);
            this.applyTileMaterial(wallMat, tileId, r, c, true);
            block.material = wallMat;
            block.parent = this.rootNode;
            block.receiveShadows = true;
            if (this.shadowGen) this.shadowGen.addShadowCaster(block);
            this.objectMeshes.push(block);
          } else if (tileId === 2 || tileId === 3) {
            // Tall Grass Tufts (2 crossed billboards for volume)
            for (let t = 0; t < 2; t++) {
              const tuft = MeshBuilder.CreatePlane(`tuft_${r}_${c}_${t}`, { width: tileSize * 0.85, height: tileSize * 0.75 }, this.scene);
              tuft.billboardMode = Mesh.BILLBOARDMODE_Y;
              tuft.rotation.y = t * (Math.PI / 2);
              tuft.position = new Vector3(posX, tileSize * 0.38, posZ);
              const tuftMat = new StandardMaterial(`tuftMat_${r}_${c}_${t}`, this.scene);
              tuftMat.diffuseColor = new Color3(0.1, 0.62, 0.18);
              tuftMat.emissiveColor = new Color3(0.02, 0.12, 0.04);
              tuft.material = tuftMat;
              tuft.parent = this.rootNode;
              this.objectMeshes.push(tuft);
            }
          } else if (tileId === 5) {
            // Tree: trunk box + billboard foliage
            const trunk = MeshBuilder.CreateBox(`trunk_${r}_${c}`, { width: 0.3, height: 0.9, depth: 0.3 }, this.scene);
            trunk.position = new Vector3(posX, 0.45, posZ);
            const trunkMat = new StandardMaterial(`trunkMat_${r}_${c}`, this.scene);
            trunkMat.diffuseColor = new Color3(0.35, 0.22, 0.12);
            trunk.material = trunkMat;
            trunk.parent = this.rootNode;
            trunk.receiveShadows = true;
            if (this.shadowGen) this.shadowGen.addShadowCaster(trunk);
            this.objectMeshes.push(trunk);

            const foliage = MeshBuilder.CreatePlane(`tree_${r}_${c}`, { width: tileSize * 1.4, height: tileSize * 1.5 }, this.scene);
            foliage.billboardMode = Mesh.BILLBOARDMODE_Y;
            foliage.position = new Vector3(posX, tileSize * 0.9, posZ);
            const treeMat = new StandardMaterial(`treeMat_${r}_${c}`, this.scene);
            treeMat.diffuseColor = new Color3(0.1, 0.52, 0.2);
            treeMat.emissiveColor = new Color3(0.01, 0.08, 0.02);
            foliage.material = treeMat;
            foliage.parent = this.rootNode;
            if (this.shadowGen) this.shadowGen.addShadowCaster(foliage);
            this.objectMeshes.push(foliage);
          } else if (tileId === 6) {
            // Ore Rock
            const ore = MeshBuilder.CreateBox(`ore_${r}_${c}`, { width: tileSize * 0.7, height: tileSize * 0.45, depth: tileSize * 0.7 }, this.scene);
            ore.position = new Vector3(posX, tileSize * 0.22, posZ);
            ore.rotation.y = Math.random() * Math.PI;
            const oreMat = new StandardMaterial(`oreMat_${r}_${c}`, this.scene);
            oreMat.diffuseColor = new Color3(0.55, 0.45, 0.35);
            oreMat.specularColor = new Color3(0.4, 0.3, 0.2);
            oreMat.emissiveColor = new Color3(0.08, 0.06, 0.03);
            ore.material = oreMat;
            ore.parent = this.rootNode;
            ore.receiveShadows = true;
            if (this.shadowGen) this.shadowGen.addShadowCaster(ore);
            this.objectMeshes.push(ore);
          } else if (tileId === 4 || tileId === 10) {
            // Animated Water / Fishing
            if (mat) {
              this.waterMaterials.push(mat);
              // Update immediately with current water texture
              if (this.waterTexture) mat.diffuseTexture = this.waterTexture;
            }
            // Fishing spot gets a small marker buoy
            if (tileId === 10) {
              const buoy = MeshBuilder.CreateBox(`buoy_${r}_${c}`, { width: 0.15, height: 0.4, depth: 0.15 }, this.scene);
              buoy.position = new Vector3(posX + 0.2, 0.25, posZ - 0.1);
              const buoyMat = new StandardMaterial(`buoyMat_${r}_${c}`, this.scene);
              buoyMat.diffuseColor = new Color3(0.9, 0.2, 0.1);
              buoyMat.emissiveColor = new Color3(0.15, 0.03, 0.01);
              buoy.material = buoyMat;
              buoy.parent = this.rootNode;
              this.objectMeshes.push(buoy);
            }
          } else if (tileId === 9) {
            // Crafting Anvil — small metallic box with specular highlight
            const anvil = MeshBuilder.CreateBox(`anvil_${r}_${c}`, { width: tileSize * 0.5, height: tileSize * 0.35, depth: tileSize * 0.4 }, this.scene);
            anvil.position = new Vector3(posX, tileSize * 0.18, posZ);
            const anvilMat = new StandardMaterial(`anvilMat_${r}_${c}`, this.scene);
            anvilMat.diffuseColor = new Color3(0.3, 0.3, 0.35);
            anvilMat.specularColor = new Color3(0.6, 0.6, 0.7);
            anvilMat.specularPower = 24;
            anvil.material = anvilMat;
            anvil.parent = this.rootNode;
            anvil.receiveShadows = true;
            if (this.shadowGen) this.shadowGen.addShadowCaster(anvil);
            this.objectMeshes.push(anvil);
          } else if (tileId === 12) {
            // Base Terminal — glowing pillar
            const pillar = MeshBuilder.CreateBox(`terminal_${r}_${c}`, { width: tileSize * 0.35, height: tileSize * 1.0, depth: tileSize * 0.35 }, this.scene);
            pillar.position = new Vector3(posX, tileSize * 0.5, posZ);
            const pillarMat = new StandardMaterial(`terminalMat_${r}_${c}`, this.scene);
            pillarMat.diffuseColor = new Color3(0.12, 0.15, 0.35);
            pillarMat.emissiveColor = new Color3(0.05, 0.08, 0.25);
            pillarMat.specularColor = new Color3(0.3, 0.4, 0.8);
            pillarMat.specularPower = 48;
            pillar.material = pillarMat;
            pillar.parent = this.rootNode;
            pillar.receiveShadows = true;
            if (this.shadowGen) this.shadowGen.addShadowCaster(pillar);
            this.objectMeshes.push(pillar);
          }
        }
      }
    }

    // Render Map NPCs
    if (npcs) {
      npcs.forEach((npc) => {
        this.updateEntity({
          id: `npc_${npc.id}`,
          name: npc.name || npc.id,
          x: (npc.x - width / 2) * tileSize,
          y: (height / 2 - npc.y) * tileSize,
          isNpc: true,
          spriteUrl: npc.sprite ? `/assets/sprites/${npc.sprite}.png` : '/assets/sprites/villager_1.png'
        });
      });
    }
  }

  private applyTileMaterial(mat: StandardMaterial, tileId: number, r: number = 0, c: number = 0, isBlock: boolean = false) {
    const isAlt = (r + c) % 2 === 0;
    const tone = isAlt ? 0.025 : 0;

    const isIndoor = this.currentMapId && (
      this.currentMapId.includes('HOUSE') ||
      this.currentMapId.includes('BEDROOM') ||
      this.currentMapId.includes('ROOM') ||
      this.currentMapId.includes('LAB') ||
      this.currentMapId.includes('CENTER') ||
      this.currentMapId.includes('DOJO') ||
      this.currentMapId.includes('TOWER') ||
      this.currentMapId.includes('MART') ||
      this.currentMapId.includes('HQ')
    );

    // Specular highlight for all tiles (slight gloss)
    mat.specularColor = new Color3(0.05, 0.05, 0.05);
    mat.specularPower = 32;

    if (isIndoor) {
      if (tileId === 0) {
        if (this.woodFloorTexture) {
          mat.diffuseTexture = this.woodFloorTexture;
        }
        mat.diffuseColor = new Color3(1 + tone, 1 + tone, 1 + tone);
        mat.specularColor = new Color3(0.12, 0.08, 0.04);
        return;
      } else if (tileId === 1) {
        if (isBlock && this.indoorWallTexture) {
          mat.diffuseTexture = this.indoorWallTexture;
        }
        mat.diffuseColor = new Color3(0.85 + tone, 0.88 + tone, 0.92 + tone);
        return;
      }
    }

    switch (tileId) {
      // Safe Grass — lush green
      case 0: mat.diffuseColor = new Color3(0.15 + tone, 0.48 + tone, 0.20 + tone); break;
      // Wall / Boundary — dark stone
      case 1:
        mat.diffuseColor = new Color3(0.22 + tone, 0.24 + tone, 0.26 + tone);
        mat.specularColor = new Color3(0.15, 0.15, 0.15);
        mat.specularPower = 20;
        break;
      // Tall Grass (encounter) — vibrant emerald
      case 2:
      case 3: mat.diffuseColor = new Color3(0.08 + tone, 0.55 + tone, 0.15 + tone); break;
      // Water — animated (handled separately)
      case 4:
        mat.diffuseColor = new Color3(0.15 + tone, 0.42 + tone, 0.72 + tone);
        mat.emissiveColor = new Color3(0.02, 0.06, 0.12);
        mat.specularColor = new Color3(0.5, 0.6, 0.8);
        mat.specularPower = 64;
        break;
      // Woodcutting Tree tile
      case 5: mat.diffuseColor = new Color3(0.12 + tone, 0.38 + tone, 0.18 + tone); break;
      // Ore / Mining
      case 6: mat.diffuseColor = new Color3(0.38 + tone, 0.34 + tone, 0.28 + tone); break;
      // Shop
      case 7:
        mat.diffuseColor = new Color3(0.52 + tone, 0.42 + tone, 0.22 + tone);
        mat.emissiveColor = new Color3(0.05, 0.04, 0.01);
        break;
      // Clinic / Healing
      case 8:
        mat.diffuseColor = new Color3(0.18 + tone, 0.48 + tone, 0.58 + tone);
        mat.emissiveColor = new Color3(0.02, 0.06, 0.08);
        break;
      // Fishing Water
      case 10:
        mat.diffuseColor = new Color3(0.08 + tone, 0.32 + tone, 0.65 + tone);
        mat.emissiveColor = new Color3(0.01, 0.04, 0.10);
        mat.specularColor = new Color3(0.4, 0.5, 0.7);
        mat.specularPower = 48;
        break;
      // Crafting anvil
      case 9:
        mat.diffuseColor = new Color3(0.4 + tone, 0.4 + tone, 0.42 + tone);
        mat.specularColor = new Color3(0.3, 0.3, 0.35);
        mat.specularPower = 40;
        break;
      // Base terminal
      case 12:
        mat.diffuseColor = new Color3(0.08 + tone, 0.1 + tone, 0.22 + tone);
        mat.emissiveColor = new Color3(0.03, 0.05, 0.15);
        break;
      default: mat.diffuseColor = new Color3(0.18 + tone, 0.44 + tone, 0.20 + tone); break;
    }
  }

  public updateSingleTile(r: number, c: number, tileId: number, layerIdx: number = -1, tilesets?: Array<{ firstgid: number; imageSource: string; columns: number; tilewidth: number; tileheight: number; imageheight?: number; tilecount?: number }>) {
    if (layerIdx === -1) {
      const tileMesh = this.scene.getMeshByName(`tile_${r}_${c}`) as Mesh;
      if (tileMesh && tileMesh.material) {
        this.applyTileMaterial(tileMesh.material as StandardMaterial, tileId, r, c);
      }
      return;
    }

    const meshName = `tile_${layerIdx}_${r}_${c}`;
    const tileMesh = this.scene.getMeshByName(meshName) as Mesh;
    if (!tileMesh || !tileMesh.material || !tilesets || tilesets.length === 0) return;

    const sortedTilesets = [...tilesets].sort((a, b) => b.firstgid - a.firstgid);
    const ts = sortedTilesets.find(t => tileId >= t.firstgid);
    if (!ts || !ts.imageSource) return;

    const mat = this.tilesetMaterialCache.get(ts.imageSource);
    if (mat) {
      tileMesh.material = mat;
    }

    const localGid = tileId - ts.firstgid;
    const tsCol = localGid % ts.columns;
    const tsRow = Math.floor(localGid / ts.columns);
    
    // Calculate exact rows if possible
    let estimatedRows = 24;
    const rawSource = ts.imageSource.replace(/^(.*\/tilesets\/|tilesets\/)/i, '');
    const sizes = TILESET_SIZES[rawSource];
    if (sizes && sizes.h && ts.tileheight) {
      estimatedRows = Math.floor(sizes.h / ts.tileheight);
    } else if (ts.imageheight && ts.tileheight) {
      estimatedRows = Math.floor(ts.imageheight / ts.tileheight);
    } else if (ts.tilecount && ts.columns) {
      estimatedRows = Math.ceil(ts.tilecount / ts.columns);
    } else {
      if (ts.imageSource.includes("Terrain")) estimatedRows = 24;
      else if (ts.imageSource.includes("Furniture")) estimatedRows = 11;
      else if (ts.imageSource.includes("Interior_Walls")) estimatedRows = 12;
      else if (ts.imageSource.includes("Interior_Floors")) estimatedRows = 12;
      else if (ts.imageSource.includes("Vegetation")) estimatedRows = 4;
      else estimatedRows = Math.max(16, Math.ceil((localGid + 1) / ts.columns));
    }
    
    // Half-pixel inset to prevent tile edge bleeding/seams
    const imgW = ts.columns * (ts.tilewidth || 16);
    const imgH = estimatedRows * (ts.tileheight || 16);
    const hpU = 0.5 / imgW;
    const hpV = 0.5 / imgH;

    // InvertY = false means Texture (0,0) is Top-Left
    const u0 = tsCol / ts.columns + hpU;
    const u1 = (tsCol + 1) / ts.columns - hpU;
    const v0 = tsRow / estimatedRows + hpV; // Top of tile
    const v1 = (tsRow + 1) / estimatedRows - hpV; // Bottom of tile

    // Plane vertices: 0=Bottom-Left, 1=Bottom-Right, 2=Top-Right, 3=Top-Left
    const uvData = [
      u0, v1, // Bottom-Left Vertex -> Bottom of Tile
      u1, v1, // Bottom-Right Vertex -> Bottom of Tile
      u1, v0, // Top-Right Vertex -> Top of Tile
      u0, v0  // Top-Left Vertex -> Top of Tile
    ];
    tileMesh.setVerticesData(VertexBuffer.UVKind, uvData);
  }

  // --- LOGIC GRID OVERLAY SYSTEM ---

  private logicOverlayMeshes: Mesh[] = [];
  
  public enableLogicGridOverlay(logicGrid: number[][]) {
    if (this.logicOverlayMeshes.length > 0) {
      this.logicOverlayMeshes.forEach(m => m.dispose());
      this.logicOverlayMeshes = [];
    }

    const height = logicGrid.length;
    const width = logicGrid[0]?.length || 0;
    const yOffset = 0.5; // Render high above other layers so it's always clickable/visible

    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const logicId = logicGrid[r]?.[c] || 0;
        
        const plane = MeshBuilder.CreatePlane(`logic_${r}_${c}`, { size: this.currentTileSize }, this.scene);
        plane.rotation.x = Math.PI / 2;
        const posX = (c - width / 2) * this.currentTileSize;
        const posZ = (height / 2 - r) * this.currentTileSize;
        plane.position = new Vector3(posX, yOffset, posZ);
        plane.parent = this.rootNode;
        plane.isPickable = true; // IMPORTANT: intercept clicks

        const mat = new StandardMaterial(`logicMat_${r}_${c}`, this.scene);
        mat.alpha = 0.5; // Semi-transparent
        this.applyLogicMaterialColor(mat, logicId);
        plane.material = mat;
        
        this.logicOverlayMeshes.push(plane);
      }
    }
  }

  public disableLogicGridOverlay() {
    this.logicOverlayMeshes.forEach(m => m.dispose());
    this.logicOverlayMeshes = [];
  }

  public updateLogicTile(r: number, c: number, logicId: number) {
    const plane = this.scene.getMeshByName(`logic_${r}_${c}`) as Mesh;
    if (plane && plane.material) {
      this.applyLogicMaterialColor(plane.material as StandardMaterial, logicId);
    }
  }

  private applyLogicMaterialColor(mat: StandardMaterial, logicId: number) {
    if (logicId === 0) {
      mat.diffuseColor = Color3.FromHexString("#064e3b"); // Walkable (emerald-900)
      mat.alpha = 0.2; // less visible
    } else if (logicId === 1) {
      mat.diffuseColor = Color3.FromHexString("#dc2626"); // Solid (red-600)
      mat.alpha = 0.7;
    } else if (logicId === 2) {
      mat.diffuseColor = Color3.FromHexString("#22c55e"); // Grass (green-500)
      mat.alpha = 0.7;
    } else if (logicId === 3 || logicId === 4) {
      mat.diffuseColor = Color3.FromHexString("#f59e0b"); // Gate (amber)
      mat.alpha = 0.7;
    } else {
      mat.diffuseColor = Color3.FromHexString("#6366f1"); // Other nodes (indigo)
      mat.alpha = 0.6;
    }
  }

  public enableTilePicking(onTileClick: (r: number, c: number, layerIdx?: number) => void) {
    this.scene.onPointerDown = (_evt, pickResult) => {
      if (pickResult.hit && pickResult.pickedMesh) {
        const name = pickResult.pickedMesh.name;
        // Match tile_ with 3 parts (tile_r_c) or 4 parts (tile_layer_r_c) or logic_r_c
        if (name.startsWith('tile_') || name.startsWith('logic_')) {
          const parts = name.split('_');
          if (parts[0] === 'logic') {
            const r = parseInt(parts[1], 10);
            const c = parseInt(parts[2], 10);
            onTileClick(r, c, -2);
          } else if (parts.length === 3) {
            const r = parseInt(parts[1], 10);
            const c = parseInt(parts[2], 10);
            onTileClick(r, c, -1);
          } else if (parts.length === 4) {
            const layerIdx = parseInt(parts[1], 10);
            const r = parseInt(parts[2], 10);
            const c = parseInt(parts[3], 10);
            onTileClick(r, c, layerIdx);
          }
        }
      }
    };
  }

  public disableTilePicking() {
    this.scene.onPointerDown = undefined;
  }

  public updateEntity(entity: BabylonEntityData) {
    let spriteMesh = this.entityMeshes.get(entity.id);
    const targetPos = new Vector3(entity.x, 0.85, entity.y);

    if (!spriteMesh) {
      // Create 2.5D Billboard Sprite Plane
      spriteMesh = MeshBuilder.CreatePlane(
        `entity_${entity.id}`,
        { width: this.currentTileSize * 1.1, height: this.currentTileSize * 1.5 },
        this.scene
      );

      // Initialize Metadata for Animation & Movement
      spriteMesh.metadata = {
        targetPos: targetPos,
        isMoving: entity.isMoving || false,
        animTime: 0,
        direction: entity.direction || 'down',
        isNpc: entity.isNpc || false,
        isPlayer: entity.isPlayer || false,
        isEditor: !!this.scene.onPointerDown // Simple heuristic: if tile picking is enabled, it's dev editor
      };
      
      // Initial position snap
      spriteMesh.position = targetPos;

      // For orthographic 2.5D, fixed tilt is much more stable than billboarding
      spriteMesh.rotation.x = Math.PI / 4;

      const mat = new StandardMaterial(`entityMat_${entity.id}`, this.scene);
      mat.useAlphaFromDiffuseTexture = true;
      mat.transparencyMode = 2; // ALPHATESTANDBLEND
      mat.backFaceCulling = false;

      if (entity.spriteUrl) {
        // Use nearest neighbor (1) sampling mode for crisp pixel art
        const tex = new Texture(entity.spriteUrl, this.scene, true, true, 1);
        tex.hasAlpha = true;

        if (entity.isNpc || entity.isPlayer || entity.spriteUrl.includes('/npc/')) {
          tex.uScale = 1 / 3;
          tex.vScale = 1 / 4;
        }

        mat.diffuseTexture = tex;
      } else if (this.defaultPlayerTexture) {
        mat.diffuseTexture = this.defaultPlayerTexture;
        mat.diffuseTexture.hasAlpha = true;
      }

      spriteMesh.material = mat;
      
      // Simple drop shadow
      const shadow = MeshBuilder.CreatePlane(`shadow_${entity.id}`, { size: this.currentTileSize * 0.8 }, this.scene);
      shadow.rotation.x = Math.PI / 2;
      shadow.position.y = -0.7; // Relative to spriteMesh center
      shadow.parent = spriteMesh;
      
      const shadowMat = new StandardMaterial(`shadowMat_${entity.id}`, this.scene);
      shadowMat.diffuseColor = new Color3(0, 0, 0);
      shadowMat.alpha = 0.3;
      shadowMat.transparencyMode = 2;
      shadowMat.zOffset = -1; // Prevent Z-fighting with floor
      shadow.material = shadowMat;
      this.shadowMeshes.set(entity.id, shadow);

      this.entityMeshes.set(entity.id, spriteMesh);
    } else {
      // Update Metadata
      if (spriteMesh.metadata) {
        spriteMesh.metadata.targetPos = targetPos;
        spriteMesh.metadata.isMoving = entity.isMoving || false;
        spriteMesh.metadata.direction = entity.direction || spriteMesh.metadata.direction;
        spriteMesh.metadata.isEditor = !!this.scene.onPointerDown;
      }

      // Check if sprite URL changed
      const mat = spriteMesh.material as StandardMaterial;
      const tex = mat?.diffuseTexture as Texture;
      const currentUrl = tex?.name;
      
      if (mat) {
        // If the URL changed (and it's not falling back to the default dynamic texture)
        if (entity.spriteUrl && currentUrl !== entity.spriteUrl) {
          // Use nearest neighbor (1) sampling mode
          const newTex = new Texture(entity.spriteUrl, this.scene, true, true, 1);
          newTex.hasAlpha = true;
          
          if (entity.isNpc || entity.isPlayer || entity.spriteUrl.includes('/npc/')) {
            newTex.uScale = 1 / 3;
            newTex.vScale = 1 / 4;
          }
          mat.diffuseTexture = newTex;
        } else if (!entity.spriteUrl && currentUrl !== 'defaultPlayerTex' && this.defaultPlayerTexture) {
          mat.diffuseTexture = this.defaultPlayerTexture;
        }
      }
    }

    // Handle Chat Bubble (Runescape Style - Yellow text, no background)
    let chatBubble = this.chatBubbles.get(entity.id);
    if (entity.chatMessage) {
      if (!chatBubble) {
        // We use a Rectangle as an invisible container to hold the text
        chatBubble = new Rectangle(`chatBubble_${entity.id}`);
        chatBubble.width = '200px';
        chatBubble.height = '40px';
        chatBubble.thickness = 0;
        chatBubble.background = 'transparent';
        
        const text = new TextBlock();
        text.text = entity.chatMessage;
        text.color = '#ffff00'; // Runescape yellow
        text.fontSize = 14;
        text.fontFamily = 'Arial, sans-serif';
        text.fontWeight = 'bold';
        text.textWrapping = true;
        text.shadowColor = 'black';
        text.shadowBlur = 2;
        text.shadowOffsetX = 1;
        text.shadowOffsetY = 1;

        chatBubble.addControl(text);
        this.guiTexture.addControl(chatBubble);
        chatBubble.linkWithMesh(spriteMesh);
        chatBubble.linkOffsetY = -70;

        this.chatBubbles.set(entity.id, chatBubble);
      } else {
        const textBlock = chatBubble.children[0] as TextBlock;
        if (textBlock.text !== entity.chatMessage) {
          textBlock.text = entity.chatMessage;
        }
      }
    } else if (chatBubble) {
      this.guiTexture.removeControl(chatBubble);
      chatBubble.dispose();
      this.chatBubbles.delete(entity.id);
    }
  }

  public removeEntity(id: string) {
    const mesh = this.entityMeshes.get(id);
    if (mesh) {
      mesh.dispose();
      this.entityMeshes.delete(id);
    }
    const shadowBlob = this.shadowMeshes.get(id);
    if (shadowBlob) {
      shadowBlob.dispose();
      this.shadowMeshes.delete(id);
    }
    const chatBubble = this.chatBubbles.get(id);
    if (chatBubble) {
      this.guiTexture.removeControl(chatBubble);
      chatBubble.dispose();
      this.chatBubbles.delete(id);
    }
  }

  public dispose() {
    window.removeEventListener('resize', this.onResize);
    this.stopRenderLoop();
    this.guiTexture.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }
}
