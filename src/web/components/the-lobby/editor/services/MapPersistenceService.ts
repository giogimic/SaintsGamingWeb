/**
 * Saints Gaming Studio — Map Persistence Service
 *
 * Encapsulates authoritative map serialization, visual normalization, overlay stripping,
 * REST API communication, cache invalidation, and versioning (Save ≠ Publish ≠ Live).
 */

import { stripEditorOverlaysFromMapPayload } from '@/shared/game/mapLayers';
import { ensureMapHasStudioTilesets } from '@/shared/game/studioTilesetBootstrap';
import { normalizeStudioMapVisuals, formatMapWriteError, buildBorderedLogicGrid } from '@/shared/game/studioMapCreate';
import { invalidateMapCache } from '@/shared/game/mapCache';
import { invalidateMapCache as invalidateLobbyMapCache } from '../../data/maps';
import { isGoMmoSocketEnabled } from '@/shared/net/goMmoSocket';
import { toBaseMapId } from '@/shared/net/mapIds';
import { useGameStore } from '../../store';
import { useEditorStore } from '../editor-store';
import { SpatialVoxelWorldManager } from '@/shared/game/voxel/VoxelWorldDoc';
import { StudioApiClient } from '@/shared/api/StudioApiClient';

export interface SaveMapResult {
  ok: boolean;
  mapId?: string;
  error?: string;
  backendUsed?: string;
  version?: number;
}

export interface PublishMapResult {
  ok: boolean;
  mapId?: string;
  publishedVersion?: number;
  error?: string;
}

export interface RollbackMapResult {
  ok: boolean;
  mapId?: string;
  restoredVersion?: number;
  error?: string;
}

export interface MapVersionItem {
  version: number;
  name: string;
  description?: string;
  publishedBy?: string;
  createdAt: string;
}

export class MapPersistenceService {
  /**
   * Authoritative map persistence method for Saints Gaming Studio.
   * Serializes current state, strips editor overlays, sends to REST endpoint,
   * invalidates local cache, and tracks save status.
   */
  public static async saveActiveMap(): Promise<SaveMapResult> {
    return this.saveMap();
  }

