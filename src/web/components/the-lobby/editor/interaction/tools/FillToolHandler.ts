import type { IToolHandler, ToolExecutionContext } from './IToolHandler';
import type { ToolPointerEvent } from '../types';
import { useEditorStore } from '../../editor-store';
import { useGameStore } from '../../../store';
import { LOGIC_LAYER_IDX, resolvePaintTarget } from '@/shared/game/tilePaint';
import { paintWorldCell } from '@/shared/game/worldDocument';
import { isPointInGeometry } from '@/shared/game/geometry/continuousGeometry';
import { packVoxel, VoxelShape, VoxelOrientation, VoxelPhysics, VoxelLogic, VoxelLogicType, VOXEL_MAT_GRASS } from '@/shared/game/voxel/VoxelWord';
import { VOXEL_MATERIAL_CATALOG } from '@/shared/game/voxel/VoxelMaterialDefinition';
import { VoxelWorld } from '@/shared/game/voxel/VoxelWorldDoc';
import { VoxelTransactionBuilder } from '@/shared/game/voxel/VoxelTransaction';

export class FillToolHandler implements IToolHandler {
  public readonly id = 'fill' as const;

  public onPointerDown(event: ToolPointerEvent, context: ToolExecutionContext): boolean {
    if (event.button !== 0) return false;
    const store = useEditorStore.getState();
    const gameStore = useGameStore.getState();
    const liveMap = context.mapData || gameStore.activeMapData;
    if (!liveMap) return false;

    // 0. Authoritative 3D Voxel Volumetric Flood Fill
    if (event.voxelTarget && (context.engine as any).voxelWorld) {
      const voxelWorld: VoxelWorld = (context.engine as any).voxelWorld;
      const startCoord = event.voxelTarget.voxelCoord;
      const targetWord = voxelWorld.getVoxel(startCoord.wx, startCoord.wy, startCoord.wz);

      const shapeId = (store.activeVoxelShape ?? VoxelShape.FULL_CUBE) as any;
      const orient = (store.activeVoxelOrientation ?? VoxelOrientation.NORTH) as any;
      const matId = store.activeVoxelMaterialId || VOXEL_MAT_GRASS;
      const basePhysics = VOXEL_MATERIAL_CATALOG[matId]?.physics ?? VoxelPhysics.SOLID_OBSTACLE;
      const physics = shapeId === VoxelShape.SLOPE_45 && basePhysics !== VoxelPhysics.SWIMMABLE_FLUID 
        ? VoxelPhysics.WALKABLE_SLOPE 
        : basePhysics;
      const logicId = (store.activeVoxelLogicId || VoxelLogic.NONE) as VoxelLogicType;
      const logicOnly = store.activeVoxelLogicOnly;
      
      let fillWord = 0;
      if (logicOnly) {
        fillWord = (targetWord & ~(0xF << 28)) | ((logicId & 0xF) << 28);
      } else {
        fillWord = packVoxel(matId, shapeId, orient, 0, physics, logicId);
      }

      // If we're filling logic, we consider blocks matching the target's logic.
      // If we're filling materials, we consider blocks matching the entire target word.
      if (targetWord === fillWord) return true;
      if (targetWord === 0) return true; // Cannot fill air

      const runAsyncVoxelFill = async () => {
        const queue: Array<[number, number, number]> = [[startCoord.wx, startCoord.wy, startCoord.wz]];
        const visited = new Set<string>();
        visited.add(`${startCoord.wx}_${startCoord.wy}_${startCoord.wz}`);
        let filledCount = 0;
        const MAX_VOXEL_FILL = 65536;
        const CHUNK_SIZE = 2500;

        const totalW = voxelWorld.totalWidthBlocks;
        const totalZ = voxelWorld.totalDepthBlocks;
        const totalH = voxelWorld.totalHeightBlocks;

        const txBuilder = new VoxelTransactionBuilder('Flood Fill Voxel', liveMap.id || '');

        while (queue.length > 0 && filledCount < MAX_VOXEL_FILL) {
          // Process a chunk of voxels
          let iterations = 0;
          while (queue.length > 0 && filledCount < MAX_VOXEL_FILL && iterations < CHUNK_SIZE) {
            const [wx, wy, wz] = queue.shift()!;
            
            let writeWord = fillWord;
            if (logicOnly) {
              const w = voxelWorld.getVoxel(wx, wy, wz) || 0;
              writeWord = (w & ~(0xF << 28)) | ((logicId & 0xF) << 28);
            }
            txBuilder.record(voxelWorld, wx, wy, wz, writeWord);
            filledCount++;
            iterations++;

            const neighbors: Array<[number, number, number]> = [
              [wx + 1, wy, wz],
              [wx - 1, wy, wz],
              [wx, wy + 1, wz],
              [wx, wy - 1, wz],
              [wx, wy, wz + 1],
              [wx, wy, wz - 1],
            ];

            for (const [nx, ny, nz] of neighbors) {
              if (nx >= 0 && nx < totalW && nz >= 0 && nz < totalZ && ny >= 0 && ny < totalH) {
                const key = `${nx}_${ny}_${nz}`;
                if (!visited.has(key)) {
                  visited.add(key);
                  const neighborWord = voxelWorld.getVoxel(nx, ny, nz) || 0;
                  if (neighborWord !== 0) {
                    if (logicOnly) {
                      if ((neighborWord & 0x0FFFFFFF) === (targetWord & 0x0FFFFFFF)) {
                        queue.push([nx, ny, nz]);
                      }
                    } else if (neighborWord === targetWord) {
                      queue.push([nx, ny, nz]);
                    }
                  }
                }
              }
            }
          }

          // Yield to UI thread to prevent freezing
          if (queue.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
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
          context.engine.voxel.meshDirtyVoxelChunks?.();
          const doc = voxelWorld.serializeToDoc();
          gameStore.setActiveMapData({ ...liveMap, voxelDoc: doc });
          store.pushVoxelOp(changedVoxels);
          store.markMapDirty();
          context.showToast?.(`Voxel flood filled ${tx.mutations.length} blocks`);
        }
      };

      runAsyncVoxelFill().catch(console.error);
      return true;
    }

    // Guard: Never fall through to 2D discrete flood fill when editing in 3D Voxel Mode
    if (store.studioMode === 'voxel') return false;

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
    const layerIdx = target.kind === 'visual' ? (target as any).layerIdx : target.kind === 'region' ? -2 : -1;
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
    const MAX_FILL_CELLS = 65536;

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
