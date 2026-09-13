/**
 * World Handlers — map_joined, content_reload, tile_changed, chunk_data,
 * voxel_edit, dialogue_start, dialogue_end.
 *
 * Handles map loading, map syncing, and NPC dialogue flow.
 * Now properly bridges to MapMesher for rendering.
 */
import type {
  MapJoinedPayload,
  JoinRejectedPayload,
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
import { worldStreamer } from '../../engine/streaming/WorldStreamer';
import { loadMap } from '@/shared/game/maps';

export function onMapJoined(data: MapJoinedPayload): void {
  const { worldJoinSeq } = useWorldStore.getState();
  if (data.joinSeq !== undefined && data.joinSeq < worldJoinSeq) {
    console.warn('[worldHandlers] Stale map_joined (seq mismatch), ignoring');
    return;
  }
  if (data.serverTime) {
    const offset = data.serverTime - performance.now();
    useSessionStore.getState().setServerTimeOffset(offset);
    console.log(`[worldHandlers] Server clock synced. Offset: ${offset}ms`);
  }
  useWorldStore.getState().setCurrentMapId(data.mapId);
  useWorldStore.getState().setInstanceId(data.instanceId);
  useWorldStore.getState().setWorldSessionState('joined');
  usePlayerStore.getState().setPlayerPosition(
    { x: data.x, y: data.y, z: data.z },
    'down',
    false,
  );
  useMultiplayerStore.getState().setOtherPlayers({});
  worldStreamer.loadManifest(data.mapId).then(() => {
    return worldStreamer.requestSpawnRegion(data.x, data.y, data.z);
  }).catch((err) => {
    console.error(`[worldHandlers] Fatal streaming error:`, err);
    useSessionStore.getState().setBootState('FATAL_ERROR');
  });
  console.log(`[worldHandlers] Joined map: ${data.mapId} at (${data.x}, ${data.y}, ${data.z})`);
}

export function onJoinRejected(data: JoinRejectedPayload): void {
  const { worldJoinSeq } = useWorldStore.getState();
  if (data.joinSeq !== undefined && data.joinSeq < worldJoinSeq) {
    console.warn(`[worldHandlers] Stale join_rejected (seq mismatch) for ${data.mapId}, ignoring`);
    return;
  }
  console.warn(`[worldHandlers] Join rejected for ${data.mapId}: ${data.message} (${data.reason})`);
  useWorldStore.getState().setWorldSessionState('not_joined');
}

export function onContentReload(data: ContentReloadPayload): void {
  const { currentMapId } = useWorldStore.getState();
  if (data.type === 'map' && data.mapId === currentMapId) {
    loadMap(data.mapId, 0, undefined, true)
      .then((mapData: any) => useWorldStore.getState().setActiveMapData(mapData))
      .catch((err: any) => console.error('[worldHandlers] Content reload failed:', err));
  }
  if (data.type === 'map_entities' && data.mapId === currentMapId) {
    console.log('[worldHandlers] Content reload: entities', data.mapId);
  }
}

export function onTileChanged(data: TileChangedPayload): void {
  const { activeMapData } = useWorldStore.getState();
  if (!activeMapData || !activeMapData.grid) return;
  if (data.y >= 0 && data.y < activeMapData.grid.length && data.x >= 0 && data.x < (activeMapData.grid[0]?.length || 0)) {
    activeMapData.grid[data.y][data.x] = data.tileId;
    useWorldStore.getState().setActiveMapData({ ...activeMapData });
  }
}

/** Bridges both legacy split-array chunks and the authoritative Go binary packet. */
export function onChunkData(data: ChunkDataPayload): void {
  if (data.data !== undefined) {
    mapMesher.loadEncodedChunk(data.data);
    return;
  }
  if (data.low !== undefined && data.high !== undefined) {
    mapMesher.loadStreamedChunk({
      cx: data.cx,
      cy: data.cy,
      cz: data.cz,
      low: data.low instanceof Uint32Array ? data.low : new Uint32Array(data.low),
      high: data.high instanceof Uint32Array ? data.high : new Uint32Array(data.high),
    });
  }
}

export function onVoxelEdit(data: VoxelEditPayload): void {
  const voxelWorld = mapMesher.getVoxelWorld();
  if (!voxelWorld) return;
  const chunk = voxelWorld.getChunk(data.cx, data.cz, data.cy, true);
  if (chunk) {
    chunk.set(data.lx, data.ly, data.lz, data.voxel, data.voxelHigh ?? 0);
    chunk.isDirty = true;
    mapMesher.applyVoxelEdit(data.cx, data.cy, data.cz);
  }
}

export function onDialogueStart(data: DialogueStartPayload): void {
  useWorldStore.getState().setActiveDialog({
    npcId: data.npcId, npcName: data.npcName, node: data.node, text: data.text, options: data.options,
  });
}

export function onDialogueEnd(): void {
  useWorldStore.getState().setActiveDialog(null);
}
