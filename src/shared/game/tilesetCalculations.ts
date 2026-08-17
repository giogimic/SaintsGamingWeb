export interface TilesetCalculationMeta {
  firstgid: number;
  columns: number;
  tilewidth: number;
  tileheight: number;
}

/** Calculate next available firstgid for a newly added tileset. */
export function calculateNextFirstGid(
  existingTilesets: Array<{ firstgid: number; columns?: number; tilewidth?: number; tileheight?: number }>,
  estimatedTileCount: number = 256
): number {
  if (!existingTilesets || existingTilesets.length === 0) {
    return 1;
  }
  const last = existingTilesets[existingTilesets.length - 1];
  const count = (last.columns || 8) * 32 || estimatedTileCount;
  return last.firstgid + count;
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
