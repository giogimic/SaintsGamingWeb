/**
 * Saints Gaming Studio — Eyedropper Tool Handler
 *
 * Samples the visual GID, logic tile tag, or terrain material under the pointer
 * and sets it as the active brush asset.
 */

import type { IToolHandler, ToolExecutionContext } from './IToolHandler';
import type { ToolPointerEvent } from '../types';
import { useEditorStore } from '../../editor-store';
import { useGameStore } from '../../../store';
import { LOGIC_LAYER_IDX } from '@/shared/game/tilePaint';

export class EyedropperToolHandler implements IToolHandler {
  public readonly id = 'eyedropper' as const;

  public onPointerDown(event: ToolPointerEvent, context: ToolExecutionContext): boolean {
    if (event.button !== 0) return false;
    const store = useEditorStore.getState();
    const gameStore = useGameStore.getState();
    const map = context.mapData || gameStore.activeMapData;
    if (!map) return false;

    const { r, c } = event.tilePos;
    const curLayerIdx = store.activeLayerIdx;

    if (curLayerIdx === LOGIC_LAYER_IDX) {
      const tagId = map.grid?.[r]?.[c] ?? 0;
      store.setActiveLogicTileId(tagId);
      const meta = gameStore.logicTiles?.[tagId];
      context.showToast?.(`Sampled Logic Tag: ${meta?.name || `#${tagId}`}`);
    } else {
      const gid = map.tileLayers?.[curLayerIdx]?.grid?.[r]?.[c] ?? 0;
      store.setActiveBrushTileId(gid);
      context.showToast?.(`Sampled Visual Tile: GID ${gid}`);
    }

    store.setBrushMode('paint');
    return true;
  }
}
