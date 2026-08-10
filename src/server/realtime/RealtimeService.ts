/**
 * Saints Gaming Realtime Platform — RealtimeService
 *
 * This is the ONLY place that calls socket.io emit methods.
 * API routes, server actions, and game engine events must call
 * this service — never socket.io directly.
 *
 * ⛔ Before modifying this file:
 *    1. Read .docs/info/realtime/ARCHITECTURE.md
 *    2. Check EVENT_REGISTRY in src/shared/events/registry.ts
 */

import { Server } from "socket.io";
import { prisma } from "@/web/lib/prisma";
import { EventEnvelope } from "@/shared/events/types";
import { EVENT_REGISTRY, validateEventPayload } from "@/shared/events/registry";

export class RealtimeService {
  private io: Server;
  private circuitBreakerOpen = false; // true = realtime broadcasts paused
  private metrics = {
    totalEmits: 0,
    failedValidations: 0,
    connectedUsers: 0,
  };

  constructor(io: Server) {
    this.io = io;
  }

  // ─── Circuit Breaker (Admin Control) ─────────────────────────────────────
  public setCircuitBreaker(open: boolean) {
    this.circuitBreakerOpen = open;
    console.log(`[Realtime] Circuit breaker ${open ? "OPENED (broadcasts paused)" : "CLOSED (resuming)"}`);
  }

  public isCircuitBreakerOpen() {
    return this.circuitBreakerOpen;
  }

  // ─── Metrics ──────────────────────────────────────────────────────────────
  public getMetrics() {
    return {
      ...this.metrics,
      connectedUsers: this.io.sockets.sockets.size,
      rooms: this.io.sockets.adapter.rooms.size,
    };
  }

  // ─── Core Event Publisher ─────────────────────────────────────────────────
  /**
   * The main entry point. Validates payload against registry, persists
   * CRITICAL events to RealtimeEvent table, then broadcasts.
   */
  public async publishEvent(
    type: string,
    payload: Record<string, unknown>,
    options: {
      userId?: string;
      room?: string;
      global?: boolean;
      source?: EventEnvelope["source"];
    } = {}
  ): Promise<void> {
    // 1. Validate against registry
    const entry = EVENT_REGISTRY[type];
    if (!entry) {
      this.metrics.failedValidations++;
      console.error(`[Realtime] Unknown event type: "${type}". Register it in src/shared/events/registry.ts`);
      return;
    }

    try {
      validateEventPayload(type, payload);
    } catch (err) {
      this.metrics.failedValidations++;
      console.error(`[Realtime] Payload validation failed for "${type}":`, err);
      return;
    }

    // 2. Build envelope
    const envelope: EventEnvelope = {
      id: crypto.randomUUID(),
      type,
      version: "1.0",
      timestamp: Date.now(),
      source: options.source ?? "web",
      priority: entry.priority,
      payload,
    };

    // 3. Persist CRITICAL events for reconnection sync
    if (entry.persistent && options.userId) {
      try {
        await prisma.realtimeEvent.create({
          data: {
            eventType: type,
            userId: options.userId,
            payload: JSON.stringify(payload),
            priority: entry.priority,
          },
        });
      } catch (err) {
        console.error(`[Realtime] Failed to persist event "${type}":`, err);
        // Non-fatal — still emit via socket
      }
    }

    // 4. Circuit breaker guard
    if (this.circuitBreakerOpen) {
      console.warn(`[Realtime] Circuit breaker open. Event "${type}" not broadcast.`);
      return;
    }

    // 5. Broadcast
    this.metrics.totalEmits++;

    if (options.global) {
      this.io.emit(type, envelope);
    } else if (options.room) {
      this.io.to(options.room).emit(type, envelope);
    } else if (options.userId) {
      this.io.to(`user:${options.userId}`).emit(type, envelope);
    } else {
      console.warn(`[Realtime] publishEvent called for "${type}" with no target (userId, room, or global). Skipped.`);
    }
  }

  // ─── Convenience Emit Helpers ─────────────────────────────────────────────
  public async emitToUser(userId: string, type: string, payload: Record<string, unknown>) {
    return this.publishEvent(type, payload, { userId });
  }

  public async emitToRoom(room: string, type: string, payload: Record<string, unknown>) {
    return this.publishEvent(type, payload, { room });
  }

  public async emitGlobal(
    type: string,
    payload: Record<string, unknown>,
    options: { source?: EventEnvelope["source"] } = {}
  ) {
    return this.publishEvent(type, payload, { global: true, source: options.source });
  }

  // ─── Room Authorization Helper ────────────────────────────────────────────
  /**
   * Check if a socket can join a given room. Call before socket.join().
   * Add room-specific permission logic here as the platform grows.
   */
  public async authorizeRoomJoin(userId: string, room: string): Promise<boolean> {
    // User rooms: always allowed for the owning user
    if (room === `user:${userId}`) return true;

    // Thread rooms: any authenticated user can join for live updates
    if (room.startsWith("thread:")) return true;

    // Admin rooms: future — check permissionLevel here
    if (room === "admin") {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { permissionLevel: true },
      });
      return (user?.permissionLevel ?? 0) >= 90;
    }

    // Default: deny unknown rooms
    console.warn(`[Realtime] Unauthorized room join attempt: userId=${userId} room=${room}`);
    return false;
  }

  // ─── Force Disconnect User (Admin Control) ────────────────────────────────
  public disconnectUser(userId: string, reason = "Disconnected by admin") {
    const sockets = this.io.sockets.sockets;
    sockets.forEach((socket) => {
      if ((socket as any).userId === userId) {
        socket.emit("force_disconnect", { reason });
        socket.disconnect(true);
        console.log(`[Realtime] Force-disconnected userId=${userId}: ${reason}`);
      }
    });
  }
}
