import { BabylonEngine } from './BabylonEngine';
import { Mesh, TransformNode, StandardMaterial, Color3, Color4, MeshBuilder, Matrix, Vector3 } from '@babylonjs/core';
import { VoxelChunkMesher } from './voxel/VoxelChunkMesher';
import { VoxelWorld, type VoxelWorldDocV3, SpatialVoxelWorldManager } from '../shared/game/voxel/VoxelWorldDoc';
import { resolveVoxelTarget, type VoxelTargetResolution } from '../shared/game/voxel/VoxelTargetResolver';
import { resolveConstrainedVoxelCoordinates, type VoxelBrushAxis, getVoxelShape, getVoxelOrientation, VoxelShape, VoxelOrientation, type VoxelShapeType, type VoxelOrientationType } from '../shared/game/voxel/VoxelWord';
import { type BrushShape } from '../shared/game/brushGeometry';
import { isTilePickTarget } from '../shared/game/tilePaint';
import { ChunkStreamer } from './voxel/ChunkStreamer';
import { VoxelMeshBuilder } from './voxel/VoxelGeometry';
import { VertexData } from '@babylonjs/core';


export class VoxelController {
  public engine: BabylonEngine;
  public chunkStreamer?: ChunkStreamer;

  constructor(engine: BabylonEngine) {
    this.engine = engine;
  }

public voxelSelectionBoxMesh: Mesh | null = null;
public voxelMesher?: VoxelChunkMesher;
public voxelWorld?: VoxelWorld;
private adjacentVoxelMeshes = new Map<string, Mesh[]>();
public voxelCursorMesh?: Mesh;
public voxelCursorMaterial?: StandardMaterial;
private voxelCursorBoxes: Mesh[] = [];
private voxelCursorRoot?: TransformNode;
private voxelPlaneLockEnabled: boolean = true;
private voxelTargetPlaneY: number = 0;
private voxelPlaneMask: number[] | null = null;
private voxelBuildUpMode: boolean = false;
private voxelBrushAxis: VoxelBrushAxis = 'xz';
private voxelPreviewWord?: number;
public loadVoxelWorld(docOrWorld: VoxelWorld | VoxelWorldDocV3) {
    if (!this.engine.scene) return;
    if (!this.voxelMesher) {
      this.voxelMesher = new VoxelChunkMesher(this.engine.scene);
    }

    if (this.voxelWorld) {
      for (const chunk of this.voxelWorld.chunks.values()) {
        this.voxelMesher.disposeChunkMesh(chunk.key);
      }
      this.clearAdjacentVoxelMeshes();
    }

    if (docOrWorld instanceof VoxelWorld) {
      this.voxelWorld = docOrWorld;
    } else {
      this.voxelWorld = VoxelWorld.deserializeFromDoc(docOrWorld);
    }

    if (this.engine.currentMapId && this.voxelWorld.id !== this.engine.currentMapId) {
      this.voxelWorld.id = this.engine.currentMapId;
    }
    if (this.engine.currentMapWidth && !this.voxelWorld.mapWidth) this.voxelWorld.mapWidth = this.engine.currentMapWidth;
    if (this.engine.currentMapHeight && !this.voxelWorld.mapHeight) this.voxelWorld.mapHeight = this.engine.currentMapHeight;

    // Register with SpatialVoxelWorldManager
    SpatialVoxelWorldManager.getInstance().registerWorld(this.voxelWorld, 0, 0);

    // Initialize ChunkStreamer only for procedural/infinite maps
    if (this.engine.currentRawMapData?.mapType === 'FRACTAL') {
      this.chunkStreamer = new ChunkStreamer(this.voxelWorld.id, this);
    } else {
      this.chunkStreamer = undefined;
    }

    for (const chunk of this.voxelWorld.chunks.values()) {
      const result = this.voxelMesher.meshChunk(this.voxelWorld, chunk);
      if (result) {
        result.mesh.parent = this.engine.rootNode;
        const s = this.engine.currentTileSize || 64;
        result.mesh.scaling = new Vector3(s, s, s);
      }
    }

    // Stream and mesh any adjacent neighbor maps from active chunks data
    const rawChunks = (this as any).currentMapData?.chunks;
    if (Array.isArray(rawChunks)) {
      for (const c of rawChunks) {
        if (c.mapId !== this.voxelWorld.id && c.voxelDoc) {
          this.streamAdjacentVoxelMap(c.mapId, c.voxelDoc, c.offsetX || 0, c.offsetZ || 0);
        }
      }
    }
  }

