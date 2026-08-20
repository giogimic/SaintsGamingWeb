/**
 * Subgrid extraction, clipboard data structure, and stamping engine.
 * Pure logic shared across Studio Tile Clipboard (Cut/Copy/Paste) and Prefab Builder.
 */

import {
  LOGIC_LAYER_IDX,
  type PaintableMap,
  eraseSparseCells,
  eraseTilesInRegion,
} from './tilePaint';
import {
  type PaintedCell,
  deduplicatePaintedCells,
} from './editorOps';

export type PasteMode = 'overlay' | 'replace' | 'new_layer';


export interface ClipboardVisualTile {
  layerOffset: number;
  r: number;
  c: number;
  tileId: number;
}

export interface ClipboardLogicTile {
  r: number;
  c: number;
  tileId: number;
}

export interface TileClipboardData {
  width: number;
  height: number;
  visualData: ClipboardVisualTile[];
  logicData: ClipboardLogicTile[];
  sourceOrigin: { r: number; c: number };
  activeLayerAtCopy: number;
}

export interface ExtractSubgridParams {
  map: PaintableMap | null | undefined;
  minR: number;
  maxR: number;
  minC: number;
  maxC: number;
  activeLayerIdx?: number;
}

/**
 * Extract visual and logic tiles from a rectangular region of a map.
 * Normalized to relative coordinates (0..height-1, 0..width-1).
 */
export function extractSubgridFromMap(params: ExtractSubgridParams): TileClipboardData | null {
  const { map, minR, maxR, minC, maxC, activeLayerIdx = 0 } = params;
  if (!map) return null;

  const r0 = Math.max(0, Math.min(minR, maxR));
  const r1 = Math.max(minR, maxR);
  const c0 = Math.max(0, Math.min(minC, maxC));
  const c1 = Math.max(minC, maxC);

  const width = c1 - c0 + 1;
  const height = r1 - r0 + 1;

  if (width <= 0 || height <= 0) return null;

  const visualData: ClipboardVisualTile[] = [];
  const logicData: ClipboardLogicTile[] = [];

  // Extract visual layers
  if (Array.isArray(map.tileLayers)) {
    map.tileLayers.forEach((layer, layerIdx) => {
      if (!Array.isArray(layer.grid)) return;
      for (let r = r0; r <= r1; r++) {
        const row = layer.grid[r];
        if (!Array.isArray(row)) continue;
        for (let c = c0; c <= c1; c++) {
          const tileId = row[c];
          if (typeof tileId === 'number' && tileId > 0) {
            visualData.push({
              layerOffset: layerIdx,
              r: r - r0,
              c: c - c0,
              tileId,
            });
          }
        }
      }
    });
  }

  // Extract logic grid
  if (Array.isArray(map.grid)) {
    for (let r = r0; r <= r1; r++) {
      const row = map.grid[r];
      if (!Array.isArray(row)) continue;
      for (let c = c0; c <= c1; c++) {
        const tileId = row[c];
        if (typeof tileId === 'number' && tileId !== 0) {
          logicData.push({
            r: r - r0,
            c: c - c0,
            tileId,
          });
        }
      }
    }
  }

  return {
    width,
    height,
    visualData,
    logicData,
    sourceOrigin: { r: r0, c: c0 },
    activeLayerAtCopy: activeLayerIdx,
  };
}

export interface ExtractSparseCellsParams {
  map: PaintableMap | null | undefined;
  cells: Array<{ r: number; c: number }> | Record<string, boolean>;
  activeLayerIdx?: number;
}

/**
 * Extract visual and logic tiles from an arbitrary set of selected cells (e.g. Shift+Click multi-selection, odd shapes).
 * Normalized to relative coordinates within the minimum bounding box.
 */
