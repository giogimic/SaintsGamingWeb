"use client";

/**
 * Saints Gaming Realtime Platform — Client Provider
 *
 * Manages a persistent socket.io connection for the authenticated user.
 * Handles reconnection, missed-event sync, and event deduplication.
 *
 * ⛔ Do NOT call socket.on() or socket.emit() outside of this file and
 *    useRealtimeStore.ts. All event subscriptions go through the store.
 */

import { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import { useRealtimeStore } from "@/web/hooks/useRealtimeStore";
import { EventEnvelope } from "@/shared/events/types";

interface RealtimeContextValue {
  socket: Socket | null;
}

const RealtimeContext = createContext<RealtimeContextValue>({ socket: null });

export function useRealtime() {
  return useContext(RealtimeContext);
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const socketRef = useRef<Socket | null>(null);

  // Timestamp of the last event we received — used for sync on reconnect
  const lastEventTimestampRef = useRef<number>(Date.now() - 5000);

  const {
    addNotification,
    setUnreadCount,
    processedEventIds,
    addProcessedEventId,
  } = useRealtimeStore();

  useEffect(() => {
    // Only connect when user is authenticated
    if (status !== "authenticated" || !session?.user?.id) return;

    // Create singleton connection
    const socket: Socket = io({
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    socketRef.current = socket;

    // ─── Reconnection sync ──────────────────────────────────────────────────
    socket.on("connect", async () => {
      console.log("[Realtime] Connected:", socket.id);

      // On reconnect, fetch any CRITICAL events we missed while offline
      try {
        const res = await fetch(`/api/realtime/sync?since=${lastEventTimestampRef.current}`);
        if (res.ok) {
          const data = await res.json();
          const missed: Array<{ id: string; eventType: string; payload: Record<string, unknown>; createdAt: number }> =
            data.events ?? [];

          for (const event of missed) {
            if (!processedEventIds.has(event.id)) {
              handleEvent(event.eventType, { ...event.payload, id: event.id, timestamp: event.createdAt } as unknown as EventEnvelope);
            }
          }
        }
      } catch (err) {
        console.warn("[Realtime] Sync failed on reconnect:", err);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("[Realtime] Disconnected:", reason);
    });

    // ─── Event Handlers ─────────────────────────────────────────────────────
    function handleEvent(type: string, envelope: EventEnvelope) {
      // Deduplicate by event id
      if (processedEventIds.has(envelope.id)) return;
      addProcessedEventId(envelope.id);

      lastEventTimestampRef.current = envelope.timestamp;

      switch (type) {
        case "notification.created": {
          const p = envelope.payload as {
            notificationId: string;
            userId: string;
            type: string;
            message: string;
            link: string | null;
          };
          addNotification({
            id: p.notificationId,
            type: p.type,
            message: p.message,
            link: p.link,
            isRead: false,
            createdAt: new Date(envelope.timestamp).toISOString(),
          });
          break;
        }
        default:
          break;
      }
    }

    socket.on("notification.created", (envelope: EventEnvelope) => {
      handleEvent("notification.created", envelope);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [status, session?.user?.id]);

  return (
    <RealtimeContext.Provider value={{ socket: socketRef.current }}>
      {children}
    </RealtimeContext.Provider>
  );
}
