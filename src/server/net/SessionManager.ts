/**
 * Saints Gaming — Authoritative Session Manager
 *
 * Enforces 1-account-1-seat determinism, maps account identities to active sockets,
 * tracks heartbeats, and notifies stale/replaced sessions.
 */

import type { Socket } from "socket.io";

export interface SessionInfo {
  socketId: string;
  accountId: string;
  connectedAt: number;
  lastHeartbeat: number;
  ip?: string;
}

export class SessionManager {
  /** Maps accountId -> SessionInfo */
  private accountSessions = new Map<string, SessionInfo>();
  /** Maps socketId -> accountId */
  private socketAccounts = new Map<string, string>();

  /**
   * Registers a connected socket for an account.
   * If an existing session for this account exists on a different socket,
   * returns the old socket ID so it can be evicted with `session_replaced`.
   */
  public registerSession(socket: Socket, accountId: string): string | null {
    const cleanAccountId = accountId.trim();
    if (!cleanAccountId) return null;

    let evictedSocketId: string | null = null;
    const existing = this.accountSessions.get(cleanAccountId);
    if (existing && existing.socketId !== socket.id) {
      evictedSocketId = existing.socketId;
      this.socketAccounts.delete(existing.socketId);
    }

    const session: SessionInfo = {
      socketId: socket.id,
      accountId: cleanAccountId,
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
      ip: socket.handshake.address,
    };

    this.accountSessions.set(cleanAccountId, session);
    this.socketAccounts.set(socket.id, cleanAccountId);

    return evictedSocketId;
  }

  public touchHeartbeat(socketId: string) {
    const accountId = this.socketAccounts.get(socketId);
    if (accountId) {
      const sess = this.accountSessions.get(accountId);
      if (sess && sess.socketId === socketId) {
        sess.lastHeartbeat = Date.now();
      }
    }
  }

  public getAccountId(socketId: string): string | undefined {
    return this.socketAccounts.get(socketId);
  }

  public getSocketId(accountId: string): string | undefined {
    return this.accountSessions.get(accountId)?.socketId;
  }

  public removeSession(socketId: string) {
    const accountId = this.socketAccounts.get(socketId);
    if (accountId) {
      const sess = this.accountSessions.get(accountId);
      if (sess && sess.socketId === socketId) {
        this.accountSessions.delete(accountId);
      }
      this.socketAccounts.delete(socketId);
    }
  }

  public getActiveSessionCount(): number {
    return this.accountSessions.size;
  }
}
