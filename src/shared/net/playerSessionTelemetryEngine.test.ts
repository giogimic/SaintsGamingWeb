import { describe, expect, it } from 'vitest';
import {
  PlayerSessionTelemetryEngine,
} from './playerSessionTelemetryEngine';

describe('Master Player Session Handshake, Anti-Cheat Input Throttle & Telemetry Engine (Phase 37)', () => {
  it('manages authoritative session state lifecycle transitions', () => {
    const engine = new PlayerSessionTelemetryEngine();
    const session = engine.createSession('sess_123', 'p_saint_1');

    expect(session.state).toBe('CONNECTING');

    // 1. Invalid jump from CONNECTING to IN_GAME -> Rejected
    expect(engine.transitionState(session, 'IN_GAME')).toBe(false);
    expect(session.state).toBe('CONNECTING');

    // 2. Valid progression: CONNECTING -> AUTHENTICATED -> IN_GAME
    expect(engine.transitionState(session, 'AUTHENTICATED')).toBe(true);
    expect(engine.transitionState(session, 'IN_GAME')).toBe(true);
    expect(session.state).toBe('IN_GAME');

    // 3. Graceful disconnect
    expect(engine.transitionState(session, 'DISCONNECTED')).toBe(true);
    expect(session.state).toBe('DISCONNECTED');
  });

  it('enforces sliding window packet rate limits and blocks macro floods', () => {
    const engine = new PlayerSessionTelemetryEngine();
    const session = engine.createSession('sess_456', 'p_saint_2');
    const now = 100000;

    // 1. Ability cast rate limit: Max 4 / sec
    for (let i = 0; i < 4; i++) {
      const res = engine.validatePacketRate(session, 'ABILITY_CAST', now + i * 10);
      expect(res.allowed).toBe(true);
    }

    // 5th ability cast in same window -> Rejected
    const blockedCast = engine.validatePacketRate(session, 'ABILITY_CAST', now + 50);
    expect(blockedCast.allowed).toBe(false);
    expect(blockedCast.reason).toContain('Rate limit exceeded');

    // 2. Advance time beyond 1-second sliding window -> Allowed again
    const laterCast = engine.validatePacketRate(session, 'ABILITY_CAST', now + 1500);
    expect(laterCast.allowed).toBe(true);
  });

  it('computes network latency, jitter, and automatically triggers desync recovery on spikes', () => {
    const engine = new PlayerSessionTelemetryEngine();
    const session = engine.createSession('sess_789', 'p_saint_3');
    engine.transitionState(session, 'AUTHENTICATED');
    engine.transitionState(session, 'IN_GAME');

    // 1. Normal low-latency heartbeat (30ms RTT)
    const hb1 = engine.recordHeartbeat(session, 1000, 1015, 1030);
    expect(hb1.rttMs).toBe(30);
    expect(hb1.needsDesyncRecovery).toBe(false);
    expect(session.state).toBe('IN_GAME');

    // 2. Severe network lag spike (500ms RTT) -> Triggers DESYNC_RECOVERY
    const hb2 = engine.recordHeartbeat(session, 2000, 2250, 2500);
    expect(hb2.rttMs).toBe(500);
    expect(hb2.needsDesyncRecovery).toBe(true);
    expect(session.state).toBe('DESYNC_RECOVERY');
    expect(session.desyncRecoveryCount).toBe(1);
  });
});
