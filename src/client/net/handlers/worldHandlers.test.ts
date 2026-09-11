import { describe, it, expect, vi, beforeEach } from 'vitest';
import { onMapJoined, onJoinRejected } from './worldHandlers';
import { useWorldStore } from '../../state/useWorldStore';
import { useSessionStore } from '../../state/useSessionStore';
import { usePlayerStore } from '../../state/usePlayerStore';
import { worldStreamer } from '../../engine/streaming/WorldStreamer';

// Mock dependencies
vi.mock('../../engine/streaming/WorldStreamer', () => ({
  worldStreamer: {
    loadManifest: vi.fn().mockResolvedValue(undefined),
    requestSpawnRegion: vi.fn().mockResolvedValue(undefined),
  }
}));

describe('worldHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorldStore.setState({ worldJoinSeq: 0, currentMapId: undefined, instanceId: undefined, worldSessionState: 'not_joined' });
    useSessionStore.setState({ bootState: 'TITLE', serverTimeOffset: 0 });
    usePlayerStore.setState({ player: { x: 0, y: 0, z: 0 } as any });
  });

  it('A. Successful join: join_map -> map_joined -> normal streaming', async () => {
    useWorldStore.getState().incrementWorldJoinSeq(); // sets seq to 1
    useWorldStore.setState({ worldSessionState: 'joining' });

    onMapJoined({
      instanceId: 'inst_123',
      mapId: 'TEST_MAP',
      x: 10,
      y: 20,
      z: 5,
      serverTime: 1000,
      joinSeq: 1
    });

    expect(useWorldStore.getState().worldSessionState).toBe('joined');
    expect(useWorldStore.getState().currentMapId).toBe('TEST_MAP');
    expect(worldStreamer.loadManifest).toHaveBeenCalledWith('TEST_MAP');
  });

  it('B. Invalid map: join_map -> join_rejected -> client returns to idle', () => {
    useWorldStore.getState().incrementWorldJoinSeq(); // seq = 1
    useWorldStore.setState({ worldSessionState: 'joining' });
    useSessionStore.setState({ bootState: 'CONNECT' });

    onJoinRejected({
      mapId: 'INVALID_MAP',
      reason: 'map_not_found',
      message: 'Failed to resolve map',
      joinSeq: 1
    });

    expect(useWorldStore.getState().worldSessionState).toBe('not_joined');
    expect(worldStreamer.loadManifest).not.toHaveBeenCalled();
  });

  it('C. Stale rejection: rejection for seq 10 must NOT cancel seq 11', () => {
    // Current seq is 11 (we are currently joining)
    useWorldStore.setState({ worldJoinSeq: 11, worldSessionState: 'joining' });

    // A stale rejection from an earlier attempt arrives
    onJoinRejected({
      mapId: 'OLD_MAP',
      reason: 'timeout',
      message: 'Failed',
      joinSeq: 10
    });

    // We must ignore the stale rejection and stay in 'joining' state
    expect(useWorldStore.getState().worldSessionState).toBe('joining');
  });
});
