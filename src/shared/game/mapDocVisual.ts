/**
 * Map document visual comparison — decide when Babylon should remesh tiles
 * without tearing down the engine (Studio hydrate) vs keep a stable ref (lobby MP).
 */

import { countVisualGids } from "./studioTilesetBootstrap";

export type MapDocVisual = {
  id?: string;
  width?: number;
  height?: number;
  grid?: number[][];
  tileLayers?: Array<{ name?: string; grid?: number[][] }>;
  tilesets?: unknown[];
  source?: string;
  version?: number;
  npcs?: unknown[];
};

/** Sync GAME_MAPS / loadMap failure placeholders — never treat as authoritative. */
export const MAP_DOC_SOURCE_PROXY_SHELL = "proxy-shell";

export function isProxyShellMapDoc(doc: MapDocVisual | null | undefined): boolean {
  if (!doc) return true;
  if (doc.source === MAP_DOC_SOURCE_PROXY_SHELL) return true;
  if (doc.source === "worldMap" || doc.source === "gameMap") return false;
  const noTilesets = !Array.isArray(doc.tilesets) || doc.tilesets.length === 0;
  const noLayers = !Array.isArray(doc.tileLayers) || doc.tileLayers.length === 0;
  return noTilesets && noLayers;
}

export function resolveMapDimensions(doc: MapDocVisual | null | undefined): {
  width: number;
  height: number;
} {
  if (!doc) return { width: 24, height: 24 };
  // Visual tileLayers are authoritative for Babylon remesh. Declared width/height
  // (or an empty logic grid) can lag after Studio paint expands the map — DEMO
  // shipped as meta 24×24 with a 30×30 Ground layer.
  const lw = doc.tileLayers?.[0]?.grid?.[0]?.length;
  const lh = doc.tileLayers?.[0]?.grid?.length;
  const gw =
    Array.isArray(doc.grid) && doc.grid.length > 0 ? doc.grid[0]?.length : undefined;
  const gh = Array.isArray(doc.grid) && doc.grid.length > 0 ? doc.grid.length : undefined;
  return {
    width: lw || gw || doc.width || 24,
    height: lh || gh || doc.height || 24,
  };
}

/** Cheap fingerprint of tile geometry (ignores NPC list / object identity). */
export function mapVisualFingerprint(doc: MapDocVisual | null | undefined): string {
  if (!doc) return "null";
  const { width, height } = resolveMapDimensions(doc);
  const { nonzero, total } = countVisualGids(doc.tileLayers);
  const tilesets = Array.isArray(doc.tilesets) ? doc.tilesets.length : 0;
  const version = doc.version ?? 0;
  const source = doc.source ?? "unknown";
  const logicCells = Array.isArray(doc.grid)
    ? doc.grid.reduce((n, row) => n + (Array.isArray(row) ? row.length : 0), 0)
    : 0;
  return `${source}|v${version}|${width}x${height}|ts${tilesets}|nz${nonzero}/${total}|lg${logicCells}`;
}

/**
 * Whether React `mapData` should switch to `next` (new object).
 * NPC-only enrichment → false (render loop reads store `activeMapData`).
 * Shell → DB / visual upgrade / version bump → true.
 */
export function shouldAcceptMapDoc(
  prev: MapDocVisual | null | undefined,
  next: MapDocVisual
): boolean {
  if (!next) return false;
  if (!prev) return true;
  if (prev === next) return false;

  if (isProxyShellMapDoc(prev) && !isProxyShellMapDoc(next)) return true;
  if (!isProxyShellMapDoc(prev) && isProxyShellMapDoc(next)) return false;

  if (
    (prev.source === undefined || prev.source === MAP_DOC_SOURCE_PROXY_SHELL) &&
    next.source &&
    next.source !== MAP_DOC_SOURCE_PROXY_SHELL
  ) {
    return true;
  }

  const prevFp = mapVisualFingerprint(prev);
  const nextFp = mapVisualFingerprint(next);
  if (prevFp === nextFp) return false;

  const prevTiles = Array.isArray(prev.tilesets) ? prev.tilesets.length : 0;
  const nextTiles = Array.isArray(next.tilesets) ? next.tilesets.length : 0;
  const prevNz = countVisualGids(prev.tileLayers).nonzero;
  const nextNz = countVisualGids(next.tileLayers).nonzero;

  if (nextTiles > prevTiles || nextNz > prevNz) return true;
  if ((next.version ?? 0) > (prev.version ?? 0)) return true;
  if (next.source === "worldMap" || next.source === "gameMap") return true;

  return false;
}

/** True when tile meshes must be rebuilt for the new doc (same engine instance). */
export function shouldRemeshMapDoc(
  loaded: MapDocVisual | null | undefined,
  next: MapDocVisual | null | undefined
): boolean {
  if (!next) return false;
  if (!loaded) return true;
  if (loaded === next) return false;
  const loadedChunks = (loaded as any).chunks?.length ?? 0;
  const nextChunks = (next as any).chunks?.length ?? 0;
  if (loadedChunks !== nextChunks) return true;
  const loadedConns = JSON.stringify((loaded as any).connections || {});
  const nextConns = JSON.stringify((next as any).connections || {});
  if (loadedConns !== nextConns) return true;
  return mapVisualFingerprint(loaded) !== mapVisualFingerprint(next);
}
