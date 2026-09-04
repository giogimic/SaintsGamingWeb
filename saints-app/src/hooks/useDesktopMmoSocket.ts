import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { lobbySocketConnect } from '@/shared/net/goMmoSocket';
import { useGameStore } from '@/web/components/the-lobby/store';
import { decodePlayerMoved, decodeCreatureMoved, normalizeBinaryPayload } from '@/shared/net/movementCodec';
import { loadMap } from '@/web/components/the-lobby/data/maps';
import { ensureMapHasStudioTilesets } from '@/shared/game/studioTilesetBootstrap';

export function useDesktopMmoSocket(accountId: string | undefined, currentMapId: string | null) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!accountId) return;

    const connectConfig = lobbySocketConnect(accountId);
    if (!connectConfig.url) {
      console.warn('[DesktopMmoSocket] NEXT_PUBLIC_GO_MMO_URL missing. Multiplayer disabled.');
      return;
    }

    const socket = io(connectConfig.url, connectConfig.options);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[DesktopMmoSocket] Connected to Go MMO:', socket.id);
      
      const store = useGameStore.getState();
      if (store.player) {
        socket.emit('player_spawn', {
          mapId: store.currentMapId,
          name: store.player.name,
          spriteId: store.player.assetProfileId || 'adventurer',
          direction: store.player.direction || 'down',
          x: store.player.position?.x ?? 6,
          y: store.player.position?.y ?? 2,
          hp: store.player.hp,
          maxHp: store.player.maxHp
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('[DesktopMmoSocket] Disconnected from Go MMO');
      useGameStore.getState().clearOtherPlayers();
      useGameStore.getState().clearMapEntities();
    });

    // Multiplayer Sync
    socket.on('player_joined', (data) => {
      useGameStore.getState().addOtherPlayer(data.socketId, data);
    });

    socket.on('player_left', (data) => {
      useGameStore.getState().removeOtherPlayer(data.socketId);
    });

    socket.on('player_moved', (rawData) => {
      const buffer = normalizeBinaryPayload(rawData);
      if (buffer) {
        const decoded = decodePlayerMoved(buffer);
        if (decoded) {
          useGameStore.getState().updateOtherPlayer(decoded.socketId, {
            x: decoded.x,
            y: decoded.y,
            direction: decoded.direction,
            isMoving: decoded.isMoving,
            hp: decoded.hp,
            maxHp: decoded.maxHp,
            name: decoded.name,
            assetProfileId: decoded.spriteId
          });
        }
      }
    });

    // Map Sync (Studio Mode)
    socket.on('content_reload', async (data) => {
      if (data.type === 'map' && data.mapId === currentMapId) {
        console.log(`[DesktopMmoSocket] Studio push received for map ${data.mapId}`);
        const store = useGameStore.getState();
        try {
          const rawMap = await loadMap(data.mapId);
          const ensured = ensureMapHasStudioTilesets(rawMap);
          store.setActiveMapData(ensured);
        } catch (e) {
          console.error('[DesktopMmoSocket] Failed to hot-reload map data:', e);
        }
      }
    });

    // Authoritative position corrections
    socket.on('position_correction', (data) => {
      useGameStore.getState().applyServerCorrection(data.x, data.y, data.direction);
    });

    socket.on('move_ack', (data) => {
      useGameStore.getState().clearPendingMovesUpTo(data.seq, data.x, data.y);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accountId, currentMapId]);

  return socketRef.current;
}
