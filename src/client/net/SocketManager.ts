/**
 * Socket Manager — Socket.IO lifecycle management.
 *
 * Pure TypeScript class with zero React dependency. Handles connection,
 * reconnection, auth handshake, and socket-level events.
 * All game-logic event routing is delegated to SocketEventRouter.
 */
import { io, Socket } from 'socket.io-client';
import {
  goMmoPublicUrl,
  lobbySocketAuth,
  type LobbySocketConnect,
} from '@/shared/net/goMmoSocket';
import type { ServerToClientEvents, ClientToServerEvents } from './protocol.d';

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface SocketManagerOptions {
  accountId: string;
  serverUrl?: string; // Optional dynamic URL for Routed Server
  joinToken?: string; // Optional dynamic JWT token
  onConnect: () => void;
  onDisconnect: (reason: string) => void;
  onReconnecting: () => void;
  onSessionReplaced?: () => void;
}

export class SocketManager {
  private socket: TypedSocket | null = null;
  private options: SocketManagerOptions | null = null;

  /** Returns the active socket (or null before connect). */
  get raw(): TypedSocket | null {
    return this.socket;
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  get socketId(): string | undefined {
    return this.socket?.id;
  }

  /**
   * Connect to the Go MMO server (or same-origin Node fallback).
   */
  connect(opts: SocketManagerOptions): TypedSocket {
    if (this.socket?.connected) {
      this.socket.disconnect();
    }
    
    this.options = opts;

    // Use dynamic serverUrl if provided, otherwise fallback to env
    const goUrl = opts.serverUrl || goMmoPublicUrl();
    const auth = opts.joinToken ? { token: opts.joinToken } : lobbySocketAuth(opts.accountId);

    const connectOpts: any = {
      auth,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
    };

    if (goUrl) {
      connectOpts.withCredentials = true;
      connectOpts.path = '/socket.io/';
    }

    this.socket = io(goUrl || '/', connectOpts) as TypedSocket;

    // Lifecycle events
    this.socket.on('connect', () => {
      console.log('[SocketManager] Connected:', this.socket?.id);
      opts.onConnect();
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('[SocketManager] Disconnected:', reason);
      opts.onDisconnect(reason);
    });

    this.socket.io.on('reconnect_attempt', () => {
      opts.onReconnecting();
    });

    this.socket.io.on('reconnect', () => {
      console.log('[SocketManager] Reconnected');
      opts.onConnect();
    });

    // Session replaced (another tab opened)
    this.socket.on('session_replaced', () => {
      console.warn('[SocketManager] Session replaced by another connection');
      opts.onSessionReplaced?.();
    });

    return this.socket;
  }

  /**
   * Emit a typed event to the server.
   */
  emit<E extends keyof ClientToServerEvents>(
    event: E,
    ...args: Parameters<ClientToServerEvents[E]>
  ): void {
    if (!this.socket?.connected) {
      console.warn(`[SocketManager] Cannot emit '${event}': not connected`);
      return;
    }
    (this.socket.emit as any)(event, ...args);
  }

  /**
   * Subscribe to a typed server event.
   */
  on<E extends keyof ServerToClientEvents>(
    event: E,
    handler: ServerToClientEvents[E],
  ): void {
    if (!this.socket) {
      console.warn(`[SocketManager] Cannot listen for '${event}': no socket`);
      return;
    }
    (this.socket.on as any)(event, handler);
  }

  /**
   * Unsubscribe from a typed server event.
   */
  off<E extends keyof ServerToClientEvents>(
    event: E,
    handler?: ServerToClientEvents[E],
  ): void {
    if (!this.socket) return;
    if (handler) {
      (this.socket.off as any)(event, handler);
    } else {
      (this.socket.off as any)(event);
    }
  }

  /**
   * Cleanly disconnect and dispose.
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.options = null;
  }
}

// Singleton instance
export const socketManager = new SocketManager();
