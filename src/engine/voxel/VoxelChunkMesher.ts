import { Scene, Mesh, VertexData, StandardMaterial, Color3, Texture, Material } from '@babylonjs/core';
import { VoxelWorld } from '@/shared/game/voxel/VoxelWorldDoc';
import { VoxelChunk, CHUNK_SIZE_X, CHUNK_SIZE_Z, CHUNK_SIZE_Y } from '@/shared/game/voxel/VoxelChunk';
import { 
  VoxelShape, 
  isVoxelSolid, 
  isVoxelAir, 
  isVoxelFaceOccluding,
  getVoxelMaterial, 
  getVoxelShape, 
  getVoxelOrientation,
  VOXEL_MAT_FARMLAND_MOIST 
} from '@/shared/game/voxel/VoxelWord';
import { 
  getVoxelMaterialDef, 
  getFaceUv, 
  CANONICAL_VOXEL_TEXTURE 
} from '@/shared/game/voxel/VoxelMaterialDefinition';
import { VoxelMeshBuilder } from './VoxelGeometry';
import { meshChunkWithHalo34, TransferableVoxelMeshResult } from './VoxelMesherCore';

export interface ChunkMeshResult {
  mesh: Mesh;
  chunkKey: string;
  quadCount: number;
}

/** Helper to create a fallback procedural texture data URL so red/black checkerboard is NEVER displayed */
function createProceduralVoxelAtlasDataUrl(): string {
  if (typeof document === 'undefined') return '';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    
    // Fill top-left: grass green
    ctx.fillStyle = '#4a8505';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#3b6b04';
    ctx.fillRect(0, 0, 16, 2);

    // Fill top-mid: dirt brown
    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(16, 0, 16, 16);

    // Fill top-right: stone grey
    ctx.fillStyle = '#757575';
    ctx.fillRect(32, 0, 16, 16);

    // Fill mid-left: sand
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(0, 16, 16, 16);

    // Fill mid-mid: water
    ctx.fillStyle = '#0288d1';
    ctx.fillRect(16, 16, 16, 16);

    // Fill mid-right: wood
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(32, 16, 16, 16);

    // Fill bot-left: snow
    ctx.fillStyle = '#eceff1';
    ctx.fillRect(0, 32, 16, 16);

    // Fill bot-mid: gunmetal
    ctx.fillStyle = '#2a2d34';
    ctx.fillRect(16, 32, 16, 16);

    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}

export class VoxelChunkMesher {
  private scene: Scene;
  private materialCache = new Map<number, StandardMaterial>();
  private textureCache?: Texture;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  public getOrCreateMaterial(): StandardMaterial {
    let mat = this.materialCache.get(1);
    if (!mat) {
      mat = new StandardMaterial('voxel_world_mat', this.scene);
      if (!this.textureCache) {
        this.textureCache = new Texture(
          CANONICAL_VOXEL_TEXTURE,
          this.scene,
          true,
          false,
          Texture.NEAREST_SAMPLINGMODE,
          undefined,
          (message) => {
            console.warn('[VoxelChunkMesher] Failed to load canonical voxel texture, using fallback procedural atlas', message);
            const fallbackUrl = createProceduralVoxelAtlasDataUrl();
            if (fallbackUrl && mat) {
              const fallbackTex = new Texture(fallbackUrl, this.scene, true, false, Texture.NEAREST_SAMPLINGMODE);
              fallbackTex.hasAlpha = true;
              mat.diffuseTexture = fallbackTex;
            } else if (mat) {
              mat.diffuseTexture = null;
              mat.diffuseColor = new Color3(0.29, 0.52, 0.02);
            }
          }
        );
        this.textureCache.hasAlpha = true;
      }
      mat.diffuseTexture = this.textureCache;
      mat.diffuseColor = new Color3(1, 1, 1);
      mat.ambientColor = new Color3(0.6, 0.6, 0.6);
      mat.emissiveColor = new Color3(0.08, 0.08, 0.08);
      mat.specularColor = new Color3(0, 0, 0);
      mat.transparencyMode = Material.MATERIAL_ALPHATEST;
      mat.alphaCutOff = 0.5;
      mat.forceDepthWrite = true;
      mat.backFaceCulling = false;
      mat.disableLighting = false;
      mat.zOffset = 0;
      this.materialCache.set(1, mat);
    }
    return mat;
  }

  /**
   * Generates a greedy-meshed Babylon.js Mesh for a single chunk using 34³ halo buffers and vertex AO.
   */
  public meshChunk(world: VoxelWorld, chunk: VoxelChunk): ChunkMeshResult | null {
    if (chunk.isEmpty()) {
      this.disposeChunkMesh(chunk.key);
      chunk.isDirty = false;
      return null;
    }

    const halo = world.extractChunkHalo34(chunk.cx, chunk.cz, chunk.cy);
    const meshResult = meshChunkWithHalo34({
      chunkKey: chunk.key,
      cx: chunk.cx,
      cy: chunk.cy,
      cz: chunk.cz,
      halo,
      originOffsetX: world.originOffsetX,
      originOffsetY: world.originOffsetY,
      originOffsetZ: world.originOffsetZ,
    });

    chunk.isDirty = false;
    return this.applyMeshResult(meshResult);
  }

  /**
   * Applies transferable vertex arrays (from Web Worker or sync mesher) to a Babylon Mesh.
   */
  public applyMeshResult(result: TransferableVoxelMeshResult): ChunkMeshResult | null {
    if (result.positions.length === 0) {
      this.disposeChunkMesh(result.chunkKey);
      return null;
    }

    const meshName = `voxel_chunk_${result.chunkKey}`;
    let mesh = this.scene.getMeshByName(meshName) as Mesh;
    if (!mesh) {
      mesh = new Mesh(meshName, this.scene);
    }

    const vertexData = new VertexData();
    vertexData.positions = result.positions;
    vertexData.normals = result.normals;
    vertexData.uvs = result.uvs;
    vertexData.indices = result.indices;
    vertexData.colors = result.colors;
    vertexData.applyToMesh(mesh);

    // Apply vertex-colored voxel world material
    mesh.material = this.getOrCreateMaterial();
    mesh.isPickable = true;
    mesh.checkCollisions = true;

    return { mesh, chunkKey: result.chunkKey, quadCount: result.quadCount };
  }

  public disposeChunkMesh(chunkKey: string): void {
    const meshName = `voxel_chunk_${chunkKey}`;
    const mesh = this.scene.getMeshByName(meshName);
    if (mesh) {
      mesh.dispose();
    }
  }
}
