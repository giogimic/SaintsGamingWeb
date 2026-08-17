/**
 * Saints Gaming — Unified Real-Time Protocol Specification
 * Protocol Version: 2.1.0
 *
 * Single source of truth for message schemas, event contracts, request/response
 * semantics, and reliability classes for Lobby Multiplayer & Saints Studio.
 */

export const REALTIME_PROTOCOL_VERSION = "2.1.0";

// ─── Reliability Classes ───────────────────────────────────────────────────────
export type ReliabilityClass =
  | "CRITICAL"    // Must be confirmed / recoverable on reconnect (joins, locks, transactions)
  | "STATE"       // Synchronizable snapshot state (peers list, full map layers)
  | "TRANSIENT"   // Latest value matters (movement deltas, cursor hover)
  | "CHAT"        // Ordered message stream
  | "PRESENCE";   // Best-effort heartbeats & diagnostics

// ─── Message Envelope ─────────────────────────────────────────────────────────
export interface RealtimeEnvelope<T = unknown> {
  protocolVersion: string;
  requestId?: string;
  seq?: number;
  type: string;
  timestamp: number;
  payload: T;
}

// ─── Event Names ──────────────────────────────────────────────────────────────
export const RealtimeEvents = {
  // Shard & Lifecycle
  JOIN_MAP: "join_map",
  MAP_JOINED: "map_joined",
  MAP_PLAYERS: "map_players",
  PLAYER_JOINED: "player_joined",
  PLAYER_LEFT: "player_left",
  SESSION_REPLACED: "session_replaced",
  FORCE_DISCONNECT: "force_disconnect",

  // Movement & Prediction
  MOVE: "move",
  PLAYER_MOVED: "player_moved",
  MOVE_ACK: "move_ack",
  POSITION_CORRECTION: "position_correction",

  // Chat & Social
  CHAT_MESSAGE: "chat_message",
  PLAYER_CHAT: "player_chat",
  GLOBAL_CHAT: "global_chat",
  GLOBAL_CHAT_MSG: "global_chat_msg",
  PARTY_CHAT: "party_chat",
  PARTY_CHAT_MSG: "party_chat_msg",
  WHISPER: "whisper",
  WHISPER_MSG: "whisper_msg",
  STAFF_ANNOUNCE: "staff_announce",

  // Party
  PARTY_INVITE: "party_invite",
  PARTY_JOIN: "party_join",
  PARTY_LEAVE: "party_leave",
  PARTY_UPDATE: "party_update",

  // Studio Collaboration
  PAINT_TILES: "paint_tiles",
  TILE_CHANGED: "tile_changed",
  STUDIO_LOCK: "studio_lock",
  STUDIO_UNLOCK: "studio_unlock",
  STUDIO_PRESENCE: "studio_presence",
  CONTENT_RELOAD: "content_reload",

  // State Resynchronization
  RESYNC_REQUEST: "resync_request",
  RESYNC_STATE: "resync_state",

  // Diagnostics & Heartbeat
  PING: "ping",
  PONG: "pong",
} as const;

export type RealtimeEventName = typeof RealtimeEvents[keyof typeof RealtimeEvents];

// ─── Shard & Player Payloads ──────────────────────────────────────────────────
export interface JoinMapPayload {
  accountId?: string;
  mapId: string;
  lobby?: boolean;
  isPrivate?: boolean;
  pie?: boolean;
  name?: string;
  spriteId?: string;
  x?: number;
  y?: number;
  direction?: string;
}

export interface MapJoinedPayload {
  instanceId: string;
  mapId: string;
  x: number;
  y: number;
  revision?: number;
  protocolVersion: string;
}

export interface PlayerPublicSnapshot {
  socketId: string;
  accountId: string;
  name: string;
  spriteId: string;
  x: number;
  y: number;
  direction: string;
  moving?: boolean;
  hp?: number;
  maxHp?: number;
  chatMessage?: string;
}

export interface PlayerMovedPayload {
  socketId: string;
  x: number;
  y: number;
  direction: string;
  moving: boolean;
  seq?: number;
}

export interface MoveCommand {
  x: number;
  y: number;
  direction?: string;
  moving?: boolean;
  mapId?: string;
  seq?: number;
  requestId?: string;
}

export interface MoveAckPayload {
  x: number;
  y: number;
  seq?: number;
  requestId?: string;
}

// ─── Chat Payloads ────────────────────────────────────────────────────────────
export interface ChatBroadcastPayload {
  socketId: string;
  accountId?: string;
  sender: string;
  message: string;
  channel: "LOCAL" | "GLOBAL" | "PARTY" | "WHISPER" | "SYSTEM";
  timestamp: number;
  recipient?: string;
}

export interface WhisperCommand {
  toPlayerName: string;
  message: string;
}

// ─── Studio Collaboration Payloads ────────────────────────────────────────────
export interface StudioSoftLock {
  resource: string;
  userId: string;
  displayName: string;
  at: string;
  expiresAt: string;
}

export interface StudioTileChangeOp {
  r: number;
  c: number;
  layerIdx: number;
  before: number;
  after: number;
}

export interface PaintTilesCommand {
  mapId: string;
  ops: StudioTileChangeOp[];
  revision: number;
  clientOpId?: string;
}

export interface TileChangedBroadcast {
  mapId: string;
  revision: number;
  ops: StudioTileChangeOp[];
  authorId: string;
  authorName: string;
  timestamp: number;
}

export interface StudioPresencePayload {
  userId: string;
  displayName: string;
  activeMapId: string;
  activeDock?: string;
  cursor?: { r: number; c: number };
  timestamp: number;
}

// ─── State Resync Payloads ────────────────────────────────────────────────────
export interface ResyncRequestPayload {
  instanceId: string;
  lastKnownRevision?: number;
}

export interface ResyncStatePayload {
  instanceId: string;
  mapId: string;
  revision: number;
  players: Record<string, PlayerPublicSnapshot>;
  locks: Record<string, StudioSoftLock>;
}
