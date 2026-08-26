import { describe, it, expect, vi } from 'vitest';
import { joinWorld, startMapTransition, type JoinWorldOptions } from './lobbyWorldJoin';

describe('lobbyWorldJoin', () => {
  const createMockOptions = (overrides?: Partial<JoinWorldOptions>): JoinWorldOptions => {
    let worldState = overrides?.worldSessionState || 'not_joined';
    let seq = overrides?.worldJoinSeq || 0;
    let key = overrides?.lastJoinKey || null;

    return {
      socket: {
        connected: true,
        emit: vi.fn(),
      },
      accountId: 'acc_123',
      characterId: 'char_456',
      contract: {
        mapId: 'DEMO_SANDBOX',
        lobby: true,
        isPrivate: false,
        pie: false,
      },
      position: { x: 14, y: 15 },
      name: 'Hero',
      assetProfileId: 'adventurer',
      worldSessionState: worldState,
      currentInstanceId: null,
      worldJoinSeq: seq,
      lastJoinKey: key,
      onSetWorldSessionState: (s) => { worldState = s; },
      onIncrementWorldJoinSeq: () => { seq += 1; return seq; },
      onUpdateLastJoinKey: (k) => { key = k; },
      ...overrides,
    };
  };

  it('rejects unauthenticated join requests', () => {
    const opts = createMockOptions({ accountId: null });
    const res = joinWorld(opts);
    expect(res.success).toBe(false);
    expect(res.reason).toBe('unauthenticated');
    expect(opts.socket?.emit).not.toHaveBeenCalled();
  });

  it('rejects disconnected socket', () => {
    const opts = createMockOptions({ socket: { connected: false, emit: vi.fn() } });
    const res = joinWorld(opts);
    expect(res.success).toBe(false);
    expect(res.reason).toBe('disconnected');
    expect(opts.socket?.emit).not.toHaveBeenCalled();
  });

  it('rejects concurrent joining when state is already joining', () => {
    const opts = createMockOptions({ worldSessionState: 'joining' });
    const res = joinWorld(opts);
    expect(res.success).toBe(false);
    expect(res.reason).toBe('already_joining');
    expect(opts.socket?.emit).not.toHaveBeenCalled();
  });

  it('emits join_map with normalized base map and increments join sequence', () => {
    const onSetState = vi.fn();
    const onIncSeq = vi.fn().mockReturnValue(1);
    const onUpdateKey = vi.fn();
    const emit = vi.fn();

    const opts = createMockOptions({
      socket: { connected: true, emit },
      contract: { mapId: 'DEMO_SANDBOX_ch2', lobby: true, isPrivate: false, pie: false },
      onSetWorldSessionState: onSetState,
      onIncrementWorldJoinSeq: onIncSeq,
      onUpdateLastJoinKey: onUpdateKey,
    });

    const res = joinWorld(opts);
    expect(res.success).toBe(true);
    expect(res.seq).toBe(1);
    expect(onSetState).toHaveBeenCalledWith('joining');
    expect(onIncSeq).toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith('join_map', expect.objectContaining({
      accountId: 'acc_123',
      characterId: 'char_456',
      mapId: 'DEMO_SANDBOX', // Stripped _ch2
      lobby: true,
      joinSeq: 1,
    }));
  });

  it('skips redundant join when matching seat is already held', () => {
    const opts = createMockOptions({
      contract: { mapId: 'DEMO_SANDBOX', lobby: true, isPrivate: false, pie: false },
      currentInstanceId: 'DEMO_SANDBOX_ch1',
      lastJoinKey: 'DEMO_SANDBOX|lobby|pub|nopie',
    });

    const res = joinWorld(opts);
    expect(res.success).toBe(false);
    expect(res.reason).toBe('redundant');
    expect(opts.socket?.emit).not.toHaveBeenCalled();
  });

  it('allows forced join to bypass redundant check', () => {
    const emit = vi.fn();
    const opts = createMockOptions({
      socket: { connected: true, emit },
      contract: { mapId: 'DEMO_SANDBOX', lobby: true, isPrivate: false, pie: false },
      currentInstanceId: 'DEMO_SANDBOX_ch1',
      lastJoinKey: 'DEMO_SANDBOX|lobby|pub|nopie',
      force: true,
    });

    const res = joinWorld(opts);
    expect(res.success).toBe(true);
    expect(emit).toHaveBeenCalled();
  });

  it('startMapTransition sets transitioning state, clears peers, and forces world join', () => {
    const onSetState = vi.fn();
    const setIsTransitioning = vi.fn();
    const onClearPeers = vi.fn();
    const emit = vi.fn();

    const opts = createMockOptions({
      socket: { connected: true, emit },
      contract: { mapId: 'NEW_ZONE', lobby: true, isPrivate: false, pie: false },
      onSetWorldSessionState: onSetState,
    });

    const transitionRes = startMapTransition({
      ...opts,
      setIsMapTransitioning: setIsTransitioning,
      onClearPeers,
    });

    expect(transitionRes.success).toBe(true);
    expect(onSetState).toHaveBeenCalledWith('transitioning');
    expect(setIsTransitioning).toHaveBeenCalledWith(true);
    expect(onClearPeers).toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith('join_map', expect.objectContaining({
      mapId: 'NEW_ZONE',
    }));

    transitionRes.cleanupTimeout?.();
  });
});

