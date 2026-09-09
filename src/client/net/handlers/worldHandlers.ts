/**
 * World Handlers — map_joined, content_reload, tile_changed, chunk_data,
 * voxel_edit, dialogue_start, dialogue_end.
 *
 * Handles map loading, map syncing, and NPC dialogue flow.
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
    // Map data changed — trigger re-fetch in Phase 3
    console.log('[worldHandlers] Content reload: map', data.mapId);
  }

  if (data.type === 'map_entities' && data.mapId === currentMapId) {
    console.log('[worldHandlers] Content reload: entities', data.mapId);
  }
}

/**
 * Individual tile changed (Studio live paint).
 */
export function onTileChanged(data: TileChangedPayload): void {
  // Will be handled by the rendering layer in Phase 3
  // For now, log it
}

/**
 * Chunk data received (for large/streaming maps).
 */
export function onChunkData(data: ChunkDataPayload): void {
  // Chunk loading handled by the rendering layer in Phase 3
}

/**
 * Voxel edit received (multiplayer voxel building).
 */
export function onVoxelEdit(data: VoxelEditPayload): void {
  // Voxel mutation handled by the rendering layer in Phase 3
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
