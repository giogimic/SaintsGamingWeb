import { Scene, Mesh, VertexData, StandardMaterial, Color3, Texture } from '@babylonjs/core';
import { VoxelWorld } from '@/shared/game/voxel/VoxelWorldDoc';
import { VoxelChunk, CHUNK_SIZE_X, CHUNK_SIZE_Z, CHUNK_SIZE_Y } from '@/shared/game/voxel/VoxelChunk';
import { 
  VoxelShape, 
  isVoxelSolid, 
  isVoxelAir, 
  getVoxelMaterial, 
  getVoxelShape, 
  getVoxelOrientation 
} from '@/shared/game/voxel/VoxelWord';
import { VoxelMeshBuilder } from './VoxelGeometry';

export interface ChunkMeshResult {
  mesh: Mesh;
  chunkKey: string;
  quadCount: number;
}

export class VoxelChunkMesher {
  private scene: Scene;
  private materialCache = new Map<number, StandardMaterial>();

  constructor(scene: Scene) {
    this.scene = scene;
  }

  public getOrCreateMaterial(materialId: number, colorHex: string = '#2a2d34'): StandardMaterial {
    let mat = this.materialCache.get(materialId);
    if (!mat) {
      mat = new StandardMaterial(`voxel_mat_${materialId}`, this.scene);
      mat.diffuseColor = Color3.FromHexString(colorHex);
      mat.specularColor = new Color3(0.1, 0.1, 0.1);
      mat.backFaceCulling = true;
      this.materialCache.set(materialId, mat);
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
          const wx = startWX + lx + originOffsetX;
          const wy = startWY + ly + originOffsetY;
          const wz = startWZ + lz + originOffsetZ;

          // Non-cube specialized shapes
          if (shape === VoxelShape.SLOPE_45) {
            builder.addSlope45(wx, wy, wz, orientation);
            quadCount += 3;
            continue;
          } else if (shape === VoxelShape.SLAB_BOTTOM) {
            builder.addHalfSlab(wx, wy, wz, false);
            quadCount += 6;
            continue;
          } else if (shape === VoxelShape.SLAB_TOP) {
            builder.addHalfSlab(wx, wy, wz, true);
            quadCount += 6;
            continue;
          }

          // Full Cube Face Culling (Only emit faces exposed to Air / transparent voxel)
          // Top Face (+Y)
          const above = sample(lx, ly + 1, lz);
          if (!isVoxelSolid(above)) {
            builder.addQuad(
              [wx, wy + 1, wz],
              [wx + 1, wy + 1, wz],
              [wx + 1, wy + 1, wz + 1],
              [wx, wy + 1, wz + 1],
              [0, 1, 0]
            );
            quadCount++;
          }

          // Bottom Face (-Y)
          const below = sample(lx, ly - 1, lz);
          if (!isVoxelSolid(below)) {
            builder.addQuad(
              [wx, wy, wz + 1],
              [wx + 1, wy, wz + 1],
              [wx + 1, wy, wz],
              [wx, wy, wz],
              [0, -1, 0]
            );
            quadCount++;
          }

          // North Face (+Z)
          const north = sample(lx, ly, lz + 1);
          if (!isVoxelSolid(north)) {
            builder.addQuad(
              [wx + 1, wy, wz + 1],
              [wx, wy, wz + 1],
              [wx, wy + 1, wz + 1],
              [wx + 1, wy + 1, wz + 1],
              [0, 0, 1]
            );
            quadCount++;
          }

          // South Face (-Z)
          const south = sample(lx, ly, lz - 1);
          if (!isVoxelSolid(south)) {
            builder.addQuad(
              [wx, wy, wz],
              [wx + 1, wy, wz],
              [wx + 1, wy + 1, wz],
              [wx, wy + 1, wz],
              [0, 0, -1]
            );
            quadCount++;
          }

          // East Face (+X)
          const east = sample(lx + 1, ly, lz);
          if (!isVoxelSolid(east)) {
            builder.addQuad(
              [wx + 1, wy, wz],
              [wx + 1, wy, wz + 1],
              [wx + 1, wy + 1, wz + 1],
              [wx + 1, wy + 1, wz],
              [1, 0, 0]
            );
            quadCount++;
          }

          // West Face (-X)
          const west = sample(lx - 1, ly, lz);
          if (!isVoxelSolid(west)) {
            builder.addQuad(
              [wx, wy, wz + 1],
              [wx, wy, wz],
              [wx, wy + 1, wz],
              [wx, wy + 1, wz + 1],
              [-1, 0, 0]
            );
            quadCount++;
          }
        }
      }
    }

    if (builder.positions.length === 0) return null;

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

    // Apply default Gunmetal/Terrain material
    mesh.material = this.getOrCreateMaterial(1, '#2a2d34');
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
