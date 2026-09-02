/**
 * Saints Gaming Studio — Eraser Tool Handler
 *
 * Handles 2D discrete tile clearing (writing 0) and continuous splat / prop object erasure.
 */

import type { IToolHandler, ToolExecutionContext } from './IToolHandler';
import type { ToolPointerEvent } from '../types';
import { useEditorStore } from '../../editor-store';
import { useGameStore } from '../../../store';
import { LOGIC_LAYER_IDX, resolvePaintTarget } from '@/shared/game/tilePaint';
import { paintWorldCell } from '@/shared/game/worldDocument';
import { rasterizeLine } from '@/shared/game/lineRaster';
import { isPointInGeometry } from '@/shared/game/geometry/continuousGeometry';
import { STUDIO_MAP_HOT_RELOAD_EVENT } from '@/shared/game/studioEvents';
import { isInBrushShape } from '@/shared/game/brushGeometry';

export class EraserToolHandler implements IToolHandler {
  public readonly id = 'eraser' as const;

  public onPointerDown(event: ToolPointerEvent, context: ToolExecutionContext): boolean {
    return this.executeErase(event, context, 'down');
  }

  public onPointerMove(event: ToolPointerEvent, context: ToolExecutionContext): boolean {
    return this.executeErase(event, context, 'move');
  }

  private executeErase(event: ToolPointerEvent, context: ToolExecutionContext, eventType: 'down' | 'move'): boolean {
    if (event.button !== 0 && event.rawEvent.buttons !== 1) return false;
    const store = useEditorStore.getState();
    const gameStore = useGameStore.getState();
    const liveMap = context.mapData || gameStore.activeMapData;
    if (!liveMap) return false;

    const { r, c } = event.tilePos;
    const { x, z } = event.worldPos;

    // 0. 3D Voxel Erasure
    if (store.studioMode === 'voxel') {
      const voxelWorld = (context.engine as any).voxelWorld;
      if (voxelWorld) {
        const vy = 16; // Top surface block height
        voxelWorld.setVoxel(c, vy, r, 0); // Set to AIR
        context.engine.meshDirtyVoxelChunks?.();
        
        const doc = voxelWorld.serializeToDoc();
        gameStore.setActiveMapData({ ...liveMap, voxelDoc: doc });
        store.markMapDirty();
        return true;
      }
    }

    // 1. Freeform Splat / Props Erasure
    if (store.activeLayerType === 'paint-splat' || store.activeLayerType === 'free-form') {
      const mapWidth = liveMap.grid?.[0]?.length || 24;
      const mapHeight = liveMap.grid?.length || 24;
      const tileSize = context.engine.getCurrentTileSize?.() || 1;
      const tileX = (x / tileSize) + mapWidth / 2;
      const tileY = mapHeight / 2 - (z / tileSize);

      const finalX = store.snapToGrid ? Math.floor(tileX) + 0.5 : tileX;
      const finalY = store.snapToGrid ? Math.floor(tileY) + 0.5 : tileY;

      const newMap = { ...liveMap };
      newMap.freeformLayers = [...(newMap.freeformLayers || [])];

      const layerName = store.activeLayerType === 'paint-splat' ? 'Terrain Paint (Splats)' : 'Foliage & Props (2.5D)';
      const layerIdx = newMap.freeformLayers.findIndex((l: any) => l.name === layerName);
      if (layerIdx === -1) return false;

      const layer = { ...newMap.freeformLayers[layerIdx] };
      newMap.freeformLayers[layerIdx] = layer;

      const bShape = store.brushShape || 'circle';
      const eraseRad = store.brushRadius || 1;

      if (store.activeLayerType === 'paint-splat' && layer.data) {
        Object.keys(layer.data).forEach((key) => {
          layer.data[key] = layer.data[key].filter(
            (p: any) => !isInBrushShape(p.x - finalX, p.y - finalY, eraseRad, bShape)
          );
        });
      } else if (store.activeLayerType === 'free-form' && layer.objects) {
        layer.objects = layer.objects.filter(
          (obj: any) => !isInBrushShape(obj.x - finalX, obj.y - finalY, eraseRad, bShape)
        );
      }

      gameStore.setActiveMapData(newMap);
      store.markMapDirty();
      window.dispatchEvent(new CustomEvent(STUDIO_MAP_HOT_RELOAD_EVENT, { detail: { mapDoc: newMap } }));
      return true;
    }

    // 2. Tile / Logic Grid Erasure (write 0)
    const target = resolvePaintTarget(liveMap, store.activeLayerIdx);
    if (target.kind === 'unavailable') {
      context.showToast?.(target.reason);
      return false;
    }

    const isShiftLine = event.isShift && eventType === 'down' && Boolean(store.lastPaintedTile);
    const coordsToPaint = isShiftLine && store.lastPaintedTile
      ? rasterizeLine(store.lastPaintedTile.r, store.lastPaintedTile.c, r, c)
      : [{ r, c }];

    store.setLastPaintedTile({ r, c });

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

    const worldDocSync = {
      ensureActiveMap: (m: any) => gameStore.setActiveMapData(m),
      markDirty: () => store.markMapDirty(),
    };

    if (target.kind === 'logic') {
      const paintedOps: any[] = [];
      for (const pt of coordsToPaint) {
        if (hasSelection && !isCellInsideSelection(pt.r, pt.c)) continue;
        const painted = paintWorldCell(liveMap, LOGIC_LAYER_IDX, pt.r, pt.c, 0, worldDocSync);
        if (!('error' in painted)) {
          paintedOps.push(painted.cell);
          if (!context.engine.updateLogicTile(pt.r, pt.c, 0)) {
            context.engine.enableLogicGridOverlay(liveMap.grid || []);
            context.engine.updateLogicTile(pt.r, pt.c, 0);
          }
        }
      }
      if (paintedOps.length > 0) {
        store.pushPaintOp(paintedOps);
        store.markMapDirty();
      }
    } else {
      const paintedOps: any[] = [];
      const layerIdx = target.layerIdx;
      for (const pt of coordsToPaint) {
        if (hasSelection && !isCellInsideSelection(pt.r, pt.c)) continue;
        const painted = paintWorldCell(liveMap, layerIdx, pt.r, pt.c, 0, worldDocSync);
        if (!('error' in painted)) {
          paintedOps.push(painted.cell);
          context.engine.updateSingleTile(pt.r, pt.c, 0, layerIdx, liveMap.tilesets);
        }
      }
      if (paintedOps.length > 0) {
        store.pushPaintOp(paintedOps);
        store.markMapDirty();
      }
    }

    return true;
  }
}
