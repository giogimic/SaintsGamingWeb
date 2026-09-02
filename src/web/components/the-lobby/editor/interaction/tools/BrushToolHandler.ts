/**
 * Saints Gaming Studio — Brush Tool Handler
 *
 * Handles 2D discrete tile paint, continuous terrain splat spray, and straight-line rasterization.
 */

import type { IToolHandler, ToolExecutionContext } from './IToolHandler';
import type { ToolPointerEvent } from '../types';
import { useEditorStore } from '../../editor-store';
import { useGameStore } from '../../../store';
import { LOGIC_LAYER_IDX, resolvePaintTarget, isPaintableLogicId } from '@/shared/game/tilePaint';
import { paintWorldCell } from '@/shared/game/worldDocument';
import { rasterizeLine } from '@/shared/game/lineRaster';
import { isPointInGeometry } from '@/shared/game/geometry/continuousGeometry';
import { STUDIO_MAP_HOT_RELOAD_EVENT } from '@/shared/game/studioEvents';
import { generateSplatScatterPoints, isInBrushShape } from '@/shared/game/brushGeometry';

export class BrushToolHandler implements IToolHandler {
  public readonly id = 'brush' as const;

  public onPointerDown(event: ToolPointerEvent, context: ToolExecutionContext): boolean {
    return this.executePaint(event, context, 'down');
  }

  public onPointerMove(event: ToolPointerEvent, context: ToolExecutionContext): boolean {
    return this.executePaint(event, context, 'move');
  }

  private executePaint(event: ToolPointerEvent, context: ToolExecutionContext, eventType: 'down' | 'move'): boolean {
    if (event.button !== 0 && event.rawEvent.buttons !== 1) return false;
    const store = useEditorStore.getState();
    const gameStore = useGameStore.getState();
    const liveMap = context.mapData || gameStore.activeMapData;
    if (!liveMap) return false;

    const { r, c } = event.tilePos;
    const { x, z } = event.worldPos;

    // 1. Freeform Splat / Props Handling
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
      let layerIdx = newMap.freeformLayers.findIndex((l: any) => l.name === layerName);
      let layer: any;
      if (layerIdx === -1) {
        layer = {
          id: `layer_${store.activeLayerType}_${Date.now()}`,
          name: layerName,
          type: store.activeLayerType,
        };
        newMap.freeformLayers.push(layer);
      } else {
        layer = { ...newMap.freeformLayers[layerIdx] };
        newMap.freeformLayers[layerIdx] = layer;
      }

      if (!store.activeStampAsset) {
        context.showToast?.('Please select a Material or Prop from the palette first.');
        return false;
      }

      const assetUrl = store.activeStampAsset.url;
      const uOffset = store.activeStampAsset.uOffset;
      const vOffset = store.activeStampAsset.vOffset;
      const uScale = store.activeStampAsset.uScale;
      const vScale = store.activeStampAsset.vScale;
      const stampWidth = store.activeStampAsset.width || 1;
      const stampHeight = store.activeStampAsset.height || 1;
      const bShape = store.brushShape || 'circle';

      if (store.activeLayerType === 'paint-splat') {
        layer.data = { ...(layer.data || {}) };
        layer.data[assetUrl] = [...(layer.data[assetUrl] || [])];

        const rad = store.brushRadius || 1;
        const scatterVal = store.splatScatter ?? 0.5;
        const area = Math.PI * rad * rad;
        const baseCount = rad <= 1 ? 1 : Math.max(1, Math.round(area * (1 + scatterVal * 2)));
        const rotRad = store.brushRotation ? (store.brushRotation * Math.PI) / 180 : 0;

        const pointsToDrop = generateSplatScatterPoints(
          finalX,
          finalY,
          rad * 0.9,
          bShape,
          scatterVal,
          baseCount,
          rotRad,
          Boolean(store.splatRotationRandomize)
        );

        const minSqDist = Math.max(0.005, (rad * rad * (1 - scatterVal * 0.5)) / 30);

        for (const pt of pointsToDrop) {
          const isTooClose = layer.data[assetUrl].some((existing: any) => {
            const dx = existing.x - pt.x;
            const dy = existing.y - pt.y;
            return dx * dx + dy * dy < minSqDist;
          });

          if (!isTooClose || eventType === 'down') {
            layer.data[assetUrl].push({
              x: pt.x,
              y: pt.y,
              scale: store.stampScale || 1,
              rotation: pt.rot,
              uOffset,
              vOffset,
              uScale,
              vScale,
              width: stampWidth,
              height: stampHeight,
            });
          }
        }
      } else if (store.activeLayerType === 'free-form' && eventType === 'down') {
        layer.objects = [...(layer.objects || [])];
        layer.objects.push({
          id: `prop_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          asset: assetUrl,
          x: finalX,
          y: finalY,
          scale: store.stampScale || 1,
          rotation: store.brushRotation ? (store.brushRotation * Math.PI) / 180 : 0,
          uOffset,
          vOffset,
          uScale,
          vScale,
          width: stampWidth,
          height: stampHeight,
        });
      }

      gameStore.setActiveMapData(newMap);
      store.markMapDirty();
      window.dispatchEvent(new CustomEvent(STUDIO_MAP_HOT_RELOAD_EVENT, { detail: { mapDoc: newMap } }));
      return true;
    }

    // 2. Tile / Logic Grid Paint
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

    const paintValue = target.kind === 'logic' ? store.activeLogicTileId : store.activeBrushTileId;

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
      const logicId = paintValue;
      const logicTiles = gameStore.logicTiles;
      if (logicId > 0 && !isPaintableLogicId(logicTiles, logicId)) {
        context.showToast?.(`Logic tile #${logicId} is not registered — pick a tag in Logic Tags first.`);
        return false;
      }
      const paintedOps: any[] = [];
      for (const pt of coordsToPaint) {
        if (hasSelection && !isCellInsideSelection(pt.r, pt.c)) continue;
        const painted = paintWorldCell(liveMap, LOGIC_LAYER_IDX, pt.r, pt.c, logicId, worldDocSync);
        if (!('error' in painted)) {
          paintedOps.push(painted.cell);
          if (!context.engine.updateLogicTile(pt.r, pt.c, logicId)) {
            context.engine.enableLogicGridOverlay(liveMap.grid || []);
            context.engine.updateLogicTile(pt.r, pt.c, logicId);
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
        const painted = paintWorldCell(liveMap, layerIdx, pt.r, pt.c, paintValue, worldDocSync);
        if (!('error' in painted)) {
          paintedOps.push(painted.cell);
          context.engine.updateSingleTile(pt.r, pt.c, paintValue, layerIdx, liveMap.tilesets);
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
