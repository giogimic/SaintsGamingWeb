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
  VertexBuffer,
  VertexData,
  Matrix
} from '@babylonjs/core';
import { AdvancedDynamicTexture, Rectangle, TextBlock } from '@babylonjs/gui';
import { TILESET_SIZES } from "../web/components/the-lobby/data/tileset-sizes";

export interface BabylonMapChunk {
  chunkX: number;
  chunkY: number;
  width: number;
  height: number;
  grid: number[][];
  tileLayers?: Array<{ name: string; grid: number[][] }>;
}

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
  chunks?: BabylonMapChunk[];
}

export interface SpriteSheetConfig {
  columns: number;
  rows: number;
  idleFrame: number;
  walkCycle: number[];
  walkSpeed: number; // frames per sec
  directions: {
    down: number;
    left: number;
    right: number;
    up: number;
    [key: string]: number;
  };
}

export const DEFAULT_SPRITE_CONFIG: SpriteSheetConfig = {
  columns: 3,
  rows: 4,
  idleFrame: 1,
  walkCycle: [0, 1, 2, 1],
  walkSpeed: 6,
  directions: {
    down: 0,
    left: 1,
    right: 2,
    up: 3
  }
};

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
  isCreature?: boolean;
  chatMessage?: string;
  spriteConfig?: SpriteSheetConfig;
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
  public _renderedSockets: Set<string> = new Set();
  public _renderedEntities: Set<string> = new Set();
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

  public onEntityClick?: (entityId: string) => void;

  public getEntityScreenPosition(entityId: string): { x: number, y: number, isVisible: boolean } | null {
    const mesh = this.entityMeshes.get(entityId);
    if (!mesh) return null;
    
    // Project 3D coordinate to screen coordinate (offset up for health bar)
    const pos = Vector3.Project(
      mesh.position.add(new Vector3(0, 1.8, 0)),
      Matrix.Identity(),
      this.scene.getTransformMatrix(),
      this.camera.viewport.toGlobal(this.engine.getRenderWidth(), this.engine.getRenderHeight())
    );
    
    return { x: pos.x, y: pos.y, isVisible: pos.z < 1.0 && pos.z > 0.0 };
  }

  private waterMaterials: StandardMaterial[] = [];
  private guiTexture: AdvancedDynamicTexture;
  private chatBubbles: Map<string, Rectangle> = new Map();
  private shadowGen?: ShadowGenerator;
  private cameraTargetX: number = 0;
  private cameraTargetZ: number = 0;
  private cameraSnapped: boolean = false;
  private selectionRingMesh?: Mesh;
  private activeProjectiles: Map<string, { mesh: Mesh, observer: any }> = new Map();

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

    // Entity Pointer Interaction
    this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === 1) { // PointerEventTypes.POINTERDOWN
        if (pointerInfo.pickInfo?.hit && pointerInfo.pickInfo.pickedMesh) {
          const name = pointerInfo.pickInfo.pickedMesh.name;
          if (name.startsWith('entity_') && this.onEntityClick) {
            const entityId = name.replace('entity_', '');
            this.onEntityClick(entityId);
          }
        }
      }
    });

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
          if (tex && (state.isNpc || state.isPlayer || state.spriteConfig || tex.name.includes('/npc/'))) {
            const config = state.spriteConfig || DEFAULT_SPRITE_CONFIG;
            
            // Update row (direction) - Map top-to-bottom row index (0=down, 1=left, 2=right, 3=up) to Babylon V offset
            const dir = state.direction || 'down';
            const rowIdx = config.directions[dir] ?? config.directions.down;
            tex.vOffset = (config.rows - 1 - rowIdx) * (1 / config.rows);

            // Update column (animation frame)
            if (state.isMoving) {
              state.animTime += deltaTime * config.walkSpeed;
              const frameSeq = config.walkCycle;
              const f = frameSeq[Math.floor(state.animTime) % frameSeq.length];
              tex.uOffset = f * (1 / config.columns);
            } else {
              state.animTime = 0;
              tex.uOffset = config.idleFrame * (1 / config.columns);
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

      const tilesetVertexData: Map<string, { positions: number[], indices: number[], uvs: number[], vertexIndex: number }> = new Map();

      // Normalize input: if chunks aren't provided, treat the base map as a single chunk at 0,0
      const chunksToRender: BabylonMapChunk[] = mapData.chunks?.length 
        ? mapData.chunks 
        : [{
            chunkX: 0, chunkY: 0, 
            width: width, height: height, 
            grid: tiles || [], 
            tileLayers: tileLayers
          }];

      chunksToRender.forEach(chunk => {
        if (!chunk.tileLayers) return;
        
        // Calculate the world-space offset for the center of this chunk
        // Assuming chunkX/Y are grid coordinates where 1 unit = chunkWidth tiles
        const chunkOffsetX = chunk.chunkX * chunk.width * tileSize;
        const chunkOffsetZ = -(chunk.chunkY * chunk.height * tileSize); // -Z is down in our setup

        chunk.tileLayers.forEach((layer, layerIdx) => {
          const heightOffset = layerIdx * 0.02;

          for (let r = 0; r < chunk.height; r++) {
            for (let c = 0; c < chunk.width; c++) {
              const gid = layer.grid[r]?.[c] ?? 0;
              if (gid === 0) continue;

              const ts = sortedTilesets.find(t => gid >= t.firstgid);
              if (!ts || !ts.imageSource) continue;

              // Local position relative to the center of the entire map
              const localX = (c - width / 2) * tileSize;
              const localZ = (height / 2 - r) * tileSize;
              
              // Apply chunk offset
              const posX = localX + chunkOffsetX;
              const posZ = localZ + chunkOffsetZ;

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

            let vData = tilesetVertexData.get(ts.imageSource);
            if (!vData) {
              vData = { positions: [], indices: [], uvs: [], vertexIndex: 0 };
              tilesetVertexData.set(ts.imageSource, vData);
            }

            // Vertices for the quad (flat on XZ plane with Math.PI/2 rotation behavior factored in)
            const x0 = posX - tileSize / 2;
            const x1 = posX + tileSize / 2;
            const z0 = posZ - tileSize / 2;
            const z1 = posZ + tileSize / 2;
            const y = heightOffset;

            // Notice vertex order is adapted so normal points UP (positive Y)
            vData.positions.push(
              x0, y, z1, // Top-left
              x1, y, z1, // Top-right
              x1, y, z0, // Bottom-right
              x0, y, z0  // Bottom-left
            );

            // Match UVs to vertices (u0,v0 is top-left in standard WebGL texture if invertY=false)
            vData.uvs.push(
              u0, v0, // Top-Left
              u1, v0, // Top-Right
              u1, v1, // Bottom-Right
              u0, v1  // Bottom-Left
            );

            // Triangle indices
            const vi = vData.vertexIndex;
            vData.indices.push(
              vi + 0, vi + 2, vi + 1,
              vi + 0, vi + 3, vi + 2
            );
            vData.vertexIndex += 4;
          }
        }
      });
    });

      // Build one mesh per tileset
      tilesetVertexData.forEach((vData, imageSource) => {
        if (vData.vertexIndex === 0) return;
        
        const mesh = new Mesh(`tileset_mesh_${imageSource}`, this.scene);
        
        const vertexData = new VertexData();
        vertexData.positions = vData.positions;
        vertexData.indices = vData.indices;
        vertexData.uvs = vData.uvs;
        
        const normals: number[] = [];
        VertexData.ComputeNormals(vData.positions, vData.indices, normals);
        vertexData.normals = normals;
        
        vertexData.applyToMesh(mesh, false);
        mesh.parent = this.rootNode;
        mesh.receiveShadows = true;

        let mat = this.tilesetMaterialCache.get(imageSource);
        if (!mat) {
          mat = new StandardMaterial(`tileset_${imageSource}`, this.scene);
          let tex = this.tilesetTextureCache.get(imageSource);
          if (!tex) {
            const rawSource = imageSource.replace(/^(.*\/tilesets\/|tilesets\/)/i, '');
            // Encode spaces / special chars (e.g. "core_set pieces.png") so Texture fetch succeeds.
            const tilesetPath = `/game-assets/tilesets/${encodeURIComponent(rawSource)}`;
            tex = new Texture(tilesetPath, this.scene, true, false, 1);
            tex.hasAlpha = true;
            this.tilesetTextureCache.set(imageSource, tex);
          }
          mat.diffuseTexture = tex;
          mat.useAlphaFromDiffuseTexture = true;
          mat.backFaceCulling = false;
          // Subtly enhance color for the classic RPG vibe
          mat.specularColor = new Color3(0.05, 0.05, 0.05);
          mat.specularPower = 32;
          this.tilesetMaterialCache.set(imageSource, mat);
        }
        mesh.material = mat;
        this.tileMeshes.push(mesh);
      });
    } else {
      // Fallback: simple colored grid rendering with 2.5D geometry
      const baseGrounds: Record<number, Mesh> = {};
      const baseObjects: Record<number, Mesh[]> = {};

      for (let r = 0; r < height; r++) {
        for (let c = 0; c < width; c++) {
          const tileId = tiles[r]?.[c] ?? 0;
          const posX = (c - width / 2) * tileSize;
          const posZ = (height / 2 - r) * tileSize;

          // Ground plane base
          let groundBase = baseGrounds[tileId];
          if (!groundBase) {
            groundBase = MeshBuilder.CreatePlane(`base_ground_${tileId}`, { size: tileSize }, this.scene);
            groundBase.rotation.x = Math.PI / 2;
            const mat = new StandardMaterial(`baseMat_${tileId}`, this.scene);
            this.applyTileMaterial(mat, tileId, 0, 0); // Tone variance lost, but it's fine for instancing
            groundBase.material = mat;
            groundBase.receiveShadows = true;
            this.tileMeshes.push(groundBase);
            baseGrounds[tileId] = groundBase;
            groundBase.isVisible = false; // Hide the base mesh
          }

          // Instance the ground
          const inst = groundBase.createInstance(`ground_${r}_${c}`);
          inst.position = new Vector3(posX, 0, posZ);
          inst.parent = this.rootNode;
          
          if (tileId === 4 || tileId === 10) {
            if (groundBase.material && !this.waterMaterials.includes(groundBase.material as StandardMaterial)) {
              this.waterMaterials.push(groundBase.material as StandardMaterial);
              if (this.waterTexture) (groundBase.material as StandardMaterial).diffuseTexture = this.waterTexture;
            }
          }

          // 3D Objects Instancing
          if (tileId === 1 || tileId === 2 || tileId === 3 || tileId === 5 || tileId === 6 || tileId === 7 || tileId === 9 || tileId === 10 || tileId === 11 || tileId === 12) {
            let objs = baseObjects[tileId];
            if (!objs) {
              objs = [];
              if (tileId === 1) {
                const block = MeshBuilder.CreateBox(`base_wall`, { width: tileSize * 0.95, height: tileSize * 0.9, depth: tileSize * 0.95 }, this.scene);
                const wallMat = new StandardMaterial(`baseWallMat`, this.scene);
                this.applyTileMaterial(wallMat, tileId, 0, 0, true);
                block.material = wallMat;
                if (this.shadowGen) this.shadowGen.addShadowCaster(block);
                objs.push(block);
              } else if (tileId === 2 || tileId === 3) {
                for (let t = 0; t < 2; t++) {
                  const tuft = MeshBuilder.CreatePlane(`base_tuft_${t}`, { width: tileSize * 0.85, height: tileSize * 0.75 }, this.scene);
                  tuft.billboardMode = Mesh.BILLBOARDMODE_Y;
                  tuft.rotation.y = t * (Math.PI / 2);
                  const tuftMat = new StandardMaterial(`baseTuftMat`, this.scene);
                  tuftMat.diffuseColor = new Color3(0.1, 0.62, 0.18);
                  tuftMat.emissiveColor = new Color3(0.02, 0.12, 0.04);
                  tuft.material = tuftMat;
                  objs.push(tuft);
                }
              } else if (tileId === 5) {
                const trunk = MeshBuilder.CreateBox(`base_trunk`, { width: 0.3, height: 0.9, depth: 0.3 }, this.scene);
                const trunkMat = new StandardMaterial(`baseTrunkMat`, this.scene);
                trunkMat.diffuseColor = new Color3(0.35, 0.22, 0.12);
                trunk.material = trunkMat;
                if (this.shadowGen) this.shadowGen.addShadowCaster(trunk);
                objs.push(trunk);
                
                const foliage = MeshBuilder.CreatePlane(`base_tree`, { width: tileSize * 1.4, height: tileSize * 1.5 }, this.scene);
                foliage.billboardMode = Mesh.BILLBOARDMODE_Y;
                const treeMat = new StandardMaterial(`baseTreeMat`, this.scene);
                treeMat.diffuseColor = new Color3(0.1, 0.52, 0.2);
                treeMat.emissiveColor = new Color3(0.01, 0.08, 0.02);
                foliage.material = treeMat;
                if (this.shadowGen) this.shadowGen.addShadowCaster(foliage);
                objs.push(foliage);
              } else if (tileId === 6) {
                const ore = MeshBuilder.CreateBox(`base_ore`, { width: tileSize * 0.7, height: tileSize * 0.45, depth: tileSize * 0.7 }, this.scene);
                const oreMat = new StandardMaterial(`baseOreMat`, this.scene);
                oreMat.diffuseColor = new Color3(0.55, 0.45, 0.35);
                oreMat.specularColor = new Color3(0.4, 0.3, 0.2);
                oreMat.emissiveColor = new Color3(0.08, 0.06, 0.03);
                ore.material = oreMat;
                if (this.shadowGen) this.shadowGen.addShadowCaster(ore);
                objs.push(ore);
              } else if (tileId === 10) {
                const buoy = MeshBuilder.CreateBox(`base_buoy`, { width: 0.15, height: 0.4, depth: 0.15 }, this.scene);
                const buoyMat = new StandardMaterial(`baseBuoyMat`, this.scene);
                buoyMat.diffuseColor = new Color3(0.9, 0.2, 0.1);
                buoyMat.emissiveColor = new Color3(0.15, 0.03, 0.01);
                buoy.material = buoyMat;
                objs.push(buoy);
              } else if (tileId === 7) {
                const stall = MeshBuilder.CreateBox(`base_shop`, { width: tileSize * 0.7, height: tileSize * 0.55, depth: tileSize * 0.55 }, this.scene);
                const stallMat = new StandardMaterial(`baseShopMat`, this.scene);
                stallMat.diffuseColor = new Color3(0.72, 0.55, 0.18);
                stallMat.emissiveColor = new Color3(0.1, 0.07, 0.02);
                stall.material = stallMat;
                if (this.shadowGen) this.shadowGen.addShadowCaster(stall);
                objs.push(stall);
              } else if (tileId === 9) {
                const anvil = MeshBuilder.CreateBox(`base_anvil`, { width: tileSize * 0.5, height: tileSize * 0.35, depth: tileSize * 0.4 }, this.scene);
                const anvilMat = new StandardMaterial(`baseAnvilMat`, this.scene);
                anvilMat.diffuseColor = new Color3(0.3, 0.3, 0.35);
                anvilMat.specularColor = new Color3(0.6, 0.6, 0.7);
                anvilMat.specularPower = 24;
                anvil.material = anvilMat;
                if (this.shadowGen) this.shadowGen.addShadowCaster(anvil);
                objs.push(anvil);
              } else if (tileId === 11) {
                const thicket = MeshBuilder.CreateBox(`base_bramble`, { width: tileSize * 0.95, height: tileSize * 0.85, depth: tileSize * 0.95 }, this.scene);
                const brambleMat = new StandardMaterial(`baseBrambleMat`, this.scene);
                brambleMat.diffuseColor = new Color3(0.22, 0.38, 0.12);
                brambleMat.emissiveColor = new Color3(0.04, 0.08, 0.02);
                thicket.material = brambleMat;
                if (this.shadowGen) this.shadowGen.addShadowCaster(thicket);
                objs.push(thicket);
              } else if (tileId === 12) {
                const pillar = MeshBuilder.CreateBox(`base_terminal`, { width: tileSize * 0.35, height: tileSize * 1.0, depth: tileSize * 0.35 }, this.scene);
                const pillarMat = new StandardMaterial(`baseTerminalMat`, this.scene);
                pillarMat.diffuseColor = new Color3(0.12, 0.15, 0.35);
                pillarMat.emissiveColor = new Color3(0.05, 0.08, 0.25);
                pillarMat.specularColor = new Color3(0.3, 0.4, 0.8);
                pillarMat.specularPower = 48;
                pillar.material = pillarMat;
                if (this.shadowGen) this.shadowGen.addShadowCaster(pillar);
                objs.push(pillar);
              }
              
              objs.forEach(o => {
                o.isVisible = false;
                this.objectMeshes.push(o);
              });
              baseObjects[tileId] = objs;
            }

            // Create instances
            if (tileId === 1) {
              const inst = objs[0].createInstance(`wall_${r}_${c}`);
              inst.position = new Vector3(posX, tileSize * 0.45, posZ);
              inst.parent = this.rootNode;
            } else if (tileId === 2 || tileId === 3) {
              objs.forEach((base, i) => {
                const inst = base.createInstance(`tuft_${r}_${c}_${i}`);
                inst.position = new Vector3(posX, tileSize * 0.38, posZ);
                inst.parent = this.rootNode;
              });
            } else if (tileId === 5) {
              const trunkInst = objs[0].createInstance(`trunk_${r}_${c}`);
              trunkInst.position = new Vector3(posX, 0.45, posZ);
              trunkInst.parent = this.rootNode;
              const foliageInst = objs[1].createInstance(`tree_${r}_${c}`);
              foliageInst.position = new Vector3(posX, tileSize * 0.9, posZ);
              foliageInst.parent = this.rootNode;
            } else if (tileId === 6) {
              const oreInst = objs[0].createInstance(`ore_${r}_${c}`);
              oreInst.position = new Vector3(posX, tileSize * 0.22, posZ);
              oreInst.rotation.y = Math.random() * Math.PI;
              oreInst.parent = this.rootNode;
            } else if (tileId === 10) {
              const buoyInst = objs[0].createInstance(`buoy_${r}_${c}`);
              buoyInst.position = new Vector3(posX + 0.2, 0.25, posZ - 0.1);
              buoyInst.parent = this.rootNode;
            } else if (tileId === 7) {
              const shopInst = objs[0].createInstance(`shop_${r}_${c}`);
              shopInst.position = new Vector3(posX, tileSize * 0.28, posZ);
              shopInst.parent = this.rootNode;
            } else if (tileId === 9) {
              const anvilInst = objs[0].createInstance(`anvil_${r}_${c}`);
              anvilInst.position = new Vector3(posX, tileSize * 0.18, posZ);
              anvilInst.parent = this.rootNode;
            } else if (tileId === 11) {
              const brambleInst = objs[0].createInstance(`bramble_${r}_${c}`);
              brambleInst.position = new Vector3(posX, tileSize * 0.42, posZ);
              brambleInst.parent = this.rootNode;
            } else if (tileId === 12) {
              const pillarInst = objs[0].createInstance(`terminal_${r}_${c}`);
              pillarInst.position = new Vector3(posX, tileSize * 0.5, posZ);
              pillarInst.parent = this.rootNode;
            }
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
          // Overworld NPC sheets live under /game-assets/npc/ (not /assets/sprites/).
          spriteUrl: npc.sprite
            ? (String(npc.sprite).startsWith("/") ? npc.sprite : `/game-assets/npc/${npc.sprite}.png`)
            : "/game-assets/npc/professor.png"
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
      // Bramble barrier (Q4)
      case 11:
        mat.diffuseColor = new Color3(0.18 + tone, 0.32 + tone, 0.1 + tone);
        mat.emissiveColor = new Color3(0.03, 0.06, 0.01);
        break;
      // Base terminal
      case 12:
        mat.diffuseColor = new Color3(0.08 + tone, 0.1 + tone, 0.22 + tone);
        mat.emissiveColor = new Color3(0.03, 0.05, 0.15);
        break;
      default: mat.diffuseColor = new Color3(0.18 + tone, 0.44 + tone, 0.20 + tone); break;
    }
  }

  /** Remove decorative prop instances for a cell (bramble/tree/ore after harvest/clear). */
  public clearTileProps(r: number, c: number) {
    if (!this.scene) return;
    const prefixes = [
      `wall_${r}_${c}`,
      `tuft_${r}_${c}`,
      `trunk_${r}_${c}`,
      `tree_${r}_${c}`,
      `ore_${r}_${c}`,
      `buoy_${r}_${c}`,
      `shop_${r}_${c}`,
      `anvil_${r}_${c}`,
      `bramble_${r}_${c}`,
      `terminal_${r}_${c}`,
    ];
    for (const mesh of [...this.scene.meshes]) {
      if (prefixes.some((p) => mesh.name === p || mesh.name.startsWith(`${p}_`))) {
        mesh.dispose();
      }
    }
  }

  public setLogicTile(r: number, c: number, tileId: number) {
    this.clearTileProps(r, c);
    this.updateSingleTile(r, c, tileId, -1);
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

  public getEntityMesh(entityId: string) {
    return this.entityMeshes.get(entityId);
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
        isEditor: !!this.scene.onPointerDown, // Simple heuristic: if tile picking is enabled, it's dev editor
        spriteConfig: entity.spriteConfig || DEFAULT_SPRITE_CONFIG
      };
      
      // Initial position snap
      spriteMesh.position = targetPos;

      // For orthographic 2.5D, fixed tilt is much more stable than billboarding
      spriteMesh.rotation.x = Math.PI / 4;
      
      // Make entities pickable for combat targeting
      spriteMesh.isPickable = true;

      const mat = new StandardMaterial(`entityMat_${entity.id}`, this.scene);
      mat.useAlphaFromDiffuseTexture = true;
      mat.transparencyMode = 2; // ALPHATESTANDBLEND
      mat.backFaceCulling = false;

      if (entity.spriteUrl) {
        // Use nearest neighbor (1) sampling mode for crisp pixel art
        const tex = new Texture(entity.spriteUrl, this.scene, true, true, 1);
        tex.hasAlpha = true;

        if (entity.isNpc || entity.isPlayer || entity.spriteConfig || entity.spriteUrl.includes('/npc/')) {
          const config = entity.spriteConfig || DEFAULT_SPRITE_CONFIG;
          tex.uScale = 1 / config.columns;
          tex.vScale = 1 / config.rows;
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
        if (entity.spriteConfig) {
          spriteMesh.metadata.spriteConfig = entity.spriteConfig;
        }
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
          
          if (entity.isNpc || entity.isPlayer || entity.spriteConfig || entity.spriteUrl.includes('/npc/')) {
            const config = entity.spriteConfig || DEFAULT_SPRITE_CONFIG;
            newTex.uScale = 1 / config.columns;
            newTex.vScale = 1 / config.rows;
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

  // --- COMBAT VISUAL FX ---

  public updateSelectionRing(targetId: string | null) {
    if (!targetId) {
      if (this.selectionRingMesh) {
        this.selectionRingMesh.isVisible = false;
      }
      return;
    }

    const targetMesh = this.entityMeshes.get(targetId);
    if (!targetMesh) return;

    if (!this.selectionRingMesh) {
      // Create a glowing torus for the selection ring
      this.selectionRingMesh = MeshBuilder.CreateTorus('selectionRing', { diameter: this.currentTileSize * 1.5, thickness: 0.1, tessellation: 32 }, this.scene);
      this.selectionRingMesh.rotation.x = 0; // Flat on the ground
      
      const mat = new StandardMaterial('selectionRingMat', this.scene);
      mat.diffuseColor = new Color3(0.2, 0.8, 1.0); // Cyan
      mat.emissiveColor = new Color3(0.2, 0.8, 1.0);
      mat.alpha = 0.8;
      this.selectionRingMesh.material = mat;
      
      // Add a simple rotation animation
      this.scene.onBeforeRenderObservable.add(() => {
        if (this.selectionRingMesh && this.selectionRingMesh.isVisible) {
          this.selectionRingMesh.rotation.y += 0.05;
        }
      });
    }

    this.selectionRingMesh.isVisible = true;
    // Position slightly above the ground to avoid Z-fighting
    this.selectionRingMesh.position = new Vector3(targetMesh.position.x, 0.1, targetMesh.position.z);
  }

  public disposeProjectile(sourceId: string) {
    const proj = this.activeProjectiles.get(sourceId);
    if (proj) {
      this.scene.onBeforeRenderObservable.remove(proj.observer);
      proj.mesh.dispose();
      this.activeProjectiles.delete(sourceId);
    }
  }

  public renderProjectile(sourceId: string, targetId: string, fxType: string, castTimeMs: number) {
    const sourceMesh = this.entityMeshes.get(sourceId);
    const targetMesh = this.entityMeshes.get(targetId);
    
    if (!sourceMesh || !targetMesh) return;

    // Dispose existing if any
    this.disposeProjectile(sourceId);

    // Create projectile (a glowing sphere)
    const projectile = MeshBuilder.CreateSphere(`projectile_${sourceId}`, { diameter: 0.5 }, this.scene);
    projectile.position = new Vector3(sourceMesh.position.x, 1.5, sourceMesh.position.z);
    
    const mat = new StandardMaterial('projectileMat', this.scene);
    mat.diffuseColor = new Color3(1, 0.4, 0.4); // Reddish for Capture Device
    mat.emissiveColor = new Color3(1, 0.2, 0.2);
    projectile.material = mat;

    // Simple animation loop to move the projectile towards the target
    const startTime = performance.now();
    const startPos = projectile.position.clone();
    
    const animObserver = this.scene.onBeforeRenderObservable.add(() => {
      const now = performance.now();
      const progress = Math.min(1, (now - startTime) / castTimeMs);
      
      // Arc interpolation
      const targetPos = new Vector3(targetMesh.position.x, 0.5, targetMesh.position.z);
      
      // Linear interpolation for X and Z
      const currentX = startPos.x + (targetPos.x - startPos.x) * progress;
      const currentZ = startPos.z + (targetPos.z - startPos.z) * progress;
      
      // Parabolic arc for Y (throw arc)
      const peakHeight = 4.0;
      const currentY = startPos.y + (targetPos.y - startPos.y) * progress + Math.sin(progress * Math.PI) * peakHeight;
      
      projectile.position = new Vector3(currentX, currentY, currentZ);
      
      if (progress >= 1.0) {
        // Impact
        this.scene.onBeforeRenderObservable.remove(animObserver);
        this.activeProjectiles.delete(sourceId);
        
        // Simple impact FX (expand and fade)
        const impactObserver = this.scene.onBeforeRenderObservable.add(() => {
          projectile.scaling.scaleInPlace(1.1);
          mat.alpha -= 0.1;
          if (mat.alpha <= 0) {
            this.scene.onBeforeRenderObservable.remove(impactObserver);
            projectile.dispose();
          }
        });
      }
    });

    this.activeProjectiles.set(sourceId, { mesh: projectile, observer: animObserver });
  }

  public renderDamageText(targetId: string, damage: number | string, isCrit: boolean) {
    const targetMesh = this.entityMeshes.get(targetId);
    if (!targetMesh) return;

    // Create a plane for the text
    const plane = MeshBuilder.CreatePlane(`dmgTxt_${Date.now()}`, { width: 2, height: 1 }, this.scene);
    plane.position = targetMesh.position.clone();
    plane.position.y += 2.5; // Start above head
    plane.billboardMode = Mesh.BILLBOARDMODE_ALL; // Always face camera

    // Create dynamic texture
    const dt = new DynamicTexture(`dt_${Date.now()}`, { width: 256, height: 128 }, this.scene, false);
    dt.hasAlpha = true;
    
    const mat = new StandardMaterial(`mat_${Date.now()}`, this.scene);
    mat.diffuseTexture = dt;
    mat.emissiveColor = new Color3(1, 1, 1);
    mat.backFaceCulling = false;
    plane.material = mat;

    const font = isCrit ? "bold 64px Arial" : "bold 48px Arial";
    const color = isCrit ? "yellow" : "white";
    
    // Draw text
    dt.drawText(damage.toString(), null, null, font, color, "transparent", true);

    // Animate: float up and fade out over 1.5s
    const startTime = performance.now();
    const durationMs = 1500;
    
    const observer = this.scene.onBeforeRenderObservable.add(() => {
      const progress = (performance.now() - startTime) / durationMs;
      if (progress >= 1.0) {
        this.scene.onBeforeRenderObservable.remove(observer);
        plane.dispose();
        mat.dispose();
        dt.dispose();
        return;
      }
      
      plane.position.y += 0.02; // Float up
      mat.alpha = 1.0 - progress; // Fade out
    });
  }

  public spawnProjectile(attackerId: string, targetId: string, abilityId: string) {
    const attacker = this.entityMeshes.get(attackerId);
    const target = this.entityMeshes.get(targetId);
    if (!attacker || !target) return;

    const projectileId = `proj_${Date.now()}_${Math.random()}`;
    const mesh = MeshBuilder.CreateSphere(projectileId, { diameter: 0.5 }, this.scene);
    mesh.position = attacker.position.clone();
    mesh.position.y += 1.0; // Shoot from chest height

    const mat = new StandardMaterial(`mat_${projectileId}`, this.scene);
    mat.emissiveColor = new Color3(1, 0.5, 0); // Orange fireball
    mat.diffuseColor = new Color3(1, 0.2, 0);
    mesh.material = mat;

    const targetPos = target.position.clone();
    targetPos.y += 1.0;

    const durationMs = 300;
    const startTime = performance.now();

    const observer = this.scene.onBeforeRenderObservable.add(() => {
      const now = performance.now();
      const progress = Math.min(1.0, (now - startTime) / durationMs);
      
      mesh.position = Vector3.Lerp(attacker.position.clone().add(new Vector3(0, 1.0, 0)), targetPos, progress);

      if (progress >= 1.0) {
        this.scene.onBeforeRenderObservable.remove(observer);
        mesh.dispose();
        mat.dispose();
        this.activeProjectiles.delete(projectileId);
      }
    });

    this.activeProjectiles.set(projectileId, { mesh, observer });
  }

  public renderHealthBar(targetId: string, hpPercent: number) {
    const targetMesh = this.entityMeshes.get(targetId);
    if (!targetMesh) return;

    let hpBarGroup = this.scene.getMeshByName(`hpGroup_${targetId}`);
    let fgMesh = this.scene.getMeshByName(`hpFg_${targetId}`);

    if (!hpBarGroup || !fgMesh) {
      // Create new health bar
      hpBarGroup = MeshBuilder.CreatePlane(`hpGroup_${targetId}`, { width: 1.5, height: 0.2 }, this.scene);
      hpBarGroup.position.y = 2.0; // Above head
      hpBarGroup.parent = targetMesh; // Attach to entity
      hpBarGroup.billboardMode = Mesh.BILLBOARDMODE_ALL;

      const bgMat = new StandardMaterial(`hpBgMat_${targetId}`, this.scene);
      bgMat.diffuseColor = new Color3(0.2, 0.2, 0.2);
      bgMat.emissiveColor = new Color3(0.2, 0.2, 0.2);
      hpBarGroup.material = bgMat;

      fgMesh = MeshBuilder.CreatePlane(`hpFg_${targetId}`, { width: 1.5, height: 0.2 }, this.scene);
      fgMesh.parent = hpBarGroup;
      fgMesh.position.z = -0.01; // Slightly in front of bg

      const fgMat = new StandardMaterial(`hpFgMat_${targetId}`, this.scene);
      fgMat.diffuseColor = new Color3(0.2, 0.8, 0.2); // Green
      fgMat.emissiveColor = new Color3(0.2, 0.8, 0.2);
      fgMesh.material = fgMat;
    }

    // Update width and color based on HP
    fgMesh.scaling.x = Math.max(0.01, hpPercent);
    fgMesh.position.x = -0.75 + (1.5 * fgMesh.scaling.x) / 2; // Keep left-aligned

    const mat = fgMesh.material as StandardMaterial;
    if (hpPercent < 0.2) {
      mat.diffuseColor = new Color3(0.8, 0.1, 0.1); // Red
      mat.emissiveColor = new Color3(0.8, 0.1, 0.1);
    } else if (hpPercent < 0.5) {
      mat.diffuseColor = new Color3(0.8, 0.8, 0.1); // Yellow
      mat.emissiveColor = new Color3(0.8, 0.8, 0.1);
    } else {
      mat.diffuseColor = new Color3(0.2, 0.8, 0.2); // Green
      mat.emissiveColor = new Color3(0.2, 0.8, 0.2);
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
