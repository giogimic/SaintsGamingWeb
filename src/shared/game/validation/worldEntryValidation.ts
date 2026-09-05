/**
 * Saints Gaming — World Entry Validation Gate (Task B2 / Bible 35)
 *
 * Validates character identity, starting map integrity, and asset readiness
 * before permitting a character to enter the live game world.
 */

export interface WorldEntryValidationParams {
  character?: {
    id: string;
    name: string;
    classId?: string | null;
    spriteId?: string | null;
    currentMap?: string | null;
    x?: number | null;
    y?: number | null;
  } | null;
  mapId?: string | null;
  mapData?: {
    id: string;
    mapType?: string;
    grid?: number[][];
    tileLayers?: any[];
    voxelDoc?: any;
  } | null;
}

export interface WorldEntryValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateWorldEntry(params: WorldEntryValidationParams): WorldEntryValidationResult {
  const errors: string[] = [];

  if (!params.character) {
    errors.push('No character selected for world entry.');
    return { valid: false, errors };
  }

  if (!params.character.name || params.character.name.trim().length < 3) {
    errors.push('Character name must be at least 3 characters.');
  }

  if (!params.character.classId) {
    errors.push('Character is missing a designated combat class.');
  }

  if (!params.mapId && !params.character.currentMap) {
    errors.push('No target destination map specified.');
  }

  if (params.mapData) {
    const isVoxel = params.mapData.mapType === 'VOXEL';
    
    if (isVoxel && !params.mapData.voxelDoc) {
      errors.push('Target map is VOXEL but contains no 3D volume data.');
    } else if (!isVoxel && (!params.mapData.tileLayers || params.mapData.tileLayers.length === 0)) {
      errors.push('Target map contains no geometry or tile layers.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
