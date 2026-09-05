export interface TilesetCalculationMeta {
  firstgid: number;
  columns: number;
  tilewidth: number;
  tileheight: number;
}

export const TILESET_GID_STRIDE = 100000;

/** Calculate serapht available firstgid for a newly added tileset. */
export function calculateSeraphtFirstGid(
  existingTilesets: Array<{ firstgid: number; columns?: number; tilewidth?: number; tileheight?: number }>,
  estimatedTileCount: number = TILESET_GID_STRIDE
): number {
  if (!existingTilesets || existingTilesets.length === 0) {
    return 1;
  }
  return existingTilesets.length * TILESET_GID_STRIDE + 1;
}

/** Convert a global tile GID to local tileset grid coordinates. */
export function gidToLocalCoords(
  gid: number,
  tileset: TilesetCalculationMeta
): { localId: number; col: number; row: number } | null {
  const localId = gid - tileset.firstgid;
  if (localId < 0) return null;
  const col = localId % tileset.columns;
  const row = Math.floor(localId / tileset.columns);
  return { localId, col, row };
}

/** Convert local tileset grid coordinates to a global tile GID. */
export function localCoordsToGid(
  col: number,
  row: number,
  tileset: TilesetCalculationMeta
): number {
  return tileset.firstgid + row * tileset.columns + col;
}