  public forceLoadChunk(cx: number, cz: number) {
    if (this.chunkStreamer) {
      this.chunkStreamer.forceLoadChunk(cx, cz);
    }
  }

public clearAdjacentVoxelMeshes() {
    for (const meshes of this.adjacentVoxelMeshes.values()) {
      for (const m of meshes) {
        m.dispose();
      }
    }
    this.adjacentVoxelMeshes.clear();
  }

public streamAdjacentVoxelMap(mapId: string, voxelDoc: VoxelWorldDocV3, offsetX = 0, offsetZ = 0) {
    if (!this.engine.scene || !this.voxelWorld || !this.voxelMesher) return;
    if (this.adjacentVoxelMeshes.has(mapId)) return; // already streamed

    const neighborWorld = VoxelWorld.deserializeFromDoc(voxelDoc);
    const tileSize = this.engine.getCurrentTileSize?.() || 1;

    let dir: 'north' | 'east' | 'south' | 'west' = 'east';
    if (offsetZ > 0) dir = 'north';
    else if (offsetZ < 0) dir = 'south';
    else if (offsetX > 0) dir = 'east';
    else if (offsetX < 0) dir = 'west';

    this.voxelWorld.registerAdjacentNeighbor(dir, neighborWorld, 0, 0);
    const reverse: Record<'north' | 'east' | 'south' | 'west', 'north' | 'east' | 'south' | 'west'> = {
      north: 'south',
      south: 'north',
      east: 'west',
      west: 'east',
    };
    neighborWorld.registerAdjacentNeighbor(reverse[dir], this.voxelWorld, 0, 0);

    const meshes: Mesh[] = [];
    for (const chunk of neighborWorld.chunks.values()) {
      const result = this.voxelMesher.meshChunk(neighborWorld, chunk);
      if (result) {
        result.mesh.parent = this.engine.rootNode;
        
        const s = this.engine.currentTileSize || 64;
        result.mesh.scaling = new Vector3(s, s, s);

        // Position offset: The chunks within neighborWorld are already relative to (0,0) of neighborWorld.
        // We need to offset the entire neighborWorld by (offsetX, offsetZ) in tile units.
        result.mesh.position.x += offsetX * tileSize;
        result.mesh.position.z += offsetZ * tileSize;
        
        meshes.push(result.mesh);
      }
    }
    this.adjacentVoxelMeshes.set(mapId, meshes);
    this.meshDirtyVoxelChunks();
  }

public meshDirtyVoxelChunks() {
    if (!this.engine.scene || !this.voxelWorld || !this.voxelMesher) return;
    for (const chunk of this.voxelWorld.chunks.values()) {
      if (chunk.isDirty) {
        const result = this.voxelMesher.meshChunk(this.voxelWorld, chunk);
        if (result) {
          result.mesh.parent = this.engine.rootNode;
        }
      }
    }
  }

public getVoxelSurfaceY(worldX: number, worldZ: number): number {
    if (!this.voxelWorld) return 0;
    const s = this.engine.currentTileSize || 64;
    const voxelCoords = this.voxelWorld.worldMeshToVoxel(worldX / s, 0, worldZ / s);
    const wx = voxelCoords.wx;
    const wz = voxelCoords.wz;

    for (let wy = this.voxelWorld.totalHeightBlocks - 1; wy >= 0; wy--) {
      const word = typeof this.voxelWorld.getVoxelWithHalo === 'function'
        ? this.voxelWorld.getVoxelWithHalo(wx, wy, wz)
        : this.voxelWorld.getVoxel(wx, wy, wz);
      if (word && (word & 0xfff) !== 0) {
        return (wy - 15) * (this.engine.currentTileSize || 64);
      }
    }
    return 0;
  }

public setVoxelConstraints(constraints: {
    planeLockEnabled?: boolean;
    targetPlaneY?: number;
    planeMask?: number[] | null;
    buildUpMode?: boolean;
    brushAxis?: VoxelBrushAxis;
    brushRadius?: number;
    brushShape?: BrushShape;
    previewWord?: number;
  }): void {
    if (constraints.planeLockEnabled !== undefined) this.voxelPlaneLockEnabled = constraints.planeLockEnabled;
    if (constraints.targetPlaneY !== undefined) this.voxelTargetPlaneY = constraints.targetPlaneY;
    if (constraints.planeMask !== undefined) this.voxelPlaneMask = constraints.planeMask;
    if (constraints.buildUpMode !== undefined) this.voxelBuildUpMode = constraints.buildUpMode;
    if (constraints.brushAxis !== undefined) this.voxelBrushAxis = constraints.brushAxis;
    if (constraints.brushRadius !== undefined) this.engine.brushRadius = Math.max(1, Math.min(10, constraints.brushRadius));
    if (constraints.brushShape !== undefined) this.engine.brushShape = constraints.brushShape;
    if (constraints.previewWord !== undefined) this.voxelPreviewWord = constraints.previewWord;
  }

public resolveVoxelTargetAtScreenCoord(screenX: number, screenY: number): VoxelTargetResolution | null {
    if (!this.engine.scene || !this.voxelWorld) return null;
    const ray = this.engine.renderer.camera
      ? this.engine.scene.createPickingRay(screenX, screenY, Matrix.Identity(), this.engine.renderer.camera)
      : null;
    const pickResult = this.engine.scene.pick(
      screenX,
      screenY,
      (mesh) => mesh.isPickable && isTilePickTarget(mesh.name)
    );
    return resolveVoxelTarget(
      pickResult,
      this.voxelWorld,
      ray ? { origin: ray.origin, direction: ray.direction } : null,
      {
        planeLockEnabled: this.voxelPlaneLockEnabled,
        targetPlaneY: this.voxelTargetPlaneY,
      }
    );
  }

