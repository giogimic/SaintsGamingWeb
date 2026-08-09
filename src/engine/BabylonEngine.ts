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
  Material,
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
import { resolveEntitySpriteUrl } from "../shared/game/creatureCatalog";
import { isTilePickTarget } from "../shared/game/tilePaint";
import {
  ENTITY_GROUND_CLEARANCE,
  clampCameraFocus,
  paintOverlayHeight,
} from "../shared/game/babylonViewHelpers";
import {
  cellBatchKey,
  collapsedQuadPositions,
  groundQuadPositions,
  tileCellWorldPos,
  tilesetUvForGid,
  tilesetUvForOverlayPlane,
  type TilesetUvInput,
} from "../shared/game/tileBatchHelpers";
import {
  AUTHOR_OVERLAY_Y,
  authorOverlayGateMarkers,
  authorOverlayNpcMarkers,
  authorOverlaySpawnMarkers,
  authorOverlayMonsterSpawnerMarkers,
  type AuthorOverlaysInput,
} from "../shared/game/authorOverlays";

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

/** Full-frame portraits / single-image sheets (no 3×4 walk UV slicing). */
export const SINGLE_FRAME_SPRITE_CONFIG: SpriteSheetConfig = {
  columns: 1,
  rows: 1,
  idleFrame: 0,
  walkCycle: [0],
  walkSpeed: 0,
  directions: {
    down: 0,
    left: 0,
    right: 0,
    up: 0
  }
};

/** LimeWire custom NPCs are 1024² portraits — not classic 3×4 walk sheets. */
const SINGLE_FRAME_NPC_SLUGS = [
  "candrift_keeper",
  "capturer_kian",
  "elder_voss",
  "ironwright_kael",
  "scout_mira",
  "soulwarden_aldric",
] as const;

/**
 * True when a sprite URL should render as one full frame (no 3×4 walk UV slicing).
 * Classic Tuxemon /npc/ walk sheets (e.g. adventurer 48×128) stay on DEFAULT_SPRITE_CONFIG.
 * Custom portraits, creature/monster sheets, and *-ow crops are single-frame.
 */
