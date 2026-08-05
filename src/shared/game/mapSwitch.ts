/**
 * Client map document switching — keep `currentMapId` and `activeMapData` in sync.
 * Gate warps that only flip `currentMapId` leave a stale Studio document mounted.
 */

import { toBaseMapId } from "../net/mapIds";

export type MapIdDoc = { id?: string } | null | undefined;

/** True when the live document belongs to the requested map (base-id compare). */
export function mapDocMatchesId(mapDoc: MapIdDoc, mapId: string): boolean {
  if (!mapDoc || mapDoc.id == null || mapDoc.id === "") return false;
  if (!mapId) return false;
  return toBaseMapId(String(mapDoc.id)) === toBaseMapId(String(mapId));
}

/**
 * Whether the canvas / Save path should keep using `activeMapData` for this id.
 * Mismatch → discard and load fresh (gate warp bug).
 */
export function shouldKeepActiveMapData(
  activeMapData: MapIdDoc,
  currentMapId: string
): boolean {
  return mapDocMatchesId(activeMapData, currentMapId);
}