  public static async saveMap(): Promise<SaveMapResult> {
    const currentMapId = useGameStore.getState().currentMapId;
    const baseMapId = currentMapId ? toBaseMapId(currentMapId) : null;
    if (!baseMapId) {
      return { ok: false, error: 'No map loaded to save.' };
    }

    const live = useGameStore.getState().activeMapData;
    if (!live) {
      return { ok: false, error: 'Map data not loaded yet — wait for the world to appear, then Save.' };
    }

    // Ensure voxel world is synchronized from live engine instance if present
    let activeVoxelDoc = live.voxelDoc;
    const engine = typeof window !== 'undefined' ? (window as any).__sg_babylon_engine : null;

    if (engine?.voxel?.chunkStreamer) {
      await engine.voxel.chunkStreamer.saveDirtyChunks();
      // If we are streaming, we don't save the chunks in the map document.
      // But we still serialize the palette, dimensions, etc.
      activeVoxelDoc = engine.voxel.voxelWorld.serializeToDoc();
      activeVoxelDoc.chunks = {}; 
    } else {
      const spatialWorld = SpatialVoxelWorldManager.getInstance().getWorld(baseMapId);
      if (spatialWorld) {
        activeVoxelDoc = spatialWorld.serializeToDoc();
      } else if (engine?.voxelWorld) {
        activeVoxelDoc = engine.voxelWorld.serializeToDoc();
      }
    }

    if (activeVoxelDoc) {
      activeVoxelDoc.id = baseMapId;
      if (live.name) activeVoxelDoc.name = live.name;
    }

    const mapWithFreshVoxel = activeVoxelDoc ? { ...live, voxelDoc: activeVoxelDoc } : live;
    const saveDoc = normalizeStudioMapVisuals(ensureMapHasStudioTilesets(mapWithFreshVoxel));

    // Resolve authoritative dimensions and ensure grid is ALWAYS a valid non-empty 2D array
    const width = saveDoc.width || (saveDoc.voxelDoc?.dimensions?.widthChunks ? saveDoc.voxelDoc.dimensions.widthChunks * 16 : 24);
    const height = saveDoc.height || (saveDoc.voxelDoc?.dimensions?.depthChunks ? saveDoc.voxelDoc.dimensions.depthChunks * 16 : 24);
    let validGrid = saveDoc.grid;
    if (!Array.isArray(validGrid) || validGrid.length === 0 || !Array.isArray(validGrid[0]) || validGrid[0].length === 0) {
      validGrid = buildBorderedLogicGrid(width, height);
      saveDoc.grid = validGrid;
    }
    saveDoc.width = width;
    saveDoc.height = height;

    if (saveDoc !== live) {
      useGameStore.getState().setActiveMapData(saveDoc);
    }

    useEditorStore.getState().setIsSavingMap(true);

    try {
      const payload = stripEditorOverlaysFromMapPayload({
        name: saveDoc.name || baseMapId,
        gameId: saveDoc.gameId,
        width,
        height,
        grid: validGrid,
        gates: saveDoc.gates || {},
        npcs: saveDoc.npcs || [],
        encounterPool: saveDoc.encounterPool || [],
        tileLayers: saveDoc.tileLayers || [],
        freeformLayers: saveDoc.freeformLayers || [],
        tilesets: saveDoc.tilesets || [],
        voxelDoc: saveDoc.voxelDoc,
        blockSizePx: saveDoc.blockSizePx || 64,
        cameraStyle: (saveDoc as any).cameraStyle || (saveDoc as any).defaultCameraStyle,
        allowCustomCamera: (saveDoc as any).allowCustomCamera ?? (saveDoc as any).allowCustomPlayerCamera,
        allowCustomPlayerCamera: (saveDoc as any).allowCustomCamera ?? (saveDoc as any).allowCustomPlayerCamera,
      });

      const saveRes = await StudioApiClient.getInstance().saveMap(baseMapId, payload);
      if (!saveRes.ok) {
        return { ok: false, error: saveRes.error || 'Save failed' };
      }

      // Invalidate both shared and runtime lobby caches so fresh authoritative data is loaded everywhere
      invalidateMapCache(baseMapId);
      invalidateLobbyMapCache(baseMapId);
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

  public static async saveIsolatedMap(mapData: any): Promise<SaveMapResult> {
    const baseMapId = mapData.id ? toBaseMapId(mapData.id) : null;
    if (!baseMapId) {
      return { ok: false, error: 'No map ID provided to save.' };
    }

    const saveDoc = normalizeStudioMapVisuals(ensureMapHasStudioTilesets(mapData));
    const width = saveDoc.width || (saveDoc.voxelDoc?.dimensions?.widthChunks ? saveDoc.voxelDoc.dimensions.widthChunks * 16 : 24);
    const height = saveDoc.height || (saveDoc.voxelDoc?.dimensions?.depthChunks ? saveDoc.voxelDoc.dimensions.depthChunks * 16 : 24);
    let validGrid = saveDoc.grid;
    if (!Array.isArray(validGrid) || validGrid.length === 0 || !Array.isArray(validGrid[0]) || validGrid[0].length === 0) {
      validGrid = buildBorderedLogicGrid(width, height);
      saveDoc.grid = validGrid;
    }
    saveDoc.width = width;
    saveDoc.height = height;

    try {
      const payload = stripEditorOverlaysFromMapPayload({
        name: saveDoc.name || baseMapId,
        gameId: saveDoc.gameId,
        width,
        height,
        grid: validGrid,
        gates: saveDoc.gates || {},
        npcs: saveDoc.npcs || [],
        encounterPool: saveDoc.encounterPool || [],
        tileLayers: saveDoc.tileLayers || [],
        freeformLayers: saveDoc.freeformLayers || [],
        tilesets: saveDoc.tilesets || [],
        voxelDoc: saveDoc.voxelDoc,
        blockSizePx: saveDoc.blockSizePx || 64,
        cameraStyle: (saveDoc as any).cameraStyle || (saveDoc as any).defaultCameraStyle,
        allowCustomCamera: (saveDoc as any).allowCustomCamera ?? (saveDoc as any).allowCustomPlayerCamera,
        allowCustomPlayerCamera: (saveDoc as any).allowCustomCamera ?? (saveDoc as any).allowCustomPlayerCamera,
      });

      const saveRes = await StudioApiClient.getInstance().saveMap(baseMapId, payload);
      if (!saveRes.ok) {
        return { ok: false, error: saveRes.error || 'Save failed' };
      }

      invalidateMapCache(baseMapId);
      invalidateLobbyMapCache(baseMapId);
      const backendUsed = isGoMmoSocketEnabled() ? 'Go MMO' : 'TS Server';

      return {
        ok: true,
        backendUsed,
      };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Save failed - network error.' };
    }
  }

  /**
   * Promotes the current saved draft to an immutable published release version.
   */
  public static async publishActiveMap(description?: string): Promise<PublishMapResult> {
    const currentMapId = useGameStore.getState().currentMapId;
    const baseMapId = currentMapId ? toBaseMapId(currentMapId) : null;
    if (!baseMapId) {
      return { ok: false, error: 'No map loaded to publish.' };
    }

    // Ensure map is saved first
    const saveRes = await this.saveMap();
    if (!saveRes.ok) {
      return { ok: false, error: `Save draft before publishing failed: ${saveRes.error}` };
    }

    try {
      const pubRes = await StudioApiClient.getInstance().publishMap(baseMapId, description);
      if (!pubRes.ok) {
        return { ok: false, error: pubRes.error || 'Publish failed' };
      }

      invalidateMapCache(baseMapId);
      invalidateLobbyMapCache(baseMapId);

      // Update publishedVersion in activeMapData
      const active = useGameStore.getState().activeMapData;
      if (active && pubRes.publishedVersion !== undefined) {
        useGameStore.getState().setActiveMapData({
          ...active,
          publishedVersion: pubRes.publishedVersion,
        });
      }

      return {
        ok: true,
        mapId: baseMapId,
        publishedVersion: pubRes.publishedVersion,
      };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Network error publishing map.' };
    }
  }

  /**
   * Restores a map to an earlier published version snapshot.
   */
  public static async rollbackActiveMap(targetVersion: number): Promise<RollbackMapResult> {
    const currentMapId = useGameStore.getState().currentMapId;
    const baseMapId = currentMapId ? toBaseMapId(currentMapId) : null;
    if (!baseMapId) {
      return { ok: false, error: 'No map loaded to rollback.' };
    }

    try {
      const rollRes = await StudioApiClient.getInstance().rollbackMap(baseMapId, targetVersion);
      if (!rollRes.ok) {
        return { ok: false, error: rollRes.error || 'Rollback failed' };
      }

      invalidateMapCache(baseMapId);
      invalidateLobbyMapCache(baseMapId);

      // Trigger re-load of map data
      const { loadMap } = await import('../../data/maps');
      const reloaded = await loadMap(baseMapId);
      useGameStore.getState().setActiveMapData(reloaded);
      useEditorStore.getState().clearMapDirty();

      return {
        ok: true,
        mapId: baseMapId,
        restoredVersion: rollRes.restoredVersion,
      };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Network error rolling back map.' };
    }
  }

  /**
   * Fetches the published version history for a map.
   */
  public static async fetchVersionHistory(mapId: string): Promise<MapVersionItem[]> {
    const baseId = toBaseMapId(mapId);
    return StudioApiClient.getInstance().fetchVersionHistory(baseId);
  }
}
