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
  Matrix,
  Quaternion,
  LinesMesh,
  ImageProcessingPostProcess,
  ImageProcessingConfiguration,
  Animation,
  ParticleSystem,
  GizmoManager,
} from '@babylonjs/core';
import { AdvancedDynamicTexture, Rectangle, TextBlock } from '@babylonjs/gui';
import { TILESET_SIZES } from "../web/components/the-lobby/data/tileset-sizes";
import { resolveEntitySpriteUrl } from "../shared/game/creatureCatalog";
import { isTilePickTarget } from "../shared/game/tilePaint";
import { type EdgeStripData } from "../shared/game/atlas/edgeStrip";
import { type CardinalDirection } from "../shared/game/atlas/spatialAtlas";
import {
  ENTITY_GROUND_CLEARANCE,
  clampCameraFocus,
  paintOverlayHeight,
} from "./helpers/babylonViewHelpers";
import { SPATIAL_LAYER_ALTITUDES } from "../shared/game/spatialLayers";
import {
  cellBatchKey,
  collapsedQuadPositions,
  groundQuadPositions,
  stripTiledGidFlags,
  tileCellWorldPos,
  tilesetUvForGid,
  tilesetUvForOverlayPlane,
  worldToTileCoord,
  resolveTilesetTextureUrl,
  toClientAssetUrl,
  createProceduralTileDataUrl,
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
import { BIOME_SKIRT_CONFIG, type FreeformLayer } from "../shared/game/types/map";
import { isInGridFootprint, type BrushShape } from "../shared/game/brushGeometry";
import {
  type ContinuousGeometry,
  getGeometryBoundingBox,
  getRegularPolygonVertices,
  getStarVertices,
} from "../shared/game/geometry/continuousGeometry";
import {
  resolveSpriteDefinition,
  spriteDefinitionToBabylonConfig,
  type SpriteAnimationProfile,
  type SpriteDefinition,
} from "../shared/game/spriteDefinitions";
import { ItemBillboardRenderer, type ItemBillboardConfig } from "./ItemBillboardRenderer";
import { VoxelChunkMesher } from './voxel/VoxelChunkMesher';
import { VoxelWorld, type VoxelWorldDocV3, generateDefaultWorldDoc, SpatialVoxelWorldManager } from '../shared/game/voxel/VoxelWorldDoc';
import { resolveVoxelTarget, type VoxelTargetResolution } from '../shared/game/voxel/VoxelTargetResolver';
import {
  getVoxelBrushOffsets,
  getVoxelBrushOffsets3D,
  resolveConstrainedVoxelCoordinates,
  type VoxelBrushAxis,
} from '../shared/game/voxel/VoxelWord';

import { VoxelController } from './VoxelController';
import { InputController } from './InputController';
import { Renderer } from './Renderer';
import { EntityController } from './EntityController';

export interface RenderedChunk {
  mapId?: string;
  mapType?: string;
  chunkX?: number; // Legacy
  chunkY?: number; // Legacy
  offsetX: number;
  offsetZ: number;
  width: number;
  height: number;
  grid?: number[][];
  tileLayers?: Array<{ name: string; grid: number[][] }>;
  tilesets?: Array<{ firstgid: number; imageSource: string; columns: number; tilewidth: number; tileheight: number }>;
}

export interface BabylonTileMapData {
  id?: string;
  width: number;
  height: number;
  tileSize: number;
  baseTileSizePx?: number;
  tiles: number[][]; // 2D array of tile IDs
  tilesetUrl?: string;
  tileLayers?: Array<{ name: string; grid: number[][] }>;
  tilesets?: Array<{ firstgid: number; imageSource: string; columns: number; tilewidth: number; tileheight: number; imageheight?: number; tilecount?: number }>;
  npcs?: Array<{ id: string; name: string; x: number; y: number; sprite?: string }>;
  freeformLayers?: FreeformLayer[];
  chunks?: RenderedChunk[];
  connections?: any;
  voxelDoc?: VoxelWorldDocV3;
  blockSizePx?: number;
  mapType?: 'TILE' | 'VOXEL' | 'FRACTAL' | string;
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
  "soulmarshal_aldric",
] as const;

/**
 * True when a sprite URL should render as one full frame (no 3×4 walk UV slicing).
 * Classic /npc/ walk sheets (e.g. adventurer 48×128) stay on DEFAULT_SPRITE_CONFIG.
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
  hp?: number;
  maxHp?: number;
  isCreature?: boolean;
  chatMessage?: string;
  spriteConfig?: SpriteSheetConfig;
  animationProfile?: SpriteAnimationProfile;
  spriteDef?: SpriteDefinition;
}

export class BabylonEngine {
  private pendingPlayerTeleports: Map<string, { x: number, z: number }> = new Map();

  // Chunk-Level Resource Pooling (Phase 3)
  private chunkMeshPool: Mesh[] = [];

  public canvas: HTMLCanvasElement;
  public engine: Engine;
  public scene: Scene;
  public rootNode: TransformNode;
  private tileMeshes: Mesh[] = [];
  private objectMeshes: Mesh[] = [];
  public entityMeshes: Map<string, Mesh> = new Map();
  public shadowMeshes: Map<string, Mesh> = new Map();
  public isRunning: boolean = false;
  public _renderedSockets: Set<string> = new Set();
  public _renderedEntities: Set<string> = new Set();
  public defaultPlayerTexture?: DynamicTexture;
  public woodFloorTexture?: DynamicTexture;
  public indoorWallTexture?: DynamicTexture;
  public waterTexture?: DynamicTexture;
  public waterAnimTime: number = 0;
  public lastWaterUpdateTime: number = 0;
  public waterFlowSpeed: number = 1.0;
  private cameraSmoothingFactor: number = 0.6;
  public currentMapId: string = '';
  public currentMapWidth: number = 24;
  public currentMapHeight: number = 24;

  /** Live tilemap dims for world↔tile math (peers / camera) after hot remesh. */
  public getMapWidth(): number {
    return this.currentMapWidth;
  }
  public getMapHeight(): number {
    return this.currentMapHeight;
  }
  public currentTileSize: number = 1;
  private tilesetTextureCache: Map<string, Texture> = new Map();
  private tilesetMaterialCache: Map<string, StandardMaterial> = new Map();
  private spriteTextureCache: Map<string, Texture> = new Map();
  private static failedSpriteUrls: Set<string> = new Set();

  public static isSpriteUrlFailed(url?: string | null): boolean {
    if (!url) return false;
    const raw = url.split('?')[0];
    return BabylonEngine.failedSpriteUrls.has(raw) || BabylonEngine.failedSpriteUrls.has(url);
  }

  public static markSpriteUrlFailed(url?: string | null): void {
    if (!url) return;
    const raw = url.split('?')[0];
    BabylonEngine.failedSpriteUrls.add(raw);
    BabylonEngine.failedSpriteUrls.add(url);
  }

  /** Studio paint overlays — fallback when batched remesh cannot patch a cell. */
  private paintOverlayMeshes: Map<string, Mesh> = new Map();
  /** layerIdx_r_c → quad in a `tileset_mesh_*` (live remesh). */
  private batchedQuadIndex: Map<
    string,
    { imageSource: string; vertexBase: number; layerIdx: number; r: number; c: number }
  > = new Map();
  private tilesetMeshBySource: Map<string, Mesh> = new Map();
  public mapPickPlane?: Mesh;
  public mapBoundaryMesh?: LinesMesh | Mesh;
  public currentRawMapData?: BabylonTileMapData;
  private freeformMeshes: Mesh[] = [];
  private neighborEdgeStrips: Map<string, EdgeStripData> = new Map();
  private showNeighborBleedPreview: boolean = false;

  public setNeighborEdgeStrip(direction: CardinalDirection, strip: EdgeStripData | null) {
    if (strip) {
      this.neighborEdgeStrips.set(direction, strip);
    } else {
      this.neighborEdgeStrips.delete(direction);
    }
  }

  public setNeighborEdgeStrips(strips: Partial<Record<CardinalDirection, EdgeStripData | null>>) {
    this.neighborEdgeStrips.clear();
    Object.entries(strips).forEach(([dir, strip]) => {
      if (strip) this.neighborEdgeStrips.set(dir, strip);
    });
  }

  public setShowNeighborBleedPreview(show: boolean) {
    this.showNeighborBleedPreview = show;
  }

  public getEntityScreenPosition(entityId: string): { x: number, y: number, isVisible: boolean } | null {
    const mesh = this.entityMeshes.get(entityId);
    if (!mesh) return null;
    
    // Project 3D coordinate to screen coordinate (offset up for health bar)
    const pos = Vector3.Project(
      mesh.position.add(new Vector3(0, 1.8, 0)),
      Matrix.Identity(),
      this.scene.getTransformMatrix(),
      this.renderer.camera.viewport.toGlobal(this.engine.getRenderWidth(), this.engine.getRenderHeight())
    );
    
    return { x: pos.x, y: pos.y, isVisible: pos.z < 1.0 && pos.z > 0.0 };
  }

  public waterMaterials: StandardMaterial[] = [];
  public itemBillboards: ItemBillboardRenderer;
  private guiTexture: AdvancedDynamicTexture;
  private chatBubbles: Map<string, Rectangle> = new Map();
  /** Floating HP bars for creatures during combat. */
  private healthBars: Map<string, Rectangle> = new Map();
  public weatherParticleSystem?: ParticleSystem;
  public activeWeatherPreset?: string;
  /** When true, camera ignores player follow and accepts editor pan. */
  public editorCameraMode: boolean = false;
  public selectionRingMesh?: Mesh;
  public selectionRingMaterial?: StandardMaterial;
  public activeTargetEntityId: string | null = null;
  private smartTargetRingMesh?: Mesh;
  private destinationIndicatorMesh?: Mesh;
  private abilityAoEMeshes: Mesh[] = [];
  public activeProjectiles: Map<string, { mesh: Mesh, observer: any }> = new Map();
  /** Covers erased cells so batched tileset art disappears without a full remesh. */
  private eraseVoidMaterial?: StandardMaterial;
  /** Adjustable brush radius for multi-tile paint (1 = single tile). */
  public brushRadius: number = 1;
  public brushShape: BrushShape = 'circle';
  private brushRotation: number = 0;
  public activeBrushPattern: { w: number, h: number } | null = null;
  public prefabStampMode: '1tile' | 'footprint' = 'footprint';
  public stampScale: number = 1;
  private activeBrushTileId: number = 0;
  private activeLayerIdx: number = 0;
  public activeLayerType: string = 'grid';
  public brushMode: string = 'paint';
  private currentTilesets: any[] = [];
  public lastHoveredR: number = -1;
  public lastHoveredC: number = -1;
  /** Brush preview overlay meshes. */
  public brushPreviewMeshes: Mesh[] = [];
  private hoverReticleMesh?: Mesh;
  public footprintSqMesh?: Mesh;
  public footprintUnifiedMesh?: Mesh;
  private patternPreviewMesh?: Mesh;
  public splatPreviewMesh?: Mesh;
  private footprintCircMeshes: Mesh[] = [];
  private selectionBoxMesh?: Mesh;
  public multiSelectionBaseMesh?: Mesh;
  public selectionPreviewMeshes: Mesh[] = [];
  public actionPreviewBoundsMesh?: Mesh;
  public actionPreviewMeshes: Mesh[] = [];
  private editorMapBorderMeshes: (Mesh | LinesMesh)[] = [];

  /**
   * Ground tilesets are one batched mesh per image. Alpha-*blend* sorts that
   * whole mesh by its center — north of center, sprites + paint overlays draw
   * first and then get buried under the ground. Alpha-*test* writes depth per
   * texel so characters stay above the plane everywhere.
   */
  private configureTilesetMaterial(mat: StandardMaterial, tex?: Texture) {
    mat.useAlphaFromDiffuseTexture = true;
    mat.transparencyMode = Material.MATERIAL_ALPHATEST;
    mat.alphaCutOff = 0.05;
    mat.forceDepthWrite = true;
    mat.backFaceCulling = false;
    
    // Unlit pipeline: push the texture to the emissive channel and ignore lights
    if (tex) {
      mat.diffuseTexture = tex;
      mat.emissiveTexture = tex;
      mat.emissiveColor = new Color3(1, 1, 1);
    } else {
      mat.emissiveColor = new Color3(0.18, 0.42, 0.22);
    }
    mat.disableLighting = true;
    mat.specularColor = new Color3(0, 0, 0);
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
    this.voxel = new VoxelController(this);
    this.input = new InputController(this);
    this.renderer = new Renderer(this);
    this.entity = new EntityController(this);
    this.engine = new Engine(this.canvas, true, {
      preserveDrawingBuffer: false,
      stencil: true,
      antialias: false // Keep pixel art crisp
    });

    // Cap DPR to 1.5 to prevent massive 4K fill-rate explosion on Retina/4K displays for pixel art
    if (typeof window !== 'undefined') {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      this.engine.setHardwareScalingLevel(1 / dpr);
    }

    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0, 0, 0, 0);

    this.guiTexture = AdvancedDynamicTexture.CreateFullscreenUI('UI', true, this.scene);

    // Root Node for 2.5D Isometric World
    this.rootNode = new TransformNode('rootNode', this.scene);

    // 3D Perspective Volumetric Camera
    this.renderer.camera = new FreeCamera('camera3D', new Vector3(0, this.renderer.cameraProfile.distance, -this.renderer.cameraProfile.distance), this.scene);
    
    // Enable Vignette
    this.renderer.vignettePostProcess = new ImageProcessingPostProcess("vignette", 1.0, this.renderer.camera);
    this.renderer.vignettePostProcess.vignetteEnabled = true;
    this.renderer.vignettePostProcess.vignetteWeight = 1.5;
    this.renderer.vignettePostProcess.vignetteColor = new Color4(0, 0, 0, 1);
    this.renderer.vignettePostProcess.vignetteBlendMode = ImageProcessingConfiguration.VIGNETTEMODE_MULTIPLY;
    this.renderer.camera.setTarget(Vector3.Zero());
    this.renderer.camera.mode = FreeCamera.PERSPECTIVE_CAMERA;

    this.renderer.updateCameraAspect(10);

    // Primary ambient light
    this.renderer.ambientLight = new HemisphericLight('ambientLight', new Vector3(0.2, 1, -0.3), this.scene);
    this.renderer.ambientLight.intensity = 0.85;
    this.renderer.ambientLight.diffuse = new Color3(0.95, 0.95, 1.0);
    this.renderer.ambientLight.groundColor = new Color3(0.15, 0.2, 0.15);

    // Directional sun light for 2.5D depth
    this.renderer.dirLight = new DirectionalLight('sunLight', new Vector3(-0.5, -1.0, 0.5), this.scene);
    this.renderer.dirLight.intensity = 0.55;
    this.renderer.dirLight.diffuse = new Color3(1.0, 0.97, 0.88);
    this.renderer.dirLight.position = new Vector3(5, 15, -10);

    // Shadow Generator (soft shadows for 2.5D depth)
    this.renderer.shadowGen = undefined; // ShadowGenerator disabled in Unlit pixel-art pipeline

    // Window Resize Handler
    window.addEventListener('resize', this.renderer.onResize);

    // Camera Mouse Wheel Zoom Handler (Cursor-Anchored in Editor)
    this.canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      const currentOrtho = this.renderer.camera.orthoTop || 10;
      // Editor mode: max 120 (supports 128x128 full fit), Game mode: range 5.5 - 11.0 (limits zoom-out to maintain crisp immersion)
      const isStudioToolsOpen = Boolean((window as any)._isDevEditorOpen) || this.editorCameraMode;
      const minOrtho = isStudioToolsOpen ? 2.5 : 5.5;
      const maxZoom = isStudioToolsOpen ? 120 : 11.0;
      const newOrtho = Math.max(minOrtho, Math.min(maxZoom, currentOrtho * zoomFactor));
      if (newOrtho === currentOrtho) return;

      const renderW = Math.max(1, this.engine.getRenderWidth());
      const renderH = Math.max(1, this.engine.getRenderHeight());
      const aspect = renderW / renderH;

      // In editor mode, anchor zoom around the mouse cursor to prevent viewport drifting
      if (this.editorCameraMode && this.canvas) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (rect.width > 0 && rect.height > 0) {
          const ndcX = (mouseX / rect.width) * 2 - 1;
          const ndcY = 1 - (mouseY / rect.height) * 2;

          const deltaX = ndcX * (currentOrtho - newOrtho) * aspect;
          const deltaZ = ndcY * (currentOrtho - newOrtho);

          this.renderer.cameraTargetX += deltaX;
          this.renderer.cameraTargetZ += deltaZ;
          this.renderer.snapCameraTo(this.renderer.cameraTargetX, this.renderer.cameraTargetZ);
        }
      }

      this.renderer.camera.orthoLeft = -newOrtho * aspect;
      this.renderer.camera.orthoRight = newOrtho * aspect;
      this.renderer.camera.orthoTop = newOrtho;
      this.renderer.camera.orthoBottom = -newOrtho;

      // Notify UI of zoom change
      const zoomPercent = Math.round((10 / newOrtho) * 100);
      window.dispatchEvent(
        new CustomEvent('studio_zoom_changed', { detail: { ortho: newOrtho, percent: zoomPercent } })
      );
    }, { passive: false });

    // Programmatic Zoom & Fit Map Events
    window.addEventListener('studio_set_zoom', (e: Event) => {
      const custom = e as CustomEvent<{ percent?: number; ortho?: number }>;
      const isStudioToolsOpen = Boolean((window as any)._isDevEditorOpen) || this.editorCameraMode;
      const minOrtho = isStudioToolsOpen ? 2.5 : 5.5;
      const maxZoom = isStudioToolsOpen ? 120 : 11.0;
      let newOrtho = 10;
      if (custom.detail?.percent !== undefined) {
        newOrtho = Math.max(minOrtho, Math.min(maxZoom, 10 / (custom.detail.percent / 100)));
      } else if (custom.detail?.ortho !== undefined) {
        newOrtho = Math.max(minOrtho, Math.min(maxZoom, custom.detail.ortho));
      }
      this.renderer.updateCameraAspect(newOrtho);
      const zoomPercent = Math.round((10 / newOrtho) * 100);
      window.dispatchEvent(
        new CustomEvent('studio_zoom_changed', { detail: { ortho: newOrtho, percent: zoomPercent } })
      );
    });

    window.addEventListener('studio_fit_map', () => {
      this.renderer.fitMapInView();
    });

    window.addEventListener('studio_set_view_angle', (e: Event) => {
      const custom = e as CustomEvent<{ angle: 'isometric' | 'topdown' | 'front' | 'back' | 'east' | 'west' | 'free' }>;
      if (custom.detail?.angle) {
        this.renderer.setViewAngle(custom.detail.angle);
      }
    });

    window.addEventListener('studio_update_camera_settings', (e: Event) => {
      const custom = e as CustomEvent<{ settings: any }>;
      if (custom.detail?.settings) {
        this.renderer.setCameraSettings(custom.detail.settings);
      }
    });

    window.addEventListener('studio_reset_camera', () => {
      this.renderer.cameraYaw = 0;
      this.renderer.cameraPitch = this.renderer.cameraSettings.isometricPitch || Math.PI / 4;
      this.renderer.cameraDistance = 20;
      this.renderer.targetCameraDistance = 20;
      this.renderer.killCameraMomentum();
      if (this.renderer.isFreeCam) {
        this.renderer.updateFreeCamPosition();
      } else {
        this.renderer.updateCameraAspect(10);
        this.renderer.snapCameraTo(this.renderer.cameraTargetX, this.renderer.cameraTargetZ);
      }
    });

    window.addEventListener('studio_preview_player_camera', () => {
      this.renderer.isFreeCam = false;
      this.renderer.applyPlayerCameraStyle(this.renderer.cameraSettings.playerCameraStyle);
      this.renderer.snapCameraTo(this.renderer.cameraTargetX, this.renderer.cameraTargetZ);
    });

    window.addEventListener('studio_update_realm_visuals', (e: Event) => {
      const custom = e as CustomEvent<{ settings: any }>;
      if (custom.detail?.settings) {
        this.renderer.updateRealmVisuals(custom.detail.settings);
      }
    });

    // Entity Pointer Interaction
    this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === 1) { // PointerEventTypes.POINTERDOWN
        if (pointerInfo.pickInfo?.hit && pointerInfo.pickInfo.pickedMesh) {
          const name = pointerInfo.pickInfo.pickedMesh.name;
          if (name.startsWith('entity_') && this.input.onEntityClick) {
            const entityId = name.replace('entity_', '');
            this.input.onEntityClick(entityId);
          }
        }
      }
    });

    // 2D Items rendered in 3D (Minecraft-style item billboards)
    this.itemBillboards = new ItemBillboardRenderer(this.scene);

    // Studio Gizmos (Position/Scale)
    this.gizmoManager = new GizmoManager(this.scene);
    this.gizmoManager.positionGizmoEnabled = false;
    this.gizmoManager.rotationGizmoEnabled = false;
    this.gizmoManager.scaleGizmoEnabled = false;
    this.gizmoManager.boundingBoxGizmoEnabled = false;
    // Don't auto-attach to meshes when clicking (we handle selection manually via SelectToolHandler)
    this.gizmoManager.usePointerToAttachGizmos = false;
    this.gizmoManager.clearGizmoOnEmptyPointerEvent = true;

    // Generate procedural textures
    this.renderer.createDefaultPlayerTexture();
    this.renderer.createProceduralTextures();

    // Hook voxel controller into render loop for dynamic chunk streaming
    this.scene.onBeforeRenderObservable.add(() => {
      this.voxel.update();
    });
  }

  public getCurrentTileSize(): number {
    return this.currentTileSize || 1;
  }

  public loadTilemap(mapData: BabylonTileMapData, seamlessOffset?: { x: number, y: number }) {
    if (!this.scene) return;

    if (!seamlessOffset) {
      // Clear old meshes
      this.tileMeshes.forEach((mesh) => mesh.dispose());
      this.objectMeshes.forEach((mesh) => mesh.dispose());
      this.freeformMeshes.forEach((mesh) => mesh.dispose());
      this.tileMeshes = [];
      this.objectMeshes = [];
      this.freeformMeshes = [];
      this.waterMaterials = [];
      this.clearPaintOverlays();
      this.clearAuthorOverlays();
      this.batchedQuadIndex.clear();
      this.tilesetMeshBySource.clear();

      if (this.voxel.voxelWorld) {
        for (const chunk of this.voxel.voxelWorld.chunks.values()) {
          this.voxel.voxelMesher?.disposeChunkMesh(chunk.key);
        }
        this.voxel.voxelWorld = undefined;
      }
      
      this.disableLogicGridOverlay();
      if (this.mapPickPlane) {
        this.mapPickPlane.dispose();
        this.mapPickPlane = undefined;
      }
      if (this.mapBoundaryMesh) {
        this.mapBoundaryMesh.dispose();
        this.mapBoundaryMesh = undefined;
      }
      this.renderer.cameraSnapped = false; // Force snap on next setCameraPosition
    } else {
      // Seamless transition: preserve tileMeshes, but clear objects/pickPlane
      this.objectMeshes.forEach((mesh) => mesh.dispose());
      this.objectMeshes = [];
      this.freeformMeshes.forEach((mesh) => mesh.dispose());
      this.freeformMeshes = [];
      this.batchedQuadIndex.clear(); // We'll rebuild the quad index
      
      if (this.mapPickPlane) {
        this.mapPickPlane.dispose();
        this.mapPickPlane = undefined;
      }
      if (this.mapBoundaryMesh) {
        this.mapBoundaryMesh.dispose();
        this.mapBoundaryMesh = undefined;
      }
    }

    this.currentRawMapData = mapData;
    const { width, height, tileSize, tiles, tileLayers, tilesets, npcs, id: mapId } = mapData;
    this.currentTilesets = tilesets || [];
    this.currentMapId = mapId || '';
    this.currentMapWidth = width;
    this.currentMapHeight = height;
    this.currentTileSize = tileSize;

    // Use a fixed zoom level for gameplay RPG look (~6 tiles vertically).
    // In editor mode, keep editor zoom / fitMapInView.
    if (!this.editorCameraMode) {
      const targetOrtho = 6.0;
      this.renderer.updateCameraAspect(targetOrtho);

      // Apply map-specific camera style restrictions
      const mapCameraStyle = (mapData as any).cameraStyle;
      const allowCustom = (mapData as any).allowCustomCamera ?? (mapData as any).allowCustomPlayerCamera ?? false;
      
      if (mapCameraStyle && !allowCustom) {
        this.renderer.applyPlayerCameraStyle(mapCameraStyle as any);
      } else {
        // Apply user's active camera style, defaulting to map author's camera style
        this.renderer.applyPlayerCameraStyle(this.renderer.cameraSettings.playerCameraStyle || (mapCameraStyle as any) || 'isometric');
      }
    }

    // Determine map rendering types based on mapType (fallback to TILE if unknown)
    const mapType = mapData.mapType || 'HYBRID';
    const isVoxelType = mapType === 'VOXEL' || mapType === 'FRACTAL' || mapType === 'HYBRID';
    const isTileType = mapType === 'TILE' || mapType === 'HYBRID';

    // Authoritative 3D Voxel World Rendering
    if (isVoxelType && mapData.voxelDoc && mapData.voxelDoc.chunks && Object.keys(mapData.voxelDoc.chunks).length > 0) {
      this.voxel.loadVoxelWorld(mapData.voxelDoc);
    }
    
    if (isTileType && tileLayers && tileLayers.length > 0 && tilesets && tilesets.length > 0) {
      const sortedTilesets = [...tilesets].sort((a, b) => b.firstgid - a.firstgid);

      // Group meshes by imageSource AND chunk (32x32)
      const tilesetVertexData: Map<string, { positions: number[], indices: number[], uvs: number[], vertexIndex: number }> = new Map();
      const CHUNK_SIZE = 32;

      // Normalize input: if chunks aren't provided, treat the base map as a single chunk at 0,0
      const chunksToRender: RenderedChunk[] = mapData.chunks?.length 
        ? mapData.chunks 
        : [{
            offsetX: 0, offsetZ: 0, 
            width: width, height: height, 
            grid: tiles || [], 
            tileLayers: tileLayers
          }];

      // Ensure we treat the map as 32x32 chunks, regardless of input structure
      const processTile = (r: number, c: number, absR: number, absC: number, layer: any, layerIdx: number, chunkOffsetX: number, chunkOffsetZ: number, chunkWidth: number, chunkHeight: number, chunkTilesets: any[], centerWidth: number, centerHeight: number) => {
        const rawGid = layer.grid[r]?.[c] ?? 0;
        const gid = stripTiledGidFlags(rawGid);
        if (gid === 0) return;

        const ts = chunkTilesets.find((t: any) => gid >= t.firstgid);
        if (!ts || !ts.imageSource) return;

        // Determine which 32x32 chunk this tile belongs to
        const chunkR = Math.floor(absR / CHUNK_SIZE);
        const chunkC = Math.floor(absC / CHUNK_SIZE);
        const chunkKey = `${ts.imageSource}_${chunkR}_${chunkC}`;

        const localX = (c - centerWidth / 2) * tileSize;
        const localZ = (centerHeight / 2 - r) * tileSize;
        const posX = localX + chunkOffsetX;
        const posZ = localZ + chunkOffsetZ;
        const y = layerIdx * 0.02;

        const uvPair = tilesetUvForGid(gid, ts, TILESET_SIZES);

        let vData = tilesetVertexData.get(chunkKey);
        if (!vData) {
          vData = { positions: [], indices: [], uvs: [], vertexIndex: 0 };
          tilesetVertexData.set(chunkKey, vData);
        }

        vData.positions.push(...groundQuadPositions(posX, posZ, y, tileSize, ts.tilewidth, ts.tileheight, mapData.baseTileSizePx));
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
        
        // Use chunk's own tilesets to resolve GIDs locally, falling back to global tilesets
        const rawChunkTilesets = chunk.tilesets || tilesets || [];
        const chunkTilesets = [...rawChunkTilesets].sort((a, b) => b.firstgid - a.firstgid);

        // Handle both explicit world offsets and legacy chunk coords
        const chunkOffsetX = (chunk.offsetX !== undefined ? chunk.offsetX * tileSize : (chunk.chunkX || 0) * chunk.width * tileSize) + (seamlessOffset ? seamlessOffset.x * tileSize : 0);
        const chunkOffsetZ = (chunk.offsetZ !== undefined ? chunk.offsetZ * tileSize : -((chunk.chunkY || 0) * chunk.height * tileSize)) - (seamlessOffset ? seamlessOffset.y * tileSize : 0);

        // Tile-space offsets for globally unique batched quad index keys
        const tileOffsetX = (chunk.offsetX !== undefined ? Math.floor(chunk.offsetX) : (chunk.chunkX || 0) * chunk.width) + (seamlessOffset ? seamlessOffset.x : 0);
        const tileOffsetZ = (chunk.offsetZ !== undefined ? Math.floor(-chunk.offsetZ) : (chunk.chunkY || 0) * chunk.height) - (seamlessOffset ? seamlessOffset.y : 0);

        const centerWidth = chunk.offsetX !== undefined ? chunk.width : width;
        const centerHeight = chunk.offsetZ !== undefined ? chunk.height : height;

        chunk.tileLayers.forEach((layer, layerIdx) => {
          for (let r = 0; r < chunk.height; r++) {
            const absR = tileOffsetZ + r;
            for (let c = 0; c < chunk.width; c++) {
              const absC = tileOffsetX + c;
              processTile(r, c, absR, absC, layer, layerIdx, chunkOffsetX, chunkOffsetZ, chunk.width, chunk.height, chunkTilesets, centerWidth, centerHeight);
            }
          }
        });
      });
      
      if (seamlessOffset) {
        // Pool any tileset meshes that are no longer needed instead of disposing
        const keysToRemove: string[] = [];
        this.tilesetMeshBySource.forEach((mesh, chunkKey) => {
          if (!tilesetVertexData.has(chunkKey)) {
            mesh.isVisible = false;
            this.chunkMeshPool.push(mesh);
            keysToRemove.push(chunkKey);
          }
        });
        keysToRemove.forEach(k => {
          this.tilesetMeshBySource.delete(k);
          const idx = this.tileMeshes.findIndex(m => m.name === `tileset_mesh_${k}`);
          if (idx !== -1) this.tileMeshes.splice(idx, 1);
        });
      }

      // --- PHASE B: FILL SKIRT & NEIGHBOR EDGE BLEED ---
      const isEditor = this.editorCameraMode;
      const shouldRenderNeighborBleed = this.showNeighborBleedPreview || !isEditor;
      const hasVoxelWorldMesh = Boolean((mapData as any).voxelDoc || this.voxel.voxelWorld);
      const SKIRT_PADDING = (isEditor || hasVoxelWorldMesh) ? 0 : 64;

      const biome = (mapData as any).biome || 'default';
      const skirtConfig = BIOME_SKIRT_CONFIG[biome] || BIOME_SKIRT_CONFIG['default'];
      const skirtGid = skirtConfig.gid;
      const skirtTs = sortedTilesets.find((t: any) => skirtGid >= t.firstgid);
      
      if (SKIRT_PADDING > 0 && skirtTs && skirtTs.imageSource) {
        const defaultUvPair = tilesetUvForGid(skirtGid, skirtTs, TILESET_SIZES);
        const y = -0.01; // Render slightly below layer 0

        for (let absR = -SKIRT_PADDING; absR < height + SKIRT_PADDING; absR++) {
          for (let absC = -SKIRT_PADDING; absC < width + SKIRT_PADDING; absC++) {
            if (absR >= 0 && absR < height && absC >= 0 && absC < width) continue;

            // Check if this cell falls into a connected neighbor's edge strip
            let cellGid = skirtGid;
            let cellTs = skirtTs;
            let uvPair = defaultUvPair;

            if (shouldRenderNeighborBleed && this.neighborEdgeStrips.size > 0) {
              // North strip (absR < 0, 0 <= absC < width)
              if (absR < 0 && absC >= 0 && absC < width) {
                const northStrip = this.neighborEdgeStrips.get('north');
                if (northStrip) {
                  const offsetR = -1 - absR; // absR = -1 -> offsetR 0, absR = -2 -> offsetR 1
                  const match = northStrip.tiles.find((t) => t.offsetR === offsetR && t.offsetC === absC);
                  if (match && match.tileId > 0) {
                    const matchedTs = sortedTilesets.find((t: any) => match.tileId >= t.firstgid) || skirtTs;
                    cellGid = match.tileId;
                    cellTs = matchedTs;
                    uvPair = tilesetUvForGid(cellGid, cellTs, TILESET_SIZES);
                  }
                }
              }
              // South strip (absR >= height, 0 <= absC < width)
              else if (absR >= height && absC >= 0 && absC < width) {
                const southStrip = this.neighborEdgeStrips.get('south');
                if (southStrip) {
                  const offsetR = absR - height; // absR = height -> offsetR 0
                  const match = southStrip.tiles.find((t) => t.offsetR === offsetR && t.offsetC === absC);
                  if (match && match.tileId > 0) {
                    const matchedTs = sortedTilesets.find((t: any) => match.tileId >= t.firstgid) || skirtTs;
                    cellGid = match.tileId;
                    cellTs = matchedTs;
                    uvPair = tilesetUvForGid(cellGid, cellTs, TILESET_SIZES);
                  }
                }
              }
              // West strip (absC < 0, 0 <= absR < height)
              else if (absC < 0 && absR >= 0 && absR < height) {
                const westStrip = this.neighborEdgeStrips.get('west');
                if (westStrip) {
                  const offsetC = -1 - absC; // absC = -1 -> offsetC 0
                  const match = westStrip.tiles.find((t) => t.offsetC === offsetC && t.offsetR === absR);
                  if (match && match.tileId > 0) {
                    const matchedTs = sortedTilesets.find((t: any) => match.tileId >= t.firstgid) || skirtTs;
                    cellGid = match.tileId;
                    cellTs = matchedTs;
                    uvPair = tilesetUvForGid(cellGid, cellTs, TILESET_SIZES);
                  }
                }
              }
              // East strip (absC >= width, 0 <= absR < height)
              else if (absC >= width && absR >= 0 && absR < height) {
                const eastStrip = this.neighborEdgeStrips.get('east');
                if (eastStrip) {
                  const offsetC = absC - width; // absC = width -> offsetC 0
                  const match = eastStrip.tiles.find((t) => t.offsetC === offsetC && t.offsetR === absR);
                  if (match && match.tileId > 0) {
                    const matchedTs = sortedTilesets.find((t: any) => match.tileId >= t.firstgid) || skirtTs;
                    cellGid = match.tileId;
                    cellTs = matchedTs;
                    uvPair = tilesetUvForGid(cellGid, cellTs, TILESET_SIZES);
                  }
                }
              }
            }

            const chunkR = Math.floor(absR / CHUNK_SIZE);
            const chunkC = Math.floor(absC / CHUNK_SIZE);
            const chunkKey = `${cellTs.imageSource}_${chunkR}_${chunkC}`;

            const posX = (absC - width / 2) * tileSize;
            const posZ = (height / 2 - absR) * tileSize;

            let vData = tilesetVertexData.get(chunkKey);
            if (!vData) {
              vData = { positions: [], indices: [], uvs: [], vertexIndex: 0 };
              tilesetVertexData.set(chunkKey, vData);
            }

            vData.positions.push(...groundQuadPositions(posX, posZ, y, tileSize, cellTs.tilewidth, cellTs.tileheight, mapData.baseTileSizePx));
            vData.uvs.push(...uvPair);

            const vi = vData.vertexIndex;
            vData.indices.push(
              vi + 0, vi + 1, vi + 2,
              vi + 0, vi + 2, vi + 3
            );
            
            vData.vertexIndex += 4;
          }
        }
      }

      let totalTilesMeshed = 0;

      tilesetVertexData.forEach((data, chunkKey) => {
        const parts = chunkKey.split('_');
        const chunkC = parts.pop();
        const chunkR = parts.pop();
        const imageSource = parts.join('_');

        if (data.vertexIndex === 0) return;
        totalTilesMeshed += data.vertexIndex / 4;
        
        let mesh = this.tilesetMeshBySource.get(chunkKey);
        const isNewMesh = !mesh;
        
        if (isNewMesh) {
          mesh = this.chunkMeshPool.pop();
          if (mesh) {
            mesh.name = `tileset_mesh_${chunkKey}`;
            mesh.isVisible = true;
          } else {
            mesh = new Mesh(`tileset_mesh_${chunkKey}`, this.scene);
          }
        }
        
        // We always update vertex data because terrain edits or neighbor resolution might have changed
        const vertexData = new VertexData();
        vertexData.positions = data.positions;
        vertexData.indices = data.indices;
        vertexData.uvs = data.uvs;
        
        const normals: number[] = [];
        VertexData.ComputeNormals(data.positions, data.indices, normals);
        vertexData.normals = normals;
        
        // Updatable so Studio paint can patch UV/positions without remount.
        vertexData.applyToMesh(mesh!, true);
        
        if (isNewMesh) {
          mesh!.parent = this.rootNode;
        }

        let mat = this.tilesetMaterialCache.get(imageSource);
        if (!mat) {
          const newMat = new StandardMaterial(`tileset_${imageSource}`, this.scene);
          mat = newMat;
          let tex = this.tilesetTextureCache.get(imageSource);
          if (!tex) {
            const tilesetPath = resolveTilesetTextureUrl(imageSource);
            console.log(`[BabylonEngine] Requesting texture: ${tilesetPath}`);
            tex = new Texture(
              tilesetPath,
              this.scene,
              true,
              false,
              1,
              () => console.log(`[BabylonEngine] Texture loaded SUCCESS: ${tilesetPath}`),
              (message) => {
                console.warn(`[BabylonEngine] Tileset image not found at ${tilesetPath}, checking remote server fallback`, message);
                const baseUrl = typeof window !== 'undefined'
                  ? ((window as any).__studioBaseUrl || localStorage.getItem('saints_studio_server_url') || 'https://saintsgaming.net')
                  : 'https://saintsgaming.net';
                if (!tilesetPath.startsWith('http')) {
                  const remotePath = `${baseUrl.replace(/\/+$/, '')}/${tilesetPath.replace(/^\.?\/+/, '')}`;
                  const remoteTex = new Texture(
                    remotePath,
                    this.scene,
                    true,
                    false,
                    1,
                    () => {
                      console.log(`[BabylonEngine] Remote fallback texture loaded SUCCESS: ${remotePath}`);
                      newMat.diffuseTexture = remoteTex;
                      this.configureTilesetMaterial(newMat, remoteTex);
                      this.tilesetTextureCache.set(imageSource, remoteTex);
                    },
                    () => {
                      newMat.diffuseTexture = null;
                      newMat.emissiveTexture = null;
                      newMat.diffuseColor = new Color3(0.18, 0.42, 0.22);
                      newMat.emissiveColor = new Color3(0.05, 0.15, 0.05);
                    }
                  );
                  remoteTex.hasAlpha = true;
                  return;
                }
                newMat.diffuseTexture = null;
                newMat.emissiveTexture = null;
                newMat.diffuseColor = new Color3(0.18, 0.42, 0.22);
                newMat.emissiveColor = new Color3(0.05, 0.15, 0.05);
              }
            );
            tex.hasAlpha = true;
            this.tilesetTextureCache.set(imageSource, tex);
          }
          mat.diffuseTexture = tex;
          this.configureTilesetMaterial(mat, tex);
          this.tilesetMaterialCache.set(imageSource, mat);
        } else {
          this.configureTilesetMaterial(mat, mat.diffuseTexture as Texture);
        }
        mesh!.material = mat;
        // Pick through map_pick_plane only — batched alpha meshes mis-hit cells.
        mesh!.isPickable = false;
        
        if (isNewMesh) {
          this.tileMeshes.push(mesh!);
          this.tilesetMeshBySource.set(chunkKey, mesh!);
        }
      });

      console.log(`[BabylonEngine] loadTilemap complete. Meshed ${totalTilesMeshed} tiles across ${tilesetVertexData.size} chunks.`);
      console.log(`[BabylonEngine] Camera position:`, this.renderer.camera.position, `Ortho dims:`, {
        left: this.renderer.camera.orthoLeft,
        right: this.renderer.camera.orthoRight,
        top: this.renderer.camera.orthoTop,
        bottom: this.renderer.camera.orthoBottom
      });
      console.log(`[BabylonEngine] Tilesets config:`, tilesets);
      console.log(`[BabylonEngine] Canvas size:`, this.canvas.width, this.canvas.height);
    }

    const hasVoxelWorld = Boolean((mapData as any).voxelDoc || this.voxel.voxelWorld);

    // If rich layers were all GID 0 (or failed), fall back to colored logic grid ONLY if no 3D voxel world is present.
    // Otherwise Studio shows only scene clearColor (near-black) — DEMO after PR #20.
    if (this.tileMeshes.length === 0 && !hasVoxelWorld) {
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
                if (this.renderer.shadowGen) this.renderer.shadowGen.addShadowCaster(block);
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
                if (this.renderer.shadowGen) this.renderer.shadowGen.addShadowCaster(trunk);
                objs.push(trunk);
                
                const foliage = MeshBuilder.CreatePlane(`base_tree`, { width: tileSize * 1.4, height: tileSize * 1.5 }, this.scene);
                foliage.billboardMode = Mesh.BILLBOARDMODE_Y;
                const treeMat = new StandardMaterial(`baseTreeMat`, this.scene);
                treeMat.diffuseColor = new Color3(0.1, 0.52, 0.2);
                treeMat.emissiveColor = new Color3(0.01, 0.08, 0.02);
                foliage.material = treeMat;
                if (this.renderer.shadowGen) this.renderer.shadowGen.addShadowCaster(foliage);
                objs.push(foliage);
              } else if (tileId === 6) {
                const ore = MeshBuilder.CreateBox(`base_ore`, { width: tileSize * 0.7, height: tileSize * 0.45, depth: tileSize * 0.7 }, this.scene);
                const oreMat = new StandardMaterial(`baseOreMat`, this.scene);
                oreMat.diffuseColor = new Color3(0.55, 0.45, 0.35);
                oreMat.specularColor = new Color3(0.4, 0.3, 0.2);
                oreMat.emissiveColor = new Color3(0.08, 0.06, 0.03);
                ore.material = oreMat;
                if (this.renderer.shadowGen) this.renderer.shadowGen.addShadowCaster(ore);
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
                if (this.renderer.shadowGen) this.renderer.shadowGen.addShadowCaster(stall);
                objs.push(stall);
              } else if (tileId === 9) {
                const anvil = MeshBuilder.CreateBox(`base_anvil`, { width: tileSize * 0.5, height: tileSize * 0.35, depth: tileSize * 0.4 }, this.scene);
                const anvilMat = new StandardMaterial(`baseAnvilMat`, this.scene);
                anvilMat.diffuseColor = new Color3(0.3, 0.3, 0.35);
                anvilMat.specularColor = new Color3(0.6, 0.6, 0.7);
                anvilMat.specularPower = 24;
                anvil.material = anvilMat;
                if (this.renderer.shadowGen) this.renderer.shadowGen.addShadowCaster(anvil);
                objs.push(anvil);
              } else if (tileId === 11) {
                const thicket = MeshBuilder.CreateBox(`base_bramble`, { width: tileSize * 0.95, height: tileSize * 0.85, depth: tileSize * 0.95 }, this.scene);
                const brambleMat = new StandardMaterial(`baseBrambleMat`, this.scene);
                brambleMat.diffuseColor = new Color3(0.22, 0.38, 0.12);
                brambleMat.emissiveColor = new Color3(0.04, 0.08, 0.02);
                thicket.material = brambleMat;
                if (this.renderer.shadowGen) this.renderer.shadowGen.addShadowCaster(thicket);
                objs.push(thicket);
              } else if (tileId === 12) {
                const pillar = MeshBuilder.CreateBox(`base_terminal`, { width: tileSize * 0.35, height: tileSize * 1.0, depth: tileSize * 0.35 }, this.scene);
                const pillarMat = new StandardMaterial(`baseTerminalMat`, this.scene);
                pillarMat.diffuseColor = new Color3(0.12, 0.15, 0.35);
                pillarMat.emissiveColor = new Color3(0.05, 0.08, 0.25);
                pillarMat.specularColor = new Color3(0.3, 0.4, 0.8);
                pillarMat.specularPower = 48;
                pillar.material = pillarMat;
                if (this.renderer.shadowGen) this.renderer.shadowGen.addShadowCaster(pillar);
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
    // Pad by one tile so edge-cell half-extents (centers at ±w/2) stay pickable.
    const pickW = width * tileSize + tileSize;
    const pickH = height * tileSize + tileSize;
    const pickPlane = MeshBuilder.CreateGround(
      'map_pick_plane',
      { width: pickW, height: pickH },
      this.scene
    );
    // Slightly above y=0 so the ray hits even when ground quads write depth.
    pickPlane.position = new Vector3(0, 0.001, 0);
    pickPlane.parent = this.rootNode;
    pickPlane.isPickable = true;
    pickPlane.visibility = 0;
    this.mapPickPlane = pickPlane;
    this.tileMeshes.push(pickPlane);

    // Render Freeform Layers
    if (mapData.freeformLayers) {
      mapData.freeformLayers.forEach((layer) => {
        if (layer.type === 'paint-splat' && layer.data) {
          // Splat Rendering — Group points by unique material signature (Texture URL + UV crop)
          const splatGroups = new Map<string, {
            texUrl: string;
            uOffset?: number;
            vOffset?: number;
            uScale?: number;
            vScale?: number;
            points: any[];
          }>();

          Object.entries(layer.data).forEach(([rawUrl, rawPoints]) => {
            const points = rawPoints as any[];
            if (!points.length) return;
            const texUrl = toClientAssetUrl((rawUrl.startsWith('/') || rawUrl.startsWith('http'))
              ? rawUrl
              : `/game-assets/tilesets/${rawUrl}`);

            for (const p of points) {
              const hasUv = typeof p.uOffset === 'number' && typeof p.uScale === 'number';
              const groupKey = hasUv
                ? `${texUrl}_u${p.uOffset}_v${p.vOffset}_s${p.uScale}_${p.vScale}`
                : texUrl;

              let group = splatGroups.get(groupKey);
              if (!group) {
                group = {
                  texUrl,
                  uOffset: p.uOffset,
                  vOffset: p.vOffset,
                  uScale: p.uScale,
                  vScale: p.vScale,
                  points: [],
                };
                splatGroups.set(groupKey, group);
              }
              group.points.push(p);
            }
          });

          splatGroups.forEach((group, groupKey) => {
            const points = group.points;
            if (!points.length) return;
            const hasUv = typeof group.uOffset === 'number' && typeof group.uScale === 'number';
            const matKey = `splat_mat_${groupKey}`;

            let mat = this.tilesetMaterialCache.get(matKey);
            if (!mat) {
              const newMat = new StandardMaterial(matKey, this.scene);
              mat = newMat;
              let tex = new Texture(
                group.texUrl,
                this.scene,
                true,
                false,
                Texture.NEAREST_SAMPLINGMODE,
                undefined,
                (message) => {
                  console.warn(`[BabylonEngine] Splat texture not found at ${group.texUrl}, using fallback color`, message);
                  newMat.diffuseTexture = null;
                  newMat.emissiveTexture = null;
                  newMat.diffuseColor = new Color3(0.2, 0.35, 0.2);
                  newMat.emissiveColor = new Color3(0.05, 0.15, 0.05);
                }
              );
              tex.hasAlpha = true;
              if (hasUv) {
                tex.uOffset = group.uOffset || 0;
                tex.vOffset = group.vOffset || 0;
                tex.uScale = group.uScale || 1;
                tex.vScale = group.vScale || 1;
              }
              mat.diffuseTexture = tex;
              mat.useAlphaFromDiffuseTexture = true;
              mat.alphaCutOff = 0.5;
              mat.specularColor = new Color3(0, 0, 0);
              mat.emissiveColor = new Color3(0.9, 0.9, 0.9);
              mat.backFaceCulling = false;
              mat.disableLighting = true;
              this.tilesetMaterialCache.set(matKey, mat);
            }

            // Thin Instances: Use discs for seamless terrain to prevent blocky square edges
            let plane: Mesh;
            if (!hasUv) {
              plane = MeshBuilder.CreateDisc(`splat_mesh_${groupKey}`, { radius: tileSize * 0.7, tessellation: 24 }, this.scene);
            } else {
              plane = MeshBuilder.CreatePlane(`splat_mesh_${groupKey}`, { size: tileSize }, this.scene);
            }
            plane.material = mat;
            plane.rotation.x = Math.PI / 2;
            plane.isPickable = false;

            const matrices = new Float32Array(16 * points.length);
            for (let i = 0; i < points.length; i++) {
              const p = points[i];
              const posX = (p.x - width / 2) * tileSize;
              const posZ = (height / 2 - p.y) * tileSize;

              const baseScale = p.scale || 1;
              const scaleX = baseScale * (p.width || 1);
              const scaleY = baseScale * (p.height || 1);

              const matrix = Matrix.Compose(
                new Vector3(scaleX, scaleY, baseScale),
                Quaternion.RotationAxis(Vector3.Up(), p.rotation || 0),
                new Vector3(posX, 0.01 + Math.min(i, 50) * 0.0005, posZ)
              );
              matrix.copyToArray(matrices, i * 16);
            }
            plane.thinInstanceSetBuffer('matrix', matrices, 16, true);
            plane.parent = this.rootNode;
            this.freeformMeshes.push(plane);
          });
        } else if (layer.type === 'free-form' && layer.objects) {
          // Prop Rendering
          layer.objects.forEach((obj: any) => {
            const posX = (obj.x - width / 2) * tileSize;
            const posZ = (height / 2 - obj.y) * tileSize;

            const baseScale = obj.scale || 1;
            const w = baseScale * tileSize * (obj.width || 1);
            const h = baseScale * tileSize * (obj.height || 1);

            const plane = MeshBuilder.CreatePlane(
              `prop_${obj.id}`,
              {
                width: w,
                height: h,
                sideOrientation: Mesh.DOUBLESIDE,
              },
              this.scene
            );

            plane.position.set(posX, ((obj.scale || 1) * tileSize) / 2, posZ);
            plane.rotation.y = obj.rotation || 0;

            const rawPropUrl = obj.asset || 'default';
            const propUrl = toClientAssetUrl((rawPropUrl.startsWith('/') || rawPropUrl.startsWith('http'))
              ? rawPropUrl
              : `/game-assets/tilesets/${rawPropUrl}`);

            const hasUv = typeof obj.uOffset === 'number' && typeof obj.uScale === 'number';
            const matKey = hasUv
              ? `prop_mat_${propUrl}_${obj.uOffset}_${obj.vOffset}_${obj.uScale}_${obj.vScale}`
              : `prop_mat_${propUrl}`;

            let mat = this.tilesetMaterialCache.get(matKey);
            if (!mat) {
              const newPropMat = new StandardMaterial(matKey, this.scene);
              mat = newPropMat;
              let tex = new Texture(
                propUrl,
                this.scene,
                true,
                false,
                Texture.NEAREST_SAMPLINGMODE,
                undefined,
                (message) => {
                  console.warn(`[BabylonEngine] Prop texture not found at ${propUrl}, using fallback color`, message);
                  newPropMat.diffuseTexture = null;
                  newPropMat.diffuseColor = new Color3(0.2, 0.35, 0.2);
                  newPropMat.emissiveColor = new Color3(0.05, 0.15, 0.05);
                }
              );
              tex.hasAlpha = true;
              if (hasUv) {
                tex.uOffset = obj.uOffset || 0;
                tex.vOffset = obj.vOffset || 0;
                tex.uScale = obj.uScale || 1;
                tex.vScale = obj.vScale || 1;
              }
              mat.diffuseTexture = tex;
              mat.useAlphaFromDiffuseTexture = true;
              mat.alphaCutOff = 0.5;
              mat.specularColor = new Color3(0, 0, 0);
              mat.emissiveColor = new Color3(0.9, 0.9, 0.9);
              mat.backFaceCulling = false;
              mat.disableLighting = true;
              this.tilesetMaterialCache.set(matKey, mat);
            }
            plane.material = mat;
            plane.billboardMode = Mesh.BILLBOARDMODE_Y;
            plane.isPickable = false;
            plane.parent = this.rootNode;
            this.freeformMeshes.push(plane);
          });
        }
      });
    }

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
          spriteUrl: toClientAssetUrl(npc.sprite
            ? (String(npc.sprite).startsWith("/") ? npc.sprite : `/game-assets/npc/${npc.sprite}.png`)
            : "/game-assets/npc/professor.png")
        });
      });
    }

    // Refresh high-contrast editor map boundaries (visible only in editor mode)
    this.updateEditorMapBorders();

    if (!this.editorCameraMode) {
      this.renderer.applyPlayerCameraStyle(this.renderer.cameraSettings.playerCameraStyle);
    }

    // Always ensure 3D Voxel World is loaded and rendered
    const rawVoxel = mapData.voxelDoc || (this.currentRawMapData as any)?.voxelDoc;
    const voxelDoc = rawVoxel || generateDefaultWorldDoc(
      Math.max(1, Math.ceil((width || 32) / 32)),
      Math.max(1, Math.ceil((height || 32) / 32)),
      mapData.blockSizePx || (this.currentRawMapData as any)?.blockSizePx || 64,
      width,
      height
    );
    if (mapId && voxelDoc.id !== mapId) {
      voxelDoc.id = mapId;
    }
    this.voxel.loadVoxelWorld(voxelDoc);
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

    if (isIndoor) {
      if (tileId === 0) {
        if (this.woodFloorTexture) {
          mat.diffuseTexture = this.woodFloorTexture;
          mat.emissiveTexture = this.woodFloorTexture;
          mat.emissiveColor = new Color3(1, 1, 1);
          return;
        }
        mat.diffuseColor = new Color3(0.55 + tone, 0.35 + tone, 0.2 + tone);
        mat.emissiveColor = mat.diffuseColor;
        mat.specularColor = new Color3(0.12, 0.08, 0.04);
        return;
      } else if (tileId === 1) {
        if (isBlock && this.indoorWallTexture) {
          mat.diffuseTexture = this.indoorWallTexture;
          mat.emissiveTexture = this.indoorWallTexture;
          mat.emissiveColor = new Color3(1, 1, 1);
          return;
        }
        mat.diffuseColor = new Color3(0.85 + tone, 0.88 + tone, 0.92 + tone);
        mat.emissiveColor = mat.diffuseColor;
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
        break;
      // Clinic / Healing
      case 8:
        mat.diffuseColor = new Color3(0.18 + tone, 0.48 + tone, 0.58 + tone);
        break;
      // Crafting anvil
      case 9:
        mat.diffuseColor = new Color3(0.4 + tone, 0.4 + tone, 0.42 + tone);
        mat.specularColor = new Color3(0.3, 0.3, 0.35);
        mat.specularPower = 40;
        break;
      // Fishing Water
      case 10:
        mat.diffuseColor = new Color3(0.08 + tone, 0.32 + tone, 0.65 + tone);
        mat.specularColor = new Color3(0.4, 0.5, 0.7);
        mat.specularPower = 48;
        break;
      // Bramble barrier (Q4)
      case 11:
        mat.diffuseColor = new Color3(0.18 + tone, 0.32 + tone, 0.1 + tone);
        break;
      // Base terminal
      case 12:
        mat.diffuseColor = new Color3(0.08 + tone, 0.1 + tone, 0.22 + tone);
        break;
      default: mat.diffuseColor = new Color3(0.18 + tone, 0.44 + tone, 0.20 + tone); break;
    }
    mat.emissiveColor = mat.diffuseColor;
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
    return worldToTileCoord(
      worldX,
      worldZ,
      this.currentMapWidth,
      this.currentMapHeight,
      this.currentTileSize || 1
    );
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
      const newMat = new StandardMaterial(`tileset_${imageSource}`, this.scene);
      mat = newMat;
      let tex = this.tilesetTextureCache.get(imageSource);
      if (!tex) {
        const tilesetPath = resolveTilesetTextureUrl(imageSource);
        tex = new Texture(
          tilesetPath,
          this.scene,
          true,
          false,
          1,
          undefined,
          (message) => {
            console.warn(`[BabylonEngine] Tileset image not found at ${tilesetPath}, using fallback color`, message);
            newMat.diffuseTexture = null;
            newMat.emissiveTexture = null;
            newMat.diffuseColor = new Color3(0.18, 0.42, 0.22);
            newMat.emissiveColor = new Color3(0.05, 0.15, 0.05);
          }
        );
        tex.hasAlpha = true;
        this.tilesetTextureCache.set(imageSource, tex);
      }
      mat.diffuseTexture = tex;
      this.configureTilesetMaterial(mat, tex);
      this.tilesetMaterialCache.set(imageSource, mat);
    } else {
      this.configureTilesetMaterial(mat, mat.diffuseTexture as Texture);
    }
    mesh.material = mat;
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
    const positions = groundQuadPositions(posX, posZ, y, tileSize, ts.tilewidth, ts.tileheight, this.currentRawMapData?.baseTileSizePx);

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
        const newLegacyMat = new StandardMaterial(`tileset_${ts.imageSource}`, this.scene);
        mat = newLegacyMat;
        let tex = this.tilesetTextureCache.get(ts.imageSource);
        if (!tex) {
          const tilesetPath = resolveTilesetTextureUrl(ts.imageSource);
          tex = new Texture(
            tilesetPath,
            this.scene,
            true,
            false,
            1,
            undefined,
            (message) => {
              console.warn(`[BabylonEngine] Legacy paint tileset not found at ${tilesetPath}, using fallback color`, message);
              newLegacyMat.diffuseTexture = null;
              newLegacyMat.emissiveTexture = null;
              newLegacyMat.diffuseColor = new Color3(0.18, 0.42, 0.22);
              newLegacyMat.emissiveColor = new Color3(0.05, 0.15, 0.05);
            }
          );
          tex.hasAlpha = true;
          this.tilesetTextureCache.set(ts.imageSource, tex);
        }
        mat.diffuseTexture = tex;
        this.configureTilesetMaterial(mat, tex);
        this.tilesetMaterialCache.set(ts.imageSource, mat);
      } else {
        this.configureTilesetMaterial(mat, mat.diffuseTexture as Texture);
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
      const newOverlayMat = new StandardMaterial(`tileset_${ts.imageSource}`, this.scene);
      mat = newOverlayMat;
      let tex = this.tilesetTextureCache.get(ts.imageSource);
      if (!tex) {
        const tilesetPath = resolveTilesetTextureUrl(ts.imageSource);
        tex = new Texture(
          tilesetPath,
          this.scene,
          true,
          false,
          1,
          undefined,
          (message) => {
            console.warn(`[BabylonEngine] Paint overlay tileset not found at ${tilesetPath}, using fallback color`, message);
            newOverlayMat.diffuseTexture = null;
            newOverlayMat.emissiveTexture = null;
            newOverlayMat.diffuseColor = new Color3(0.18, 0.42, 0.22);
            newOverlayMat.emissiveColor = new Color3(0.05, 0.15, 0.05);
          }
        );
        tex.hasAlpha = true;
        this.tilesetTextureCache.set(ts.imageSource, tex);
      }
      mat.diffuseTexture = tex;
      this.configureTilesetMaterial(mat, tex);
      this.tilesetMaterialCache.set(ts.imageSource, mat);
    } else {
      this.configureTilesetMaterial(mat, mat.diffuseTexture as Texture);
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
      const isGate = m.kind === "gate";
      const w = isGate ? Math.max(1, (m as any).w || 1) : 1;
      const h = isGate ? Math.max(1, (m as any).h || 1) : 1;
      const centerC = m.x + (w - 1) / 2;
      const centerR = m.y + (h - 1) / 2;

      const { posX, posZ } = tileCellWorldPos(
        centerR,
        centerC,
        this.currentMapWidth,
        this.currentMapHeight,
        tileSize
      );

      const planeWidth = isGate ? w * tileSize * 0.95 : tileSize * (m.kind === "spawn" ? 0.45 : 0.7);
      const planeHeight = isGate ? h * tileSize * 0.95 : tileSize * (m.kind === "spawn" ? 0.45 : 0.7);

      const plane = MeshBuilder.CreatePlane(
        `author_${m.kind}_${m.key}`,
        { width: planeWidth, height: planeHeight },
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
      mat.emissiveColor = Color3.FromHexString("#10b981");
      mat.alpha = 0.55;
    } else if (logicId === 1) {
      mat.emissiveColor = Color3.FromHexString("#dc2626");
      mat.alpha = 0.85;
    } else if (logicId === 2) {
      mat.emissiveColor = Color3.FromHexString("#22c55e");
      mat.alpha = 0.85;
    } else if (logicId === 3 || logicId === 4) {
      mat.emissiveColor = Color3.FromHexString("#f59e0b");
      mat.alpha = 0.85;
    } else if (logicId === 5) {
      mat.emissiveColor = Color3.FromHexString("#92400e");
      mat.alpha = 0.85;
    } else if (logicId === 6) {
      mat.emissiveColor = Color3.FromHexString("#78716c");
      mat.alpha = 0.85;
    } else if (logicId === 7) {
      mat.emissiveColor = Color3.FromHexString("#eab308");
      mat.alpha = 0.85;
    } else if (logicId === 8) {
      mat.emissiveColor = Color3.FromHexString("#ec4899");
      mat.alpha = 0.85;
    } else if (logicId === 9) {
      mat.emissiveColor = Color3.FromHexString("#64748b");
      mat.alpha = 0.85;
    } else if (logicId === 10) {
      mat.emissiveColor = Color3.FromHexString("#0284c7");
      mat.alpha = 0.85;
    } else if (logicId === 11) {
      mat.emissiveColor = Color3.FromHexString("#3f6212");
      mat.alpha = 0.72;
    } else if (logicId === 12) {
      mat.emissiveColor = Color3.FromHexString("#4338ca");
      mat.alpha = 0.7;
    } else {
      // Stable hash so custom tags stay visually distinct.
      const hue = ((logicId * 47) % 360) / 360;
      mat.emissiveColor = Color3.FromHSV(hue * 360, 0.65, 0.9);
      mat.alpha = 0.85;
    }
  }

  // --- REGION GRID OVERLAY SYSTEM ---

  private regionOverlayMeshes: Mesh[] = [];
  private regionMaterialCache: Map<number, StandardMaterial> = new Map();

  public enableRegionGridOverlay(regionGrid: number[][]) {
    if (this.regionOverlayMeshes.length > 0) {
      this.regionOverlayMeshes.forEach(m => m.dispose());
      this.regionOverlayMeshes = [];
    }

    const height = regionGrid.length;
    const width = regionGrid[0]?.length || 0;
    const yOffset = 0.55; // Slightly above logic layer

    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const regionId = regionGrid[r]?.[c] || 0;

        const plane = MeshBuilder.CreatePlane(`region_${r}_${c}`, { size: this.currentTileSize }, this.scene);
        plane.rotation.x = Math.PI / 2;
        const posX = (c - width / 2) * this.currentTileSize;
        const posZ = (height / 2 - r) * this.currentTileSize;
        plane.position = new Vector3(posX, yOffset, posZ);
        plane.parent = this.rootNode;
        plane.isPickable = true; 
        plane.material = this.getRegionMaterial(regionId);

        this.regionOverlayMeshes.push(plane);
      }
    }
  }

  public disableRegionGridOverlay() {
    this.regionOverlayMeshes.forEach(m => m.dispose());
    this.regionOverlayMeshes = [];
  }

  public hasRegionGridOverlay(): boolean {
    return this.regionOverlayMeshes.length > 0;
  }

  public updateRegionTile(r: number, c: number, regionId: number): boolean {
    const plane = this.scene.getMeshByName(`region_${r}_${c}`) as Mesh | null;
    if (!plane) return false;
    plane.material = this.getRegionMaterial(regionId);
    return true;
  }

  private getRegionMaterial(regionId: number): StandardMaterial {
    const cached = this.regionMaterialCache.get(regionId);
    if (cached) return cached;
    const mat = new StandardMaterial(`regionMat_${regionId}`, this.scene);
    mat.disableLighting = true;
    if (regionId === 0) {
      mat.emissiveColor = Color3.FromHexString("#000000");
      mat.alpha = 0.0;
    } else {
      // Create distinct hue per region ID matching Palette (id * 25)
      const hue = ((regionId * 25) % 360) / 360;
      mat.emissiveColor = Color3.FromHSV(hue * 360, 0.7, 0.5);
      mat.alpha = 0.75;
    }
    this.regionMaterialCache.set(regionId, mat);
    return mat;
  }

  /** Set brush radius for multi-tile painting. */
  public setBrushRadius(radius: number) {
    this.brushRadius = Math.max(1, Math.min(10, radius));
    this.refreshBrushPreview();
  }

  /** Set brush shape. */
  public setBrushShape(shape: BrushShape) {
    this.brushShape = shape;
    this.refreshBrushPreview();
  }

  public setBrushRotation(rot: number) {
    this.brushRotation = ((rot % 360) + 360) % 360;
    this.refreshBrushPreview();
  }

  public setActiveBrushTileId(gid: number) {
    this.activeBrushTileId = gid;
    this.activeBrushPattern = null;
    this.refreshBrushPreview();
  }

  public setActiveBrushPattern(pattern: { w: number; h: number; gids?: number[][] } | null) {
    this.activeBrushPattern = pattern;
    this.refreshBrushPreview();
  }

  public setPrefabStampMode(mode: '1tile' | 'footprint') {
    this.prefabStampMode = mode;
    this.refreshBrushPreview();
  }

  public setActiveLayerIdx(layerIdx: number) {
    this.activeLayerIdx = layerIdx;
    this.refreshBrushPreview();
  }

  public setActiveLayerType(type: string) {
    this.activeLayerType = type;
    this.refreshBrushPreview();
  }

  public setBrushMode(mode: string) {
    this.brushMode = mode;
    this.refreshBrushPreview();
  }

  /** Re-render the brush preview at the last hovered coordinate. */
  public refreshBrushPreview() {
    if (this.activeLayerType === 'paint-splat' || this.activeLayerType === 'free-form') {
      if (this.scene) {
        const pick = this.scene.pick(
          this.scene.pointerX,
          this.scene.pointerY,
          (m) => m.isPickable && isTilePickTarget(m.name)
        );
        const res = this.input.resolveTilePick(pick) || this.input.pickTileFromGroundPlane(this.scene.pointerX, this.scene.pointerY);
        if (res?.point) {
          this.renderContinuousSplatPreview(res.point.x, res.point.z);
        }
      }
    } else {
      if (this.lastHoveredR !== -1 && this.lastHoveredC !== -1) {
        this.renderBrushPreview(this.lastHoveredR, this.lastHoveredC);
      }
    }
  }

  private createSplatBrushReticleMaterial(
    shape: BrushShape,
    strokeColor: string,
    glassColor: string
  ): StandardMaterial {
    const matName = `hud_splat_brush_${shape}_${strokeColor.replace('#', '')}`;
    let mat = this.scene.getMaterialByName(matName) as StandardMaterial | null;
    if (mat) return mat;

    mat = new StandardMaterial(matName, this.scene);
    const texSize = 512;
    const dt = new DynamicTexture(`${matName}_tex`, { width: texSize, height: texSize }, this.scene, false);
    const ctx = dt.getContext();
    ctx.clearRect(0, 0, texSize, texSize);

    const cx = texSize / 2;
    const cy = texSize / 2;
    const radius = texSize * 0.44;

    ctx.save();
    if (shape === 'square') {
      const minX = cx - radius;
      const minY = cy - radius;
      const size = radius * 2;
      ctx.fillStyle = glassColor;
      ctx.fillRect(minX, minY, size, size);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 6;
      ctx.strokeRect(minX, minY, size, size);
    } else if (shape === 'diamond') {
      ctx.beginPath();
      ctx.moveTo(cx, cy - radius);
      ctx.lineTo(cx + radius, cy);
      ctx.lineTo(cx, cy + radius);
      ctx.lineTo(cx - radius, cy);
      ctx.closePath();
      ctx.fillStyle = glassColor;
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 6;
      ctx.stroke();
    } else if (shape === 'splat-star') {
      ctx.beginPath();
      const numPoints = 8;
      for (let i = 0; i < numPoints * 2; i++) {
        const r = i % 2 === 0 ? radius : radius * 0.45;
        const angle = (i * Math.PI) / numPoints - Math.PI / 2;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = glassColor;
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 6;
      ctx.stroke();
    } else {
      // Circle
      const grad = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius);
      grad.addColorStop(0, glassColor);
      grad.addColorStop(0.8, glassColor.replace('0.25', '0.12').replace('0.22', '0.10'));
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Center focal reticle pip & crosshairs
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    const crosshairLen = 14;
    const gap = 8;
    // N, S, W, E ticks
    ctx.beginPath(); ctx.moveTo(cx, cy - gap - crosshairLen); ctx.lineTo(cx, cy - gap); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy + gap); ctx.lineTo(cx, cy + gap + crosshairLen); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - gap - crosshairLen, cy); ctx.lineTo(cx - gap, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + gap, cy); ctx.lineTo(cx + gap + crosshairLen, cy); ctx.stroke();

    ctx.restore();

    dt.hasAlpha = true;
    dt.update();

    mat.diffuseTexture = dt;
    mat.emissiveColor = new Color3(1, 1, 1);
    mat.useAlphaFromDiffuseTexture = true;
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    return mat;
  }

  public renderContinuousSplatPreview(worldX: number, worldZ: number) {
    if (!this.scene) return;

    if (this.footprintUnifiedMesh) this.footprintUnifiedMesh.isVisible = false;
    if (this.hoverReticleMesh) this.hoverReticleMesh.isVisible = false;
    if (this.footprintSqMesh) this.footprintSqMesh.isVisible = false;
    if (this.patternPreviewMesh) this.patternPreviewMesh.isVisible = false;
    this.clearFootprintCircMeshes();

    const isErase = this.brushMode === 'erase';
    const stroke = isErase ? '#f43f5e' : '#f59e0b';
    const glass = isErase ? 'rgba(244, 63, 94, 0.22)' : 'rgba(245, 158, 11, 0.22)';
    const mat = this.createSplatBrushReticleMaterial(this.brushShape, stroke, glass);

    if (!this.splatPreviewMesh || this.splatPreviewMesh.isDisposed()) {
      this.splatPreviewMesh = MeshBuilder.CreatePlane('brush_splat_preview', { size: 1 }, this.scene);
      this.splatPreviewMesh.parent = this.rootNode;
      this.splatPreviewMesh.isPickable = false;
    }

    const rad = this.brushRadius || 1;
    const scale = (rad * 0.9 * 2) * (this.stampScale || 1);
    const altitude = SPATIAL_LAYER_ALTITUDES.BRUSH_PREVIEW;

    this.splatPreviewMesh.rotation.set(Math.PI / 2, 0, (this.brushRotation * Math.PI) / 180);
    this.splatPreviewMesh.scaling.x = scale;
    this.splatPreviewMesh.scaling.y = scale;
    this.splatPreviewMesh.position.set(worldX, altitude, worldZ);
    this.splatPreviewMesh.material = mat;
    this.splatPreviewMesh.isVisible = true;
  }

  private createUnifiedBrushReticleMaterial(
    shape: BrushShape,
    rad: number,
    strokeColor: string,
    glassColor: string,
    cornerColor: string = '#ffffff'
  ): StandardMaterial {
    const matName = `hud_unified_brush_${shape}_r${rad}_${strokeColor.replace('#', '')}`;
    let mat = this.scene.getMaterialByName(matName) as StandardMaterial | null;
    if (mat) return mat;

    mat = new StandardMaterial(matName, this.scene);
    const span = rad * 2 + 1;
    const texSize = Math.min(1024, Math.max(256, span * 128));
    const cellSize = texSize / span;
    const dt = new DynamicTexture(`${matName}_tex`, { width: texSize, height: texSize }, this.scene, false);
    const ctx = dt.getContext();

    ctx.clearRect(0, 0, texSize, texSize);

    const isInFootprint = (r: number, c: number): boolean => {
      if (r < 0 || r >= span || c < 0 || c >= span) return false;
      return isInGridFootprint(r - rad, c - rad, rad, shape);
    };

    // 1. Fill entire active footprint with ambient glass gradient
    ctx.save();
    ctx.beginPath();
    for (let r = 0; r < span; r++) {
      for (let c = 0; c < span; c++) {
        if (isInFootprint(r, c)) {
          ctx.rect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
      }
    }
    ctx.clip();

    const centerX = texSize / 2;
    const centerY = texSize / 2;
    const maxRadius = (texSize / 2) * 1.15;
    const grad = ctx.createRadialGradient(centerX, centerY, cellSize * 0.15, centerX, centerY, maxRadius);
    grad.addColorStop(0, glassColor);
    grad.addColorStop(0.65, glassColor.replace('0.25', '0.12').replace('0.22', '0.10').replace('0.3', '0.10'));
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, texSize, texSize);
    ctx.restore();

    // 2. Subtle internal grid dividers between adjacent cells
    if (span > 1) {
      ctx.save();
      ctx.strokeStyle = strokeColor.includes('#') ? `${strokeColor}44` : 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = Math.max(1.5, cellSize * 0.02);

      for (let r = 0; r < span; r++) {
        for (let c = 0; c < span; c++) {
          if (!isInFootprint(r, c)) continue;

          // Vertical divider
          if (c + 1 < span && isInFootprint(r, c + 1)) {
            const x = (c + 1) * cellSize;
            ctx.beginPath();
            ctx.moveTo(x, r * cellSize + 2);
            ctx.lineTo(x, (r + 1) * cellSize - 2);
            ctx.stroke();
          }

          // Horizontal divider
          if (r + 1 < span && isInFootprint(r + 1, c)) {
            const y = (r + 1) * cellSize;
            ctx.beginPath();
            ctx.moveTo(c * cellSize + 2, y);
            ctx.lineTo((c + 1) * cellSize - 2, y);
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }

    // 3. Continuous Outer Boundary Contour (Single unified perimeter stroke)
    ctx.save();
    ctx.shadowBlur = 6;
    ctx.shadowColor = strokeColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = Math.max(3, Math.min(6, cellSize * 0.05));
    const ctx2d = ctx as unknown as CanvasRenderingContext2D;
    ctx2d.lineCap = 'round';
    ctx2d.lineJoin = 'round';

    const edgePad = 2;
    for (let r = 0; r < span; r++) {
      for (let c = 0; c < span; c++) {
        if (!isInFootprint(r, c)) continue;

        const x0 = c * cellSize + edgePad;
        const x1 = (c + 1) * cellSize - edgePad;
        const y0 = r * cellSize + edgePad;
        const y1 = (r + 1) * cellSize - edgePad;

        // North edge
        if (!isInFootprint(r - 1, c)) {
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y0);
          ctx.stroke();
        }
        // South edge
        if (!isInFootprint(r + 1, c)) {
          ctx.beginPath();
          ctx.moveTo(x0, y1);
          ctx.lineTo(x1, y1);
          ctx.stroke();
        }
        // West edge
        if (!isInFootprint(r, c - 1)) {
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x0, y1);
          ctx.stroke();
        }
        // East edge
        if (!isInFootprint(r, c + 1)) {
          ctx.beginPath();
          ctx.moveTo(x1, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
        }
      }
    }
    ctx.restore();

    // 4. Outer Boundary Corner L-Brackets
    ctx.save();
    ctx.shadowBlur = 6;
    ctx.shadowColor = strokeColor;
    ctx.strokeStyle = cornerColor;
    ctx.lineWidth = Math.max(3.5, Math.min(6, cellSize * 0.06));
    const bracketLen = Math.min(cellSize * 0.4, 32);

    if (span === 1 || shape === 'square') {
      const inset = edgePad + 1;
      const minX = inset;
      const maxX = texSize - inset;
      const minY = inset;
      const maxY = texSize - inset;

      // Top-Left
      ctx.beginPath();
      ctx.moveTo(minX, minY + bracketLen); ctx.lineTo(minX, minY); ctx.lineTo(minX + bracketLen, minY);
      // Top-Right
      ctx.moveTo(maxX - bracketLen, minY); ctx.lineTo(maxX, minY); ctx.lineTo(maxX, minY + bracketLen);
      // Bottom-Right
      ctx.moveTo(maxX, maxY - bracketLen); ctx.lineTo(maxX, maxY); ctx.lineTo(maxX - bracketLen, maxY);
      // Bottom-Left
      ctx.moveTo(minX + bracketLen, maxY); ctx.lineTo(minX, maxY); ctx.lineTo(minX, maxY - bracketLen);
      ctx.stroke();
    } else {
      // Circular silhouette: add subtle corner bracket ticks on the 4 cardinal outer tips
      let northR = 0; while (northR < span && !isInFootprint(northR, rad)) northR++;
      let southR = span - 1; while (southR >= 0 && !isInFootprint(southR, rad)) southR--;
      let westC = 0; while (westC < span && !isInFootprint(rad, westC)) westC++;
      let eastC = span - 1; while (eastC >= 0 && !isInFootprint(rad, eastC)) eastC--;

      const drawTipAccent = (cx: number, cy: number) => {
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fillStyle = cornerColor;
        ctx.fill();
      };
      drawTipAccent((rad + 0.5) * cellSize, northR * cellSize + edgePad + 3);
      drawTipAccent((rad + 0.5) * cellSize, (southR + 1) * cellSize - edgePad - 3);
      drawTipAccent(westC * cellSize + edgePad + 3, (rad + 0.5) * cellSize);
      drawTipAccent((eastC + 1) * cellSize - edgePad - 3, (rad + 0.5) * cellSize);
    }
    ctx.restore();

    // 5. Single Focal Center Target Pip (on the exact center cell under mouse)
    const focalCenterX = (rad + 0.5) * cellSize;
    const focalCenterY = (rad + 0.5) * cellSize;

    ctx.save();
    ctx.shadowBlur = 5;
    ctx.shadowColor = strokeColor;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(focalCenterX, focalCenterY, Math.max(3, cellSize * 0.04), 0, Math.PI * 2);
    ctx.fill();

    // Subtle focal crosshair tick marks
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    const crosshairLen = Math.max(5, cellSize * 0.12);
    const gap = Math.max(3.5, cellSize * 0.07);

    // North tick
    ctx.beginPath(); ctx.moveTo(focalCenterX, focalCenterY - gap - crosshairLen); ctx.lineTo(focalCenterX, focalCenterY - gap); ctx.stroke();
    // South tick
    ctx.beginPath(); ctx.moveTo(focalCenterX, focalCenterY + gap); ctx.lineTo(focalCenterX, focalCenterY + gap + crosshairLen); ctx.stroke();
    // West tick
    ctx.beginPath(); ctx.moveTo(focalCenterX - gap - crosshairLen, focalCenterY); ctx.lineTo(focalCenterX - gap, focalCenterY); ctx.stroke();
    // East tick
    ctx.beginPath(); ctx.moveTo(focalCenterX + gap, focalCenterY); ctx.lineTo(focalCenterX + gap + crosshairLen, focalCenterY); ctx.stroke();
    ctx.restore();

    dt.hasAlpha = true;
    dt.update();

    mat.diffuseTexture = dt;
    mat.emissiveColor = new Color3(1, 1, 1);
    mat.useAlphaFromDiffuseTexture = true;
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    return mat;
  }

  private createMultiTileReticleMaterial(patW: number, patH: number): StandardMaterial {
    const matName = `hud_reticle_pat_${patW}x${patH}`;
    let mat = this.scene.getMaterialByName(matName) as StandardMaterial | null;
    if (mat) return mat;

    mat = new StandardMaterial(matName, this.scene);
    const texW = Math.min(1024, Math.max(256, patW * 64));
    const texH = Math.min(1024, Math.max(256, patH * 64));
    const dt = new DynamicTexture(`${matName}_tex`, { width: texW, height: texH }, this.scene, false);
    const ctx = dt.getContext();

    ctx.clearRect(0, 0, texW, texH);

    // Subtle violet background glass fill
    ctx.fillStyle = 'rgba(192, 132, 252, 0.18)';
    ctx.fillRect(8, 8, texW - 16, texH - 16);

    // Internal cell grid lines
    ctx.strokeStyle = 'rgba(216, 180, 254, 0.35)';
    ctx.lineWidth = 1.5;
    for (let c = 1; c < patW; c++) {
      const x = (c / patW) * texW;
      ctx.beginPath();
      ctx.moveTo(x, 8);
      ctx.lineTo(x, texH - 8);
      ctx.stroke();
    }
    for (let r = 1; r < patH; r++) {
      const y = (r / patH) * texH;
      ctx.beginPath();
      ctx.moveTo(8, y);
      ctx.lineTo(texW - 8, y);
      ctx.stroke();
    }

    // Outer neon border
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 3.5;
    ctx.strokeRect(8, 8, texW - 16, texH - 16);

    // Corner L-brackets
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#c084fc';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    const ctx2d = ctx as unknown as CanvasRenderingContext2D;
    ctx2d.lineCap = 'round';
    ctx2d.lineJoin = 'round';
    const cLen = Math.min(32, Math.min(texW, texH) * 0.25);

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(6, 6 + cLen); ctx.lineTo(6, 6); ctx.lineTo(6 + cLen, 6);
    // Top-Right
    ctx.moveTo(texW - 6 - cLen, 6); ctx.lineTo(texW - 6, 6); ctx.lineTo(texW - 6, 6 + cLen);
    // Bottom-Right
    ctx.moveTo(texW - 6, texH - 6 - cLen); ctx.lineTo(texW - 6, texH - 6); ctx.lineTo(texW - 6 - cLen, texH - 6);
    // Bottom-Left
    ctx.moveTo(6 + cLen, texH - 6); ctx.lineTo(6, texH - 6); ctx.lineTo(6, texH - 6 - cLen);
    ctx.stroke();

    dt.hasAlpha = true;
    dt.update();

    mat.diffuseTexture = dt;
    mat.emissiveColor = new Color3(1, 1, 1);
    mat.useAlphaFromDiffuseTexture = true;
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    return mat;
  }

  /**
   * Render hover reticle and dynamic brush footprints on the Babylon pick plane.
   * Renders 1 unified, cohesive highlight structure for any radius (1x1 or multi-tile circle/square).
   * Reuses persistent meshes to completely eliminate in-and-out flickering during mouse movements.
   */
  public renderBrushPreview(r: number, c: number) {
    if (!this.scene) return;

    const s = this.currentTileSize || 1;
    const w = this.currentMapWidth;
    const h = this.currentMapHeight;
    if (r < 0 || r >= h || c < 0 || c >= w) {
      this.clearBrushPreview();
      return;
    }

    const isLogicLayer = this.activeLayerIdx === -1 || this.hasLogicGridOverlay();
    const altitudeHover = isLogicLayer ? 0.53 : SPATIAL_LAYER_ALTITUDES.HOVER_INDICATOR;
    const altitudeFootprint = isLogicLayer ? 0.52 : SPATIAL_LAYER_ALTITUDES.BRUSH_PREVIEW;

    const centerPosX = (c - w / 2) * s;
    const centerPosZ = (h / 2 - r) * s;

    // 1. Multi-tile pattern footprint (Render ONLY the pattern bounding box when holding a pattern and in footprint mode)
    if (this.activeBrushPattern && this.prefabStampMode !== '1tile' && (this.activeBrushPattern.w > 1 || this.activeBrushPattern.h > 1)) {
      if (this.footprintUnifiedMesh) this.footprintUnifiedMesh.isVisible = false;
      if (this.hoverReticleMesh) this.hoverReticleMesh.isVisible = false;
      if (this.footprintSqMesh) this.footprintSqMesh.isVisible = false;
      this.clearFootprintCircMeshes();

      const pat = this.activeBrushPattern;
      const scale = this.stampScale || 1;
      const effW = Math.max(1, Math.round(pat.w * scale));
      const effH = Math.max(1, Math.round(pat.h * scale));
      const patPosX = centerPosX;
      const patPosZ = centerPosZ;

      const patMat = this.createMultiTileReticleMaterial(effW, effH);

      if (!this.patternPreviewMesh || this.patternPreviewMesh.isDisposed()) {
        this.patternPreviewMesh = MeshBuilder.CreatePlane('brush_hover_pattern', { size: 1 }, this.scene);
        this.patternPreviewMesh.parent = this.rootNode;
        this.patternPreviewMesh.isPickable = false;
      }
      this.patternPreviewMesh.rotation.set(Math.PI / 2, 0, (this.brushRotation * Math.PI) / 180);
      this.patternPreviewMesh.scaling.x = s * effW * 1.01;
      this.patternPreviewMesh.scaling.y = s * effH * 1.01;
      this.patternPreviewMesh.position.set(patPosX, altitudeHover, patPosZ);
      this.patternPreviewMesh.material = patMat;
      this.patternPreviewMesh.isVisible = true;
      return;
    }

    if (this.patternPreviewMesh) this.patternPreviewMesh.isVisible = false;

    // 2. Unified Brush Footprint Structure (multi-tile brush radius or fill/erase only)
    const rad = Math.max(0, this.brushRadius - 1);
    const span = rad * 2 + 1;
    const isErase = this.brushMode === 'erase';
    const isFill = this.brushMode === 'fill';

    // Suppress 1x1 green ground reticle on hover so the standard cursor acts as the indicator
    if (rad === 0 && !isErase && !isFill) {
      if (this.footprintUnifiedMesh) this.footprintUnifiedMesh.isVisible = false;
      if (this.hoverReticleMesh) this.hoverReticleMesh.isVisible = false;
      if (this.footprintSqMesh) this.footprintSqMesh.isVisible = false;
      this.clearFootprintCircMeshes();
      return;
    }
    const stroke = isErase
      ? '#f43f5e'
      : isFill
      ? '#f59e0b'
      : isLogicLayer
      ? '#06b6d4'
      : '#10b981';
    const glass = isErase
      ? 'rgba(244, 63, 94, 0.22)'
      : isFill
      ? 'rgba(245, 158, 11, 0.22)'
      : isLogicLayer
      ? 'rgba(6, 182, 212, 0.22)'
      : 'rgba(16, 185, 129, 0.22)';

    const footMat = this.createUnifiedBrushReticleMaterial(
      this.brushShape,
      rad,
      stroke,
      glass,
      '#ffffff'
    );

    if (!this.footprintUnifiedMesh || this.footprintUnifiedMesh.isDisposed()) {
      this.footprintUnifiedMesh = MeshBuilder.CreatePlane('brush_footprint_unified', { size: 1 }, this.scene);
      this.footprintUnifiedMesh.parent = this.rootNode;
      this.footprintUnifiedMesh.isPickable = false;
    }

    this.footprintUnifiedMesh.rotation.set(Math.PI / 2, 0, (this.brushRotation * Math.PI) / 180);
    this.footprintUnifiedMesh.scaling.x = s * span * 1.005;
    this.footprintUnifiedMesh.scaling.y = s * span * 1.005;
    this.footprintUnifiedMesh.position.set(centerPosX, altitudeFootprint, centerPosZ);
    this.footprintUnifiedMesh.material = footMat;
    this.footprintUnifiedMesh.isVisible = true;

    // Clean up any legacy separate meshes
    if (this.hoverReticleMesh) this.hoverReticleMesh.isVisible = false;
    if (this.footprintSqMesh) this.footprintSqMesh.isVisible = false;
    this.clearFootprintCircMeshes();
  }

  private clearFootprintCircMeshes() {
    for (const m of this.footprintCircMeshes) {
      if (m && !m.isDisposed()) m.isVisible = false;
    }
  }

  /** Clear brush preview overlay. */
  public clearBrushPreview() {
    if (this.splatPreviewMesh) this.splatPreviewMesh.isVisible = false;
    if (this.footprintUnifiedMesh) this.footprintUnifiedMesh.isVisible = false;
    if (this.hoverReticleMesh) this.hoverReticleMesh.isVisible = false;
    if (this.footprintSqMesh) this.footprintSqMesh.isVisible = false;
    if (this.patternPreviewMesh) this.patternPreviewMesh.isVisible = false;
    this.clearFootprintCircMeshes();
    for (const m of this.brushPreviewMeshes) m.dispose();
    this.brushPreviewMeshes = [];
  }

  public setStampScale(scale: number) {
    this.stampScale = Math.max(0.05, Math.min(8.0, Number(scale) || 1));
    if (this.lastHoveredR >= 0 && this.lastHoveredC >= 0) {
      this.renderBrushPreview(this.lastHoveredR, this.lastHoveredC);
    }
  }

  public clearSelectionPreview() {
    if (this.selectionBoxMesh) this.selectionBoxMesh.isVisible = false;
    if (this.multiSelectionBaseMesh) {
      this.multiSelectionBaseMesh.thinInstanceCount = 0;
      this.multiSelectionBaseMesh.isVisible = false;
    }
    for (const m of this.selectionPreviewMeshes) m.dispose();
    this.selectionPreviewMeshes = [];
    this.clear3DBoxSelectionPreview();
  }

  private createSelectionBoxMaterial(
    mode: 'normal' | 'add' | 'subtract',
    spanW: number,
    spanH: number
  ): StandardMaterial {
    const matName = `hud_selection_box_${mode}_${spanW}x${spanH}`;
    let mat = this.scene.getMaterialByName(matName) as StandardMaterial | null;
    if (mat) return mat;

    mat = new StandardMaterial(matName, this.scene);
    const strokeColor = mode === 'add' ? '#10b981' : mode === 'subtract' ? '#f43f5e' : '#f59e0b';
    const glassColor = mode === 'add' ? 'rgba(16, 185, 129, 0.20)' : mode === 'subtract' ? 'rgba(244, 63, 94, 0.20)' : 'rgba(245, 158, 11, 0.20)';
    const cornerColor = '#ffffff';

    const texW = Math.min(1024, Math.max(256, spanW * 64));
    const texH = Math.min(1024, Math.max(256, spanH * 64));
    const dt = new DynamicTexture(`${matName}_tex`, { width: texW, height: texH }, this.scene, false);
    const ctx = dt.getContext();

    ctx.clearRect(0, 0, texW, texH);

    const pad = 4;
    const innerW = texW - pad * 2;
    const innerH = texH - pad * 2;

    // 1. Ambient Glass Fill
    ctx.fillStyle = glassColor;
    ctx.fillRect(pad, pad, innerW, innerH);

    // 2. Subtle internal grid dividers
    if (spanW > 1 || spanH > 1) {
      ctx.save();
      ctx.strokeStyle = mode === 'add' ? 'rgba(52, 211, 153, 0.25)' : mode === 'subtract' ? 'rgba(251, 113, 133, 0.25)' : 'rgba(251, 191, 36, 0.25)';
      ctx.lineWidth = 1.5;
      for (let c = 1; c < spanW; c++) {
        const x = pad + (c / spanW) * innerW;
        ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, texH - pad); ctx.stroke();
      }
      for (let r = 1; r < spanH; r++) {
        const y = pad + (r / spanH) * innerH;
        ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(texW - pad, y); ctx.stroke();
      }
      ctx.restore();
    }

    // 3. Glowing Perimeter Border
    ctx.save();
    ctx.shadowBlur = 6;
    ctx.shadowColor = strokeColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3.5;
    ctx.strokeRect(pad, pad, innerW, innerH);
    ctx.restore();

    // 4. Outer Boundary Corner L-Brackets
    ctx.save();
    ctx.shadowBlur = 6;
    ctx.shadowColor = strokeColor;
    ctx.strokeStyle = cornerColor;
    ctx.lineWidth = 4;
    const bracketLen = Math.min(Math.min(innerW, innerH) * 0.35, 24);

    const minX = pad;
    const maxX = texW - pad;
    const minY = pad;
    const maxY = texH - pad;

    // Top-Left
    ctx.beginPath(); ctx.moveTo(minX, minY + bracketLen); ctx.lineTo(minX, minY); ctx.lineTo(minX + bracketLen, minY);
    // Top-Right
    ctx.beginPath(); ctx.moveTo(maxX - bracketLen, minY); ctx.lineTo(maxX, minY); ctx.lineTo(maxX, minY + bracketLen);
    // Bottom-Right
    ctx.beginPath(); ctx.moveTo(maxX, maxY - bracketLen); ctx.lineTo(maxX, maxY); ctx.lineTo(maxX - bracketLen, maxY);
    // Bottom-Left
    ctx.beginPath(); ctx.moveTo(minX + bracketLen, maxY); ctx.lineTo(minX, maxY); ctx.lineTo(minX, maxY - bracketLen);
    ctx.stroke();
    ctx.restore();

    dt.hasAlpha = true;
    dt.update();

    mat.diffuseTexture = dt;
    mat.emissiveColor = new Color3(1, 1, 1);
    mat.useAlphaFromDiffuseTexture = true;
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    return mat;
  }

  private createMultiSelectionCellMaterial(): StandardMaterial {
    const matName = 'hud_multi_selection_cell_mat';
    let mat = this.scene.getMaterialByName(matName) as StandardMaterial | null;
    if (mat) return mat;

    mat = new StandardMaterial(matName, this.scene);
    const texSize = 128;
    const dt = new DynamicTexture(`${matName}_tex`, { width: texSize, height: texSize }, this.scene, false);
    const ctx = dt.getContext();

    ctx.clearRect(0, 0, texSize, texSize);

    const pad = 4;
    const w = texSize - pad * 2;
    const h = texSize - pad * 2;

    // 1. Sleek warm gold/amber glass fill
    const grad = ctx.createRadialGradient(texSize / 2, texSize / 2, 8, texSize / 2, texSize / 2, texSize / 2);
    grad.addColorStop(0, 'rgba(245, 158, 11, 0.30)');
    grad.addColorStop(1, 'rgba(245, 158, 11, 0.14)');
    ctx.fillStyle = grad;
    ctx.fillRect(pad, pad, w, h);

    // 2. Glowing perimeter border
    ctx.save();
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#f59e0b';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.strokeRect(pad, pad, w, h);
    ctx.restore();

    // 3. Crisp white corner brackets
    ctx.save();
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#f59e0b';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.5;
    const bLen = 14;

    const minX = pad;
    const maxX = texSize - pad;
    const minY = pad;
    const maxY = texSize - pad;

    ctx.beginPath(); ctx.moveTo(minX, minY + bLen); ctx.lineTo(minX, minY); ctx.lineTo(minX + bLen, minY);
    ctx.beginPath(); ctx.moveTo(maxX - bLen, minY); ctx.lineTo(maxX, minY); ctx.lineTo(maxX, minY + bLen);
    ctx.beginPath(); ctx.moveTo(maxX, maxY - bLen); ctx.lineTo(maxX, maxY); ctx.lineTo(maxX - bLen, maxY);
    ctx.beginPath(); ctx.moveTo(minX + bLen, maxY); ctx.lineTo(minX, maxY); ctx.lineTo(minX, maxY - bLen);
    ctx.stroke();
    ctx.restore();

    dt.hasAlpha = true;
    dt.update();

    mat.diffuseTexture = dt;
    mat.emissiveColor = new Color3(1, 1, 1);
    mat.useAlphaFromDiffuseTexture = true;
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    return mat;
  }

  private createActionPreviewMaterial(isValid: boolean, spanW: number, spanH: number): StandardMaterial {
    const matName = `hud_action_preview_${isValid ? 'valid' : 'overflow'}_${spanW}x${spanH}`;
    let mat = this.scene.getMaterialByName(matName) as StandardMaterial | null;
    if (mat) return mat;

    mat = new StandardMaterial(matName, this.scene);
    const strokeColor = isValid ? '#06b6d4' : '#f59e0b';
    const glassColor = isValid ? 'rgba(6, 182, 212, 0.20)' : 'rgba(245, 158, 11, 0.22)';
    const cornerColor = '#ffffff';

    const texW = Math.min(1024, Math.max(256, spanW * 64));
    const texH = Math.min(1024, Math.max(256, spanH * 64));
    const dt = new DynamicTexture(`${matName}_tex`, { width: texW, height: texH }, this.scene, false);
    const ctx = dt.getContext();

    ctx.clearRect(0, 0, texW, texH);

    const pad = 4;
    const innerW = texW - pad * 2;
    const innerH = texH - pad * 2;

    ctx.fillStyle = glassColor;
    ctx.fillRect(pad, pad, innerW, innerH);

    if (spanW > 1 || spanH > 1) {
      ctx.save();
      ctx.strokeStyle = isValid ? 'rgba(6, 182, 212, 0.30)' : 'rgba(245, 158, 11, 0.30)';
      ctx.lineWidth = 1.5;
      for (let c = 1; c < spanW; c++) {
        const x = pad + (c / spanW) * innerW;
        ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, texH - pad); ctx.stroke();
      }
      for (let r = 1; r < spanH; r++) {
        const y = pad + (r / spanH) * innerH;
        ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(texW - pad, y); ctx.stroke();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.shadowBlur = 6;
    ctx.shadowColor = strokeColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3.5;
    ctx.strokeRect(pad, pad, innerW, innerH);
    ctx.restore();

    ctx.save();
    ctx.shadowBlur = 6;
    ctx.shadowColor = strokeColor;
    ctx.strokeStyle = cornerColor;
    ctx.lineWidth = 4;
    const bracketLen = Math.min(Math.min(innerW, innerH) * 0.35, 24);

    const minX = pad;
    const maxX = texW - pad;
    const minY = pad;
    const maxY = texH - pad;

    ctx.beginPath(); ctx.moveTo(minX, minY + bracketLen); ctx.lineTo(minX, minY); ctx.lineTo(minX + bracketLen, minY);
    ctx.beginPath(); ctx.moveTo(maxX - bracketLen, minY); ctx.lineTo(maxX, minY); ctx.lineTo(maxX, minY + bracketLen);
    ctx.beginPath(); ctx.moveTo(maxX, maxY - bracketLen); ctx.lineTo(maxX, maxY); ctx.lineTo(maxX - bracketLen, maxY);
    ctx.beginPath(); ctx.moveTo(minX + bracketLen, maxY); ctx.lineTo(minX, maxY); ctx.lineTo(minX, maxY - bracketLen);
    ctx.stroke();
    ctx.restore();

    dt.hasAlpha = true;
    dt.update();

    mat.diffuseTexture = dt;
    mat.emissiveColor = new Color3(1, 1, 1);
    mat.useAlphaFromDiffuseTexture = true;
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    return mat;
  }

  private createContinuousSelectionMaterial(
    geom: ContinuousGeometry,
    mode: 'normal' | 'add' | 'subtract' = 'normal',
    texSize = 512
  ): StandardMaterial {
    const matName = `hud_geom_sel_${geom.type}_${mode}_${texSize}`;
    let mat = this.scene.getMaterialByName(matName) as StandardMaterial | null;
    if (mat) return mat;

    mat = new StandardMaterial(matName, this.scene);
    const strokeColor = mode === 'add' ? '#10b981' : mode === 'subtract' ? '#f43f5e' : '#f59e0b';
    const glassColor = mode === 'add' ? 'rgba(16, 185, 129, 0.22)' : mode === 'subtract' ? 'rgba(244, 63, 94, 0.22)' : 'rgba(245, 158, 11, 0.22)';
    const cornerColor = '#ffffff';

    const dt = new DynamicTexture(`${matName}_tex`, { width: texSize, height: texSize }, this.scene, false);
    const ctx = dt.getContext();
    ctx.clearRect(0, 0, texSize, texSize);

    const pad = 8;
    const w = texSize - pad * 2;
    const h = texSize - pad * 2;
    const cx = texSize / 2;
    const cy = texSize / 2;

    ctx.save();
    ctx.shadowBlur = 6;
    ctx.shadowColor = strokeColor;
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = glassColor;
    ctx.lineWidth = 3.5;

    switch (geom.type) {
      case 'circle': {
        const radius = Math.min(w, h) / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Subtle inner circle crosshair markers
        ctx.strokeStyle = cornerColor;
        ctx.lineWidth = 2.5;
        const mark = 12;
        // Top
        ctx.beginPath(); ctx.moveTo(cx, cy - radius); ctx.lineTo(cx, cy - radius + mark); ctx.stroke();
        // Bottom
        ctx.beginPath(); ctx.moveTo(cx, cy + radius - mark); ctx.lineTo(cx, cy + radius); ctx.stroke();
        // Left
        ctx.beginPath(); ctx.moveTo(cx - radius, cy); ctx.lineTo(cx - radius + mark, cy); ctx.stroke();
        // Right
        ctx.beginPath(); ctx.moveTo(cx + radius - mark, cy); ctx.lineTo(cx + radius, cy); ctx.stroke();
        break;
      }
      case 'ellipse': {
        const radX = w / 2;
        const radZ = h / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(radX, radZ);
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.restore();
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'rectangle': {
        ctx.fillRect(pad, pad, w, h);
        ctx.strokeRect(pad, pad, w, h);

        // Outer Boundary Corner L-Brackets
        ctx.save();
        ctx.strokeStyle = cornerColor;
        ctx.lineWidth = 4;
        const bLen = Math.min(Math.min(w, h) * 0.35, 24);
        const minX = pad, maxX = texSize - pad, minY = pad, maxY = texSize - pad;
        ctx.beginPath(); ctx.moveTo(minX, minY + bLen); ctx.lineTo(minX, minY); ctx.lineTo(minX + bLen, minY);
        ctx.beginPath(); ctx.moveTo(maxX - bLen, minY); ctx.lineTo(maxX, minY); ctx.lineTo(maxX, minY + bLen);
        ctx.beginPath(); ctx.moveTo(maxX, maxY - bLen); ctx.lineTo(maxX, maxY); ctx.lineTo(maxX - bLen, maxY);
        ctx.beginPath(); ctx.moveTo(minX + bLen, maxY); ctx.lineTo(minX, maxY); ctx.lineTo(minX, maxY - bLen);
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'regularPolygon': {
        const sides = Math.max(3, geom.sides);
        const radius = Math.min(w, h) / 2;
        const pts = getRegularPolygonVertices(cx, cy, radius, sides, geom.rotation || 0);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].z);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].z);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'star': {
        const outerRad = Math.min(w, h) / 2;
        const innerRad = outerRad * (geom.innerRadius / (geom.outerRadius || 1));
        const pts = getStarVertices(cx, cy, outerRad, innerRad, geom.points, geom.rotation || 0);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].z);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].z);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'polygon':
      case 'path':
      case 'freehand': {
        const bbox = getGeometryBoundingBox(geom);
        const pts = geom.type === 'polygon' || geom.type === 'path' ? geom.points : geom.strokes;
        if (pts.length > 1) {
          const mapX = (x: number) => pad + ((x - bbox.minX) / (bbox.width || 1)) * w;
          const mapZ = (z: number) => pad + ((z - bbox.minZ) / (bbox.height || 1)) * h;
          ctx.beginPath();
          ctx.moveTo(mapX(pts[0].x), mapZ(pts[0].z));
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(mapX(pts[i].x), mapZ(pts[i].z));
          }
          if (geom.type === 'polygon' || (geom.type === 'path' && geom.closed)) {
            ctx.closePath();
            ctx.fill();
          }
          ctx.stroke();
        }
        break;
      }
    }

    ctx.restore();

    dt.hasAlpha = true;
    dt.update();

    mat.diffuseTexture = dt;
    mat.emissiveColor = new Color3(1, 1, 1);
    mat.useAlphaFromDiffuseTexture = true;
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    return mat;
  }



  public set3DBoxSelectionPreview(
    minWX: number,
    minWY: number,
    minWZ: number,
    maxWX: number,
    maxWY: number,
    maxWZ: number,
    originOffsetX = 0,
    originOffsetY = 0,
    originOffsetZ = 0
  ) {
    const minX = Math.min(minWX, maxWX);
    const maxX = Math.max(minWX, maxWX) + 1;
    const minY = Math.min(minWY, maxWY);
    const maxY = Math.max(minWY, maxWY) + 1;
    const minZ = Math.min(minWZ, maxWZ);
    const maxZ = Math.max(minWZ, maxWZ) + 1;

    const dX = maxX - minX;
    const dY = maxY - minY;
    const dZ = maxZ - minZ;

    const centerX = (minX + maxX) / 2 + originOffsetX;
    const centerY = (minY + maxY) / 2 + originOffsetY;
    const centerZ = (minZ + maxZ) / 2 + originOffsetZ;

    if (!this.voxel.voxelSelectionBoxMesh || this.voxel.voxelSelectionBoxMesh.isDisposed()) {
      this.voxel.voxelSelectionBoxMesh = MeshBuilder.CreateBox('voxel_3d_selection_gizmo', { size: 1.01 }, this.scene);
      this.voxel.voxelSelectionBoxMesh.parent = this.rootNode;
      this.voxel.voxelSelectionBoxMesh.isPickable = false;
      this.voxel.voxelSelectionBoxMesh.enableEdgesRendering();
      this.voxel.voxelSelectionBoxMesh.edgesWidth = 3.0;
      this.voxel.voxelSelectionBoxMesh.edgesColor = new Color4(0.96, 0.62, 0.07, 1);

      const mat = new StandardMaterial('voxel_3d_selection_mat', this.scene);
      mat.diffuseColor = new Color3(0.96, 0.62, 0.07);
      mat.emissiveColor = new Color3(0.96, 0.62, 0.07);
      mat.disableLighting = true;
      mat.disableDepthWrite = true;
      mat.alpha = 0.2;
      mat.zOffset = -1;
      this.voxel.voxelSelectionBoxMesh.material = mat;
    }

    this.voxel.voxelSelectionBoxMesh.scaling.set(dX, dY, dZ);
    this.voxel.voxelSelectionBoxMesh.position.set(centerX, centerY, centerZ);
    this.voxel.voxelSelectionBoxMesh.isVisible = true;
  }

  public clear3DBoxSelectionPreview() {
    if (this.voxel.voxelSelectionBoxMesh) {
      this.voxel.voxelSelectionBoxMesh.isVisible = false;
      if (this.gizmoManager) {
        this.gizmoManager.attachToMesh(null);
      }
    }
  }

  public setSelectionGizmoVisibility(visible: boolean) {
    if (!this.gizmoManager) return;
    if (visible && this.voxel.voxelSelectionBoxMesh && this.voxel.voxelSelectionBoxMesh.isVisible) {
      this.gizmoManager.positionGizmoEnabled = true;
      this.gizmoManager.boundingBoxGizmoEnabled = true;
      this.gizmoManager.attachToMesh(this.voxel.voxelSelectionBoxMesh);

      // Add observers once to sync back to the editor store
      if (this.gizmoManager.gizmos.boundingBoxGizmo && !this.gizmoManager.gizmos.boundingBoxGizmo.onScaleBoxDragEndObservable.hasObservers()) {
        const handleDragEnd = () => {
          const mesh = this.voxel.voxelSelectionBoxMesh;
          if (!mesh) return;
          const dX = mesh.scaling.x;
          const dY = mesh.scaling.y;
          const dZ = mesh.scaling.z;
          const cx = mesh.position.x;
          const cy = mesh.position.y;
          const cz = mesh.position.z;

          // Invert the formula from set3DBoxSelectionPreview
          const minWX = Math.round(cx - dX / 2);
          const maxWX = Math.round(cx + dX / 2) - 1;
          const minWY = Math.round(cy - dY / 2);
          const maxWY = Math.round(cy + dY / 2) - 1;
          const minWZ = Math.round(cz - dZ / 2);
          const maxWZ = Math.round(cz + dZ / 2) - 1;

          window.dispatchEvent(new CustomEvent('studio_voxel_selection_gizmo_drag_end', {
            detail: { minWX, minWY, minWZ, maxWX, maxWY, maxWZ }
          }));
        };

        this.gizmoManager.gizmos.boundingBoxGizmo.onScaleBoxDragEndObservable.add(handleDragEnd);
        if (this.gizmoManager.gizmos.positionGizmo) {
          this.gizmoManager.gizmos.positionGizmo.onDragEndObservable.add(handleDragEnd);
        }
      }
    } else {
      this.gizmoManager.positionGizmoEnabled = false;
      this.gizmoManager.boundingBoxGizmoEnabled = false;
      this.gizmoManager.attachToMesh(null);
    }
  }

  public setContinuousSelectionPreview(
    geom: ContinuousGeometry | null,
    mode: 'normal' | 'add' | 'subtract' = 'normal'
  ) {
    if (!geom) {
      this.clearSelectionPreview();
      return;
    }

    const bbox = getGeometryBoundingBox(geom);
    const s = this.currentTileSize || 1;
    const w = this.currentMapWidth;
    const h = this.currentMapHeight;

    const rectWidth = Math.max(0.01, bbox.width * s);
    const rectHeight = Math.max(0.01, bbox.height * s);
    const centerPosX = (bbox.centerX - w / 2) * s;
    const centerPosZ = (h / 2 - bbox.centerZ) * s;

    const previewMat = this.createContinuousSelectionMaterial(geom, mode);

    if (!this.selectionBoxMesh || this.selectionBoxMesh.isDisposed()) {
      this.selectionBoxMesh = MeshBuilder.CreatePlane('selection_preview_bounds', { size: 1 }, this.scene);
      this.selectionBoxMesh.rotation.x = Math.PI / 2;
      this.selectionBoxMesh.parent = this.rootNode;
      this.selectionBoxMesh.isPickable = false;
    }
    this.selectionBoxMesh.scaling.x = rectWidth;
    this.selectionBoxMesh.scaling.y = rectHeight;
    if (geom.type === 'ellipse' && geom.rotation) {
      this.selectionBoxMesh.rotation.z = (geom.rotation * Math.PI) / 180;
    } else if (geom.type === 'rectangle' && geom.rotation) {
      this.selectionBoxMesh.rotation.z = (geom.rotation * Math.PI) / 180;
    } else {
      this.selectionBoxMesh.rotation.z = 0;
    }
    this.selectionBoxMesh.position.set(centerPosX, SPATIAL_LAYER_ALTITUDES.SELECTION_OVERLAY, centerPosZ);
    this.selectionBoxMesh.material = previewMat;
    this.selectionBoxMesh.isVisible = true;
  }

  public setSelectionPreview(
    r1: number,
    c1: number,
    r2: number,
    c2: number,
    mode: 'normal' | 'add' | 'subtract' = 'normal'
  ) {
    const minR = Math.min(r1, r2);
    const maxR = Math.max(r1, r2);
    const minC = Math.min(c1, c2);
    const maxC = Math.max(c1, c2);

    const s = this.currentTileSize || 1;
    const w = this.currentMapWidth;
    const h = this.currentMapHeight;

    const spanW = maxC - minC + 1;
    const spanH = maxR - minR + 1;
    const previewMat = this.createSelectionBoxMaterial(mode, spanW, spanH);

    const rectWidth = spanW * s;
    const rectHeight = spanH * s;
    const centerPosX = ((minC + maxC) / 2 - w / 2) * s;
    const centerPosZ = (h / 2 - (minR + maxR) / 2) * s;

    // Single bounding plane at SELECTION_OVERLAY layer altitude - reused to prevent flicker
    if (!this.selectionBoxMesh || this.selectionBoxMesh.isDisposed()) {
      this.selectionBoxMesh = MeshBuilder.CreatePlane('selection_preview_bounds', { size: 1 }, this.scene);
      this.selectionBoxMesh.rotation.x = Math.PI / 2;
      this.selectionBoxMesh.parent = this.rootNode;
      this.selectionBoxMesh.isPickable = false;
    }
    this.selectionBoxMesh.scaling.x = rectWidth;
    this.selectionBoxMesh.scaling.y = rectHeight;
    this.selectionBoxMesh.position.set(centerPosX, SPATIAL_LAYER_ALTITUDES.SELECTION_OVERLAY, centerPosZ);
    this.selectionBoxMesh.material = previewMat;
    this.selectionBoxMesh.isVisible = true;
  }

  public setMultiSelectionPreview(cells: Array<{ r: number; c: number }> | Record<string, boolean>) {
    this.clearSelectionPreview();
    const cellList: Array<{ r: number; c: number }> = Array.isArray(cells)
      ? cells
      : Object.keys(cells)
          .filter((k) => (cells as Record<string, boolean>)[k])
          .map((k) => {
            const [r, c] = k.split(',').map(Number);
            return { r, c };
          });

    if (cellList.length === 0) return;

    const s = this.currentTileSize || 1;
    const w = this.currentMapWidth;
    const h = this.currentMapHeight;

    const previewMat = this.createMultiSelectionCellMaterial();

    const validCells = cellList.filter(({ r, c }) => r >= 0 && r < h && c >= 0 && c < w);
    if (validCells.length === 0) return;

    if (!this.multiSelectionBaseMesh || this.multiSelectionBaseMesh.isDisposed()) {
      this.multiSelectionBaseMesh = MeshBuilder.CreatePlane('multi_selection_plane', { size: s * 0.98 }, this.scene);
      this.multiSelectionBaseMesh.rotation.x = Math.PI / 2;
      this.multiSelectionBaseMesh.material = previewMat;
      this.multiSelectionBaseMesh.isPickable = false;
      this.multiSelectionBaseMesh.parent = this.rootNode;
    }

    const matrices = new Float32Array(16 * validCells.length);
    for (let i = 0; i < validCells.length; i++) {
      const { r, c } = validCells[i];
      const posX = (c - w / 2) * s;
      const posZ = (h / 2 - r) * s;
      const matrix = Matrix.Translation(posX, SPATIAL_LAYER_ALTITUDES.SELECTION_OVERLAY, posZ);
      matrix.copyToArray(matrices, i * 16);
    }

    this.multiSelectionBaseMesh.thinInstanceSetBuffer("matrix", matrices, 16, true);
    this.multiSelectionBaseMesh.thinInstanceCount = validCells.length;
    this.multiSelectionBaseMesh.isVisible = true;
  }

  public clearActionPreview() {
    if (this.actionPreviewBoundsMesh) this.actionPreviewBoundsMesh.isVisible = false;
    for (const m of this.actionPreviewMeshes) m.dispose();
    this.actionPreviewMeshes = [];
  }

  public setActionPreview(
    data: { width: number; height: number; visualData?: any[]; logicData?: any[] } | null,
    targetR: number,
    targetC: number
  ) {
    if (!data) {
      this.clearActionPreview();
      return;
    }

    const s = this.currentTileSize || 1;
    const w = this.currentMapWidth;
    const h = this.currentMapHeight;

    const totalW = data.width || 1;
    const totalH = data.height || 1;
    const isOverflow = targetR < 0 || targetC < 0 || targetR + totalH > h || targetC + totalW > w;
    const matToUse = this.createActionPreviewMaterial(!isOverflow, totalW, totalH);

    const rectWidth = totalW * s;
    const rectHeight = totalH * s;
    const centerPosX = (targetC + (totalW - 1) / 2 - w / 2) * s;
    const centerPosZ = (h / 2 - (targetR + (totalH - 1) / 2)) * s;

    if (!this.actionPreviewBoundsMesh || this.actionPreviewBoundsMesh.isDisposed()) {
      this.actionPreviewBoundsMesh = MeshBuilder.CreatePlane('action_preview_bounds', { size: 1 }, this.scene);
      this.actionPreviewBoundsMesh.rotation.x = Math.PI / 2;
      this.actionPreviewBoundsMesh.parent = this.rootNode;
      this.actionPreviewBoundsMesh.isPickable = false;
    }
    this.actionPreviewBoundsMesh.scaling.x = rectWidth;
    this.actionPreviewBoundsMesh.scaling.y = rectHeight;
    this.actionPreviewBoundsMesh.position.set(centerPosX, SPATIAL_LAYER_ALTITUDES.TEMP_TOOL_PREVIEW, centerPosZ);
    this.actionPreviewBoundsMesh.material = matToUse;
    this.actionPreviewBoundsMesh.isVisible = true;
  }

  /**
   * Builds or updates the high-contrast editor map boundary box.
   * Painfully clear in editor view, hidden in gameplay.
   */
  /**
   * Builds or updates the high-precision studio map canvas frame & boundaries.
   * Features drafting corner crop marks, subtle blueprint inset line, dark underlay canvas,
   * and cardinal orientation notches. Visible in editor mode, hidden in gameplay.
   */
  public updateEditorMapBorders() {
    for (const m of this.editorMapBorderMeshes) m.dispose();
    this.editorMapBorderMeshes = [];

    if (!this.scene) return;

    const s = this.currentTileSize || 1;
    const w = this.currentMapWidth;
    const h = this.currentMapHeight;
    if (w <= 0 || h <= 0) return;

    // Exact outer perimeter bounds enclosing the whole tilemap grid [0..w-1] x [0..h-1]
    const minX = (-w / 2 - 0.5) * s;
    const maxX = (w / 2 - 0.5) * s;
    const minZ = (-h / 2 + 0.5) * s;
    const maxZ = (h / 2 + 0.5) * s;
    const centerX = -0.5 * s;
    const centerZ = 0.5 * s;
    // Keep altitude right on top of layer 0 (0.003) to eliminate 45-degree isometric projection parallax shift
    const alt = 0.003;

    // 1. Dark Blueprint Canvas Artboard Foundation (subtle underlay behind active map)
    const backdropGround = MeshBuilder.CreateGround(
      'editor_artboard_backdrop',
      { width: w * s, height: h * s },
      this.scene
    );
    const hasVoxel = Boolean((this.currentRawMapData as any)?.voxelDoc || this.voxel.voxelWorld);
    backdropGround.position = new Vector3(centerX, hasVoxel ? -2000 : -0.5, centerZ);
    const backdropMat = new StandardMaterial('editor_artboard_backdrop_mat', this.scene);
    backdropMat.diffuseColor = new Color3(0.04, 0.06, 0.12);
    backdropMat.emissiveColor = new Color3(0.02, 0.03, 0.07);
    backdropMat.disableLighting = true;
    backdropMat.backFaceCulling = false;
    backdropGround.material = backdropMat;
    backdropGround.isPickable = false;
    backdropGround.parent = this.rootNode;
    backdropGround.isVisible = this.editorCameraMode;
    backdropGround.alwaysSelectAsActiveMesh = true;
    this.editorMapBorderMeshes.push(backdropGround);

    // 2. Single, razor-sharp perimeter boundary frame (Glowing Amber Neon #f59e0b)
    const borderPoints = [
      new Vector3(minX, alt, minZ),
      new Vector3(maxX, alt, minZ),
      new Vector3(maxX, alt, maxZ),
      new Vector3(minX, alt, maxZ),
      new Vector3(minX, alt, minZ),
    ];
    const outerLines = MeshBuilder.CreateLines(
      'editor_map_outer_frame',
      { points: borderPoints, updatable: false },
      this.scene
    );
    outerLines.color = new Color3(0.96, 0.62, 0.04); // #f59e0b amber neon
    outerLines.isPickable = false;
    outerLines.parent = this.rootNode;
    outerLines.isVisible = this.editorCameraMode;
    outerLines.alwaysSelectAsActiveMesh = true;
    this.editorMapBorderMeshes.push(outerLines);
  }

  public setEditorMapBordersVisible(visible: boolean) {
    for (const m of this.editorMapBorderMeshes) {
      m.isVisible = visible;
    }
  }

  /**
   * Smart Ground Target Ring: Ground-projected circular reticle sized to target's footprint.
   * Visual modes: 'hover' (subtle cyan), 'focus' (bright amber/gold), 'combat' (crimson).
   */
  public setGroundTargetRing(
    target: { position: { x: number; y: number; z: number }; footprint?: { radius?: number } } | null,
    mode: 'hover' | 'focus' | 'combat' = 'hover'
  ) {
    if (!target || !this.scene) {
      if (this.smartTargetRingMesh) {
        this.smartTargetRingMesh.isVisible = false;
      }
      return;
    }

    const s = this.currentTileSize || 1;
    const radius = (target.footprint?.radius || 0.55) * s;

    if (!this.smartTargetRingMesh || this.smartTargetRingMesh.isDisposed()) {
      const ring = MeshBuilder.CreateDisc(
        'smart_ground_target_ring',
        { radius: 1, tessellation: 36 },
        this.scene
      );
      ring.rotation.x = Math.PI / 2;
      ring.isPickable = false;
      ring.parent = this.rootNode;
      this.smartTargetRingMesh = ring;
    }

    const matKey = `target_ring_mat_${mode}`;
    let mat = this.scene.getMaterialByName(matKey) as StandardMaterial | null;
    if (!mat) {
      mat = new StandardMaterial(matKey, this.scene);
      if (mode === 'combat') {
        mat.diffuseColor = new Color3(1.0, 0.2, 0.25);
        mat.emissiveColor = new Color3(0.6, 0.05, 0.08);
        mat.alpha = 0.55;
      } else if (mode === 'focus') {
        mat.diffuseColor = new Color3(1.0, 0.85, 0.2);
        mat.emissiveColor = new Color3(0.5, 0.35, 0.05);
        mat.alpha = 0.55;
      } else {
        // hover
        mat.diffuseColor = new Color3(0.3, 0.85, 1.0);
        mat.emissiveColor = new Color3(0.1, 0.3, 0.5);
        mat.alpha = 0.35;
      }
      mat.disableLighting = true;
      mat.backFaceCulling = false;
    }

    this.smartTargetRingMesh.material = mat;
    this.smartTargetRingMesh.scaling = new Vector3(radius, radius, radius);
    this.smartTargetRingMesh.position = new Vector3(target.position.x, SPATIAL_LAYER_ALTITUDES.SMART_TARGET_RING, target.position.z);
    this.smartTargetRingMesh.isVisible = true;
  }

  /**
   * Soft ground destination indicator for mouse-driven movement.
   */
  public setDestinationIndicator(c: number, r: number, isWalkable: boolean) {
    if (!this.scene) return;
    const s = this.currentTileSize || 1;
    const w = this.currentMapWidth;
    const h = this.currentMapHeight;
    const posX = (c - w / 2) * s;
    const posZ = (h / 2 - r) * s;

    if (!this.destinationIndicatorMesh || this.destinationIndicatorMesh.isDisposed()) {
      const disc = MeshBuilder.CreateTorus(
        'destination_indicator_disc',
        { diameter: s * 0.8, thickness: s * 0.08, tessellation: 32 },
        this.scene
      );
      disc.isPickable = false;
      disc.parent = this.rootNode;
      this.destinationIndicatorMesh = disc;
    }

    const matKey = `dest_indicator_${isWalkable ? 'valid' : 'invalid'}`;
    let mat = this.scene.getMaterialByName(matKey) as StandardMaterial | null;
    if (!mat) {
      mat = new StandardMaterial(matKey, this.scene);
      if (isWalkable) {
        mat.diffuseColor = new Color3(1, 0.8, 0.2); // Warm gold/amber color matching design system
        mat.emissiveColor = new Color3(0.6, 0.4, 0.05);
      } else {
        mat.diffuseColor = new Color3(0.95, 0.25, 0.25);
        mat.emissiveColor = new Color3(0.5, 0.1, 0.1);
      }
      mat.disableLighting = true;
      mat.backFaceCulling = false;
    }

    // Stop any currently playing animation
    this.scene.stopAnimation(this.destinationIndicatorMesh);

    const elevation = this.voxel.getVoxelSurfaceY(posX, posZ);
    this.destinationIndicatorMesh.material = mat;
    this.destinationIndicatorMesh.position = new Vector3(posX, elevation + SPATIAL_LAYER_ALTITUDES.DESTINATION_PREVIEW, posZ);
    this.destinationIndicatorMesh.isVisible = true;

    // Reset visibility and scaling for the animation
    this.destinationIndicatorMesh.visibility = 1.0;
    this.destinationIndicatorMesh.scaling = new Vector3(0.2, 0.2, 0.2);

    // Scaling animation (expand outwards)
    const scaleAnim = new Animation(
      'rippleScale',
      'scaling',
      60,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    scaleAnim.setKeys([
      { frame: 0, value: new Vector3(0.1, 0.1, 0.1) },
      { frame: 15, value: new Vector3(1.2, 1.2, 1.2) },
      { frame: 30, value: new Vector3(1.5, 1.5, 1.5) },
    ]);

    // Visibility animation (fade out)
    const fadeAnim = new Animation(
      'rippleFade',
      'visibility',
      60,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    fadeAnim.setKeys([
      { frame: 0, value: 0.8 },
      { frame: 15, value: 0.4 },
      { frame: 30, value: 0.0 },
    ]);

    this.destinationIndicatorMesh.animations = [scaleAnim, fadeAnim];
    this.scene.beginAnimation(this.destinationIndicatorMesh, 0, 30, false, 1.5, () => {
      this.destinationIndicatorMesh!.isVisible = false;
    });
  }

  public clearDestinationIndicator() {
    if (this.destinationIndicatorMesh) {
      if (this.scene) this.scene.stopAnimation(this.destinationIndicatorMesh);
      this.destinationIndicatorMesh.isVisible = false;
    }
  }

  /**
   * Previews area-of-effect ability / spell footprints before execution.
   */
  public setAbilityAoEPreview(footprint: {
    shape?: 'circle' | 'box';
    radius: number; // in tiles
    centerR: number;
    centerC: number;
  }) {
    this.clearAbilityAoEPreview();
    if (!this.scene) return;

    const s = this.currentTileSize || 1;
    const w = this.currentMapWidth;
    const h = this.currentMapHeight;
    const centerPosX = (footprint.centerC - w / 2) * s;
    const centerPosZ = (h / 2 - footprint.centerR) * s;
    const radWorld = (footprint.radius || 1) * s;

    let mat = this.scene.getMaterialByName('ability_aoe_preview_mat') as StandardMaterial | null;
    if (!mat) {
      mat = new StandardMaterial('ability_aoe_preview_mat', this.scene);
      mat.diffuseColor = new Color3(1.0, 0.4, 0.15);
      mat.emissiveColor = new Color3(0.6, 0.15, 0.05);
      mat.alpha = 0.4;
      mat.disableLighting = true;
      mat.backFaceCulling = false;
    }

    if (footprint.shape === 'box') {
      const boxSize = radWorld * 2;
      const plane = MeshBuilder.CreatePlane('ability_aoe_box', { size: boxSize }, this.scene);
      plane.rotation.x = Math.PI / 2;
      plane.position = new Vector3(centerPosX, SPATIAL_LAYER_ALTITUDES.TEMP_TOOL_PREVIEW, centerPosZ);
      plane.material = mat;
      plane.isPickable = false;
      plane.parent = this.rootNode;
      this.abilityAoEMeshes.push(plane);
    } else {
      const disc = MeshBuilder.CreateDisc('ability_aoe_circle', { radius: radWorld, tessellation: 36 }, this.scene);
      disc.rotation.x = Math.PI / 2;
      disc.position = new Vector3(centerPosX, SPATIAL_LAYER_ALTITUDES.TEMP_TOOL_PREVIEW, centerPosZ);
      disc.material = mat;
      disc.isPickable = false;
      disc.parent = this.rootNode;
      this.abilityAoEMeshes.push(disc);
    }
  }

  public clearAbilityAoEPreview() {
    for (const m of this.abilityAoEMeshes) m.dispose();
    this.abilityAoEMeshes = [];
  }

  private layerIsolationActive: boolean = false;
  private isolatedLayerIdx: number = 0;

  /**
   * Layer isolation / highlight (H key) - Phase 5C
   * Dims non-active layers to 0.35 opacity to highlight the currently active layer.
   */
  public highlightCurrentLayer(layerIdx: number) {
    this.layerIsolationActive = true;
    this.isolatedLayerIdx = layerIdx;
    this.applyLayerIsolation();
  }

  public restoreLayerIsolation() {
    this.layerIsolationActive = false;
    this.applyLayerIsolation();
  }

  public toggleLayerIsolation(layerIdx?: number): boolean {
    if (this.layerIsolationActive) {
      this.restoreLayerIsolation();
    } else {
      this.highlightCurrentLayer(layerIdx ?? 0);
    }
    return this.layerIsolationActive;
  }

  private applyLayerIsolation() {
    const dimAlpha = 0.35;
    // We cannot dim tileMeshes because all layers are currently batched into single chunked meshes.
    // Setting visibility < alphaCutOff (0.5) causes the entire tilemap to disappear.
    // In the future, this requires a custom shader uniform per vertex to isolate layers visually.

    this.logicOverlayMeshes.forEach((mesh) => {
      mesh.visibility = this.layerIsolationActive && this.isolatedLayerIdx !== -1 ? dimAlpha : 1.0;
    });

    window.dispatchEvent(
      new CustomEvent('studio_layer_isolation_changed', {
        detail: { active: this.layerIsolationActive, layerIdx: this.isolatedLayerIdx },
      })
    );
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

  private resolveSpriteConfig(entity: BabylonEntityData, dimensions?: { width: number; height: number } | null): SpriteSheetConfig {
    if (entity.spriteDef) {
      return spriteDefinitionToBabylonConfig(entity.spriteDef);
    }
    // URL is source of truth for single-frame overrides (portraits / -ow)
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
    const resolved = resolveSpriteDefinition({
      animationProfile: entity.animationProfile,
      spriteUrl: entity.spriteUrl,
      spriteConfig: entity.spriteConfig,
      width: dimensions?.width,
      height: dimensions?.height,
    });
    return spriteDefinitionToBabylonConfig(resolved);
  }

  /**
   * Crop a walk-sheet cell onto the mesh's own UV vertices.
   * Prefer this over Texture.uScale — Babylon caches textures by URL, so
   * shared uScale/vOffset fought between meshes and left full 3×4 sheets visible.
   */
  public setSpriteCellUVs(
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

  /**
   * Retrieves or instantiates a pooled GPU Texture for entity sprites.
   * Multiple entities sharing the same sprite sheet share the same Texture instance in VRAM.
   */
  private getOrCreateSpriteTexture(
    url: string,
    onLoaded?: (tex: Texture) => void,
    onError?: () => void
  ): Texture {
    const rawUrl = url.split('?')[0];
    const cached = this.spriteTextureCache.get(rawUrl);
    if (cached && !(cached as any)._isDisposed) {
      if (cached.isReady()) {
        if (onLoaded) onLoaded(cached);
      } else if (onLoaded) {
        cached.onLoadObservable.addOnce(() => onLoaded(cached));
      }
      return cached;
    }

    const tex = new Texture(
      url,
      this.scene,
      true,
      true,
      Texture.NEAREST_SAMPLINGMODE,
      () => {
        if (onLoaded) onLoaded(tex);
      },
      () => {
        BabylonEngine.markSpriteUrlFailed(url);
        if (onError) onError();
      }
    );
    tex.hasAlpha = true;
    this.spriteTextureCache.set(rawUrl, tex);
    return tex;
  }

  public updateEntity(entity: BabylonEntityData) {
    let spriteMesh = this.entityMeshes.get(entity.id);
    const elevation = this.voxel.getVoxelSurfaceY(entity.x, entity.y);
    const targetPos = new Vector3(entity.x, elevation + ENTITY_GROUND_CLEARANCE, entity.y);
    const existingDims = spriteMesh?.metadata?.spriteDimensions as { width: number; height: number } | undefined;
    const resolvedConfig = this.resolveSpriteConfig(entity, existingDims);
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
        spriteDimensions: null,
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

      if (entity.spriteUrl && !BabylonEngine.isSpriteUrlFailed(entity.spriteUrl)) {
        const tex = this.getOrCreateSpriteTexture(
          entity.spriteUrl,
          (loadedTex) => {
            const size = loadedTex.getBaseSize();
            if (size.width > 0 && size.height > 0) {
              if (createdMesh.metadata) {
                createdMesh.metadata.spriteDimensions = { width: size.width, height: size.height };
              }
              const updatedDef = resolveSpriteDefinition({
                animationProfile: entity.animationProfile,
                spriteUrl: entity.spriteUrl,
                width: size.width,
                height: size.height,
                spriteConfig: entity.spriteConfig,
              });
              const updatedConfig = spriteDefinitionToBabylonConfig(updatedDef);
              if (createdMesh.metadata) {
                createdMesh.metadata.spriteConfig = updatedConfig;
              }
              this.applySpriteSheetUv(loadedTex, updatedConfig);
              const isSingle = updatedConfig.columns <= 1 && updatedConfig.rows <= 1;
              if (isSingle) {
                this.setSpriteCellUVs(createdMesh, 0, 0, 1, 1);
                if (createdMesh.metadata) createdMesh.metadata.uvFullFrame = true;
              } else {
                const dir = (createdMesh.metadata?.direction || 'down') as 'down' | 'left' | 'right' | 'up';
                const rowIdx = (updatedConfig.directions as Record<string, number>)[dir] ?? updatedConfig.directions.down;
                const col = updatedConfig.idleFrame;
                this.setSpriteCellUVs(createdMesh, col, rowIdx, updatedConfig.columns, updatedConfig.rows);
                if (createdMesh.metadata) {
                  createdMesh.metadata.uvCol = col;
                  createdMesh.metadata.uvRow = rowIdx;
                  createdMesh.metadata.uvCols = updatedConfig.columns;
                  createdMesh.metadata.uvRows = updatedConfig.rows;
                }
              }
            } else {
              this.applySpriteSheetUv(loadedTex, resolvedConfig);
            }
          },
          () => {
            if (!entity.spriteUrl?.includes('adventurer')) {
              console.warn(`[BabylonEngine] Failed to load sprite: ${entity.spriteUrl} (cached failure, using fallback)`);
            }
            this.applyDefaultPlayerFallback(createdMesh, mat);
            if (createdMesh.metadata) {
              createdMesh.metadata.spriteUrl = entity.spriteUrl;
            }
          }
        );
        mat.diffuseTexture = tex;
        mat.emissiveTexture = tex;
        mat.emissiveColor = new Color3(1, 1, 1);
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
      } else if (this.defaultPlayerTexture) {
        this.applyDefaultPlayerFallback(createdMesh, mat);
        if (createdMesh.metadata) {
          createdMesh.metadata.spriteUrl = entity.spriteUrl || "defaultPlayerTex";
        }
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
      // Update Metadata — keep existing spriteConfig if dimensions were already measured
      if (spriteMesh.metadata) {
        spriteMesh.metadata.targetPos = targetPos;
        spriteMesh.metadata.isMoving = entity.isMoving || false;
        spriteMesh.metadata.direction = entity.direction || spriteMesh.metadata.direction;
        spriteMesh.metadata.isEditor = !!this.scene.onPointerDown;
        spriteMesh.metadata.isNpc = entity.isNpc || false;
        spriteMesh.metadata.isPlayer = entity.isPlayer || false;
        spriteMesh.metadata.isCreature = entity.isCreature || false;
        if (!spriteMesh.metadata.spriteConfig || (entity.spriteUrl && spriteMesh.metadata.spriteUrl !== entity.spriteUrl)) {
          spriteMesh.metadata.spriteConfig = resolvedConfig;
        }
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
          if (BabylonEngine.isSpriteUrlFailed(entity.spriteUrl)) {
            this.applyDefaultPlayerFallback(existingMesh, mat);
            if (existingMesh.metadata) {
              existingMesh.metadata.spriteUrl = entity.spriteUrl;
            }
          } else {
            const newTex = this.getOrCreateSpriteTexture(
              entity.spriteUrl,
              (loadedTex) => {
                const size = loadedTex.getBaseSize();
                if (size.width > 0 && size.height > 0) {
                  if (existingMesh.metadata) {
                    existingMesh.metadata.spriteDimensions = { width: size.width, height: size.height };
                  }
                  const updatedDef = resolveSpriteDefinition({
                    animationProfile: entity.animationProfile,
                    spriteUrl: entity.spriteUrl,
                    width: size.width,
                    height: size.height,
                    spriteConfig: entity.spriteConfig,
                  });
                  const updatedConfig = spriteDefinitionToBabylonConfig(updatedDef);
                  if (existingMesh.metadata) {
                    existingMesh.metadata.spriteConfig = updatedConfig;
                  }
                  this.applySpriteSheetUv(loadedTex, updatedConfig);
                  const isSingle = updatedConfig.columns <= 1 && updatedConfig.rows <= 1;
                  if (isSingle) {
                    this.setSpriteCellUVs(existingMesh, 0, 0, 1, 1);
                    if (existingMesh.metadata) existingMesh.metadata.uvFullFrame = true;
                  } else {
                    const dir = (existingMesh.metadata?.direction || 'down') as 'down' | 'left' | 'right' | 'up';
                    const rowIdx = (updatedConfig.directions as Record<string, number>)[dir] ?? updatedConfig.directions.down;
                    const col = updatedConfig.idleFrame;
                    this.setSpriteCellUVs(existingMesh, col, rowIdx, updatedConfig.columns, updatedConfig.rows);
                    if (existingMesh.metadata) {
                      existingMesh.metadata.uvCol = col;
                      existingMesh.metadata.uvRow = rowIdx;
                      existingMesh.metadata.uvCols = updatedConfig.columns;
                      existingMesh.metadata.uvRows = updatedConfig.rows;
                    }
                  }
                } else {
                  this.applySpriteSheetUv(loadedTex, resolvedConfig);
                }
              },
              () => {
                if (!entity.spriteUrl?.includes('adventurer')) {
                  console.warn(`[BabylonEngine] Failed to load sprite: ${entity.spriteUrl} (cached failure, using fallback)`);
                }
                this.applyDefaultPlayerFallback(existingMesh, mat);
                if (existingMesh.metadata) {
                  existingMesh.metadata.spriteUrl = entity.spriteUrl;
                }
              }
            );
            mat.diffuseTexture = newTex;
            mat.emissiveTexture = newTex;
            mat.emissiveColor = new Color3(1, 1, 1);
            if (existingMesh.metadata) {
              existingMesh.metadata.spriteConfig = resolvedConfig;
              existingMesh.metadata.spriteUrl = entity.spriteUrl;
              // Force UV cell recompute next anim tick
              existingMesh.metadata.uvCol = undefined;
              existingMesh.metadata.uvRow = undefined;
              existingMesh.metadata.uvFullFrame = false;
            }
          }
        } else if (!entity.spriteUrl && currentUrl !== 'defaultPlayerTex' && this.defaultPlayerTexture) {
          this.applyDefaultPlayerFallback(existingMesh, mat);
        }
      }
    }

    // Handle Chat Bubble (Overhead Text - Yellow text, no background)
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
        text.color = '#ffff00'; // Overhead chat yellow
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
    let nameplate = this.entity.nameplates.get(entity.id);
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
        this.entity.nameplates.set(entity.id, nameplate);
      } else {
        const label = nameplate.children[0] as TextBlock;
        if (label && label.text !== entity.name) label.text = entity.name;
      }
    } else if (nameplate) {
      this.guiTexture.removeControl(nameplate);
      nameplate.dispose();
      this.entity.nameplates.delete(entity.id);
    }

    // Handle Health Bars
    const wantsHealthBar = entity.hp !== undefined && entity.maxHp !== undefined && entity.maxHp > 0;
    let healthBar = this.healthBars.get(entity.id);
    if (wantsHealthBar) {
      const hpRatio = Math.max(0, Math.min(1, entity.hp! / entity.maxHp!));
      if (!healthBar) {
        healthBar = new Rectangle(`healthBar_${entity.id}`);
        healthBar.width = '60px';
        healthBar.height = '8px';
        healthBar.thickness = 1;
        healthBar.color = 'black';
        healthBar.background = 'red';
        
        const hpFill = new Rectangle(`hpFill_${entity.id}`);
        hpFill.width = `${hpRatio * 100}%`;
        hpFill.height = '100%';
        hpFill.thickness = 0;
        hpFill.background = '#22c55e'; // green-500
        hpFill.horizontalAlignment = 0; // Left align
        
        healthBar.addControl(hpFill);
        this.guiTexture.addControl(healthBar);
        healthBar.linkWithMesh(spriteMesh);
        healthBar.linkOffsetY = -65;
        this.healthBars.set(entity.id, healthBar);
      } else {
        const hpFill = healthBar.children[0] as Rectangle;
        if (hpFill) {
          hpFill.width = `${hpRatio * 100}%`;
        }
      }
    } else if (healthBar) {
      this.guiTexture.removeControl(healthBar);
      healthBar.dispose();
      this.healthBars.delete(entity.id);
    }
  }

  public getTargetEntityMesh(targetId: string | null): Mesh | undefined {
    if (!targetId) return undefined;

    // Direct match
    let mesh = this.entityMeshes.get(targetId);
    if (mesh && !mesh.isDisposed()) return mesh;

    // Multiplayer socket prefix matching
    mesh = this.entityMeshes.get(`multiplayer_${targetId}`);
    if (mesh && !mesh.isDisposed()) return mesh;

    if (targetId.startsWith('multiplayer_')) {
      const stripped = targetId.replace(/^multiplayer_/, '');
      mesh = this.entityMeshes.get(stripped);
      if (mesh && !mesh.isDisposed()) return mesh;
    }

    // NPC prefix matching
    mesh = this.entityMeshes.get(`npc_${targetId}`);
    if (mesh && !mesh.isDisposed()) return mesh;

    if (targetId.startsWith('npc_')) {
      const stripped = targetId.replace(/^npc_/, '');
      mesh = this.entityMeshes.get(stripped);
      if (mesh && !mesh.isDisposed()) return mesh;
    }

    // Creature / mob prefix matching
    mesh = this.entityMeshes.get(`creature_${targetId}`);
    if (mesh && !mesh.isDisposed()) return mesh;

    if (targetId.startsWith('creature_')) {
      const stripped = targetId.replace(/^creature_/, '');
      mesh = this.entityMeshes.get(stripped);
      if (mesh && !mesh.isDisposed()) return mesh;
    }

    mesh = this.entityMeshes.get(`mob_${targetId}`);
    if (mesh && !mesh.isDisposed()) return mesh;

    if (targetId.startsWith('mob_')) {
      const stripped = targetId.replace(/^mob_/, '');
      mesh = this.entityMeshes.get(stripped);
      if (mesh && !mesh.isDisposed()) return mesh;
    }

    mesh = this.entityMeshes.get(`wild_${targetId}`);
    if (mesh && !mesh.isDisposed()) return mesh;

    // Search by partial ID or name if needed
    for (const [id, m] of this.entityMeshes.entries()) {
      if (m && !m.isDisposed()) {
        if (id === targetId || id.includes(targetId) || targetId.includes(id)) {
          return m;
        }
      }
    }

    return undefined;
  }

  public ensureSelectionRingMesh(): Mesh {
    if (!this.selectionRingMesh || this.selectionRingMesh.isDisposed()) {
      const s = this.currentTileSize || 1;
      this.selectionRingMesh = MeshBuilder.CreateTorus(
        'selectionRing',
        { diameter: s * 1.35, thickness: 0.08, tessellation: 48 },
        this.scene
      );
      this.selectionRingMesh.rotation.x = 0; // Flat on the ground plane
      this.selectionRingMesh.isPickable = false;
      this.selectionRingMesh.renderingGroupId = 1;
      this.selectionRingMesh.parent = this.rootNode;

      const mat = new StandardMaterial('selectionRingMat', this.scene);
      mat.diffuseColor = new Color3(0.2, 0.8, 1.0);
      mat.emissiveColor = new Color3(0.2, 0.8, 1.0);
      mat.alpha = 0.85;
      mat.disableLighting = true;
      mat.backFaceCulling = false;
      mat.transparencyMode = Material.MATERIAL_ALPHABLEND;
      this.selectionRingMaterial = mat;
      this.selectionRingMesh.material = mat;
    }
    return this.selectionRingMesh;
  }

  public updateSelectionRing(targetId: string | null) {
    this.activeTargetEntityId = targetId;
    if (!targetId) {
      if (this.selectionRingMesh) {
        this.selectionRingMesh.isVisible = false;
      }
      return;
    }

    const targetMesh = this.getTargetEntityMesh(targetId);
    if (!targetMesh) {
      if (this.selectionRingMesh) {
        this.selectionRingMesh.isVisible = false;
      }
      return;
    }

    const ring = this.ensureSelectionRingMesh();
    ring.isVisible = true;
    ring.position.x = targetMesh.position.x;
    ring.position.z = targetMesh.position.z;
    ring.position.y = targetMesh.position.y + 0.03;
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

    // Sprite Hit Flash Effect
    const originalMat = targetMesh.material as StandardMaterial;
    if (originalMat && originalMat.emissiveColor) {
      const prevEmissive = originalMat.emissiveColor.clone();
      originalMat.emissiveColor = isCrit ? new Color3(1, 0.9, 0.2) : new Color3(1, 0.3, 0.3);
      setTimeout(() => {
        if (targetMesh && targetMesh.material) {
          (targetMesh.material as StandardMaterial).emissiveColor = prevEmissive;
        }
      }, 150);
    }

    // Create a billboard plane for floating combat text
    const plane = MeshBuilder.CreatePlane(`dmgTxt_${Date.now()}_${Math.random()}`, { width: 2.4, height: 1.2 }, this.scene);
    plane.position = targetMesh.position.clone();
    plane.position.y += 2.6; // Position directly above target head
    plane.billboardMode = Mesh.BILLBOARDMODE_ALL; // Always face orthographic camera

    // Create dynamic texture
    const dt = new DynamicTexture(`dt_${Date.now()}_${Math.random()}`, { width: 256, height: 128 }, this.scene, false);
    dt.hasAlpha = true;
    
    const mat = new StandardMaterial(`mat_${Date.now()}_${Math.random()}`, this.scene);
    mat.diffuseTexture = dt;
    mat.emissiveColor = new Color3(1, 1, 1);
    mat.backFaceCulling = false;
    mat.disableLighting = true;
    plane.material = mat;

    const isMiss = String(damage).toUpperCase() === 'MISS';
    const textStr = isMiss ? 'MISS' : isCrit ? `! ${damage} !` : String(damage);
    const font = isCrit ? "900 48px monospace" : isMiss ? "700 36px monospace" : "800 40px monospace";
    const color = isMiss ? "#94a3b8" : isCrit ? "#facc15" : "#f87171";
    
    // Draw text centered on canvas
    dt.drawText(textStr, null, null, font, color, "transparent", true);

    // Animate: float upwards and fade out
    const startTime = performance.now();
    const durationMs = isCrit ? 1600 : 1200;
    
    const observer = this.scene.onBeforeRenderObservable.add(() => {
      const progress = (performance.now() - startTime) / durationMs;
      if (progress >= 1.0) {
        this.scene.onBeforeRenderObservable.remove(observer);
        plane.dispose();
        mat.dispose();
        dt.dispose();
        return;
      }
      
      plane.position.y += isCrit ? 0.025 : 0.018; // Float up
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
    const nameplate = this.entity.nameplates.get(id);
    if (nameplate) {
      this.guiTexture.removeControl(nameplate);
      nameplate.dispose();
      this.entity.nameplates.delete(id);
    }
    const healthBar = this.healthBars.get(id);
    if (healthBar) {
      this.guiTexture.removeControl(healthBar);
      healthBar.dispose();
      this.healthBars.delete(id);
    }
  }

  public dispose() {
    this.renderer.setEditorCameraMode(false);
    window.removeEventListener('resize', this.renderer.onResize);
    this.renderer.stopRenderLoop();
    if (this.weatherParticleSystem) {
      this.weatherParticleSystem.stop();
      this.weatherParticleSystem.dispose();
      this.weatherParticleSystem = undefined;
    }
    this.hoverReticleMesh?.dispose();
    this.footprintSqMesh?.dispose();
    this.footprintUnifiedMesh?.dispose();
    this.patternPreviewMesh?.dispose();
    this.footprintCircMeshes.forEach((m) => m?.dispose());
    this.selectionBoxMesh?.dispose();
    this.actionPreviewBoundsMesh?.dispose();
    this.itemBillboards?.dispose();
    this.voxel.voxelCursorMesh?.dispose();
    this.voxel.voxelCursorMaterial?.dispose();

    if (this.voxel.voxelWorld) {
      for (const chunk of this.voxel.voxelWorld.chunks.values()) {
        this.voxel.voxelMesher?.disposeChunkMesh(chunk.key);
      }
      this.voxel.voxelWorld = undefined;
    }
    
    this.spriteTextureCache.forEach((tex) => tex.dispose());
    this.spriteTextureCache.clear();
    
    this.tilesetTextureCache.forEach((tex) => tex.dispose());
    this.tilesetTextureCache.clear();
    
    this.tilesetMaterialCache.forEach((mat) => mat.dispose());
    this.tilesetMaterialCache.clear();
    
    this.guiTexture.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }

  public voxel: VoxelController;
  public input: InputController;
  public renderer: Renderer;
  public entity: EntityController;
  public gizmoManager?: GizmoManager;
}
