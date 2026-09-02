/**
 * Saints Gaming Studio — Paste Tool Handler
 *
 * Places clipboard tiles onto the map and commits clipboard paste operations.
 */

import type { IToolHandler, ToolExecutionContext } from './IToolHandler';
import type { ToolPointerEvent } from '../types';
import { useEditorStore } from '../../editor-store';
import { useGameStore } from '../../../store';

export class PasteToolHandler implements IToolHandler {
  public readonly id = 'paste' as const;

  public onPointerDown(event: ToolPointerEvent, context: ToolExecutionContext): boolean {
    if (event.button !== 0) return false;
    const store = useEditorStore.getState();
    const gameStore = useGameStore.getState();
    const map = context.mapData || gameStore.activeMapData;
    if (!map) return false;
    if (store.studioMode === 'voxel') {
      context.showToast?.('Clipboard tile paste is for 2D layers.');
      return false;
    }

    const { r, c } = event.tilePos;
    const res = store.pasteClipboard(map, context.engine, r, c, store.pasteMode);

    if (res.ok) {
      context.showToast?.(`Pasted ${res.count} tiles (${store.pasteMode})`);
      store.cancelPaste();
    } else {
      context.showToast?.(res.error || 'Paste failed.');
    }

    return true;
  }
}