export function extractSparseCellsFromMap(params: ExtractSparseCellsParams): TileClipboardData | null {
  const { map, cells, activeLayerIdx = 0 } = params;
  if (!map || !cells) return null;

  const cellList: Array<{ r: number; c: number }> = Array.isArray(cells)
    ? cells
    : Object.keys(cells)
        .filter((k) => cells[k])
        .map((k) => {
          const [r, c] = k.split(',').map(Number);
          return { r, c };
        });

  if (cellList.length === 0) return null;

  let minR = Infinity;
  let maxR = -Infinity;
  let minC = Infinity;
  let maxC = -Infinity;

  const cellLookup = new Set<string>();
  cellList.forEach(({ r, c }) => {
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
    if (c < minC) minC = c;
    if (c > maxC) maxC = c;
    cellLookup.add(`${r},${c}`);
  });

  const width = maxC - minC + 1;
  const height = maxR - minR + 1;
  if (width <= 0 || height <= 0 || !isFinite(minR) || !isFinite(minC)) return null;

  const visualData: ClipboardVisualTile[] = [];
  const logicData: ClipboardLogicTile[] = [];

  // Extract visual layers for matched cells
  if (Array.isArray(map.tileLayers)) {
    map.tileLayers.forEach((layer, layerIdx) => {
      if (!Array.isArray(layer.grid)) return;
      for (const { r, c } of cellList) {
        const row = layer.grid[r];
        if (!Array.isArray(row)) continue;
        const tileId = row[c];
        if (typeof tileId === 'number' && tileId > 0) {
          visualData.push({
            layerOffset: layerIdx,
            r: r - minR,
            c: c - minC,
            tileId,
          });
        }
      }
    });
  }

  // Extract logic grid for matched cells
  if (Array.isArray(map.grid)) {
    for (const { r, c } of cellList) {
      const row = map.grid[r];
      if (!Array.isArray(row)) continue;
      const tileId = row[c];
      if (typeof tileId === 'number' && tileId !== 0) {
        logicData.push({
          r: r - minR,
          c: c - minC,
          tileId,
        });
      }
    }
  }

  return {
    width,
    height,
    visualData,
    logicData,
    sourceOrigin: { r: minR, c: minC },
    activeLayerAtCopy: activeLayerIdx,
  };
}

export interface StampClipboardParams {
  map: PaintableMap;
  clipboard: TileClipboardData;
  targetR: number;
  targetC: number;
  mode?: PasteMode;
  activeLayerIdx?: number;
}

export interface StampClipboardResult {
  ok: boolean;
  cells: PaintedCell[];
  newLayerCreated?: boolean;
  newLayerIdx?: number;
  createdLayer?: { name: string; grid: number[][] };
  error?: string;
}

/**
 * Stamps clipboard content onto a map document.
 * Mutates map in-place and returns the list of mutated cells for undo history and engine sync.
 */
