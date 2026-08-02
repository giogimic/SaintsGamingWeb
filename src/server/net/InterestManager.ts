/**
 * Area-of-Interest (AOI) zone helper for map-local interest management.
 * Players join `aoi:{mapId}:{zx}:{zy}` rooms; movement broadcasts go to
 * the 3×3 neighborhood of zones around the moving entity.
 */

const DEFAULT_ZONE_SIZE = 16;

export class InterestManager {
  static zoneSize(): number {
    const raw = Number(process.env.MMO_AOI_ZONE_SIZE ?? DEFAULT_ZONE_SIZE);
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_ZONE_SIZE;
  }

  static zoneOf(x: number, y: number, zoneSize = InterestManager.zoneSize()): { zx: number; zy: number } {
    const size = zoneSize;
    return {
      zx: Math.floor(x / size),
      zy: Math.floor(y / size),
    };
  }

  static roomKey(mapId: string, zx: number, zy: number): string {
    return `aoi:${mapId}:${zx}:${zy}`;
  }

  /** 3×3 neighborhood of AOI rooms around a zone (inclusive). */
  static neighborRooms(mapId: string, zx: number, zy: number): string[] {
    const rooms: string[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        rooms.push(InterestManager.roomKey(mapId, zx + dx, zy + dy));
      }
    }
    return rooms;
  }

  static roomsForPosition(mapId: string, x: number, y: number): string[] {
    const { zx, zy } = InterestManager.zoneOf(x, y);
    return InterestManager.neighborRooms(mapId, zx, zy);
  }
}
