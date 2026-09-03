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
  getVoxelOrientation 
} from '@/shared/game/voxel/VoxelWord';
import { 
  getVoxelMaterialDef, 
  getFaceUv, 
  CANONICAL_VOXEL_TEXTURE 
} from '@/shared/game/voxel/VoxelMaterialDefinition';
import { VoxelMeshBuilder } from './VoxelGeometry';

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
   * Generates a greedy-meshed Babylon.js Mesh for a single chunk using 1-Block Halo boundary queries.
   */
  public meshChunk(world: VoxelWorld, chunk: VoxelChunk): ChunkMeshResult | null {
    if (chunk.isEmpty()) return null;

    const builder = new VoxelMeshBuilder();
    const startWX = chunk.cx * CHUNK_SIZE_X;
    const startWZ = chunk.cz * CHUNK_SIZE_Z;
    const startWY = chunk.cy * CHUNK_SIZE_Y;

    // Helper: sample voxel with 1-block boundary halo across world
    const sample = (lx: number, ly: number, lz: number): number => {
      const wx = startWX + lx;
      const wy = startWY + ly;
      const wz = startWZ + lz;
      return world.getVoxel(wx, wy, wz);
    };

    let quadCount = 0;

    const totalW = world.widthChunks * CHUNK_SIZE_X;
    const totalZ = world.depthChunks * CHUNK_SIZE_Z;
    const originOffsetX = -totalW / 2;
    const originOffsetZ = -totalZ / 2;
    const originOffsetY = -16; // Top of Gunmetal foundation (y=16) maps to y=0

    for (let ly = 0; ly < CHUNK_SIZE_Y; ly++) {
      for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
        for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
          const word = sample(lx, ly, lz);
          if (isVoxelAir(word)) continue;

          const shape = getVoxelShape(word);
          const orientation = getVoxelOrientation(word);
          const materialId = getVoxelMaterial(word);
          const matDef = getVoxelMaterialDef(materialId);
          const baseRgba = matDef.tintRgba;

          const topUv = getFaceUv(matDef, 'top');
          const bottomUv = getFaceUv(matDef, 'bottom');
          const northUv = getFaceUv(matDef, 'north');
          const southUv = getFaceUv(matDef, 'south');
          const eastUv = getFaceUv(matDef, 'east');
          const westUv = getFaceUv(matDef, 'west');
          const sideUv = matDef.faceMapping.side || northUv;

          const wx = startWX + lx + originOffsetX;
          const wy = startWY + ly + originOffsetY;
          const wz = startWZ + lz + originOffsetZ;

          // Non-cube specialized shapes
          if (shape === VoxelShape.SLOPE_45) {
            builder.addSlope45(wx, wy, wz, orientation, baseRgba, topUv, sideUv, bottomUv);
            quadCount += 3;
            continue;
          } else if (shape === VoxelShape.SLAB_BOTTOM) {
            builder.addHalfSlab(wx, wy, wz, false, baseRgba, topUv, sideUv, bottomUv);
            quadCount += 6;
            continue;
          } else if (shape === VoxelShape.SLAB_TOP) {
            builder.addHalfSlab(wx, wy, wz, true, baseRgba, topUv, sideUv, bottomUv);
            quadCount += 6;
            continue;
          } else if (shape === VoxelShape.STAIRS_STRAIGHT) {
            builder.addStairsStraight(wx, wy, wz, orientation, baseRgba, topUv, sideUv, bottomUv);
            quadCount += 8;
            continue;
          } else if (shape === VoxelShape.STAIRS_CORNER) {
            builder.addStairsCorner(wx, wy, wz, orientation, baseRgba, topUv, sideUv, bottomUv);
            quadCount += 11;
            continue;
          } else if (shape === VoxelShape.SLOPE_GENTLE_BASE) {
            builder.addSlopeGentleBase(wx, wy, wz, orientation, baseRgba, topUv, sideUv, bottomUv);
            quadCount += 4;
            continue;
          } else if (shape === VoxelShape.SLOPE_GENTLE_TOP) {
            builder.addSlopeGentleTop(wx, wy, wz, orientation, baseRgba, topUv, sideUv, bottomUv);
            quadCount += 5;
            continue;
          } else if (shape === VoxelShape.SLOPE_CORNER_OUTER) {
            builder.addSlopeCornerOuter(wx, wy, wz, orientation, baseRgba, topUv, sideUv, bottomUv);
            quadCount += 4;
            continue;
          } else if (shape === VoxelShape.SLOPE_CORNER_INNER) {
            builder.addSlopeCornerInner(wx, wy, wz, orientation, baseRgba, topUv, sideUv, bottomUv);
            quadCount += 7;
            continue;
          } else if (shape === VoxelShape.PRISM_DIAGONAL) {
            builder.addPrismDiagonal(wx, wy, wz, orientation, baseRgba, topUv, sideUv, bottomUv);
            quadCount += 5;
            continue;
          } else if (shape === VoxelShape.COLUMN_CENTER) {
            builder.addColumnCenter(wx, wy, wz, baseRgba, topUv, sideUv, bottomUv);
            quadCount += 6;
            continue;
          } else if (shape === VoxelShape.FENCE_RAIL) {
            builder.addFenceRail(wx, wy, wz, orientation, baseRgba, topUv, sideUv, bottomUv);
            quadCount += 12;
            continue;
          } else if (shape === VoxelShape.ADAPTIVE_ALPHA) {
            // ADAPTIVE_ALPHA: render as full cube for now (auto-resolution TBD)
          }

          // Full Cube Face Culling (Only cull against full cube occluders)
          // Top Face (+Y)
          const above = sample(lx, ly + 1, lz);
          if (!isVoxelFaceOccluding(above)) {
            builder.addQuad(
              [wx, wy + 1, wz],
              [wx + 1, wy + 1, wz],
              [wx + 1, wy + 1, wz + 1],
              [wx, wy + 1, wz + 1],
              [0, 1, 0],
              topUv,
              [1, 1, 1, 1],
              [baseRgba[0] * 1.0, baseRgba[1] * 1.0, baseRgba[2] * 1.0, baseRgba[3]]
            );
            quadCount++;
          }

          // Bottom Face (-Y)
          const below = sample(lx, ly - 1, lz);
          if (!isVoxelFaceOccluding(below)) {
            builder.addQuad(
              [wx, wy, wz + 1],
              [wx + 1, wy, wz + 1],
              [wx + 1, wy, wz],
              [wx, wy, wz],
              [0, -1, 0],
              bottomUv,
              [1, 1, 1, 1],
              [baseRgba[0] * 0.55, baseRgba[1] * 0.55, baseRgba[2] * 0.55, baseRgba[3]]
            );
            quadCount++;
          }

          // North Face (+Z)
          const north = sample(lx, ly, lz + 1);
          if (!isVoxelFaceOccluding(north)) {
            builder.addQuad(
              [wx + 1, wy, wz + 1],
              [wx, wy, wz + 1],
              [wx, wy + 1, wz + 1],
              [wx + 1, wy + 1, wz + 1],
              [0, 0, 1],
              northUv,
              [1, 1, 1, 1],
              [baseRgba[0] * 0.88, baseRgba[1] * 0.88, baseRgba[2] * 0.88, baseRgba[3]]
            );
            quadCount++;
          }

          // South Face (-Z)
          const south = sample(lx, ly, lz - 1);
          if (!isVoxelFaceOccluding(south)) {
            builder.addQuad(
              [wx, wy, wz],
              [wx + 1, wy, wz],
              [wx + 1, wy + 1, wz],
              [wx, wy + 1, wz],
              [0, 0, -1],
              southUv,
              [1, 1, 1, 1],
              [baseRgba[0] * 0.84, baseRgba[1] * 0.84, baseRgba[2] * 0.84, baseRgba[3]]
            );
            quadCount++;
          }

          // East Face (+X)
          const east = sample(lx + 1, ly, lz);
          if (!isVoxelFaceOccluding(east)) {
            builder.addQuad(
              [wx + 1, wy, wz + 1],
              [wx + 1, wy, wz],
              [wx + 1, wy + 1, wz],
              [wx + 1, wy + 1, wz + 1],
              [1, 0, 0],
              eastUv,
              [1, 1, 1, 1],
              [baseRgba[0] * 0.78, baseRgba[1] * 0.78, baseRgba[2] * 0.78, baseRgba[3]]
            );
            quadCount++;
          }

          // West Face (-X)
          const west = sample(lx - 1, ly, lz);
          if (!isVoxelFaceOccluding(west)) {
            builder.addQuad(
              [wx, wy, wz],
              [wx, wy, wz + 1],
              [wx, wy + 1, wz + 1],
              [wx, wy + 1, wz],
              [-1, 0, 0],
              westUv,
              [1, 1, 1, 1],
              [baseRgba[0] * 0.74, baseRgba[1] * 0.74, baseRgba[2] * 0.74, baseRgba[3]]
            );
            quadCount++;
          }
        }
      }
    }

    if (builder.positions.length === 0) {
      this.disposeChunkMesh(chunk.key);
      chunk.isDirty = false;
      return null;
    }

    const meshName = `voxel_chunk_${chunk.key}`;
    let mesh = this.scene.getMeshByName(meshName) as Mesh;
    if (!mesh) {
      mesh = new Mesh(meshName, this.scene);
    }

    const vertexData = new VertexData();
    vertexData.positions = builder.positions;
    vertexData.normals = builder.normals;
    vertexData.uvs = builder.uvs;
    vertexData.indices = builder.indices;
    vertexData.colors = builder.colors;
    vertexData.applyToMesh(mesh);

    // Apply vertex-colored voxel world material
    mesh.material = this.getOrCreateMaterial();
    mesh.isPickable = true;
    mesh.checkCollisions = true;

    chunk.isDirty = false;
    return { mesh, chunkKey: chunk.key, quadCount };
  }

  public disposeChunkMesh(chunkKey: string): void {
    const meshName = `voxel_chunk_${chunkKey}`;
    const mesh = this.scene.getMeshByName(meshName);
    if (mesh) {
      mesh.dispose();
    }
  }
}
