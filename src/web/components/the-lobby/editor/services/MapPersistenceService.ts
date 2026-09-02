/**
 * Saints Gaming Studio — Map Persistence Service
 *
 * Encapsulates map serialization, visual normalization, overlay stripping,
 * REST API communication, cache invalidation, and Go MMO backend synchronization.
 */

import { stripEditorOverlaysFromMapPayload } from '@/shared/game/mapLayers';
import { ensureMapHasStudioTilesets } from '@/shared/game/studioTilesetBootstrap';
import { normalizeStudioMapVisuals, formatMapWriteError } from '@/shared/game/studioMapCreate';
import { invalidateMapCache } from '@/shared/game/mapCache';
import { isGoMmoSocketEnabled } from '@/shared/net/goMmoSocket';
import { toBaseMapId } from '@/shared/net/mapIds';
import { soundSynth } from '@/engine/sound-synth';
import { useGameStore } from '../../store';
import { useEditorStore } from '../editor-store';

export interface SaveMapResult {
  ok: boolean;
  mapId?: string;
  error?: string;
  backendUsed?: string;
}

export class MapPersistenceService {
  /**
   * Serializes and saves the active studio map document to the backend database.
   */
  public static async saveActiveMap(): Promise<SaveMapResult> {
    const currentMapId = useGameStore.getState().currentMapId;
    const baseMapId = currentMapId ? toBaseMapId(currentMapId) : null;
    
    if (!baseMapId) {
      return { ok: false, error: 'No map loaded to save.' };
    }

    soundSynth?.playActionSound?.();
    const live = useGameStore.getState().activeMapData;
    
    if (!live?.grid) {
      return { ok: false, error: 'Map data not loaded yet — wait for the world to appear, then Save.' };
    }

    const saveDoc = normalizeStudioMapVisuals(ensureMapHasStudioTilesets(live));
    if (saveDoc !== live) {
      useGameStore.getState().setActiveMapData(saveDoc);
    }

    useEditorStore.getState().setIsSavingMap(true);

    try {
      const payload = stripEditorOverlaysFromMapPayload({
        name: saveDoc.name || baseMapId,
        gameId: saveDoc.gameId,
        grid: saveDoc.grid,
        gates: saveDoc.gates || {},
        npcs: saveDoc.npcs || [],
        encounterPool: saveDoc.encounterPool || [],
        tileLayers: saveDoc.tileLayers || [],
        freeformLayers: saveDoc.freeformLayers || [],
        tilesets: saveDoc.tilesets || [],
        voxelDoc: saveDoc.voxelDoc,
        blockSizePx: saveDoc.blockSizePx,
      });

      const res = await fetch(`/api/maps/${encodeURIComponent(baseMapId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const formattedErr = formatMapWriteError(res.status, err);
        return { ok: false, error: formattedErr };
      }

      invalidateMapCache(baseMapId);
      useEditorStore.getState().clearMapDirty();
      const backendUsed = isGoMmoSocketEnabled() ? 'Go MMO' : 'TS Server';
      
      return {
        ok: true,
        mapId: baseMapId,
        backendUsed,
      };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Save failed — network error.' };
    } finally {
      useEditorStore.getState().setIsSavingMap(false);
    }
  }
}