export function isSingleFrameSpriteUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  // Any *-ow crop is a single billboard frame (NPCs + monsters + creatures).
  if (/-ow\.png(?:$|\?)/.test(url)) return true;
  if (url.includes("/creatures/") || url.includes("/world-monsters/")) return true;
  return SINGLE_FRAME_NPC_SLUGS.some(
    (slug) => url.includes(`/npc/${slug}.png`) || url.includes(`/npc/${slug}-ow.png`)
  );
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

  /** Live tilemap dims for world↔tile math (peers / camera) after hot remesh. */
  public getMapWidth(): number {
    return this.currentMapWidth;
  }
  public getMapHeight(): number {
    return this.currentMapHeight;
  }
  private currentTileSize: number = 1;
  private tilesetTextureCache: Map<string, Texture> = new Map();
  private tilesetMaterialCache: Map<string, StandardMaterial> = new Map();
  /** Studio paint overlays — fallback when batched remesh cannot patch a cell. */
  private paintOverlayMeshes: Map<string, Mesh> = new Map();
  /** layerIdx_r_c → quad in a `tileset_mesh_*` (live remesh). */
  private batchedQuadIndex: Map<
    string,
    { imageSource: string; vertexBase: number; layerIdx: number; r: number; c: number }
  > = new Map();
  private tilesetMeshBySource: Map<string, Mesh> = new Map();
  private mapPickPlane?: Mesh;

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
  /** Floating name labels for multiplayer peers (not local player_main). */
  private nameplates: Map<string, Rectangle> = new Map();
  private shadowGen?: ShadowGenerator;
  private cameraTargetX: number = 0;
  private cameraTargetZ: number = 0;
  private cameraSnapped: boolean = false;
  /** When true, camera ignores player follow and accepts editor pan. */
  private editorCameraMode: boolean = false;
  private editorPanPointerId: number | null = null;
  private editorPanLastClientX: number = 0;
  private editorPanLastClientY: number = 0;
  private editorSpaceHeld: boolean = false;
  private editorCameraBookmark: { x: number; z: number; ortho: number } | null = null;
  private onEditorPointerDown = (e: PointerEvent) => this.handleEditorPointerDown(e);
  private onEditorPointerMove = (e: PointerEvent) => this.handleEditorPointerMove(e);
  private onEditorPointerUp = (e: PointerEvent) => this.handleEditorPointerUp(e);
  private onEditorKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space' && !(e.target as HTMLElement)?.closest?.('input,textarea,[contenteditable]')) {
      e.preventDefault();
      this.editorSpaceHeld = true;
    }
  };
  private onEditorAuxClick = (e: MouseEvent) => {
    if (e.button === 1) e.preventDefault();
  };
  private onEditorKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space') this.editorSpaceHeld = false;
  };
  private selectionRingMesh?: Mesh;
  private activeProjectiles: Map<string, { mesh: Mesh, observer: any }> = new Map();
  /** Covers erased cells so batched tileset art disappears without a full remesh. */
  private eraseVoidMaterial?: StandardMaterial;
  /** Adjustable brush radius for multi-tile paint (1 = single tile). */
  private brushRadius: number = 1;
  /** Brush preview overlay meshes. */
  private brushPreviewMeshes: Mesh[] = [];
  private selectionPreviewMeshes: Mesh[] = [];
  /** Editor keyboard pan active keys. */
  private editorPanKeysHeld: Set<string> = new Set();
  private editorPanAnimFrameId: number | null = null;

  /**
   * Ground tilesets are one batched mesh per image. Alpha-*blend* sorts that
   * whole mesh by its center — north of center, sprites + paint overlays draw
   * first and then get buried under the ground. Alpha-*test* writes depth per
   * texel so characters stay above the plane everywhere.
   */
  private configureTilesetMaterial(mat: StandardMaterial) {
    mat.useAlphaFromDiffuseTexture = true;
    mat.transparencyMode = Material.MATERIAL_ALPHATEST;
    mat.alphaCutOff = 0.05;
    mat.forceDepthWrite = true;
    mat.backFaceCulling = false;
    mat.disableLighting = true; // 2D Pixel Art rendering
    mat.specularColor = new Color3(0.05, 0.05, 0.05);
    mat.specularPower = 32;
  }

  private getEraseVoidMaterial(): StandardMaterial {
    if (!this.eraseVoidMaterial) {
      const mat = new StandardMaterial('erase_void_mat', this.scene);
      // Match scene clearColor so GID 0 reads as an empty hole.
      mat.diffuseColor = new Color3(0.02, 0.04, 0.06);
      mat.specularColor = new Color3(0, 0, 0);
      mat.disableLighting = true;
      mat.backFaceCulling = false;
      mat.forceDepthWrite = true;
      this.eraseVoidMaterial = mat;
    }
    return this.eraseVoidMaterial;
  }

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
    this.shadowGen = undefined; // ShadowGenerator disabled in Unlit pixel-art pipeline

    // Window Resize Handler
    window.addEventListener('resize', this.onResize);

    // Camera Mouse Wheel Zoom Handler
    this.canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      const currentOrtho = this.camera.orthoTop || 10;
      // Editor mode allows much further zoom-out for large maps.
      const maxZoom = this.editorCameraMode ? 60 : 22;
      const newOrtho = Math.max(3, Math.min(maxZoom, currentOrtho * zoomFactor));
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

        // 2. UV Frame Cycling (per-mesh vertex UVs — not shared Texture.uScale)
        if (state.spriteConfig) {
          const config = state.spriteConfig as SpriteSheetConfig;
          if (config.columns <= 1 && config.rows <= 1) {
            if (!state.uvFullFrame) {
              this.setSpriteCellUVs(mesh, 0, 0, 1, 1);
              state.uvFullFrame = true;
            }
          } else {
            state.uvFullFrame = false;
            const dir = state.direction || 'down';
            const rowIdx = config.directions[dir] ?? config.directions.down;
            let col = config.idleFrame;
            if (state.isMoving) {
              state.animTime += deltaTime * config.walkSpeed;
              const frameSeq = config.walkCycle;
              col = frameSeq[Math.floor(state.animTime) % frameSeq.length];
            } else {
              state.animTime = 0;
            }
            if (
              state.uvCol !== col ||
              state.uvRow !== rowIdx ||
              state.uvCols !== config.columns ||
              state.uvRows !== config.rows
            ) {
              this.setSpriteCellUVs(mesh, col, rowIdx, config.columns, config.rows);
              state.uvCol = col;
              state.uvRow = rowIdx;
              state.uvCols = config.columns;
              state.uvRows = config.rows;
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
    // Soft edge margin: keep north/south border tiles in frame for avatars + paint.
    const clamped = clampCameraFocus(
      worldX,
      worldZ,
      this.currentMapWidth,
      this.currentMapHeight,
      this.currentTileSize
    );
    worldX = clamped.x;
    worldZ = clamped.z;

    this.cameraTargetX = worldX;
    this.cameraTargetZ = worldZ;
    this.camera.position = new Vector3(worldX, 14, worldZ - 14);
    this.camera.setTarget(new Vector3(worldX, 0, worldZ));
    this.cameraSnapped = true;
  }

  /**
   * Smoothly follow a world position each tick.
   * No-op while editor camera mode is active (engine-editor foundation).
   */
  public setCameraPosition(targetX: number, targetZ: number, lerpFactor: number = 0.08) {
    if (this.editorCameraMode) return;

    const clamped = clampCameraFocus(
      targetX,
      targetZ,
      this.currentMapWidth,
      this.currentMapHeight,
      this.currentTileSize
    );
    targetX = clamped.x;
    targetZ = clamped.z;

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

  public isEditorCameraMode(): boolean {
    return this.editorCameraMode;
  }

  /**
   * Detach player follow and enable middle-mouse / Space+drag pan.
   * Call when entering Studio editor runtime; disable on Playtest.
   */
  public setEditorCameraMode(enabled: boolean) {
    if (this.editorCameraMode === enabled) return;
    this.editorCameraMode = enabled;
    if (enabled) {
      this.editorCameraBookmark = {
        x: this.cameraTargetX,
        z: this.cameraTargetZ,
        ortho: this.camera.orthoTop || 10,
      };
      this.canvas.addEventListener('pointerdown', this.onEditorPointerDown);
      this.canvas.addEventListener('auxclick', this.onEditorAuxClick);
      window.addEventListener('pointermove', this.onEditorPointerMove);
      window.addEventListener('pointerup', this.onEditorPointerUp);
      window.addEventListener('keydown', this.onEditorKeyDown);
      window.addEventListener('keyup', this.onEditorKeyUp);
    } else {
      this.canvas.removeEventListener('pointerdown', this.onEditorPointerDown);
      this.canvas.removeEventListener('auxclick', this.onEditorAuxClick);
      window.removeEventListener('pointermove', this.onEditorPointerMove);
      window.removeEventListener('pointerup', this.onEditorPointerUp);
      window.removeEventListener('keydown', this.onEditorKeyDown);
      window.removeEventListener('keyup', this.onEditorKeyUp);
      this.editorPanPointerId = null;
      this.editorSpaceHeld = false;
      // Resume follow from current focus — do not jump to pre-edit bookmark
      // (author may have panned; Playtest should start from what they see).
      this.cameraSnapped = true;
    }
  }

  /** Restore camera focus saved when editor mode was entered (optional). */
  public restoreEditorCameraBookmark() {
    if (!this.editorCameraBookmark) return;
    const { x, z, ortho } = this.editorCameraBookmark;
    this.updateCameraAspect(ortho);
    this.snapCameraTo(x, z);
  }

  public getCameraFocus(): { x: number; z: number; ortho: number } {
    return {
      x: this.cameraTargetX,
      z: this.cameraTargetZ,
      ortho: this.camera.orthoTop || 10,
    };
  }

  private handleEditorPointerDown(e: PointerEvent) {
    if (!this.editorCameraMode) return;
    const middle = e.button === 1;
    const spaceLeft = e.button === 0 && this.editorSpaceHeld;
    if (!middle && !spaceLeft) return;
    e.preventDefault();
    this.editorPanPointerId = e.pointerId;
    this.editorPanLastClientX = e.clientX;
    this.editorPanLastClientY = e.clientY;
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  private handleEditorPointerMove(e: PointerEvent) {
    if (!this.editorCameraMode || this.editorPanPointerId !== e.pointerId) return;
    const dx = e.clientX - this.editorPanLastClientX;
    const dy = e.clientY - this.editorPanLastClientY;
    this.editorPanLastClientX = e.clientX;
    this.editorPanLastClientY = e.clientY;
    this.panEditorCameraByScreenDelta(dx, dy);
  }

  private handleEditorPointerUp(e: PointerEvent) {
    if (this.editorPanPointerId !== e.pointerId) return;
    this.editorPanPointerId = null;
    try {
      this.canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  /** Screen-pixel drag → world pan (orthographic approx). Unclamped in editor. */
  public panEditorCameraByScreenDelta(dxPx: number, dyPx: number) {
    const h = Math.max(1, this.engine.getRenderHeight());
    const ortho = this.camera.orthoTop || 10;
    // Match isometric view: screen Y maps roughly to world Z with pitch stretch.
    const worldPerPx = (ortho * 2) / h;
    const worldDx = -dxPx * worldPerPx;
    const worldDz = dyPx * worldPerPx * 1.414;
    // Editor pan must reach map edges — do not use play-mode hard clamp.
    this.cameraTargetX += worldDx;
    this.cameraTargetZ += worldDz;
    this.camera.position = new Vector3(this.cameraTargetX, 14, this.cameraTargetZ - 14);
    this.camera.setTarget(new Vector3(this.cameraTargetX, 0, this.cameraTargetZ));
    this.cameraSnapped = true;
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
    this.clearPaintOverlays();
    this.clearAuthorOverlays();
    this.batchedQuadIndex.clear();
    this.tilesetMeshBySource.clear();
    // Stale logic planes would keep the previous map's dimensions; the caller
    // re-enables the overlay after the rebuild.
    this.disableLogicGridOverlay();
    if (this.mapPickPlane) {
      this.mapPickPlane.dispose();
      this.mapPickPlane = undefined;
    }
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

      // Group meshes by imageSource AND chunk (32x32)
      const tilesetVertexData: Map<string, { positions: number[], indices: number[], uvs: number[], vertexIndex: number }> = new Map();
      const CHUNK_SIZE = 32;

      // Normalize input: if chunks aren't provided, treat the base map as a single chunk at 0,0
      const chunksToRender: BabylonMapChunk[] = mapData.chunks?.length 
        ? mapData.chunks 
        : [{
            chunkX: 0, chunkY: 0, 
            width: width, height: height, 
            grid: tiles || [], 
            tileLayers: tileLayers
          }];

      // Ensure we treat the map as 32x32 chunks, regardless of input structure
      const processTile = (r: number, c: number, absR: number, absC: number, layer: any, layerIdx: number, chunkOffsetX: number, chunkOffsetZ: number) => {
        const gid = layer.grid[r]?.[c] ?? 0;
        if (gid === 0) return;

        const ts = sortedTilesets.find((t: any) => gid >= t.firstgid);
        if (!ts || !ts.imageSource) return;

        // Determine which 32x32 chunk this tile belongs to
        const chunkR = Math.floor(absR / CHUNK_SIZE);
        const chunkC = Math.floor(absC / CHUNK_SIZE);
        const chunkKey = `${ts.imageSource}_${chunkR}_${chunkC}`;

        const localX = (c - width / 2) * tileSize;
        const localZ = (height / 2 - r) * tileSize;
        const posX = localX + chunkOffsetX;
        const posZ = localZ + chunkOffsetZ;
        const y = layerIdx * 0.02;

        const uvPair = tilesetUvForGid(gid, ts, TILESET_SIZES);

        let vData = tilesetVertexData.get(chunkKey);
        if (!vData) {
          vData = { positions: [], indices: [], uvs: [], vertexIndex: 0 };
          tilesetVertexData.set(chunkKey, vData);
        }

        vData.positions.push(...groundQuadPositions(posX, posZ, y, tileSize));
        vData.uvs.push(...uvPair);

        const vi = vData.vertexIndex;
        vData.indices.push(
          vi + 0, vi + 1, vi + 2,
          vi + 0, vi + 2, vi + 3
        );
        
        this.batchedQuadIndex.set(cellBatchKey(layerIdx, absR, absC), {
          imageSource: ts.imageSource,
          vertexBase: vi,
          layerIdx,
          r: absR,
          c: absC,
        });
        vData.vertexIndex += 4;
      };

      chunksToRender.forEach(chunk => {
        if (!chunk.tileLayers) return;
        
        const chunkOffsetX = chunk.chunkX * chunk.width * tileSize;
        const chunkOffsetZ = -(chunk.chunkY * chunk.height * tileSize);

        chunk.tileLayers.forEach((layer, layerIdx) => {
          for (let r = 0; r < chunk.height; r++) {
            const absR = chunk.chunkY * chunk.height + r;
            for (let c = 0; c < chunk.width; c++) {
              const absC = chunk.chunkX * chunk.width + c;
              processTile(r, c, absR, absC, layer, layerIdx, chunkOffsetX, chunkOffsetZ);
            }
          }
        });
      });

      let totalTilesMeshed = 0;

      tilesetVertexData.forEach((data, chunkKey) => {
        const parts = chunkKey.split('_');
        const chunkC = parts.pop();
        const chunkR = parts.pop();
        const imageSource = parts.join('_');

        if (data.vertexIndex === 0) return;
        totalTilesMeshed += data.vertexIndex / 4;
        
        const mesh = new Mesh(`tileset_mesh_${chunkKey}`, this.scene);
        
        const vertexData = new VertexData();
        vertexData.positions = data.positions;
        vertexData.indices = data.indices;
        vertexData.uvs = data.uvs;
        
        const normals: number[] = [];
        VertexData.ComputeNormals(data.positions, data.indices, normals);
        vertexData.normals = normals;
        
        // Updatable so Studio paint can patch UV/positions without remount.
        vertexData.applyToMesh(mesh, true);
        mesh.parent = this.rootNode;

        let mat = this.tilesetMaterialCache.get(imageSource);
        if (!mat) {
          mat = new StandardMaterial(`tileset_${imageSource}`, this.scene);
          let tex = this.tilesetTextureCache.get(imageSource);
          if (!tex) {
            let rawSource = imageSource.replace(/^(.*\/tilesets\/|tilesets\/)/i, '');
            // Fix legacy lowercase DB entries for Linux case-sensitive filesystems
            const caseFixes: Record<string, string> = {
              'terrain_by_george.png': 'Terrain_by_George.png',
              'furniture_and_fittings_by_george.png': 'Furniture_and_Fittings_by_George.png',
              'interior_walls_by_george.png': 'Interior_Walls_by_George.png',
              'interior_floors_by_george.png': 'Interior_Floors_by_George.png',
              'vegetation_and_outdoor_fittings_by_george.png': 'Vegetation_and_Outdoor_Fittings_by_George.png'
            };
            if (caseFixes[rawSource.toLowerCase()]) {
              rawSource = caseFixes[rawSource.toLowerCase()];
            }
            
            // Encode spaces / special chars (e.g. "core_set pieces.png") so Texture fetch succeeds.
            const tilesetPath = `/game-assets/tilesets/${encodeURIComponent(rawSource)}`;
            console.log(`[BabylonEngine] Requesting texture: ${tilesetPath}`);
            tex = new Texture(tilesetPath, this.scene, true, false, 1);
            tex.onLoadObservable.add(() => console.log(`[BabylonEngine] Texture loaded SUCCESS: ${tilesetPath}`));
            tex.hasAlpha = true;
            this.tilesetTextureCache.set(imageSource, tex);
          }
          mat.diffuseTexture = tex;
          this.configureTilesetMaterial(mat);
          this.tilesetMaterialCache.set(imageSource, mat);
        } else {
          // Re-apply in case an older cache entry still used alpha-blend.
          this.configureTilesetMaterial(mat);
        }
        mesh.material = mat;
        // Pick through map_pick_plane only — batched alpha meshes mis-hit cells.
        mesh.isPickable = false;
        this.tileMeshes.push(mesh);
        this.tilesetMeshBySource.set(chunkKey, mesh);
      });

      console.log(`[BabylonEngine] loadTilemap complete. Meshed ${totalTilesMeshed} tiles across ${tilesetVertexData.size} chunks.`);
      console.log(`[BabylonEngine] Camera position:`, this.camera.position, `Ortho dims:`, {
        left: this.camera.orthoLeft,
        right: this.camera.orthoRight,
        top: this.camera.orthoTop,
        bottom: this.camera.orthoBottom
      });
      console.log(`[BabylonEngine] Tilesets config:`, tilesets);
      console.log(`[BabylonEngine] Canvas size:`, this.canvas.width, this.canvas.height);
    }

    // If rich layers were all GID 0 (or failed), fall back to colored logic grid.
    // Otherwise Studio shows only scene clearColor (near-black) — DEMO after PR #20.
    if (this.tileMeshes.length === 0) {
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

    // Invisible full-map pick plane — batched `tileset_mesh_*` quads skip empty
    // cells and are non-pickable; this plane is the sole click authority.
    const pickW = width * tileSize;
    const pickH = height * tileSize;
    const pickPlane = MeshBuilder.CreateGround(
      'map_pick_plane',
      { width: pickW, height: pickH },
      this.scene
    );
    // Slightly above y=0 so the ray hits even when ground quads write depth.
    pickPlane.position = new Vector3(0, 0.001, 0);
    pickPlane.parent = this.rootNode;
    pickPlane.isPickable = true;
    pickPlane.isVisible = false;
    pickPlane.visibility = 0;
    this.mapPickPlane = pickPlane;
    this.tileMeshes.push(pickPlane);

    // Render Map NPCs (prefer absolute /game-assets paths; never /assets/sprites/)
    if (npcs) {
      npcs.forEach((npc) => {
        const rawId = String(npc.id || "villager");
        const entityId = rawId.startsWith("npc_") ? rawId : `npc_${rawId}`;
        this.updateEntity({
          id: entityId,
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
    mat.disableLighting = true; // 2D Pixel Art rendering
    mat.emissiveColor = new Color3(1, 1, 1);

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

  private clearPaintOverlays() {
    this.paintOverlayMeshes.forEach((m) => m.dispose());
    this.paintOverlayMeshes.clear();
  }

  /** Convert world XZ (root-local) to tile row/col. Uses center-of-cell alignment. */
  public worldToTile(worldX: number, worldZ: number): { r: number; c: number } | null {
    const w = this.currentMapWidth;
    const h = this.currentMapHeight;
    const s = this.currentTileSize || 1;
    if (!w || !h) return null;
    // Center-aligned: the pick point at the center of tile (r,c) should map exactly to (r,c).
    // Tile centers in world space: x = (c - w/2 + 0.5) * s, z = (h/2 - r - 0.5) * s
    const c = Math.floor(worldX / s + w / 2);
    const r = Math.floor(h / 2 - worldZ / s);
    if (r < 0 || c < 0 || r >= h || c >= w) return null;
    return { r, c };
  }

  private disposePaintOverlay(key: string) {
    const overlay = this.paintOverlayMeshes.get(key);
    if (!overlay) return;
    overlay.dispose();
    this.paintOverlayMeshes.delete(key);
  }

  private ensureTilesetMesh(imageSource: string, chunkR: number, chunkC: number): Mesh {
    const chunkKey = `${imageSource}_${chunkR}_${chunkC}`;
    const existing = this.tilesetMeshBySource.get(chunkKey);
    if (existing && !existing.isDisposed()) return existing;

    const mesh = new Mesh(`tileset_mesh_${chunkKey}`, this.scene);
    mesh.parent = this.rootNode;
    mesh.isPickable = false;

    let mat = this.tilesetMaterialCache.get(imageSource);
    if (!mat) {
      mat = new StandardMaterial(`tileset_${imageSource}`, this.scene);
      let tex = this.tilesetTextureCache.get(imageSource);
      if (!tex) {
        const rawSource = imageSource.replace(/^(.*\/tilesets\/|tilesets\/)/i, '');
        const tilesetPath = `/game-assets/tilesets/${encodeURIComponent(rawSource)}`;
        tex = new Texture(tilesetPath, this.scene, true, false, 1);
        tex.hasAlpha = true;
        this.tilesetTextureCache.set(imageSource, tex);
      }
      mat.diffuseTexture = tex;
      this.configureTilesetMaterial(mat);
      this.tilesetMaterialCache.set(imageSource, mat);
    } else {
      this.configureTilesetMaterial(mat);
    }
    mesh.material = mat;
    mesh.setVerticesData(VertexBuffer.PositionKind, [], true);
    mesh.setVerticesData(VertexBuffer.UVKind, [], true);
    mesh.setVerticesData(VertexBuffer.NormalKind, [], true);
    mesh.setIndices([]);
    this.tileMeshes.push(mesh);
    this.tilesetMeshBySource.set(chunkKey, mesh);
    return mesh;
  }

  private collapseBatchedQuad(ref: {
    imageSource: string;
    vertexBase: number;
    r: number;
    c: number;
  }) {
    const chunkR = Math.floor(ref.r / 32);
    const chunkC = Math.floor(ref.c / 32);
    const chunkKey = `${ref.imageSource}_${chunkR}_${chunkC}`;
    const mesh = this.tilesetMeshBySource.get(chunkKey);
    if (!mesh || mesh.isDisposed()) return;
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
    if (!positions) return;
    const collapsed = collapsedQuadPositions();
    const offset = ref.vertexBase * 3;
    for (let i = 0; i < 12; i++) {
      positions[offset + i] = collapsed[i]!;
    }
    mesh.updateVerticesData(VertexBuffer.PositionKind, positions);
  }

  private writeBatchedQuad(
    ref: { imageSource: string; vertexBase: number; r: number; c: number },
    positions: number[],
    uvs: number[]
  ) {
    const chunkKey = `${ref.imageSource}_${Math.floor(ref.r / 32)}_${Math.floor(ref.c / 32)}`;
    const mesh = this.tilesetMeshBySource.get(chunkKey);
    if (!mesh || mesh.isDisposed()) return;
    const posData = mesh.getVerticesData(VertexBuffer.PositionKind);
    const uvData = mesh.getVerticesData(VertexBuffer.UVKind);
    if (!posData || !uvData) return;
    const pOff = ref.vertexBase * 3;
    const uOff = ref.vertexBase * 2;
    for (let i = 0; i < 12; i++) posData[pOff + i] = positions[i]!;
    for (let i = 0; i < 8; i++) uvData[uOff + i] = uvs[i]!;
    mesh.updateVerticesData(VertexBuffer.PositionKind, posData);
    mesh.updateVerticesData(VertexBuffer.UVKind, uvData);
  }

  private appendBatchedQuad(
    imageSource: string,
    positions: number[],
    uvs: number[],
    layerIdx: number,
    r: number,
    c: number
  ): { imageSource: string; vertexBase: number; layerIdx: number; r: number; c: number } | null {
    const chunkR = Math.floor(r / 32);
    const chunkC = Math.floor(c / 32);
    const mesh = this.ensureTilesetMesh(imageSource, chunkR, chunkC);
    const posData = Array.from(mesh.getVerticesData(VertexBuffer.PositionKind) || []);
    const uvData = Array.from(mesh.getVerticesData(VertexBuffer.UVKind) || []);
    const idxData = Array.from(mesh.getIndices() || []);
    const vertexBase = posData.length / 3;
    posData.push(...positions);
    uvData.push(...uvs);
    idxData.push(
      vertexBase + 0,
      vertexBase + 2,
      vertexBase + 1,
      vertexBase + 0,
      vertexBase + 3,
      vertexBase + 2
    );
    const normals: number[] = [];
    VertexData.ComputeNormals(posData, idxData, normals);
    mesh.setVerticesData(VertexBuffer.PositionKind, posData, true);
    mesh.setVerticesData(VertexBuffer.UVKind, uvData, true);
    mesh.setVerticesData(VertexBuffer.NormalKind, normals, true);
    mesh.setIndices(idxData);
    return { imageSource, vertexBase, layerIdx, r, c };
  }

  /**
   * Patch a cell on `tileset_mesh_*` in place (paint / erase / overpaint).
   * Returns false when there is no batched mesh path (caller may use overlays).
   */
  private patchBatchedTile(
    r: number,
    c: number,
    tileId: number,
    layerIdx: number,
    tilesets?: TilesetUvInput[]
  ): boolean {
    if (this.tilesetMeshBySource.size === 0 && this.batchedQuadIndex.size === 0) {
      return false;
    }
    const key = cellBatchKey(layerIdx, r, c);
    this.disposePaintOverlay(key);
    const existing = this.batchedQuadIndex.get(key);

    if (!tileId) {
      if (existing) {
        this.collapseBatchedQuad(existing);
        this.batchedQuadIndex.delete(key);
      }
      return true;
    }

    if (!tilesets || tilesets.length === 0) return false;
    const sortedTilesets = [...tilesets].sort((a, b) => b.firstgid - a.firstgid);
    const ts = sortedTilesets.find((t) => tileId >= t.firstgid);
    if (!ts?.imageSource) return false;

    const uvs = tilesetUvForGid(tileId, ts, TILESET_SIZES);
    const tileSize = this.currentTileSize || 1;
    const { posX, posZ } = tileCellWorldPos(
      r,
      c,
      this.currentMapWidth,
      this.currentMapHeight,
      tileSize
    );
    const y = layerIdx * 0.02;
    const positions = groundQuadPositions(posX, posZ, y, tileSize);

    if (existing && existing.imageSource === ts.imageSource) {
      this.writeBatchedQuad(existing, positions, uvs);
      return true;
    }

    if (existing) {
      this.collapseBatchedQuad(existing);
      this.batchedQuadIndex.delete(key);
    }

    const ref = this.appendBatchedQuad(ts.imageSource, positions, uvs, layerIdx, r, c);
    if (!ref) return false;
    this.batchedQuadIndex.set(key, ref);
    return true;
  }

  /**
   * Paint / update a visual tile. Prefers in-place batched remesh; falls back
   * to per-cell overlay planes when no `tileset_mesh_*` exists.
   */
  public updateSingleTile(r: number, c: number, tileId: number, layerIdx: number = -1, tilesets?: Array<{ firstgid: number; imageSource: string; columns: number; tilewidth: number; tileheight: number; imageheight?: number; tilecount?: number }>) {
    if (layerIdx === -1) {
      const tileMesh = this.scene.getMeshByName(`tile_${r}_${c}`) as Mesh;
      if (tileMesh && tileMesh.material) {
        this.applyTileMaterial(tileMesh.material as StandardMaterial, tileId, r, c);
      }
      return;
    }

    const meshName = `tile_${layerIdx}_${r}_${c}`;
    const legacyMesh = this.scene.getMeshByName(meshName) as Mesh | null;

    // Live remesh — mutate batched quads so Save/reload matches what you paint.
    if (this.patchBatchedTile(r, c, tileId, layerIdx, tilesets)) {
      if (legacyMesh) {
        legacyMesh.isVisible = !!tileId;
      }
      return;
    }

    // Erase → cover leftover art with a void plate (no batched mesh path).
    if (!tileId) {
      const key = cellBatchKey(layerIdx, r, c);
      let overlay = this.paintOverlayMeshes.get(key);
      const tileSize = this.currentTileSize || 1;
      const posX = (c - this.currentMapWidth / 2) * tileSize;
      const posZ = (this.currentMapHeight / 2 - r) * tileSize;
      const y = paintOverlayHeight(layerIdx);

      if (!overlay) {
        overlay = MeshBuilder.CreatePlane(
          `paint_${layerIdx}_${r}_${c}`,
          { size: tileSize, updatable: true },
          this.scene
        );
        overlay.rotation.x = Math.PI / 2;
        overlay.parent = this.rootNode;
        overlay.isPickable = false;
        this.paintOverlayMeshes.set(key, overlay);
      }
      overlay.position = new Vector3(posX, y, posZ);
      overlay.material = this.getEraseVoidMaterial();
      overlay.isVisible = true;

      if (legacyMesh) {
        legacyMesh.isVisible = false;
      }
      return;
    }

    if (!tilesets || tilesets.length === 0) {
      if (legacyMesh && legacyMesh.material) {
        this.applyTileMaterial(legacyMesh.material as StandardMaterial, tileId, r, c);
      }
      return;
    }

    const sortedTilesets = [...tilesets].sort((a, b) => b.firstgid - a.firstgid);
    const ts = sortedTilesets.find((t) => tileId >= t.firstgid);
    if (!ts || !ts.imageSource) return;

    const uvData = tilesetUvForOverlayPlane(tileId, ts, TILESET_SIZES);

    // Prefer legacy per-tile mesh when present (fallback renderer).
    if (legacyMesh) {
      let mat = this.tilesetMaterialCache.get(ts.imageSource);
      if (!mat) {
        mat = new StandardMaterial(`tileset_${ts.imageSource}`, this.scene);
        let tex = this.tilesetTextureCache.get(ts.imageSource);
        if (!tex) {
          const rawSource = ts.imageSource.replace(/^(.*\/tilesets\/|tilesets\/)/i, '');
          const tilesetPath = `/game-assets/tilesets/${encodeURIComponent(rawSource)}`;
          tex = new Texture(tilesetPath, this.scene, true, false, 1);
          tex.hasAlpha = true;
          this.tilesetTextureCache.set(ts.imageSource, tex);
        }
        mat.diffuseTexture = tex;
        this.configureTilesetMaterial(mat);
        this.tilesetMaterialCache.set(ts.imageSource, mat);
      } else {
        this.configureTilesetMaterial(mat);
      }
      legacyMesh.material = mat;
      legacyMesh.isVisible = true;
      try {
        legacyMesh.markVerticesDataAsUpdatable(VertexBuffer.UVKind, true);
      } catch { /* ignore */ }
      legacyMesh.setVerticesData(VertexBuffer.UVKind, uvData, true);
      return;
    }

    // Overlay fallback when no batched mesh exists yet.
    const key = cellBatchKey(layerIdx, r, c);
    let overlay = this.paintOverlayMeshes.get(key);
    const tileSize = this.currentTileSize || 1;
    const posX = (c - this.currentMapWidth / 2) * tileSize;
    const posZ = (this.currentMapHeight / 2 - r) * tileSize;
    const y = paintOverlayHeight(layerIdx);

    if (!overlay) {
      overlay = MeshBuilder.CreatePlane(
        `paint_${layerIdx}_${r}_${c}`,
        { size: tileSize, updatable: true },
        this.scene
      );
      overlay.rotation.x = Math.PI / 2;
      overlay.parent = this.rootNode;
      overlay.isPickable = false;
      this.paintOverlayMeshes.set(key, overlay);
    }

    overlay.position = new Vector3(posX, y, posZ);

    let mat = this.tilesetMaterialCache.get(ts.imageSource);
    if (!mat) {
      mat = new StandardMaterial(`tileset_${ts.imageSource}`, this.scene);
      let tex = this.tilesetTextureCache.get(ts.imageSource);
      if (!tex) {
        const rawSource = ts.imageSource.replace(/^(.*\/tilesets\/|tilesets\/)/i, '');
        const tilesetPath = `/game-assets/tilesets/${encodeURIComponent(rawSource)}`;
        tex = new Texture(tilesetPath, this.scene, true, false, 1);
        tex.hasAlpha = true;
        this.tilesetTextureCache.set(ts.imageSource, tex);
      }
      mat.diffuseTexture = tex;
      this.configureTilesetMaterial(mat);
      this.tilesetMaterialCache.set(ts.imageSource, mat);
    } else {
      this.configureTilesetMaterial(mat);
    }
    overlay.material = mat;
    try {
      overlay.markVerticesDataAsUpdatable(VertexBuffer.UVKind, true);
    } catch { /* ignore */ }
    overlay.setVerticesData(VertexBuffer.UVKind, uvData, true);
  }

  // --- AUTHOR OVERLAYS (editor-only; never serialized) ---

  private authorOverlayMeshes: Mesh[] = [];
  private authorOverlayMats: Partial<Record<"gate" | "npc" | "spawn" | "monster_spawner", StandardMaterial>> = {};

  private getAuthorOverlayMaterial(kind: "gate" | "npc" | "spawn" | "monster_spawner"): StandardMaterial {
    let mat = this.authorOverlayMats[kind];
    if (mat) return mat;
    mat = new StandardMaterial(`author_overlay_${kind}`, this.scene);
    mat.emissiveColor =
      kind === "gate"
        ? new Color3(0.95, 0.55, 0.15)
        : kind === "npc"
          ? new Color3(0.35, 0.75, 1.0)
          : kind === "monster_spawner"
            ? new Color3(1.0, 0.35, 0.35)
            : new Color3(0.45, 0.95, 0.45);
    mat.diffuseColor = mat.emissiveColor;
    mat.alpha = 0.55;
    mat.backFaceCulling = false;
    mat.disableLighting = true;
    this.authorOverlayMats[kind] = mat;
    return mat;
  }

  public clearAuthorOverlays() {
    this.authorOverlayMeshes.forEach((m) => m.dispose());
    this.authorOverlayMeshes = [];
  }

  /**
   * Rebuild editor-only warp / NPC / spawn-pin markers.
   * Pass null to clear. Meshes are pick-through (`isPickable = false`).
   */
  public setAuthorOverlays(input: AuthorOverlaysInput | null) {
    this.clearAuthorOverlays();
    if (!input) return;

    const tileSize = this.currentTileSize || 1;
    const markers = [
      ...authorOverlayGateMarkers(input.gates),
      ...(input.showGateSpawns
        ? authorOverlaySpawnMarkers(input.spawnSourceGates ?? input.gates)
        : []),
      ...authorOverlayNpcMarkers(input.npcs),
      ...authorOverlayMonsterSpawnerMarkers(input.monsterSpawners),
    ];

    for (const m of markers) {
      const { posX, posZ } = tileCellWorldPos(
        m.y,
        m.x,
        this.currentMapWidth,
        this.currentMapHeight,
        tileSize
      );
      const size = tileSize * (m.kind === "spawn" ? 0.45 : 0.7);
      const plane = MeshBuilder.CreatePlane(
        `author_${m.kind}_${m.key}`,
        { size },
        this.scene
      );
      plane.rotation.x = Math.PI / 2;
      plane.position = new Vector3(posX, AUTHOR_OVERLAY_Y, posZ);
      plane.parent = this.rootNode;
      plane.isPickable = false;
      plane.material = this.getAuthorOverlayMaterial(m.kind);
      this.authorOverlayMeshes.push(plane);
    }
  }

  // --- LOGIC GRID OVERLAY SYSTEM ---

  private logicOverlayMeshes: Mesh[] = [];
  /** One material per logic id instead of one per cell — a 30×30 map used to
   *  build 900 materials, which stalled every switch to the Logic layer. */
  private logicMaterialCache: Map<number, StandardMaterial> = new Map();

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
        plane.material = this.getLogicMaterial(logicId);

        this.logicOverlayMeshes.push(plane);
      }
    }
  }

  public disableLogicGridOverlay() {
    this.logicOverlayMeshes.forEach(m => m.dispose());
    this.logicOverlayMeshes = [];
  }

  /** True once `enableLogicGridOverlay` has built the pickable logic planes. */
  public hasLogicGridOverlay(): boolean {
    return this.logicOverlayMeshes.length > 0;
  }

  /**
   * Recolour one logic cell. Returns false when the overlay is not built, so the
   * caller can rebuild it rather than leave the click with no visible result.
   */
  public updateLogicTile(r: number, c: number, logicId: number): boolean {
    const plane = this.scene.getMeshByName(`logic_${r}_${c}`) as Mesh | null;
    if (!plane) return false;
    plane.material = this.getLogicMaterial(logicId);
    return true;
  }

  private getLogicMaterial(logicId: number): StandardMaterial {
    const cached = this.logicMaterialCache.get(logicId);
    if (cached) return cached;
    const mat = new StandardMaterial(`logicMat_${logicId}`, this.scene);
    this.applyLogicMaterialColor(mat, logicId);
    this.logicMaterialCache.set(logicId, mat);
    return mat;
  }

  private applyLogicMaterialColor(mat: StandardMaterial, logicId: number) {
    mat.disableLighting = true;
    // Distinct, readable Studio colors (walkable stays visible enough to confirm paint).
    if (logicId === 0) {
      mat.diffuseColor = Color3.FromHexString("#10b981");
      mat.alpha = 0.38;
    } else if (logicId === 1) {
      mat.diffuseColor = Color3.FromHexString("#dc2626");
      mat.alpha = 0.72;
    } else if (logicId === 2) {
      mat.diffuseColor = Color3.FromHexString("#22c55e");
      mat.alpha = 0.7;
    } else if (logicId === 3 || logicId === 4) {
      mat.diffuseColor = Color3.FromHexString("#f59e0b");
      mat.alpha = 0.72;
    } else if (logicId === 5) {
      mat.diffuseColor = Color3.FromHexString("#92400e");
      mat.alpha = 0.7;
    } else if (logicId === 6) {
      mat.diffuseColor = Color3.FromHexString("#78716c");
      mat.alpha = 0.7;
    } else if (logicId === 7) {
      mat.diffuseColor = Color3.FromHexString("#eab308");
      mat.alpha = 0.7;
    } else if (logicId === 8) {
      mat.diffuseColor = Color3.FromHexString("#ec4899");
      mat.alpha = 0.7;
    } else if (logicId === 9) {
      mat.diffuseColor = Color3.FromHexString("#64748b");
      mat.alpha = 0.7;
    } else if (logicId === 10) {
      mat.diffuseColor = Color3.FromHexString("#0284c7");
      mat.alpha = 0.7;
    } else if (logicId === 11) {
      mat.diffuseColor = Color3.FromHexString("#3f6212");
      mat.alpha = 0.72;
    } else if (logicId === 12) {
      mat.diffuseColor = Color3.FromHexString("#4338ca");
      mat.alpha = 0.7;
    } else {
      // Stable hash so custom tags stay visually distinct.
      const hue = ((logicId * 47) % 360) / 360;
      mat.diffuseColor = Color3.FromHSV(hue * 360, 0.65, 0.9);
      mat.alpha = 0.62;
    }
  }

private resolveTilePick(
    pickResult: { hit?: boolean; pickedMesh?: { name: string } | null; pickedPoint?: { x: number; z: number } | null } | null
  ): { r: number; c: number; layerIdx: number } | null {
    if (!pickResult?.hit || !pickResult.pickedMesh) return null;

    const name = pickResult.pickedMesh.name;

    // Prefer named logic / legacy per-tile meshes when present.
    if (name.startsWith('logic_') || name.startsWith('tile_')) {
      const parts = name.split('_');
      if (parts[0] === 'logic') {
        const r = parseInt(parts[1], 10);
        const c = parseInt(parts[2], 10);
        if (!Number.isNaN(r) && !Number.isNaN(c)) return { r, c, layerIdx: -2 };
        return null;
      }
      if (parts.length === 3) {
        const r = parseInt(parts[1], 10);
        const c = parseInt(parts[2], 10);
        if (!Number.isNaN(r) && !Number.isNaN(c)) return { r, c, layerIdx: -1 };
        return null;
      }
      if (parts.length === 4) {
        const layerIdx = parseInt(parts[1], 10);
        const r = parseInt(parts[2], 10);
        const c = parseInt(parts[3], 10);
        if (!Number.isNaN(r) && !Number.isNaN(c)) return { r, c, layerIdx };
        return null;
      }
    }

    // Batched tilesets (`tileset_mesh_*`), map_pick_plane, paint overlays, etc.
    // Ignore entity billboards — their picked points sit above the ground and
    // resolve to the wrong cell (or off-map).
    if (!isTilePickTarget(name)) return null;
    const point = pickResult.pickedPoint;
    if (!point) return null;
    const tile = this.worldToTile(point.x, point.z);
    if (!tile) return null;
    return { r: tile.r, c: tile.c, layerIdx: -1 };
  }

  /**
   * Enable click (+ optional drag) paint / move picking.
   * Drag re-picks under the cursor so authors can stroke tiles continuously.
   * Keep drag off for Walk Mode click-to-move so pointer moves do not repath.
   * With brushRadius > 1, emits all cells in a circular area around the pick center.
   */
  public enableTilePicking(
    onTileClick: (r: number, c: number, layerIdx?: number, eventType?: 'down' | 'move' | 'up') => void,
    options?: { 
      drag?: boolean; 
      onTileHover?: (r: number, c: number) => void;
      onDragStart?: () => void;
      onDragEnd?: () => void;
    }
  ) {
    let isPainting = false;
    let lastKey = '';
    const allowDrag = !!options?.drag;

    const emitFromScenePick = (eventType?: 'down' | 'move' | 'up') => {
      if (!this.scene) return;
      const pickResult = this.scene.pick(
        this.scene.pointerX,
        this.scene.pointerY,
        (mesh) => mesh.isPickable && isTilePickTarget(mesh.name)
      );
      const resolved = this.resolveTilePick(pickResult);
      if (!resolved) return;
      const key = `${resolved.r},${resolved.c}`;
      if (key === lastKey) return;
      lastKey = key;

      // Apply brush radius — emit all cells within radius.
      if (this.brushRadius <= 1) {
        onTileClick(resolved.r, resolved.c, resolved.layerIdx, eventType);
      } else {
        const rad = this.brushRadius - 1;
        const w = this.currentMapWidth;
        const h = this.currentMapHeight;
        for (let dr = -rad; dr <= rad; dr++) {
          for (let dc = -rad; dc <= rad; dc++) {
            // Circular brush: only paint cells within euclidean radius.
            if (dr * dr + dc * dc > rad * rad + rad) continue;
            const nr = resolved.r + dr;
            const nc = resolved.c + dc;
            if (nr >= 0 && nr < h && nc >= 0 && nc < w) {
              onTileClick(nr, nc, resolved.layerIdx, eventType);
            }
          }
        }
      }
    };

    const updateBrushPreview = () => {
      if (!this.scene || this.brushRadius <= 1) {
        this.clearBrushPreview();
        return;
      }
      const pickResult = this.scene.pick(
        this.scene.pointerX,
        this.scene.pointerY,
        (mesh) => mesh.isPickable && isTilePickTarget(mesh.name)
      );
      const resolved = this.resolveTilePick(pickResult);
      if (!resolved) {
        this.clearBrushPreview();
        return;
      }
      this.renderBrushPreview(resolved.r, resolved.c);
      if (options?.onTileHover) {
        options.onTileHover(resolved.r, resolved.c);
      }
    };

    this.scene.onPointerDown = () => {
      isPainting = true;
      lastKey = '';
      if (options?.onDragStart) options.onDragStart();
      emitFromScenePick('down');
    };

    this.scene.onPointerUp = () => {
      isPainting = false;
      lastKey = '';
      emitFromScenePick('up');
      if (options?.onDragEnd) options.onDragEnd();
    };

    this.scene.onPointerMove = () => {
      updateBrushPreview();
      if (!allowDrag || !isPainting || !this.scene) return;
      emitFromScenePick('move');
    };
  }

  public disableTilePicking() {
    this.scene.onPointerDown = undefined;
    this.scene.onPointerUp = undefined;
    this.scene.onPointerMove = undefined;
    this.clearBrushPreview();
  }

  /** Set brush radius for multi-tile painting. */
  public setBrushRadius(radius: number) {
    this.brushRadius = Math.max(1, Math.min(10, radius));
    if (this.brushRadius <= 1) this.clearBrushPreview();
  }

  /** Clear brush preview overlay. */
  private clearBrushPreview() {
    for (const m of this.brushPreviewMeshes) m.dispose();
    this.brushPreviewMeshes = [];
  }

  public clearSelectionPreview() {
    for (const m of this.selectionPreviewMeshes) m.dispose();
    this.selectionPreviewMeshes = [];
  }

  public setSelectionPreview(r1: number, c1: number, r2: number, c2: number) {
    this.clearSelectionPreview();
    const minR = Math.min(r1, r2);
    const maxR = Math.max(r1, r2);
    const minC = Math.min(c1, c2);
    const maxC = Math.max(c1, c2);

    const s = this.currentTileSize || 1;
    const w = this.currentMapWidth;
    const h = this.currentMapHeight;

    let previewMat = this.scene.getMaterialByName('selection_preview_mat') as StandardMaterial | null;
    if (!previewMat) {
      const mat = new StandardMaterial('selection_preview_mat', this.scene);
      mat.diffuseColor = new Color3(0.5, 0.4, 1.0);
      mat.alpha = 0.4;
      mat.disableLighting = true;
      mat.backFaceCulling = false;
      previewMat = mat;
    }

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        if (r < 0 || r >= h || c < 0 || c >= w) continue;
        const posX = (c - w / 2) * s + s * 0.5;
        const posZ = (h / 2 - r) * s - s * 0.5;
        const plane = MeshBuilder.CreatePlane(`selection_preview_${r}_${c}`, { size: s * 0.95 }, this.scene);
        plane.rotation.x = Math.PI / 2;
        plane.position.x = posX;
        plane.position.z = posZ;
        plane.position.y = 0.02; // slightly above brush preview
        plane.material = previewMat;
        plane.isPickable = false;
        this.selectionPreviewMeshes.push(plane);
      }
    }
  }

  /** Render semi-transparent brush preview at given center tile. */
  private renderBrushPreview(centerR: number, centerC: number) {
    this.clearBrushPreview();
    const rad = this.brushRadius - 1;
    const w = this.currentMapWidth;
    const h = this.currentMapHeight;
    const s = this.currentTileSize || 1;

    let previewMat = this.scene.getMaterialByName('brush_preview_mat') as StandardMaterial | null;
    if (!previewMat) {
      const mat = new StandardMaterial('brush_preview_mat', this.scene);
      mat.diffuseColor = new Color3(0.3, 0.8, 1.0);
      mat.alpha = 0.25;
      mat.disableLighting = true;
      mat.backFaceCulling = false;
      previewMat = mat;
    }

    for (let dr = -rad; dr <= rad; dr++) {
      for (let dc = -rad; dc <= rad; dc++) {
        if (dr * dr + dc * dc > rad * rad + rad) continue;
        const nr = centerR + dr;
        const nc = centerC + dc;
        if (nr < 0 || nr >= h || nc < 0 || nc >= w) continue;
        const posX = (nc - w / 2) * s + s * 0.5;
        const posZ = (h / 2 - nr) * s - s * 0.5;
        const plane = MeshBuilder.CreatePlane(`brush_preview_${nr}_${nc}`, { size: s * 0.95 }, this.scene);
        plane.rotation.x = Math.PI / 2;
        plane.position = new Vector3(posX, 0.15, posZ);
        plane.parent = this.rootNode;
        plane.material = previewMat;
        plane.isPickable = false;
        this.brushPreviewMeshes.push(plane);
      }
    }
  }

  /** Fit the entire map in the editor viewport. */
  public fitMapInView() {
    const w = this.currentMapWidth;
    const h = this.currentMapHeight;
    const s = this.currentTileSize || 1;
    if (!w || !h) return;
    const aspect = this.engine.getRenderWidth() / Math.max(1, this.engine.getRenderHeight());
    // The orthographic size needed to fit the larger dimension.
    const orthoH = (h * s) / 2 + 2;
    const orthoW = (w * s) / (2 * aspect) + 2;
    const ortho = Math.max(orthoH, orthoW);
    const clamped = Math.max(3, Math.min(60, ortho));
    this.updateCameraAspect(clamped);
    // Center camera on map center.
    this.snapCameraTo(0, 0);
  }

  /** Jump editor camera to a specific tile coordinate. */
  public panEditorCameraToTile(r: number, c: number) {
    const w = this.currentMapWidth;
    const h = this.currentMapHeight;
    const s = this.currentTileSize || 1;
    if (!w || !h) return;
    const worldX = (c - w / 2 + 0.5) * s;
    const worldZ = (h / 2 - r - 0.5) * s;
    this.snapCameraTo(worldX, worldZ);
  }

  /** Start WASD/arrow key pan loop for editor camera. */
  public startEditorKeyboardPan() {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!this.editorCameraMode) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const code = e.code;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home'].includes(code)) {
        e.preventDefault();
        if (code === 'Home') {
          this.fitMapInView();
          return;
        }
        this.editorPanKeysHeld.add(code);
        this.startEditorPanLoop();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      this.editorPanKeysHeld.delete(e.code);
      if (this.editorPanKeysHeld.size === 0 && this.editorPanAnimFrameId !== null) {
        cancelAnimationFrame(this.editorPanAnimFrameId);
        this.editorPanAnimFrameId = null;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    // Return cleanup function.
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      this.editorPanKeysHeld.clear();
      if (this.editorPanAnimFrameId !== null) {
        cancelAnimationFrame(this.editorPanAnimFrameId);
        this.editorPanAnimFrameId = null;
      }
    };
  }

  private startEditorPanLoop() {
    if (this.editorPanAnimFrameId !== null) return;
    let lastTime = performance.now();
    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      if (this.editorPanKeysHeld.size === 0) {
        this.editorPanAnimFrameId = null;
        return;
      }
      // Pan speed scales with current zoom level.
      const ortho = this.camera.orthoTop || 10;
      const speed = ortho * 1.2 * dt;
      let dx = 0;
      let dz = 0;
      if (this.editorPanKeysHeld.has('KeyW') || this.editorPanKeysHeld.has('ArrowUp')) dz += speed;
      if (this.editorPanKeysHeld.has('KeyS') || this.editorPanKeysHeld.has('ArrowDown')) dz -= speed;
      if (this.editorPanKeysHeld.has('KeyA') || this.editorPanKeysHeld.has('ArrowLeft')) dx -= speed;
      if (this.editorPanKeysHeld.has('KeyD') || this.editorPanKeysHeld.has('ArrowRight')) dx += speed;
      if (dx !== 0 || dz !== 0) {
        this.cameraTargetX += dx;
        this.cameraTargetZ += dz;
        this.camera.position = new Vector3(this.cameraTargetX, 14, this.cameraTargetZ - 14);
        this.camera.setTarget(new Vector3(this.cameraTargetX, 0, this.cameraTargetZ));
        this.cameraSnapped = true;
      }
      this.editorPanAnimFrameId = requestAnimationFrame(loop);
    };
    this.editorPanAnimFrameId = requestAnimationFrame(loop);
  }

  public getEntityMesh(entityId: string) {
    return this.entityMeshes.get(entityId);
  }

  /** Show/hide an entity mesh (avatar-free editor: hide player_main). */
  public setEntityVisible(entityId: string, visible: boolean) {
    const mesh = this.entityMeshes.get(entityId);
    if (mesh) mesh.setEnabled(visible);
    const shadow = this.shadowMeshes.get(entityId);
    if (shadow) shadow.setEnabled(visible);
  }

  private resolveSpriteConfig(entity: BabylonEntityData): SpriteSheetConfig {
    // URL is source of truth — never let a stale SINGLE_FRAME client override
    // wipe 3×4 walk sheets (that rendered rockitten as a full grid).
    if (isSingleFrameSpriteUrl(entity.spriteUrl)) {
      return SINGLE_FRAME_SPRITE_CONFIG;
    }
    if (
      entity.spriteConfig &&
      entity.spriteConfig.columns > 1 &&
      entity.spriteConfig.rows > 1
    ) {
      return entity.spriteConfig;
    }
    return DEFAULT_SPRITE_CONFIG;
  }

  /**
   * Crop a walk-sheet cell onto the mesh's own UV vertices.
   * Prefer this over Texture.uScale — Babylon caches textures by URL, so
   * shared uScale/vOffset fought between meshes and left full 3×4 sheets visible.
   */
  private setSpriteCellUVs(
    mesh: Mesh,
    col: number,
    row: number,
    columns: number,
    rows: number
  ) {
    // Non-updatable planes ignore UV writes — force the buffer updatable first.
    try {
      mesh.markVerticesDataAsUpdatable(VertexBuffer.UVKind, true);
    } catch {
      /* older buffers */
    }
    if (columns <= 1 && rows <= 1) {
      mesh.setVerticesData(VertexBuffer.UVKind, [0, 0, 1, 0, 1, 1, 0, 1], true);
      return;
    }
    const u0 = col / columns;
    const u1 = (col + 1) / columns;
    // row 0 = top of sheet; with invertY textures, high V is the image top.
    const v1 = 1 - row / rows;
    const v0 = 1 - (row + 1) / rows;
    // CreatePlane vertex order: BL, BR, TR, TL
    mesh.setVerticesData(VertexBuffer.UVKind, [u0, v0, u1, v0, u1, v1, u0, v1], true);
  }

  private applySpriteSheetUv(tex: Texture, config: SpriteSheetConfig) {
    // Mesh vertex UVs (setSpriteCellUVs) own the cell crop. Keep texture scale at 1
    // so we do not double-crop (mesh UV × uScale) into a tiny brown/empty rectangle.
    tex.wrapU = Texture.CLAMP_ADDRESSMODE;
    tex.wrapV = Texture.CLAMP_ADDRESSMODE;
    tex.uScale = 1;
    tex.vScale = 1;
    tex.uOffset = 0;
    tex.vOffset = 0;
  }

  /** Procedural silhouette must be full-frame — walk-sheet UVs crop it to a brown block. */
  private applyDefaultPlayerFallback(spriteMesh: Mesh, mat: StandardMaterial) {
    if (!this.defaultPlayerTexture) return;
    mat.diffuseTexture = this.defaultPlayerTexture;
    mat.diffuseTexture.hasAlpha = true;
    this.applySpriteSheetUv(this.defaultPlayerTexture, SINGLE_FRAME_SPRITE_CONFIG);
    this.setSpriteCellUVs(spriteMesh, 0, 0, 1, 1);
    if (spriteMesh.metadata) {
      spriteMesh.metadata.spriteConfig = SINGLE_FRAME_SPRITE_CONFIG;
      spriteMesh.metadata.spriteUrl = "defaultPlayerTex";
      spriteMesh.metadata.uvFullFrame = true;
      spriteMesh.metadata.uvCol = 0;
      spriteMesh.metadata.uvRow = 0;
    }
  }

  public updateEntity(entity: BabylonEntityData) {
    let spriteMesh = this.entityMeshes.get(entity.id);
    const targetPos = new Vector3(entity.x, ENTITY_GROUND_CLEARANCE, entity.y);
    const resolvedConfig = this.resolveSpriteConfig(entity);
    const singleFrame = resolvedConfig.columns <= 1 && resolvedConfig.rows <= 1;

    if (!spriteMesh) {
      // Create 2.5D Billboard Sprite Plane — OW portraits use a slightly shorter plane
      spriteMesh = MeshBuilder.CreatePlane(
        `entity_${entity.id}`,
        {
          // OW portrait crops read huge on the old 1.5-tall plane — keep them compact.
          width: this.currentTileSize * (singleFrame ? 0.7 : 1.0),
          height: this.currentTileSize * (singleFrame ? 0.95 : 1.4),
          // Required so setSpriteCellUVs can rewrite vertex UVs each anim frame.
          updatable: true,
        },
        this.scene
      );
      const createdMesh = spriteMesh;

      // Initialize Metadata for Animation & Movement
      spriteMesh.metadata = {
        targetPos: targetPos,
        isMoving: entity.isMoving || false,
        animTime: 0,
        direction: entity.direction || 'down',
        isNpc: entity.isNpc || false,
        isPlayer: entity.isPlayer || false,
        isCreature: entity.isCreature || false,
        isEditor: !!this.scene.onPointerDown, // Simple heuristic: if tile picking is enabled, it's dev editor
        spriteConfig: resolvedConfig,
        spriteUrl: entity.spriteUrl || null,
      };
      
      // Initial position snap
      spriteMesh.position = targetPos;

      // For orthographic 2.5D, fixed tilt is much more stable than billboarding
      spriteMesh.rotation.x = Math.PI / 4;
      
      // Make entities pickable for combat targeting
      spriteMesh.isPickable = true;

      const mat = new StandardMaterial(`entityMat_${entity.id}`, this.scene);
      // Alpha-test + depth write so sprites sit above batched grass (P0 bury
      // fixed tileset mats; entity mats were still ALPHATESTANDBLEND and could
      // vanish under the ground mesh — "only grass" with no characters).
      mat.useAlphaFromDiffuseTexture = true;
      mat.transparencyMode = Material.MATERIAL_ALPHATEST;
      mat.alphaCutOff = 0.05;
      mat.forceDepthWrite = true;
      mat.backFaceCulling = false;
      mat.disableLighting = true; // 2D Pixel Art rendering

      // Draw after ground (group 0) so characters always composite on top.
      spriteMesh.renderingGroupId = 1;

      if (entity.spriteUrl) {
        // Always invertY=true (Babylon default). Re-apply UV in onLoad — Babylon can
        // reset transforms when the image bytes arrive, which showed full 3×4 sheets.
        // Unique URL per mesh so Babylon's texture cache can't share UV state.
        const texUrl = `${entity.spriteUrl}${entity.spriteUrl.includes("?") ? "&" : "?"}mesh=${encodeURIComponent(entity.id)}`;
        const tex = new Texture(
          texUrl,
          this.scene,
          true,
          true,
          Texture.NEAREST_SAMPLINGMODE,
          () => {
            this.applySpriteSheetUv(tex, resolvedConfig);
          },
          () => {
            console.warn(`[BabylonEngine] Failed to load sprite: ${entity.spriteUrl}`);
            this.applyDefaultPlayerFallback(createdMesh, mat);
          }
        );
        tex.hasAlpha = true;
        this.applySpriteSheetUv(tex, resolvedConfig);
        spriteMesh.metadata.spriteConfig = resolvedConfig;
        // Initial cell crop on the mesh itself
        if (singleFrame) {
          this.setSpriteCellUVs(spriteMesh, 0, 0, 1, 1);
          spriteMesh.metadata.uvFullFrame = true;
        } else {
          const rowIdx = resolvedConfig.directions.down;
          this.setSpriteCellUVs(
            spriteMesh,
            resolvedConfig.idleFrame,
            rowIdx,
            resolvedConfig.columns,
            resolvedConfig.rows
          );
          spriteMesh.metadata.uvCol = resolvedConfig.idleFrame;
          spriteMesh.metadata.uvRow = rowIdx;
          spriteMesh.metadata.uvCols = resolvedConfig.columns;
          spriteMesh.metadata.uvRows = resolvedConfig.rows;
        }

        mat.diffuseTexture = tex;
      } else if (this.defaultPlayerTexture) {
        this.applyDefaultPlayerFallback(createdMesh, mat);
      }

      spriteMesh.material = mat;
      
      // Simple drop shadow
      const shadow = MeshBuilder.CreatePlane(`shadow_${entity.id}`, { size: this.currentTileSize * 0.8 }, this.scene);
      shadow.rotation.x = Math.PI / 2;
      shadow.position.y = -0.7; // Relative to spriteMesh center
      shadow.parent = spriteMesh;
      shadow.renderingGroupId = 1;
      
      const shadowMat = new StandardMaterial(`shadowMat_${entity.id}`, this.scene);
      shadowMat.diffuseColor = new Color3(0, 0, 0);
      shadowMat.alpha = 0.3;
      shadowMat.disableLighting = true;
      shadowMat.transparencyMode = Material.MATERIAL_ALPHABLEND;
      shadowMat.zOffset = -1; // Prevent Z-fighting with floor
      shadow.material = shadowMat;
      this.shadowMeshes.set(entity.id, shadow);

      this.entityMeshes.set(entity.id, spriteMesh);
    } else {
      // Update Metadata — always refresh spriteConfig from current URL so a
      // prior SINGLE_FRAME assign can't keep resetting walk-sheet UVs every tick.
      if (spriteMesh.metadata) {
        spriteMesh.metadata.targetPos = targetPos;
        spriteMesh.metadata.isMoving = entity.isMoving || false;
        spriteMesh.metadata.direction = entity.direction || spriteMesh.metadata.direction;
        spriteMesh.metadata.isEditor = !!this.scene.onPointerDown;
        spriteMesh.metadata.isNpc = entity.isNpc || false;
        spriteMesh.metadata.isPlayer = entity.isPlayer || false;
        spriteMesh.metadata.isCreature = entity.isCreature || false;
        spriteMesh.metadata.spriteConfig = resolvedConfig;
      }

      // Keep peers / NPCs above grass if they were created before this fix.
      spriteMesh.renderingGroupId = 1;
      const mat = spriteMesh.material as StandardMaterial;
      if (mat && mat.transparencyMode !== Material.MATERIAL_ALPHATEST) {
        mat.useAlphaFromDiffuseTexture = true;
        mat.transparencyMode = Material.MATERIAL_ALPHATEST;
        mat.alphaCutOff = 0.05;
        mat.forceDepthWrite = true;
      }
      const tex = mat?.diffuseTexture as Texture;
      const currentUrl = (spriteMesh.metadata?.spriteUrl as string | undefined) || tex?.name;
      const existingMesh = spriteMesh;
      
      if (mat) {
        // If the URL changed (and it's not falling back to the default dynamic texture)
        if (entity.spriteUrl && currentUrl !== entity.spriteUrl) {
          const texUrl = `${entity.spriteUrl}${entity.spriteUrl.includes("?") ? "&" : "?"}mesh=${encodeURIComponent(entity.id)}`;
          const newTex = new Texture(
            texUrl,
            this.scene,
            true,
            true,
            Texture.NEAREST_SAMPLINGMODE,
            () => {
              this.applySpriteSheetUv(newTex, resolvedConfig);
            },
            () => {
              console.warn(`[BabylonEngine] Failed to load sprite: ${entity.spriteUrl}`);
              this.applyDefaultPlayerFallback(existingMesh, mat);
            }
          );
          newTex.hasAlpha = true;
          this.applySpriteSheetUv(newTex, resolvedConfig);
          if (spriteMesh.metadata) {
            spriteMesh.metadata.spriteConfig = resolvedConfig;
            spriteMesh.metadata.spriteUrl = entity.spriteUrl;
            // Force UV cell recompute next anim tick
            spriteMesh.metadata.uvCol = undefined;
            spriteMesh.metadata.uvRow = undefined;
            spriteMesh.metadata.uvFullFrame = false;
          }
          mat.diffuseTexture = newTex;
        } else if (!entity.spriteUrl && currentUrl !== 'defaultPlayerTex' && this.defaultPlayerTexture) {
          this.applyDefaultPlayerFallback(existingMesh, mat);
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

    // Multiplayer peers: always show a nameplate so they are not mistaken for NPCs.
    const wantsNameplate =
      !!entity.isPlayer &&
      entity.id.startsWith('multiplayer_') &&
      !!entity.name;
    let nameplate = this.nameplates.get(entity.id);
    if (wantsNameplate) {
      if (!nameplate) {
        nameplate = new Rectangle(`nameplate_${entity.id}`);
        nameplate.width = '160px';
        nameplate.height = '22px';
        nameplate.thickness = 0;
        nameplate.background = 'transparent';
        const label = new TextBlock();
        label.text = entity.name;
        label.color = '#fde68a';
        label.fontSize = 12;
        label.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, monospace';
        label.fontWeight = '700';
        label.shadowColor = 'black';
        label.shadowBlur = 3;
        label.shadowOffsetX = 1;
        label.shadowOffsetY = 1;
        nameplate.addControl(label);
        this.guiTexture.addControl(nameplate);
        nameplate.linkWithMesh(spriteMesh);
        nameplate.linkOffsetY = -52;
        this.nameplates.set(entity.id, nameplate);
      } else {
        const label = nameplate.children[0] as TextBlock;
        if (label && label.text !== entity.name) label.text = entity.name;
      }
    } else if (nameplate) {
      this.guiTexture.removeControl(nameplate);
      nameplate.dispose();
      this.nameplates.delete(entity.id);
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
      mat.disableLighting = true;
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
    mat.disableLighting = true;
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
    mat.disableLighting = true;
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
    mat.disableLighting = true;
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
    const nameplate = this.nameplates.get(id);
    if (nameplate) {
      this.guiTexture.removeControl(nameplate);
      nameplate.dispose();
      this.nameplates.delete(id);
    }
  }

  public dispose() {
    this.setEditorCameraMode(false);
    window.removeEventListener('resize', this.onResize);
    this.stopRenderLoop();
    this.guiTexture.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }
}
