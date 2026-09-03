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
import { resolveMapDimensions } from '@/shared/game/mapDocVisual';
import { applyAutoTilingPass } from '@/shared/game/terrainEdgeDetection';
import {
  packVoxel,
  VoxelShape,
  VoxelOrientation,
  VoxelPhysics,
  VOXEL_MAT_GRASS,
  getVoxelBrushOffsets,
  getVoxelBrushOffsets3D,
  resolveConstrainedVoxelCoordinates,
} from '@/shared/game/voxel/VoxelWord';
import { VoxelWorld } from '@/shared/game/voxel/VoxelWorldDoc';
import { VoxelTransactionBuilder } from '@/shared/game/voxel/VoxelTransaction';

export class BrushToolHandler implements IToolHandler {
  public readonly id = 'brush' as const;

  public onPointerDown(event: ToolPointerEvent, context: ToolExecutionContext): boolean {
    return this.executePaint(event, context, 'down');
  }

  public onPointerMove(event: ToolPointerEvent, context: ToolExecutionContext): boolean {
    return this.executePaint(event, context, 'drag');
  }

  public onPointerDrag(event: ToolPointerEvent, context: ToolExecutionContext): boolean {
    return this.executePaint(event, context, 'drag');
  }

  public onPointerUp(event: ToolPointerEvent, context: ToolExecutionContext): boolean {
    return false;
  }

