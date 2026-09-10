/**
 * World Handlers — map_joined, content_reload, tile_changed, chunk_data,
 * voxel_edit, dialogue_start, dialogue_end.
 *
 * Handles map loading, map syncing, and NPC dialogue flow.
 * Now properly bridges to MapMesher for rendering.
 */
import type {
  MapJoinedPayload,
  ContentReloadPayload,
  TileChangedPayload,
  ChunkDataPayload,
  VoxelEditPayload,
  DialogueStartPayload,
} from '../protocol.d';
import { useWorldStore } from '../../state/useWorldStore';
import { usePlayerStore } from '../../state/usePlayerStore';
import { useSessionStore } from '../../state/useSessionStore';
import { useMultiplayerStore } from '../../state/useMultiplayerStore';
import { useToastStore } from '../../state/useToastStore';
import { mapMesher } from '../../engine/MapMesher';
import { loadMap } from '@/shared/game/maps';

/**
 * Successfully joined a map instance.
 */
export function onMapJoined(data: MapJoinedPayload): void {
  const { worldJoinSeq } = useWorldStore.getState();

  // Ignore stale join responses
  if (data.joinSeq !== undefined && data.joinSeq < worldJoinSeq) {
    console.warn('[worldHandlers] Stale map_joined (seq mismatch), ignoring');
    return;
  }

  useWorldStore.getState().setCurrentMapId(data.mapId);
  useWorldStore.getState().setInstanceId(data.instanceId);
  useWorldStore.getState().setWorldSessionState('joined');

  usePlayerStore.getState().setPlayerPosition(
    { x: data.x, y: data.y },
    'down',
    false,
  );

  // Clear remote players from the previous map
  useMultiplayerStore.getState().setOtherPlayers({});

  // Fetch the actual map document and set activeMapData on the store.
  // MapMesher subscribes to activeMapData changes and will automatically
  // rebuild the scene geometry.
  loadMap(data.mapId)
    .then((mapData) => {
      useWorldStore.getState().setActiveMapData(mapData);

      // Load logic tiles if present in the response (not part of GameMapData type but may be in API response)
      if ((mapData as any).logicTiles) {
        useWorldStore.getState().setLogicTiles((mapData as any).logicTiles);
      }

      console.log(`[worldHandlers] Map data loaded: ${data.mapId} (type: ${mapData.mapType || 'unknown'})`);
    })
    .catch((err) => {
      console.error(`[worldHandlers] Failed to load map ${data.mapId}:`, err);
      // Set null so MapMesher clears the scene
      useWorldStore.getState().setActiveMapData(null);
    });

  // Enter exploring scene
  useSessionStore.getState().setScene('exploring');

  console.log(`[worldHandlers] Joined map: ${data.mapId} at (${data.x}, ${data.y})`);
}

/**
 * Hot content reload — map or entity data changed in Studio.
 */
export function onContentReload(data: ContentReloadPayload): void {
  const { currentMapId } = useWorldStore.getState();

  if (data.type === 'map' && data.mapId === currentMapId) {
    // Re-fetch the map data to pick up Studio changes
    loadMap(data.mapId, 0, undefined, true)
      .then((mapData) => {
        useWorldStore.getState().setActiveMapData(mapData);
        console.log('[worldHandlers] Content reload applied for map:', data.mapId);
      })
      .catch((err) => {
        console.error('[worldHandlers] Content reload failed:', err);
      });
  }

  if (data.type === 'map_entities' && data.mapId === currentMapId) {
    console.log('[worldHandlers] Content reload: entities', data.mapId);
    // Entity re-sync will come via separate socket events
  }
}

/**
 * Individual tile changed (Studio live paint).
 */
export function onTileChanged(data: TileChangedPayload): void {
  // Update the activeMapData grid in-place so MapMesher picks it up
  const { activeMapData } = useWorldStore.getState();
  if (!activeMapData || !activeMapData.grid) return;

  if (
    data.y >= 0 && data.y < activeMapData.grid.length &&
    data.x >= 0 && data.x < (activeMapData.grid[0]?.length || 0)
  ) {
    activeMapData.grid[data.y][data.x] = data.tileId;
    // Force the store to re-notify subscribers by setting a new reference
    useWorldStore.getState().setActiveMapData({ ...activeMapData });
  }
}

/**
 * Chunk data received (for large/streaming voxel maps).
 * Bridges directly to the MapMesher for JIT chunk loading.
 */
export function onChunkData(data: ChunkDataPayload): void {
  mapMesher.loadStreamedChunk({
    cx: data.cx,
    cy: data.cy,
    cz: data.cz,
    low: data.low instanceof Uint32Array ? data.low : new Uint32Array(data.low),
    high: data.high instanceof Uint32Array ? data.high : new Uint32Array(data.high),
  });
}

/**
 * Voxel edit received (multiplayer voxel building).
 * Bridges to MapMesher to re-mesh the affected chunk.
 */
export function onVoxelEdit(data: VoxelEditPayload): void {
  // Apply the voxel mutation to the VoxelWorld, then re-mesh the chunk
  const voxelWorld = mapMesher.getVoxelWorld();
  if (!voxelWorld) return;

  // Apply the edit to the chunk (note: VoxelWorld.getChunk takes cx, cz, cy)
  const chunk = voxelWorld.getChunk(data.cx, data.cz, data.cy, true);
  if (chunk) {
    // VoxelChunk.set takes (lx, ly, lz, lowWord, highWord)
    chunk.set(data.lx, data.ly, data.lz, data.voxel, data.voxelHigh ?? 0);
    chunk.isDirty = true;
    mapMesher.applyVoxelEdit(data.cx, data.cy, data.cz);
  }
}

/**
 * NPC dialogue started.
 */
export function onDialogueStart(data: DialogueStartPayload): void {
  useWorldStore.getState().setActiveDialog({
    npcId: data.npcId,
    npcName: data.npcName,
    node: data.node,
    text: data.text,
    options: data.options,
  });
}

/**
 * NPC dialogue ended.
 */
export function onDialogueEnd(): void {
  useWorldStore.getState().setActiveDialog(null);
}