  public renderVoxelCursor(
    target: VoxelTargetResolution,
    mode: 'place' | 'erase' | 'inspect' = 'place',
    previewWord?: number
  ): void {
    if (!this.engine.scene || !this.voxelWorld) return;

    if (!this.voxelCursorRoot || this.voxelCursorRoot.isDisposed()) {
      this.voxelCursorRoot = new TransformNode('voxel_cursor_root', this.engine.scene);
      this.voxelCursorRoot.parent = this.engine.rootNode;
    }

    if (!this.voxelCursorMaterial) {
      this.voxelCursorMaterial = new StandardMaterial('voxel_cursor_mat', this.engine.scene);
      this.voxelCursorMaterial.disableLighting = true;
      this.voxelCursorMaterial.disableDepthWrite = true;
      this.voxelCursorMaterial.zOffset = -1;
    }

    if (mode === 'erase') {
      this.voxelCursorMaterial.diffuseColor = new Color3(0.95, 0.25, 0.25);
      this.voxelCursorMaterial.emissiveColor = new Color3(0.8, 0.1, 0.1);
      this.voxelCursorMaterial.alpha = 0.45;
      this.voxelCursorMaterial.wireframe = true;
    } else if (mode === 'inspect') {
      this.voxelCursorMaterial.diffuseColor = new Color3(0.2, 0.8, 0.95);
      this.voxelCursorMaterial.emissiveColor = new Color3(0.1, 0.7, 0.9);
      this.voxelCursorMaterial.alpha = 0.35;
      this.voxelCursorMaterial.wireframe = true;
    } else {
      this.voxelCursorMaterial.diffuseColor = new Color3(0.96, 0.7, 0.1);
      this.voxelCursorMaterial.emissiveColor = new Color3(0.85, 0.55, 0.05);
      this.voxelCursorMaterial.alpha = 0.6; // Hologram opacity
      this.voxelCursorMaterial.wireframe = false;
    }

    const edgeColor = mode === 'erase'
      ? new Color4(0.95, 0.25, 0.25, 0.95)
      : mode === 'inspect'
      ? new Color4(0.2, 0.8, 0.95, 0.95)
      : new Color4(0.96, 0.7, 0.1, 0.95);

    const targetCoords = resolveConstrainedVoxelCoordinates({
      centerCoord: target.voxelCoord,
      brushRadius: this.engine.brushRadius || 1,
      brushShape: this.engine.brushShape || 'square',
      brushAxis: this.voxelBrushAxis || 'xz',
      planeLockEnabled: this.voxelPlaneLockEnabled,
      targetPlaneY: this.voxelTargetPlaneY,
      planeMask: this.voxelPlaneMask,
      buildUpMode: mode === 'place' && this.voxelBuildUpMode,
      mapWidth: this.engine.currentMapWidth,
      mapHeight: this.engine.currentMapHeight,
      maxElevation: 32,
    });

    if (targetCoords.length === 0) {
      this.clearVoxelCursor();
      return;
    }

    // Determine shape to render
    let shape: VoxelShapeType = VoxelShape.FULL_CUBE;
    let orient: VoxelOrientationType = VoxelOrientation.NORTH;
    if (mode === 'place' && this.voxelPreviewWord !== undefined) {
      shape = getVoxelShape(this.voxelPreviewWord);
      orient = getVoxelOrientation(this.voxelPreviewWord);
    }

    // Always rebuild the single ghost mesh
    if (this.voxelCursorMesh) {
      this.voxelCursorMesh.dispose();
    }
    
    this.voxelCursorMesh = new Mesh('voxel_cursor_ghost', this.engine.scene);
    this.voxelCursorMesh.parent = this.voxelCursorRoot;
    this.voxelCursorMesh.isPickable = false;
    this.voxelCursorMesh.material = this.voxelCursorMaterial;

    const builder = new VoxelMeshBuilder();
    const s = this.engine.currentTileSize || 64;

    for (const { wx, wy, wz } of targetCoords) {
      const worldPos = this.voxelWorld.voxelToWorldMesh(wx, wy, wz);
      const x = worldPos.x / s;
      const y = worldPos.y / s;
      const z = worldPos.z / s;

      // Add the geometry to the builder
      if (mode !== 'place' || shape === VoxelShape.FULL_CUBE) {
        builder.addCube(x, y, z, [0, 0, 1, 1], [0, 0, 1, 1], [0, 0, 1, 1]);
      } else if (shape === VoxelShape.SLOPE_45) {
        builder.addSlope45(x, y, z, orient, [0, 0, 1, 1], [1, 1, 1, 1]);
      } else if (shape === VoxelShape.STAIRS_STRAIGHT) {
        builder.addStairsStraight(x, y, z, orient, [0, 0, 1, 1], [0, 0, 1, 1], [0, 0, 1, 1]);
      } else if (shape === VoxelShape.SLAB_BOTTOM) {
        builder.addHalfSlab(x, y, z, false, [0, 0, 1, 1], [0, 0, 1, 1], [0, 0, 1, 1]);
      } else if (shape === VoxelShape.SLAB_TOP) {
        builder.addHalfSlab(x, y, z, true, [0, 0, 1, 1], [0, 0, 1, 1], [0, 0, 1, 1]);
      } else if (shape === VoxelShape.FARMLAND || shape === VoxelShape.FLUID_SURFACE) {
        builder.addFarmland(x, y, z, false, [1, 1, 1, 1], [0, 0, 1, 1], [0, 0, 1, 1], [0, 0, 1, 1]);
      } else {
        builder.addCube(x, y, z, [0, 0, 1, 1], [0, 0, 1, 1], [0, 0, 1, 1]);
      }
    }

    const vertexData = new VertexData();
    vertexData.positions = builder.positions;
    vertexData.normals = builder.normals;
    vertexData.uvs = builder.uvs;
    vertexData.indices = builder.indices;
    vertexData.colors = builder.colors;

    vertexData.applyToMesh(this.voxelCursorMesh);
    this.voxelCursorMesh.scaling = new Vector3(s, s, s);

    if (mode === 'erase' || mode === 'inspect') {
      this.voxelCursorMesh.enableEdgesRendering();
      this.voxelCursorMesh.edgesWidth = 2.5;
      this.voxelCursorMesh.edgesColor = edgeColor;
    }
  }

public clearVoxelCursor(): void {
    if (this.voxelCursorMesh && !this.voxelCursorMesh.isDisposed()) {
      this.voxelCursorMesh.isVisible = false;
    }
    // Kept for backward compatibility if any other system touched voxelCursorBoxes
    for (const box of this.voxelCursorBoxes) {
      if (box && !box.isDisposed()) {
        box.isVisible = false;
      }
    }
  }

  public update(): void {
    if (this.chunkStreamer && this.engine.renderer?.camera) {
      // Convert camera position to chunk coordinates
      const camPos = this.engine.renderer.camera.position;
      const blockSize = this.voxelWorld?.blockSizePx || 64; // Default to 64
      const cx = Math.floor(camPos.x / (32 * blockSize));
      const cz = Math.floor(camPos.z / (32 * blockSize));
      
      this.chunkStreamer.updateStreaming(cx, cz);
    }
  }
}