  private executePaint(event: ToolPointerEvent, context: ToolExecutionContext, eventType: 'down' | 'drag'): boolean {
    if (event.button !== 0 && event.rawEvent.buttons !== 1) return false;
    const store = useEditorStore.getState();
    const gameStore = useGameStore.getState();
    const liveMap = context.mapData || gameStore.activeMapData;
    if (!liveMap) return false;

    const { r, c } = event.tilePos;
    const { x, z } = event.worldPos;

    // 0. Authoritative 3D Voxel Placement
    if (event.voxelTarget && (context.engine as any).voxelWorld) {
      const voxelWorld: VoxelWorld = (context.engine as any).voxelWorld;
      const dims = resolveMapDimensions(liveMap);
      const mapWidth = dims.width;
      const mapHeight = dims.height;

      const shapeId = (store.activeVoxelShape ?? VoxelShape.FULL_CUBE) as any;
      const orient = (store.activeVoxelOrientation ?? VoxelOrientation.NORTH) as any;
      const matId = store.activeVoxelMaterialId || VOXEL_MAT_GRASS;
      const physics = shapeId === VoxelShape.SLOPE_45 ? VoxelPhysics.WALKABLE_SLOPE : VoxelPhysics.SOLID_OBSTACLE;
      const voxelWord = packVoxel(matId, shapeId, orient, 0, physics, 0);

      const targetCoords = resolveConstrainedVoxelCoordinates({
        centerCoord: event.voxelTarget.voxelCoord,
        brushRadius: store.brushRadius || 1,
        brushShape: store.brushShape || 'square',
        brushAxis: store.activeVoxelBrushAxis || 'xz',
        planeLockEnabled: store.voxelPlaneLockEnabled,
        targetPlaneY: store.voxelTargetPlaneY,
        planeMask: store.voxelPlaneMask,
        buildUpMode: store.voxelBuildUpMode,
        mapWidth,
        mapHeight,
        maxElevation: 32,
      });

      if (targetCoords.length === 0) return true;

      const txBuilder = new VoxelTransactionBuilder('Brush Paint Voxel', liveMap.id || '');
      for (const { wx, wy, wz } of targetCoords) {
        txBuilder.record(voxelWorld, wx, wy, wz, voxelWord);
      }

      const tx = txBuilder.build();
      if (tx && tx.mutations.length > 0) {
        const changedVoxels: Array<{ wx: number; wy: number; wz: number; before: number; after: number }> = [];
        for (const mut of tx.mutations) {
          voxelWorld.setVoxel(mut.worldX, mut.worldY, mut.worldZ, mut.newVoxel);
          changedVoxels.push({
            wx: mut.worldX,
            wy: mut.worldY,
            wz: mut.worldZ,
            before: mut.previousVoxel,
            after: mut.newVoxel,
          });
        }
        context.engine.meshDirtyVoxelChunks?.();
        const doc = voxelWorld.serializeToDoc();
        gameStore.setActiveMapData({ ...liveMap, voxelDoc: doc });
        store.pushVoxelOp(changedVoxels);
        store.markMapDirty();
      }
      return true;
    }

    // 1. Freeform Splat / Props Handling (Suppressed in Voxel Mode)
    if (store.studioMode === 'voxel') return false;
    if (store.activeLayerType === 'paint-splat' || store.activeLayerType === 'free-form') {
      const dims = resolveMapDimensions(liveMap);
      const mapWidth = dims.width;
      const mapHeight = dims.height;
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
      const pat = store.activeBrushPattern;
      const isFullFootprintPattern = !!pat && store.prefabStampMode !== '1tile';
      const scale = store.stampScale || 1;
      const targetW = isFullFootprintPattern && pat ? Math.max(1, Math.round(pat.w * scale)) : 1;
      const targetH = isFullFootprintPattern && pat ? Math.max(1, Math.round(pat.h * scale)) : 1;
      const offsetR = Math.floor((targetH - 1) / 2);
      const offsetC = Math.floor((targetW - 1) / 2);

      const mapWidth = liveMap.grid?.[0]?.length || 24;
      const mapHeight = liveMap.grid?.length || 24;

      for (const pt of coordsToPaint) {
        if (isFullFootprintPattern && pat) {
          for (let br = 0; br < targetH; br++) {
            for (let bc = 0; bc < targetW; bc++) {
              const tr = pt.r + br - offsetR;
              const tc = pt.c + bc - offsetC;
              if (tr < 0 || tr >= mapHeight || tc < 0 || tc >= mapWidth) continue;
              if (hasSelection && !isCellInsideSelection(tr, tc)) continue;

              const srcR = Math.min(pat.h - 1, Math.floor((br / targetH) * pat.h));
              const srcC = Math.min(pat.w - 1, Math.floor((bc / targetW) * pat.w));
              const patVal = pat.gids[srcR][srcC];
              if (patVal === 0) continue;

              const painted = paintWorldCell(liveMap, layerIdx, tr, tc, patVal, worldDocSync);
              if (!('error' in painted)) {
                paintedOps.push(painted.cell);
                context.engine.updateSingleTile(tr, tc, patVal, layerIdx, liveMap.tilesets);
              }
            }
          }
        } else {
          if (hasSelection && !isCellInsideSelection(pt.r, pt.c)) continue;
          const valToPaint = (store.activeBrushPattern && (store.paintMode === 'stamp' || store.prefabStampMode === '1tile'))
            ? (store.activeBrushPattern.gids[0]?.[0] || paintValue)
            : paintValue;

          const painted = paintWorldCell(liveMap, layerIdx, pt.r, pt.c, valToPaint, worldDocSync);
          if (!('error' in painted)) {
            paintedOps.push(painted.cell);
            context.engine.updateSingleTile(pt.r, pt.c, valToPaint, layerIdx, liveMap.tilesets);
          }
        }
      }

      if (paintedOps.length > 0) {
        if (store.isAutoEdgeEnabled && target.kind === 'visual') {
          const curGrid = liveMap.tileLayers?.[layerIdx]?.grid;
          if (curGrid) {
            const customRule = (liveMap as any).terrainTransitionRules?.find?.(
              (r: any) => r.centerGid === store.activeBrushTileId
            );
            const autoChanges = applyAutoTilingPass(
              curGrid,
              paintedOps.map((p: any) => ({ r: p.r, c: p.c })),
              store.activeBrushTileId,
              customRule?.columns || liveMap.tilesets?.[0]?.columns || 8,
              undefined,
              customRule
            );
            for (const change of autoChanges) {
              context.engine.updateSingleTile(change.r, change.c, change.after, layerIdx, liveMap.tilesets);
              paintedOps.push({
                layer: layerIdx,
                r: change.r,
                c: change.c,
                before: change.before,
                after: change.after,
              });
            }
          }
        }
        store.pushPaintOp(paintedOps);
        store.markMapDirty();
      }
    }

    return true;
  }
}
