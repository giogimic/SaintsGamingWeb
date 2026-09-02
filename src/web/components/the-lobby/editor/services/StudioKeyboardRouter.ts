/**
 * Saints Gaming Studio — Global Keyboard Command Router
 *
 * Dispatches application-level keyboard shortcuts and routes editing commands
 * to the appropriate store, dock, or persistence service without cluttering the shell.
 */

import { useEditorStore } from '../editor-store';
import { useGameStore } from '../../store';
import { MapPersistenceService } from './MapPersistenceService';
import { STUDIO_TRIGGER_SAVE_MAP_EVENT } from '@/shared/game/studioEvents';

export interface KeyboardRouterCallbacks {
  onToggleOmnisearch?: () => void;
  showToast: (msg: string) => void;
}

export class StudioKeyboardRouter {
  public static handleKeyDown(e: KeyboardEvent, callbacks: KeyboardRouterCallbacks): boolean {
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return false;
    }

    const { showToast, onToggleOmnisearch } = callbacks;
    const store = useEditorStore.getState();
    const gameStore = useGameStore.getState();

    // 1. '?' or 'F1' toggles keyboard shortcuts cheat sheet
    if ((e.key === '?' || e.key === 'F1') && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('studio_open_shortcuts'));
      return true;
    }

    // 2. Ctrl+Shift+Q Save & Exit to Character Select
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'q') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent(STUDIO_TRIGGER_SAVE_MAP_EVENT));
      setTimeout(() => { window.location.href = '/lobby'; }, 500);
      return true;
    }

    // 3. Ctrl+E toggles Editor ↔ Playtest (PIE)
    if (e.ctrlKey && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      const mode = gameStore.gameMode;
      if (mode !== 'EXPLORING' && mode !== 'BATTLE') return true;
      
      const isCreation = store.isCreationMode;
      if (isCreation) {
        const hasUnsaved = store.hasUnsavedChanges || store.mapDirty;
        if (hasUnsaved) {
          if (confirm('You have unsaved changes. They will be lost if the map reloads during playtesting. Save before playing?')) {
            void MapPersistenceService.saveActiveMap().then((res) => {
              if (res.ok) showToast(`Saved map ${res.mapId} (Synced to ${res.backendUsed})`);
              else showToast(res.error || 'Save failed');
            });
          }
        }
      }
      store.toggleCreationMode();
      return true;
    }

    // 4. Bracket keys [ ] cycle brush size
    if (!e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey && (e.key === '[' || e.key === ']')) {
      e.preventDefault();
      const currentSize = store.brushRadius;
      const SIZES = [1, 3, 5, 7];
      let idx = SIZES.indexOf(currentSize);
      if (idx === -1) idx = 0;
      
      if (e.key === ']') {
        idx = (idx + 1) % SIZES.length;
      } else {
        idx = (idx - 1 + SIZES.length) % SIZES.length;
      }
      store.setBrushRadius(SIZES[idx]);
      return true;
    }

    // 5. Studio Mode Switches (Ctrl+Shift+M, A, H, O, D)
    if (e.ctrlKey && e.shiftKey) {
      const k = e.key.toLowerCase();
      if (k === 'm' || k === 'p') {
        e.preventDefault();
        store.setStudioMode(store.studioMode === 'atlas' ? 'develop' : 'atlas');
        return true;
      }
      if (k === 'a') {
        e.preventDefault();
        store.setStudioMode(store.studioMode === 'assets' ? 'develop' : 'assets');
        return true;
      }
      if (k === 'h') {
        e.preventDefault();
        store.setStudioMode(store.studioMode === 'hero' ? 'develop' : 'hero');
        return true;
      }
      if (k === 'o') {
        e.preventDefault();
        store.openPanel('problems');
        showToast('Opened Map Diagnostics');
        return true;
      }
      if (k === 'd') {
        e.preventDefault();
        store.openPanel('dev');
        showToast('Opened Dev Tools');
        return true;
      }
    }

    // 6. Ctrl+K Omnisearch
    if (e.ctrlKey && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      onToggleOmnisearch?.();
      return true;
    }

    // 7. Ctrl+S Save
    if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent(STUDIO_TRIGGER_SAVE_MAP_EVENT));
      return true;
    }

    // 8. Ctrl+Z / Ctrl+Y — Undo / Redo
    if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
      if (!store.isCreationMode) return false;
      e.preventDefault();
      const map = gameStore.activeMapData;
      if (!map) return true;
      const result = store.triggerUndo(map);
      if (result.ok) showToast('Undo');
      return true;
    }

    if (e.ctrlKey && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
      if (!store.isCreationMode) return false;
      e.preventDefault();
      const map = gameStore.activeMapData;
      if (!map) return true;
      const result = store.triggerRedo(map);
      if (result.ok) showToast('Redo');
      return true;
    }

    // 9. Delete / Backspace — erase selected tiles
    if (!e.ctrlKey && !e.altKey && !e.metaKey && (e.key === 'Delete' || e.key === 'Backspace')) {
      if (!store.isCreationMode) return false;
      e.preventDefault();
      const map = gameStore.activeMapData;
      if (!map) return true;
      const result = store.deleteSelectionTiles(map);
      if (result.error) {
        showToast(result.error);
      } else if (result.count > 0) {
        const layerName = result.layerIdx === -1 ? 'Logic (−1)' : `Layer ${result.layerIdx}`;
        showToast(`Deleted ${result.count} tile${result.count === 1 ? '' : 's'} on ${layerName}`);
      } else {
        showToast('No tiles to delete.');
      }
      return true;
    }

    // 10. Ctrl+A — Select All tiles on active map
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'a') {
      if (!store.isCreationMode) return false;
      const map = gameStore.activeMapData;
      if (!map) return true;
      const h = map.grid?.length || 0;
      const w = map.grid?.[0]?.length || 0;
      if (h > 0 && w > 0) {
        e.preventDefault();
        store.setSelectionStart({ r: 0, c: 0 });
        store.setSelectionEnd({ r: h - 1, c: w - 1 });
        const activeEng = (window as any).__babylonEngine;
        if (activeEng?.setSelectionPreview) {
          activeEng.setSelectionPreview(0, 0, h - 1, w - 1);
        }
        showToast(`Selected entire map (${w}×${h})`);
        return true;
      }
    }

    // 11. Ctrl+D or Escape — Deselect or Escape Menu
    if (((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'd') || e.key === 'Escape') {
      if (!store.isCreationMode) return false;
      const hasSelection = Boolean(
        store.selectionStart ||
        (store.selectedCells && Object.keys(store.selectedCells).length > 0) ||
        store.activeSelectionGeometry
      );
      const isPasting = store.isPasting;

      if (hasSelection || isPasting) {
        if (e.key !== 'Escape') e.preventDefault();
        store.clearSelectedCells();
        store.setSelectionStart(null);
        store.setSelectionEnd(null);
        if (isPasting) store.cancelPaste();
        const activeEng = (window as any).__babylonEngine;
        if (activeEng?.clearSelectionPreview) {
          activeEng.clearSelectionPreview();
        }
        showToast(isPasting ? 'Paste cancelled' : 'Deselected');
        return true;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        store.setIsStudioEscapeMenuOpen(!store.isStudioEscapeMenuOpen);
        return true;
      }
    }

    // 12. Ctrl+C — Copy selection
    if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'c') {
      if (!store.isCreationMode) return false;
      e.preventDefault();
      const map = gameStore.activeMapData;
      if (!map) return true;
      const res = store.copySelection(map);
      if (res.ok) {
        showToast(`Copied ${res.width}×${res.height} tiles to clipboard`);
      } else {
        showToast(res.error || 'Copy failed');
      }
      return true;
    }

    // 13. Ctrl+V — Start paste
    if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'v') {
      if (!store.isCreationMode) return false;
      e.preventDefault();
      if (!store.tileClipboard) {
        showToast('Clipboard is empty. Copy tiles first (Ctrl+C).');
        return true;
      }
      store.setIsPasting(true);
      store.setBrushMode('paste');
      showToast(`Pasting ${store.tileClipboard.width}×${store.tileClipboard.height} tiles (Click to place)`);
      return true;
    }

    // 14. Ctrl+X — Cut selection
    if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'x') {
      if (!store.isCreationMode) return false;
      e.preventDefault();
      const map = gameStore.activeMapData;
      if (!map) return true;
      const res = store.cutSelection(map);
      if (res.ok) {
        showToast(`Cut ${res.width}×${res.height} tiles`);
      } else {
        showToast(res.error || 'Cut failed');
      }
      return true;
    }

    // 15. Single key editing shortcuts (B, R, F, G, E, I, M)
    if (!e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
      const k = e.key.toLowerCase();
      if (k === 'b') {
        e.preventDefault();
        store.setBrushMode('paint');
        showToast('Brush Tool (B)');
        return true;
      }
      if (k === 'r') {
        e.preventDefault();
        store.rotateStampCW();
        showToast('Rotated 90° (R)');
        return true;
      }
      if (k === 'f' || k === 'g') {
        e.preventDefault();
        store.setBrushMode('fill');
        showToast('Flood Fill Tool (F)');
        return true;
      }
      if (k === 'e') {
        e.preventDefault();
        store.setBrushMode('erase');
        showToast('Eraser Tool (E)');
        return true;
      }
      if (k === 'i') {
        e.preventDefault();
        store.setBrushMode('eyedropper');
        showToast('Eyedropper Tool (I)');
        return true;
      }
      if (k === 'm') {
        e.preventDefault();
        store.setSnapToGrid(!store.snapToGrid);
        showToast(`Grid Snapping: ${!store.snapToGrid ? 'ON' : 'OFF'} (M)`);
        return true;
      }
    }

    return false;
  }
}
