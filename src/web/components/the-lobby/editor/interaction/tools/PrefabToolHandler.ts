/**
 * Saints Gaming Studio — Prefab Tool Handler
 *
 * Places composite multi-tile prefabs (visual layers + logic overlays) centered on cursor pivot.
 */

import type { IToolHandler, ToolExecutionContext } from './IToolHandler';
import type { ToolPointerEvent } from '../types';
import { useEditorStore } from '../../editor-store';
import { useGameStore } from '../../../store';
import { LOGIC_LAYER_IDX } from '@/shared/game/tilePaint';
import { paintWorldCell } from '@/shared/game/worldDocument';

export class PrefabToolHandler implements IToolHandler {
  public readonly id = 'prefab' as const;

  public onPointerDown(event: ToolPointerEvent, context: ToolExecutionContext): boolean {
    if (event.button !== 0) return false;
    const store = useEditorStore.getState();
    const gameStore = useGameStore.getState();
    const map = context.mapData || gameStore.activeMapData;
    if (!map) return false;
    if (store.studioMode === 'voxel') {
      context.showToast?.('Tile prefabs are for 2D layers. Switch to Visual Grid to stamp.');
      return false;
    }

    const { r, c } = event.tilePos;
    const activePrefabId = store.activePrefabId;
    const prefab = store.prefabs.find((p) => p.id === activePrefabId);

    if (!prefab) {
      context.showToast?.('Select a prefab from the Prefab Builder first.');
      return false;
    }

    const mapWidth = map.grid?.[0]?.length || 24;
    const mapHeight = map.grid?.length || 24;

    const ops: any[] = [];
    // Center prefab on cursor pivot (0.5, 0.5)
    const offsetR = Math.floor(((prefab.height || 1) - 1) / 2);
    const offsetC = Math.floor(((prefab.width || 1) - 1) / 2);

    const worldDocSync = {
      ensureActiveMap: (m: any) => gameStore.setActiveMapData(m),
      markDirty: () => store.markMapDirty(),
    };

    // 1. Paste Visual Data
    prefab.visualData?.forEach((v: any) => {
      const tr = r + v.r - offsetR;
      const tc = c + v.c - offsetC;
      if (tr < 0 || tr >= mapHeight || tc < 0 || tc >= mapWidth) return;

      const targetLayer = Math.min(2, Math.max(0, store.activeLayerIdx + (v.layerOffset || 0)));
      const painted = paintWorldCell(map, targetLayer, tr, tc, v.tileId, worldDocSync);
      if (!('error' in painted)) {
        ops.push(painted.cell);
        context.engine.updateSingleTile(tr, tc, v.tileId, targetLayer, map.tilesets);
      }
    });

    // 2. Paste Logic Data
    prefab.logicData?.forEach((l: any) => {
      const tr = r + l.r - offsetR;
      const tc = c + l.c - offsetC;
      if (tr < 0 || tr >= mapHeight || tc < 0 || tc >= mapWidth) return;

      const painted = paintWorldCell(map, LOGIC_LAYER_IDX, tr, tc, l.tileId, worldDocSync);
      if (!('error' in painted)) {
        ops.push(painted.cell);
        if (!context.engine.updateLogicTile(tr, tc, l.tileId)) {
          context.engine.enableLogicGridOverlay(map.grid || []);
          context.engine.updateLogicTile(tr, tc, l.tileId);
        }
      }
    });

    if (ops.length > 0) {
      store.pushPaintOp(ops);
      store.markMapDirty();
    }

    return true;
  }
}
