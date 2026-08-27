/**
 * Saints Gaming — Master Player Session Handshake, Anti-Cheat Input Throttle & Realtime Heartbeat Telemetry Engine (Bible 02, 07, 33)
 * Manages connection lifecycles, sliding window input packet rate-limiting, and network jitter/latency telemetry with desync recovery.
 */

export type SessionState =
  | 'CONNECTING'
  | 'AUTHENTICATED'
  | 'IN_GAME'
  | 'DESYNC_RECOVERY'
  | 'DISCONNECTED';

export type PacketType =
  | 'MOVEMENT'
  | 'ABILITY_CAST'
  | 'INTERACT'
  | 'CHAT'
  | 'HEARTBEAT';

export const RATE_LIMIT_CONFIG: Record<PacketType, number> = {
  MOVEMENT: 10, // Max 10 movement updates per second
  ABILITY_CAST: 4, // Max 4 ability casts per second
  INTERACT: 5,
  CHAT: 3,
  HEARTBEAT: 2,
};

export interface PacketLogEntry {
  type: PacketType;
  timestamp: number;
}

export interface PlayerSessionContext {
  sessionId: string;
  playerId: string;
  state: SessionState;
  connectedAt: number;
  lastHeartbeat: number;
  recentPackets: PacketLogEntry[];
  pingRttMs: number;
  jitterMs: number;
  desyncRecoveryCount: number;
}

export class PlayerSessionTelemetryEngine {
  private sessions = new Map<string, PlayerSessionContext>();

  /**
   * Initializes a new player connection session in CONNECTING state.
   */
  public createSession(sessionId: string, playerId: string): PlayerSessionContext {
    const session: PlayerSessionContext = {
      sessionId,
      playerId,
      state: 'CONNECTING',
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
      recentPackets: [],
      pingRttMs: 0,
      jitterMs: 0,
      desyncRecoveryCount: 0,
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Retrieves a session by ID.
   */
  public getSession(sessionId: string): PlayerSessionContext | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Authoritative session state machine transitions.
   */
  public transitionState(session: PlayerSessionContext, targetState: SessionState): boolean {
    const validTransitions: Record<SessionState, SessionState[]> = {
      CONNECTING: ['AUTHENTICATED', 'DISCONNECTED'],
      AUTHENTICATED: ['IN_GAME', 'DISCONNECTED'],
      IN_GAME: ['DESYNC_RECOVERY', 'DISCONNECTED'],
      DESYNC_RECOVERY: ['IN_GAME', 'DISCONNECTED'],
      DISCONNECTED: [],
    };

    if (!validTransitions[session.state]?.includes(targetState)) {
      return false;
    }

    session.state = targetState;
    return true;
  }

  /**
   * Validates packet rate using a 1-second sliding window rate-limiter.
   */
  public validatePacketRate(
    session: PlayerSessionContext,
    packetType: PacketType,
    now: number = Date.now()
  ): { allowed: boolean; countInWindow: number; reason?: string } {
    const windowStart = now - 1000;

    // Prune entries older than 1 second
    session.recentPackets = session.recentPackets.filter((p) => p.timestamp >= windowStart);

    const countInWindow = session.recentPackets.filter((p) => p.type === packetType).length;
    const maxAllowed = RATE_LIMIT_CONFIG[packetType] || 10;

    if (countInWindow >= maxAllowed) {
      return {
        allowed: false,
        countInWindow,
        reason: `Rate limit exceeded for ${packetType} (${countInWindow}/${maxAllowed} pkts/sec)`,
      };
    }

    session.recentPackets.push({ type: packetType, timestamp: now });
    return { allowed: true, countInWindow: countInWindow + 1 };
  }

  /**
   * Processes round-trip heartbeat ping, calculating latency and jitter.
   */
  public recordHeartbeat(
    session: PlayerSessionContext,
    clientSendTimestamp: number,
    serverReceiveTimestamp: number,
    clientReceiveTimestamp: number
  ): { rttMs: number; jitterMs: number; needsDesyncRecovery: boolean } {
    const totalRtt = clientReceiveTimestamp - clientSendTimestamp;
    const cleanRtt = Math.max(1, totalRtt);

    // Exponential moving average for jitter
    const previousRtt = session.pingRttMs || cleanRtt;
    const delta = Math.abs(cleanRtt - previousRtt);
    const jitter = Number(((session.jitterMs * 0.8) + (delta * 0.2)).toFixed(1));

    session.pingRttMs = cleanRtt;
    session.jitterMs = jitter;
    session.lastHeartbeat = serverReceiveTimestamp;

    // Trigger desync recovery if latency spike exceeds 450ms or jitter exceeds 150ms
    const needsDesyncRecovery = cleanRtt > 450 || jitter > 150;
    if (needsDesyncRecovery && session.state === 'IN_GAME') {
      session.state = 'DESYNC_RECOVERY';
      session.desyncRecoveryCount++;
    }

    return {
      rttMs: cleanRtt,
      jitterMs: jitter,
      needsDesyncRecovery,
    };
  }
}
