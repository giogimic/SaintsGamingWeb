/**
 * Movement Handlers — player_moved, move_ack, position_correction, join/leave.
 *
 * Handles remote player movement, server reconciliation, and player lifecycle.
 */
import type {
  PlayerMovedPayload,
  MoveAckPayload,
  PositionCorrectionPayload,
  PeerSnapshot,
  PlayerDefeatedPayload,
} from '../protocol.d';
import { useMultiplayerStore } from '../../state/useMultiplayerStore';
import { usePlayerStore } from '../../state/usePlayerStore';
import { useSessionStore } from '../../state/useSessionStore';

/**
 * Remote player moved — update their position in multiplayer store.
 * May arrive as JSON or binary ArrayBuffer (via movementCodec).
 */
export function onPlayerMoved(data: PlayerMovedPayload | ArrayBuffer): void {
  if (data instanceof ArrayBuffer) {
    // Binary movement delta — decode handled elsewhere for now
    // TODO: Wire up movementCodec.normalizeBinaryPayload
    return;
  }

  const { socketId, ...rest } = data;
  if (!socketId) return;

  useMultiplayerStore.getState().updateOtherPlayer(socketId, rest);
}

/**
 * Server acknowledged our move — clear pending predictions up to this seq.
 */
export function onMoveAck(data: MoveAckPayload): void {
  useMultiplayerStore.getState().clearPendingMovesUpTo(data.seq, data.x, data.y);
}

/**
 * Server corrected our position — snap player and clear predictions.
 */
export function onPositionCorrection(data: PositionCorrectionPayload): void {
  usePlayerStore.getState().setPlayerPosition(
    { x: data.x, y: data.y },
    data.direction,
    false,
  );
  useMultiplayerStore.getState().applyServerCorrection(data.x, data.y, data.direction);
}

/**
 * Full peer list — initial map load.
 */
export function onMapPlayers(players: Record<string, PeerSnapshot>): void {
  useMultiplayerStore.getState().setOtherPlayers(players as any);
}

/**
 * New player joined the map.
 */
export function onPlayerJoined(data: PeerSnapshot): void {
  if (!data.socketId) return;
  useMultiplayerStore.getState().updateOtherPlayer(data.socketId, data as any);
}

/**
 * Player left the map.
 */
export function onPlayerLeft(data: { socketId: string } | string): void {
  const socketId = typeof data === 'string' ? data : data.socketId;
  if (socketId) {
    useMultiplayerStore.getState().removeOtherPlayer(socketId);
  }
}

/**
 * Our player was defeated (HP reached 0).
 */
export function onPlayerDefeated(data: PlayerDefeatedPayload): void {
  // Reset HP to max and optionally respawn at new location
  const player = usePlayerStore.getState().player;
  usePlayerStore.getState().modifyHp(player.maxHp);

  if (data.x !== undefined && data.y !== undefined) {
    usePlayerStore.getState().setPlayerPosition(
      { x: data.x, y: data.y },
      'down',
      false,
    );
  }
}
