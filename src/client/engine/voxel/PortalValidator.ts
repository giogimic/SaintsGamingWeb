import { VoxelWorld } from '../../../shared/game/voxel/VoxelWorldDoc';
import { isVoxelAir } from '../../../shared/game/voxel/VoxelWord';

export interface PortalValidationResult {
  isValid: boolean;
  plane?: 'XY' | 'XZ' | 'YZ';
  frameBlocks?: { x: number; y: number; z: number }[];
  innerBlocks?: { x: number; y: number; z: number }[];
  boundingBox?: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } };
}

/**
 * Validates if a newly placed block completes a Spirit Gate portal frame.
 * Uses a bounded flood-fill (max 23x23) to detect a closed loop on a 2D plane.
 *
 * `frameMaterialId` is the palette index (low-byte of the voxel word) for
 * `crystal_spirit_gate_frame` blocks.
 */
export function validatePortalFrame(
  world: VoxelWorld,
  startX: number,
  startY: number,
  startZ: number,
  frameMaterialId: number
): PortalValidationResult {
  const MAX_PORTAL_SIZE = 23;
  const visited = new Set<string>();
  const frameBlocks: { x: number; y: number; z: number }[] = [];
  const queue: { x: number; y: number; z: number }[] = [{ x: startX, y: startY, z: startZ }];

  const getKey = (x: number, y: number, z: number) => `${x},${y},${z}`;

  // 1. Flood fill to find all connected frame blocks
  let minX = startX, maxX = startX;
  let minY = startY, maxY = startY;
  let minZ = startZ, maxZ = startZ;

  visited.add(getKey(startX, startY, startZ));

  while (queue.length > 0) {
    const curr = queue.shift()!;
    frameBlocks.push(curr);

    // Update bounds
    if (curr.x < minX) minX = curr.x;
    if (curr.x > maxX) maxX = curr.x;
    if (curr.y < minY) minY = curr.y;
    if (curr.y > maxY) maxY = curr.y;
    if (curr.z < minZ) minZ = curr.z;
    if (curr.z > maxZ) maxZ = curr.z;

    // Reject if it exceeds max size
    if ((maxX - minX + 1) > MAX_PORTAL_SIZE || 
        (maxY - minY + 1) > MAX_PORTAL_SIZE || 
        (maxZ - minZ + 1) > MAX_PORTAL_SIZE) {
      return { isValid: false };
    }

    // Check adjacent blocks (6 directions)
    const neighbors = [
      { x: curr.x + 1, y: curr.y, z: curr.z },
      { x: curr.x - 1, y: curr.y, z: curr.z },
      { x: curr.x, y: curr.y + 1, z: curr.z },
      { x: curr.x, y: curr.y - 1, z: curr.z },
      { x: curr.x, y: curr.y, z: curr.z + 1 },
      { x: curr.x, y: curr.y, z: curr.z - 1 }
    ];

    for (const n of neighbors) {
      const key = getKey(n.x, n.y, n.z);
      if (!visited.has(key)) {
        const voxelWord = world.getVoxel(n.x, n.y, n.z);
        if ((voxelWord.low & 0xFF) !== 0) {
          // Extract material ID from the low word (lower 8 bits = palette index)
          const matId = voxelWord.low & 0xFF;
          if (matId === frameMaterialId) {
            visited.add(key);
            queue.push(n);
          }
        }
      }
    }
  }

  // 2. Determine the plane
  const sizeX = maxX - minX + 1;
  const sizeY = maxY - minY + 1;
  const sizeZ = maxZ - minZ + 1;

  let plane: 'XY' | 'XZ' | 'YZ' | null = null;
  if (sizeZ === 1 && sizeX >= 3 && sizeY >= 3) plane = 'XY';
  else if (sizeY === 1 && sizeX >= 3 && sizeZ >= 3) plane = 'XZ';
  else if (sizeX === 1 && sizeY >= 3 && sizeZ >= 3) plane = 'YZ';

  if (!plane) {
    return { isValid: false };
  }

  // 3. Find the inner empty space — verify the interior is all air
  const innerBlocks: { x: number; y: number; z: number }[] = [];
  
  if (plane === 'XY') {
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const isFrame = visited.has(getKey(x, y, startZ));
        if (x === minX || x === maxX || y === minY || y === maxY) {
          if (!isFrame) return { isValid: false };
        } else {
          if (isFrame) continue;
          const voxelWord = world.getVoxel(x, y, startZ);
          if ((voxelWord.low & 0xFF) !== 0) return { isValid: false };
          innerBlocks.push({ x, y, z: startZ });
        }
      }
    }
  } else if (plane === 'XZ') {
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        const isFrame = visited.has(getKey(x, startY, z));
        if (x === minX || x === maxX || z === minZ || z === maxZ) {
          if (!isFrame) return { isValid: false };
        } else {
          if (isFrame) continue;
          const voxelWord = world.getVoxel(x, startY, z);
          if ((voxelWord.low & 0xFF) !== 0) return { isValid: false };
          innerBlocks.push({ x, y: startY, z });
        }
      }
    }
  } else if (plane === 'YZ') {
    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        const isFrame = visited.has(getKey(startX, y, z));
        if (y === minY || y === maxY || z === minZ || z === maxZ) {
          if (!isFrame) return { isValid: false };
        } else {
          if (isFrame) continue;
          const voxelWord = world.getVoxel(startX, y, z);
          if ((voxelWord.low & 0xFF) !== 0) return { isValid: false };
          innerBlocks.push({ x: startX, y, z });
        }
      }
    }
  }

  if (innerBlocks.length === 0) {
    return { isValid: false };
  }

  return {
    isValid: true,
    plane,
    frameBlocks,
    innerBlocks,
    boundingBox: {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ }
    }
  };
}
