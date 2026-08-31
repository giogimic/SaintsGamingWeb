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

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useRealtimeStore, PresenceStatus } from "@/web/hooks/useRealtimeStore";
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
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Timestamp of the last event we received — used for sync on reconnect
  const lastEventTimestampRef = useRef<number>(Date.now() - 5000);

  const {
    addNotification,
    setPresence,
    setLastChatMessage,
    setLastForumReply,
    setMmoPlayerOnline,
    setMmoPlayerOffline,
    setLastFivemCharacterUpdate,
    setLastFivemBankUpdate,
    setLastSocialReaction,
    setLastSocialReply,
    watchedThreadId,
    processedEventIds,
    addProcessedEventId,
  } = useRealtimeStore();

  useEffect(() => {
    // Only connect when user is authenticated
    if (status !== "authenticated" || !session?.user?.id) return;

    // Create singleton connection
    const nextSocket: Socket = io({
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    socketRef.current = nextSocket;
    setSocket(nextSocket);

    // ─── Reconnection sync ──────────────────────────────────────────────────
    nextSocket.on("connect", async () => {
      console.log("[Realtime] Connected:", nextSocket.id);

      // Re-join watched thread room after reconnect
      const threadId = useRealtimeStore.getState().watchedThreadId;
      if (threadId) {
        nextSocket.emit("join_room", `thread:${threadId}`);
      }

      // On reconnect, fetch any CRITICAL events we missed while offline
      try {
        const res = await fetch(`/api/realtime/sync?since=${lastEventTimestampRef.current}`);
        if (res.ok) {
          const data = await res.json();
          const missed: Array<{ id: string; eventType: string; payload: Record<string, unknown>; createdAt: number }> =
            data.events ?? [];

          for (const event of missed) {
            if (!processedEventIds.has(event.id)) {
              handleEvent(event.eventType, {
                id: event.id,
                type: event.eventType,
                version: "1.0",
                timestamp: event.createdAt,
                source: "system",
                priority: "CRITICAL",
                payload: event.payload,
              });
            }
          }
        }
      } catch (err) {
        console.warn("[Realtime] Sync failed on reconnect:", err);
      }
    });

    nextSocket.on("disconnect", (reason) => {
      console.log("[Realtime] Disconnected:", reason);
    });

    // ─── Event Handlers ─────────────────────────────────────────────────────
    function handleEvent(type: string, envelope: EventEnvelope) {
      // Deduplicate by event id
      if (useRealtimeStore.getState().processedEventIds.has(envelope.id)) return;
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
        case "presence.updated": {
          const p = envelope.payload as {
            userId: string;
            status: PresenceStatus;
            lastSeen: number;
          };
          setPresence(p.userId, p.status, p.lastSeen);
          break;
        }
        case "chat.message.created": {
          const p = envelope.payload as {
            messageId: string;
            fromUserId: string;
            toUserId?: string;
            groupId?: string;
            content: string;
          };
          setLastChatMessage({
            ...p,
            receivedAt: envelope.timestamp,
          });
          break;
        }
        case "forum.reply.created": {
          const p = envelope.payload as {
            replyId: string;
            threadId: string;
            authorId: string;
            authorName: string;
            excerpt: string;
          };
          setLastForumReply({
            ...p,
            receivedAt: envelope.timestamp,
          });
          break;
        }
        case "game.player.online": {
          const p = envelope.payload as {
            userId: string;
            characterName: string;
            mapId: string;
            playerCount?: number;
          };
          setMmoPlayerOnline(p.userId, p.characterName, p.mapId, p.playerCount);
          break;
        }
        case "game.player.offline": {
          const p = envelope.payload as {
            userId: string;
            playerCount?: number;
          };
          setMmoPlayerOffline(p.userId, p.playerCount);
          break;
        }
        case "discord.community.announce": {
          const p = envelope.payload as {
            message: string;
            link: string | null;
          };
          toast(p.message, {
            action: p.link
              ? { label: "Open", onClick: () => { window.location.href = p.link!; } }
              : undefined,
          });
          break;
        }
        case "fivem.character.updated": {
          const p = envelope.payload as {
            userId: string;
            characterId: string;
          };
          setLastFivemCharacterUpdate({
            userId: p.userId,
            characterId: p.characterId,
            receivedAt: envelope.timestamp,
          });
          break;
        }
        case "fivem.bank.updated": {
          const p = envelope.payload as {
            userId: string;
            characterId: string;
            bank: number;
          };
          setLastFivemBankUpdate({
            userId: p.userId,
            characterId: p.characterId,
            bank: p.bank,
            receivedAt: envelope.timestamp,
          });
          break;
        }
        case "fivem.player.online": {
          const p = envelope.payload as { userId: string };
          setPresence(p.userId, "playing", envelope.timestamp);
          break;
        }
        case "fivem.player.offline": {
          const p = envelope.payload as { userId: string };
          setPresence(p.userId, "online", envelope.timestamp);
          break;
        }
        case "social.post.reacted": {
          const p = envelope.payload as {
            postId: string;
            likesCount: number;
          };
          setLastSocialReaction({
            postId: p.postId,
            likesCount: p.likesCount,
            timestamp: envelope.timestamp,
          });
          break;
        }
        case "social.reply.created": {
          const p = envelope.payload as {
            postId: string;
            reply: any;
          };
          setLastSocialReply({
            postId: p.postId,
            reply: p.reply,
            timestamp: envelope.timestamp,
          });
          break;
        }
        default:
          break;
      }
    }

    nextSocket.on("notification.created", (envelope: EventEnvelope) => {
      handleEvent("notification.created", envelope);
    });
    nextSocket.on("presence.updated", (envelope: EventEnvelope) => {
      handleEvent("presence.updated", envelope);
    });
    nextSocket.on("chat.message.created", (envelope: EventEnvelope) => {
      handleEvent("chat.message.created", envelope);
    });
    nextSocket.on("forum.reply.created", (envelope: EventEnvelope) => {
      handleEvent("forum.reply.created", envelope);
    });
    nextSocket.on("social.post.reacted", (envelope: EventEnvelope) => {
      handleEvent("social.post.reacted", envelope);
    });
    nextSocket.on("social.reply.created", (envelope: EventEnvelope) => {
      handleEvent("social.reply.created", envelope);
    });
    nextSocket.on("game.player.online", (envelope: EventEnvelope) => {
      handleEvent("game.player.online", envelope);
    });
    nextSocket.on("game.player.offline", (envelope: EventEnvelope) => {
      handleEvent("game.player.offline", envelope);
    });
    nextSocket.on("discord.community.announce", (envelope: EventEnvelope) => {
      handleEvent("discord.community.announce", envelope);
    });
    nextSocket.on("fivem.character.updated", (envelope: EventEnvelope) => {
      handleEvent("fivem.character.updated", envelope);
    });
    nextSocket.on("fivem.bank.updated", (envelope: EventEnvelope) => {
      handleEvent("fivem.bank.updated", envelope);
    });
    nextSocket.on("fivem.player.online", (envelope: EventEnvelope) => {
      handleEvent("fivem.player.online", envelope);
    });
    nextSocket.on("fivem.player.offline", (envelope: EventEnvelope) => {
      handleEvent("fivem.player.offline", envelope);
    });

    return () => {
      nextSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [status, session?.user?.id]);

  // Join / leave thread rooms when a thread page registers interest
  useEffect(() => {
    const active = socketRef.current;
    if (!active?.connected) return;

    if (watchedThreadId) {
      active.emit("join_room", `thread:${watchedThreadId}`);
      return () => {
        active.emit("leave_room", `thread:${watchedThreadId}`);
      };
    }
  }, [watchedThreadId, socket]);

  return (
    <RealtimeContext.Provider value={{ socket }}>
      {children}
    </RealtimeContext.Provider>
  );
}
