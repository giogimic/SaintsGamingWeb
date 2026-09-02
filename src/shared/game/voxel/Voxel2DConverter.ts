import { VoxelWorld, DEFAULT_BLOCK_SIZE_PX } from './VoxelWorldDoc';
import { 
  packVoxel, 
  VoxelShape, 
  VoxelOrientation, 
  VoxelPhysics, 
  VoxelLogic,
  type VoxelPhysicsType,
  type VoxelLogicType,
  VOXEL_MAT_GUNMETAL,
  VOXEL_MAT_GRASS,
  VOXEL_MAT_WATER,
  VOXEL_MAT_STONE
} from './VoxelWord';
import { CHUNK_SIZE_X, CHUNK_SIZE_Z, CHUNK_SIZE_Y } from './VoxelChunk';

export interface LegacyMapInput {
  id: string;
  name: string;
  grid?: number[][];
  gates?: any;
  npcs?: any[];
  width?: number;
  height?: number;
}

/**
 * Converts a legacy 2D tilemap into a volumetric 3D VoxelWorld.
 */
export function convertLegacy2DToVoxelWorld(legacy: LegacyMapInput): VoxelWorld {
  const grid = legacy.grid || [];
  const heightTiles = grid.length || 30;
  const widthTiles = grid[0]?.length || 30;

  const widthChunks = Math.max(1, Math.ceil(widthTiles / CHUNK_SIZE_X));
  const depthChunks = Math.max(1, Math.ceil(heightTiles / CHUNK_SIZE_Z));
  const heightChunks = 1; // 32 vertical blocks

  const world = new VoxelWorld(
    legacy.id || 'converted_map',
    legacy.name || 'Converted Voxel Map',
    widthChunks,
    depthChunks,
    heightChunks,
    DEFAULT_BLOCK_SIZE_PX
  );

  const baseSurfaceY = Math.floor(CHUNK_SIZE_Y / 2) - 1; // y = 15

  // Fill foundation from y = 0 to y = baseSurfaceY - 1 with Gunmetal Stone
  for (let z = 0; z < heightTiles; z++) {
    for (let x = 0; x < widthTiles; x++) {
      for (let y = 0; y < baseSurfaceY; y++) {
        const word = packVoxel(VOXEL_MAT_GUNMETAL, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);
        world.setVoxel(x, y, z, word);
      }

      // Read legacy 2D tile code
      const tileCode = grid[z]?.[x] ?? 1; // 1 = walk/grass, 2 = wall/solid, 3 = warp, 4 = water
      let surfaceMat = VOXEL_MAT_GRASS;
      let phys: VoxelPhysicsType = VoxelPhysics.SOLID_OBSTACLE;
      let log: VoxelLogicType = VoxelLogic.NONE;

      if (tileCode === 2) {
        surfaceMat = VOXEL_MAT_STONE;
        // Build 2-block high cliff obstacle
        const topCliffWord = packVoxel(VOXEL_MAT_STONE, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);
        world.setVoxel(x, baseSurfaceY + 1, z, topCliffWord);
      } else if (tileCode === 4) {
        surfaceMat = VOXEL_MAT_WATER;
        phys = VoxelPhysics.SWIMMABLE_FLUID;
      } else if (tileCode === 3) {
        surfaceMat = VOXEL_MAT_GRASS;
        log = VoxelLogic.WARP_GATE;
      }

      const surfaceWord = packVoxel(surfaceMat, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, phys, log);
      world.setVoxel(x, baseSurfaceY, z, surfaceWord);
    }
  }

  return world;
}
