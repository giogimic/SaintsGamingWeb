/**
 * Saints Gaming Studio — Fill Tool Handler
 *
 * Executes BFS 4-way flood fill bounded by target layer and continuous geometry selection constraint.
 */

import type { IToolHandler, ToolExecutionContext } from './IToolHandler';
import type { ToolPointerEvent } from '../types';
import { useEditorStore } from '../../editor-store';
import { useGameStore } from '../../../store';
import { LOGIC_LAYER_IDX, resolvePaintTarget } from '@/shared/game/tilePaint';
import { paintWorldCell } from '@/shared/game/worldDocument';
import { isPointInGeometry } from '@/shared/game/geometry/continuousGeometry';

export class FillToolHandler implements IToolHandler {
  public readonly id = 'fill' as const;

  public onPointerDown(event: ToolPointerEvent, context: ToolExecutionContext): boolean {
    if (event.button !== 0) return false;
    const store = useEditorStore.getState();
    const gameStore = useGameStore.getState();
    const liveMap = context.mapData || gameStore.activeMapData;
    if (!liveMap) return false;

    const { r, c } = event.tilePos;
    const height = liveMap.grid?.length || 24;
    const width = liveMap.grid?.[0]?.length || 24;
    if (r < 0 || r >= height || c < 0 || c >= width) return false;

    const target = resolvePaintTarget(liveMap, store.activeLayerIdx);
    if (target.kind === 'unavailable') {
      context.showToast?.(target.reason);
      return false;
    }

    const isLogic = target.kind === 'logic';
    const layerIdx = target.kind === 'logic' ? LOGIC_LAYER_IDX : target.layerIdx;
    const curGrid = isLogic
      ? liveMap.grid
      : (liveMap.tileLayers?.[layerIdx]?.grid || liveMap.grid);
    const targetVal = Number(curGrid?.[r]?.[c] ?? 0);
    const fillVal = isLogic ? store.activeLogicTileId : store.activeBrushTileId;

    if (targetVal === fillVal) return true;

    // Selection constraint check
    const selectedCells = store.selectedCells;
    const hasSparse = Object.keys(selectedCells).length > 0;
    const selStart = store.selectionStart;
    const selEnd = store.selectionEnd;
    const hasSelection = hasSparse || Boolean(selStart && selEnd);

    const isCellInsideSelection = (cellR: number, cellC: number): boolean => {
      if (!hasSelection) return true;
      if (store.activeSelectionGeometry) {
        return isPointInGeometry(cellC + 0.5, cellR + 0.5, store.activeSelectionGeometry);
      }
      if (hasSparse) {
        return Boolean(selectedCells[`${cellR},${cellC}`]);
      }
      if (selStart && selEnd) {
        const r0 = Math.min(selStart.r, selEnd.r);
        const r1 = Math.max(selStart.r, selEnd.r);
        const c0 = Math.min(selStart.c, selEnd.c);
        const c1 = Math.max(selStart.c, selEnd.c);
        return cellR >= r0 && cellR <= r1 && cellC >= c0 && cellC <= c1;
      }
      return true;
    };

    const queue: Array<[number, number]> = [[r, c]];
    const visited = new Set<string>();
    visited.add(`${r},${c}`);
    const paintedOps: any[] = [];
    const MAX_FILL_CELLS = 4096;

    const worldDocSync = {
      ensureActiveMap: (m: any) => gameStore.setActiveMapData(m),
      markDirty: () => store.markMapDirty(),
    };

    while (queue.length > 0 && paintedOps.length < MAX_FILL_CELLS) {
      const [currR, currC] = queue.shift()!;
      if (hasSelection && !isCellInsideSelection(currR, currC)) continue;

      const painted = paintWorldCell(liveMap, layerIdx, currR, currC, fillVal, worldDocSync);
      if (!('error' in painted)) {
        paintedOps.push(painted.cell);
        if (isLogic) {
          context.engine.updateLogicTile(currR, currC, fillVal);
        } else {
          context.engine.updateSingleTile(currR, currC, fillVal, layerIdx, liveMap.tilesets);
        }
      }

      const neighbors: Array<[number, number]> = [
        [currR - 1, currC],
        [currR + 1, currC],
        [currR, currC - 1],
        [currR, currC + 1],
      ];

      for (const [nr, nc] of neighbors) {
        if (nr >= 0 && nr < height && nc >= 0 && nc < width) {
          const key = `${nr},${nc}`;
          if (!visited.has(key)) {
            visited.add(key);
            const neighborVal = Number(curGrid?.[nr]?.[nc] ?? 0);
            if (neighborVal === targetVal) {
              queue.push([nr, nc]);
            }
          }
        }
      }
    }

    if (paintedOps.length > 0) {
      store.pushPaintOp(paintedOps);
      store.markMapDirty();
      context.showToast?.(`Flood filled ${paintedOps.length} tiles`);
    }

    return true;
  }
}
