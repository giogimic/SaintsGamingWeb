import { BabylonEngine } from './BabylonEngine';
import { Mesh, TransformNode, StandardMaterial, Color3, Color4, MeshBuilder, Matrix } from '@babylonjs/core';
import { VoxelChunkMesher } from './voxel/VoxelChunkMesher';
import { VoxelWorld, type VoxelWorldDocV3, SpatialVoxelWorldManager } from '../shared/game/voxel/VoxelWorldDoc';
import { resolveVoxelTarget, type VoxelTargetResolution } from '../shared/game/voxel/VoxelTargetResolver';
import { resolveConstrainedVoxelCoordinates, type VoxelBrushAxis } from '../shared/game/voxel/VoxelWord';
import { type BrushShape } from '../shared/game/brushGeometry';
import { isTilePickTarget } from '../shared/game/tilePaint';
import { ChunkStreamer } from './voxel/ChunkStreamer';


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

    // Initialize ChunkStreamer
    this.chunkStreamer = new ChunkStreamer(this.voxelWorld.id, this);

    for (const chunk of this.voxelWorld.chunks.values()) {
      const result = this.voxelMesher.meshChunk(this.voxelWorld, chunk);
      if (result) {
        result.mesh.parent = this.engine.rootNode;
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
    const voxelCoords = this.voxelWorld.worldMeshToVoxel(worldX, 0, worldZ);
    const wx = voxelCoords.wx;
    const wz = voxelCoords.wz;

    for (let wy = this.voxelWorld.totalHeightBlocks - 1; wy >= 0; wy--) {
      const word = typeof this.voxelWorld.getVoxelWithHalo === 'function'
        ? this.voxelWorld.getVoxelWithHalo(wx, wy, wz)
        : this.voxelWorld.getVoxel(wx, wy, wz);
      if (word && (word & 0xfff) !== 0) {
        return (wy - 15) * 1.0;
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
  }): void {
    if (constraints.planeLockEnabled !== undefined) this.voxelPlaneLockEnabled = constraints.planeLockEnabled;
    if (constraints.targetPlaneY !== undefined) this.voxelTargetPlaneY = constraints.targetPlaneY;
    if (constraints.planeMask !== undefined) this.voxelPlaneMask = constraints.planeMask;
    if (constraints.buildUpMode !== undefined) this.voxelBuildUpMode = constraints.buildUpMode;
    if (constraints.brushAxis !== undefined) this.voxelBrushAxis = constraints.brushAxis;
    if (constraints.brushRadius !== undefined) this.engine.brushRadius = Math.max(1, Math.min(10, constraints.brushRadius));
    if (constraints.brushShape !== undefined) this.engine.brushShape = constraints.brushShape;
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
      ray ? { origin: ray.origin, direction: ray.direction } : null
    );
  }

public renderVoxelCursor(
    target: VoxelTargetResolution,
    mode: 'place' | 'erase' | 'inspect' = 'place'
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
    } else if (mode === 'inspect') {
      this.voxelCursorMaterial.diffuseColor = new Color3(0.2, 0.8, 0.95);
      this.voxelCursorMaterial.emissiveColor = new Color3(0.1, 0.7, 0.9);
      this.voxelCursorMaterial.alpha = 0.35;
    } else {
      this.voxelCursorMaterial.diffuseColor = new Color3(0.96, 0.7, 0.1);
      this.voxelCursorMaterial.emissiveColor = new Color3(0.85, 0.55, 0.05);
      this.voxelCursorMaterial.alpha = 0.4;
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

    // Ensure we have enough boxes in the pool
    while (this.voxelCursorBoxes.length < targetCoords.length) {
      const idx = this.voxelCursorBoxes.length;
      const box = MeshBuilder.CreateBox(`voxel_cursor_box_${idx}`, { size: 1.01 }, this.engine.scene);
      box.parent = this.voxelCursorRoot;
      box.isPickable = false;
      box.material = this.voxelCursorMaterial;
      box.enableEdgesRendering();
      box.edgesWidth = 2.5;
      this.voxelCursorBoxes.push(box);
    }

    for (let i = 0; i < targetCoords.length; i++) {
      const { wx, wy, wz } = targetCoords[i];
      const worldPos = this.voxelWorld.voxelToWorldMesh(wx, wy, wz);
      const box = this.voxelCursorBoxes[i];
      box.position.set(worldPos.x + 0.5, worldPos.y + 0.5, worldPos.z + 0.5);
      box.edgesColor = edgeColor;
      box.isVisible = true;
    }

    // Hide any unused boxes in pool
    for (let i = targetCoords.length; i < this.voxelCursorBoxes.length; i++) {
      this.voxelCursorBoxes[i].isVisible = false;
    }
  }

public clearVoxelCursor(): void {
    if (this.voxelCursorMesh && !this.voxelCursorMesh.isDisposed()) {
      this.voxelCursorMesh.isVisible = false;
    }
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