export function stampClipboardOntoMap(params: StampClipboardParams): StampClipboardResult {
  const { map, clipboard, targetR, targetC, mode = 'overlay', activeLayerIdx = 0 } = params;
  if (!map || !clipboard) {
    return { ok: false, cells: [], error: 'Missing map or clipboard data.' };
  }

  const cells: PaintedCell[] = [];
  let newLayerCreated = false;
  let newLayerIdx: number | undefined;
  let createdLayer: { name: string; grid: number[][] } | undefined;

  // Determine target visual layer based on mode
  let effectiveVisualLayer = activeLayerIdx;

  if (mode === 'new_layer') {
    if (!Array.isArray(map.tileLayers)) {
      map.tileLayers = [];
    }
    const mapH = Array.isArray(map.grid) ? map.grid.length : 64;
    const mapW = Array.isArray(map.grid?.[0]) ? map.grid[0].length : 64;
    const blankGrid: number[][] = Array.from({ length: mapH }, () => Array(mapW).fill(0));
    newLayerIdx = map.tileLayers.length;
    createdLayer = {
      name: `Pasted Layer ${newLayerIdx + 1}`,
      grid: blankGrid,
    };
    map.tileLayers.push(createdLayer);
    newLayerCreated = true;
    effectiveVisualLayer = newLayerIdx;
  }


  // Handle visual tiles
  if (Array.isArray(map.tileLayers) && map.tileLayers.length > 0) {
    if (mode === 'replace') {
      // In replace mode, zero out the whole footprint on the active layer first
      const layer = map.tileLayers[effectiveVisualLayer];
      if (layer && Array.isArray(layer.grid)) {
        for (let r = 0; r < clipboard.height; r++) {
          const mapRowIdx = targetR + r;
          const mapRow = layer.grid[mapRowIdx];
          if (!Array.isArray(mapRow) || Object.isFrozen(mapRow)) continue;
          for (let c = 0; c < clipboard.width; c++) {
            const mapColIdx = targetC + c;
            if (mapColIdx >= mapRow.length) continue;
            const prev = mapRow[mapColIdx] ?? 0;
            if (prev !== 0) {
              mapRow[mapColIdx] = 0;
              cells.push({
                layerIdx: effectiveVisualLayer,
                r: mapRowIdx,
                c: mapColIdx,
                before: prev,
                after: 0,
              });
            }
          }
        }
      }
    }

    // Now write visual tiles from clipboard
    clipboard.visualData.forEach((v) => {
      const mapR = targetR + v.r;
      const mapC = targetC + v.c;

      // When mode is overlay or replace, map single-layer or preserve relative layer offset
      let targetLayerIndex = effectiveVisualLayer;
      if (mode !== 'new_layer' && typeof v.layerOffset === 'number' && map.tileLayers?.[v.layerOffset]) {
        targetLayerIndex = v.layerOffset;
      }

      const layer = map.tileLayers?.[targetLayerIndex];
      if (!layer || !Array.isArray(layer.grid)) return;
      const row = layer.grid[mapR];
      if (!Array.isArray(row) || Object.isFrozen(row) || mapC >= row.length) return;

      const prev = row[mapC] ?? 0;
      if (prev !== v.tileId) {
        row[mapC] = v.tileId;
        cells.push({
          layerIdx: targetLayerIndex,
          r: mapR,
          c: mapC,
          before: prev,
          after: v.tileId,
        });
      }
    });
  }

  // Handle logic grid tiles
  if (Array.isArray(map.grid)) {
    if (mode === 'replace' && activeLayerIdx === LOGIC_LAYER_IDX) {
      for (let r = 0; r < clipboard.height; r++) {
        const mapRowIdx = targetR + r;
        const row = map.grid[mapRowIdx];
        if (!Array.isArray(row) || Object.isFrozen(row)) continue;
        for (let c = 0; c < clipboard.width; c++) {
          const mapColIdx = targetC + c;
          if (mapColIdx >= row.length) continue;
          const prev = row[mapColIdx] ?? 0;
          if (prev !== 0) {
            row[mapColIdx] = 0;
            cells.push({
              layerIdx: LOGIC_LAYER_IDX,
              r: mapRowIdx,
              c: mapColIdx,
              before: prev,
              after: 0,
            });
          }
        }
      }
    }

    clipboard.logicData.forEach((l) => {
      const mapR = targetR + l.r;
      const mapC = targetC + l.c;
      const row = map.grid?.[mapR];
      if (!Array.isArray(row) || Object.isFrozen(row) || mapC >= row.length) return;

      const prev = row[mapC] ?? 0;
      if (prev !== l.tileId) {
        row[mapC] = l.tileId;
        cells.push({
          layerIdx: LOGIC_LAYER_IDX,
          r: mapR,
          c: mapC,
          before: prev,
          after: l.tileId,
        });
      }
    });
  }

  return {
    ok: true,
    cells,
    newLayerCreated,
    newLayerIdx,
    createdLayer,
  };
}


export interface DuplicateSelectionParams {
  map: PaintableMap | null | undefined;
  layerIdx?: number;
  cells?: Array<{ r: number; c: number }> | Record<string, boolean>;
  bounds?: { minR: number; maxR: number; minC: number; maxC: number };
  offsetR: number;
  offsetC: number;
  mode?: PasteMode;
}

export interface DuplicateSelectionResult {
  ok: boolean;
  cells: PaintedCell[];
  newBounds?: { minR: number; maxR: number; minC: number; maxC: number; width: number; height: number };
  newCells?: Record<string, boolean>;
  error?: string;
}

/**
 * Clones the selected region or sparse cells to a new offset destination on the map.
 * Returns the painted cells as a single undoable change set along with updated selection coordinates.
 */
