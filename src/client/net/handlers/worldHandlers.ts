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
import { localMovementSystem } from '../../engine/physics/LocalMovementSystem';
import { worldStreamer } from '../../engine/streaming/WorldStreamer';
import { loadMap } from '@/shared/game/maps';
import { isVoxelCharacterPositionClear, resolveSafeVoxelSpawnInWorld } from '@/shared/game/voxel/SpawnResolver';
import { socketManager } from '../SocketManager';

function isCurrentJoin(data: MapJoinedPayload): boolean {
  const state = useWorldStore.getState();
  return state.currentMapId === data.mapId
    && (data.joinSeq === undefined || state.worldJoinSeq === data.joinSeq);
}

async function resolveJoinedVoxelSpawn(data: MapJoinedPayload, mapData: any): Promise<void> {
  const world = mapMesher.getVoxelWorld();
  if (!world) return;
  const currentPosition = usePlayerStore.getState().player.position;
  const currentVoxelPosition = { ...currentPosition, z: currentPosition.z ?? 0 };
  const positionClear = isVoxelCharacterPositionClear(world, currentVoxelPosition);
  const surfaceAtPosition = positionClear
    ? resolveSafeVoxelSpawnInWorld(world, currentVoxelPosition.x, currentVoxelPosition.z, 0)
    : null;
  const belowGround = !!surfaceAtPosition?.isSafe
    && currentVoxelPosition.y + 0.1 < surfaceAtPosition.position.y;
  if (positionClear && !belowGround) return;

  const configuredSpawn = mapData?.spawnPoint || mapData?.gates?.spawnPoint || {};
  const centerX = Math.floor(world.totalWidthBlocks / 2);
  const centerZ = Math.floor(world.totalDepthBlocks / 2);
  const spawnX = Number.isFinite(configuredSpawn.x) ? configuredSpawn.x : centerX;
  const spawnZ = Number.isFinite(configuredSpawn.z)
    ? configuredSpawn.z
    : Number.isFinite(configuredSpawn.y)
      ? world.totalDepthBlocks - 1 - configuredSpawn.y
      : centerZ;
  const requestedSpawnY = Number.isFinite(configuredSpawn.y) ? configuredSpawn.y : data.y;
  const spawnY = Number.isFinite(requestedSpawnY)
    ? Math.max(0, Math.min(world.totalHeightBlocks - 1, requestedSpawnY))
    : 0;

  await worldStreamer.ensureSpawnRegionLoaded(spawnX, spawnY, spawnZ);
  if (!isCurrentJoin(data) || mapMesher.getVoxelWorld() !== world) return;
  let safeSpawn = resolveSafeVoxelSpawnInWorld(world, spawnX, spawnZ, 32);

  if (!safeSpawn.isSafe) {
    await worldStreamer.ensureSpawnRegionLoaded(centerX, Math.max(0, Math.min(world.totalHeightBlocks - 1, data.y)), centerZ);
    if (!isCurrentJoin(data) || mapMesher.getVoxelWorld() !== world) return;
    safeSpawn = resolveSafeVoxelSpawnInWorld(world, centerX, centerZ, 32);
  }

  const resolvedPosition = safeSpawn.isSafe
    ? { x: safeSpawn.position.x + 0.5, y: safeSpawn.position.y, z: safeSpawn.position.z + 0.5 }
    : { x: centerX + 0.5, y: world.totalHeightBlocks + 2, z: centerZ + 0.5 };
  usePlayerStore.getState().setPlayerPosition(resolvedPosition, usePlayerStore.getState().player.direction, false);
  localMovementSystem.resetAfterTeleport();

  // Keep server state in sync when its requested character position was inside
  // solid terrain or outside the loaded voxel bounds.
  const sequence = useMultiplayerStore.getState().incrementMoveSeq();
  socketManager.emit('input' as any, {
    type: 'MOVE_3D',
    sequence,
    voidRecovery: true,
    x: resolvedPosition.x,
    y: resolvedPosition.y,
    z: resolvedPosition.z,
    vx: 0,
    vy: 0,
    vz: 0,
    direction: usePlayerStore.getState().player.direction,
    timestamp: Date.now(),
  });
  console.warn('[worldHandlers] Repositioned an unsafe voxel spawn:', resolvedPosition);
}

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
  localMovementSystem.setSpawnReady(false);
  usePlayerStore.getState().setPlayerPosition(
    { x: data.x, y: data.y, ...(typeof data.z === 'number' ? { z: data.z } : {}) },
    'down',
    false,
  );
  localMovementSystem.resetAfterTeleport();
  useMultiplayerStore.getState().setOtherPlayers({});

  // Load map metadata before the voxel manifest so FRACTAL maps take the JIT
  // chunk path. Movement stays locked until the spawn column is resident and
  // any unsafe initial coordinate has been moved onto solid ground.
  void (async () => {
    const mapData: any = await loadMap(data.mapId);
    if (!isCurrentJoin(data)) return;
    useWorldStore.getState().setActiveMapData(mapData);
    await worldStreamer.loadManifest(data.mapId);
    if (!isCurrentJoin(data)) return;
    await worldStreamer.requestSpawnRegion(data.x, data.y, data.z ?? 0);
    if (!isCurrentJoin(data)) return;
    const mapType = String(mapData?.mapType || '').toUpperCase();
    if (mapType === 'VOXEL' || mapType === 'FRACTAL' || mapType === 'HYBRID') {
      await resolveJoinedVoxelSpawn(data, mapData);
    }
    if (isCurrentJoin(data)) localMovementSystem.setSpawnReady(true);
  })().catch((err) => {
    console.error(`[worldHandlers] Fatal streaming error:`, err);
    useSessionStore.getState().setFatalError(err.message || 'Unknown streaming error');
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
  useWorldStore.getState().setWorldSessionState('failed');
  useWorldStore.getState().setIsMapTransitioning(false);
  if (data.reason === 'map_not_found') {
    useSessionStore.getState().setFatalError(`Map not found: ${data.mapId}`);
  }
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
    worldStreamer.setChunkResidency(data.cx, data.cy, data.cz, 'MESHED');
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