export function duplicateSelectionOnMap(
  params: DuplicateSelectionParams
): DuplicateSelectionResult {
  const { map, layerIdx = 0, cells, bounds, offsetR, offsetC, mode = 'overlay' } = params;
  if (!map) return { ok: false, cells: [], error: 'Map data missing.' };

  const hasSparse = cells && (Array.isArray(cells) ? cells.length > 0 : Object.keys(cells).length > 0);
  let extracted: TileClipboardData | null = null;

  if (hasSparse) {
    extracted = extractSparseCellsFromMap({ map, cells: cells!, activeLayerIdx: layerIdx });
  } else if (bounds) {
    extracted = extractSubgridFromMap({
      map,
      minR: bounds.minR,
      maxR: bounds.maxR,
      minC: bounds.minC,
      maxC: bounds.maxC,
      activeLayerIdx: layerIdx,
    });
  }

  if (!extracted || (extracted.visualData.length === 0 && extracted.logicData.length === 0)) {
    return { ok: false, cells: [], error: 'No tiles in selection to duplicate.' };
  }

  const targetR = extracted.sourceOrigin.r + offsetR;
  const targetC = extracted.sourceOrigin.c + offsetC;

  const stampRes = stampClipboardOntoMap({
    map,
    clipboard: extracted,
    targetR,
    targetC,
    mode,
    activeLayerIdx: layerIdx,
  });

  if (!stampRes.ok) {
    return { ok: false, cells: [], error: stampRes.error || 'Failed to stamp duplicate.' };
  }

  const newBounds = {
    minR: targetR,
    minC: targetC,
    maxR: targetR + extracted.height - 1,
    maxC: targetC + extracted.width - 1,
    width: extracted.width,
    height: extracted.height,
  };

  const newCells: Record<string, boolean> = {};
  for (const v of extracted.visualData) {
    newCells[`${targetR + v.r},${targetC + v.c}`] = true;
  }
  for (const l of extracted.logicData) {
    newCells[`${targetR + l.r},${targetC + l.c}`] = true;
  }

  return {
    ok: true,
    cells: stampRes.cells,
    newBounds,
    newCells,
  };
}

export interface MoveSelectionParams {
  map: PaintableMap | null | undefined;
  layerIdx?: number;
  cells?: Array<{ r: number; c: number }> | Record<string, boolean>;
  bounds?: { minR: number; maxR: number; minC: number; maxC: number };
  offsetR: number;
  offsetC: number;
}

/**
 * Moves the selected region or sparse cells to a new offset destination on the map.
 * Erases the original location and stamps at the destination in a single atomic undoable change set.
 */
export function moveSelectionOnMap(
  params: MoveSelectionParams
): DuplicateSelectionResult {
  const { map, layerIdx = 0, cells, bounds, offsetR, offsetC } = params;
  if (!map) return { ok: false, cells: [], error: 'Map data missing.' };

  const hasSparse = cells && (Array.isArray(cells) ? cells.length > 0 : Object.keys(cells).length > 0);
  let extracted: TileClipboardData | null = null;

  if (hasSparse) {
    extracted = extractSparseCellsFromMap({ map, cells: cells!, activeLayerIdx: layerIdx });
  } else if (bounds) {
    extracted = extractSubgridFromMap({
      map,
      minR: bounds.minR,
      maxR: bounds.maxR,
      minC: bounds.minC,
      maxC: bounds.maxC,
      activeLayerIdx: layerIdx,
    });
  }

  if (!extracted || (extracted.visualData.length === 0 && extracted.logicData.length === 0)) {
    return { ok: false, cells: [], error: 'No tiles in selection to move.' };
  }

  // 1. Erase original tiles
  let erasedCells: PaintedCell[] = [];
  if (hasSparse) {
    const eraseRes = eraseSparseCells({ map, layerIdx, cells: cells! });
    if (eraseRes.ok) erasedCells = eraseRes.cells;
  } else if (bounds) {
    const eraseRes = eraseTilesInRegion({
      map,
      layerIdx,
      minR: bounds.minR,
      maxR: bounds.maxR,
      minC: bounds.minC,
      maxC: bounds.maxC,
    });
    if (eraseRes.ok) erasedCells = eraseRes.cells;
  }

  // 2. Stamp at destination
  const targetR = extracted.sourceOrigin.r + offsetR;
  const targetC = extracted.sourceOrigin.c + offsetC;

  const stampRes = stampClipboardOntoMap({
    map,
    clipboard: extracted,
    targetR,
    targetC,
    mode: 'overlay',
    activeLayerIdx: layerIdx,
  });

  if (!stampRes.ok) {
    return { ok: false, cells: [], error: stampRes.error || 'Failed to move tiles.' };
  }

  const allMutations = [...erasedCells, ...stampRes.cells];
  const deduplicated = deduplicatePaintedCells(allMutations);

  const newBounds = {
    minR: targetR,
    minC: targetC,
    maxR: targetR + extracted.height - 1,
    maxC: targetC + extracted.width - 1,
    width: extracted.width,
    height: extracted.height,
  };

  const newCells: Record<string, boolean> = {};
  for (const v of extracted.visualData) {
    newCells[`${targetR + v.r},${targetC + v.c}`] = true;
  }
  for (const l of extracted.logicData) {
    newCells[`${targetR + l.r},${targetC + l.c}`] = true;
  }

  return {
    ok: true,
    cells: deduplicated,
    newBounds,
    newCells,
  };
}

