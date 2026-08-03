import { Server, Socket } from "socket.io";
import { GameEngine } from "./GameEngine";
import { PlayerInput } from "./types";
import { getToken } from "next-auth/jwt";
import { RealtimeService } from "./realtime/RealtimeService";
import { prisma } from "@/web/lib/prisma";
import { hasPermission, PERMISSION_LEVELS } from "@/web/lib/permissions";
import { canWriteStudioContent } from "@/shared/game/studioPermissions";

export class SocketHandler {
  constructor(
    private io: Server,
    private engine: GameEngine,
    public realtime: RealtimeService
  ) {}

  /** Fan presence to accepted friends (and self) via private user rooms. */
  private async broadcastPresence(
    accountId: string,
    status: "online" | "offline" | "away" | "playing"
  ) {
    if (!accountId) return;
    const payload = {
      userId: accountId,
      status,
      lastSeen: Date.now(),
    };
    try {
      await this.realtime.emitToUser(accountId, "presence.updated", payload);

      const friendships = await prisma.friendship.findMany({
        where: {
          status: "ACCEPTED",
          OR: [{ userId: accountId }, { friendId: accountId }],
        },
        select: { userId: true, friendId: true },
      });

      const friendIds = new Set<string>();
      for (const f of friendships) {
        friendIds.add(f.userId === accountId ? f.friendId : f.userId);
      }

      await Promise.all(
        Array.from(friendIds).map((friendId) =>
          this.realtime.emitToUser(friendId, "presence.updated", payload)
        )
      );
    } catch (err) {
      console.warn(`[Socket] presence.updated failed for ${accountId}:`, err);
    }
  }

  public initialize() {
    // Phase 10: Enforce Production Authentication
    this.io.use(async (socket, next) => {
      try {
        const token = await getToken({ 
          req: socket.request as any, 
          secret: process.env.AUTH_SECRET,
          cookieName: process.env.NODE_ENV === "production" ? "__Secure-authjs.session-token" : "authjs.session-token"
        });

        // Fallback for development/testing if a static auth token is passed
        const bypassToken = socket.handshake.auth?.token;
        if (bypassToken && process.env.NODE_ENV === "development") {
           (socket as any).userId = bypassToken;
           return next();
        }

        if (!token || !token.id) {
          return next(new Error("Unauthorized: Invalid or missing session token."));
        }

        (socket as any).userId = token.id;
        next();
      } catch (err) {
        console.error("[Socket] Auth error:", err);
        next(new Error("Authentication error"));
      }
    });

    this.io.on("connection", (socket: Socket) => {
      const accountId = (socket as any).userId;
      console.log(`[Socket] Client connected: ${socket.id} (User: ${accountId})`);

      // Join private user room so RealtimeService can target this user
      socket.join(`user:${accountId}`);

      // Bridge socket presence to the website realtime bus (Milestone 2)
      void this.broadcastPresence(accountId, "online");

      // Website realtime room joins (e.g. thread:{id} for live forum replies)
      socket.on("join_room", async (room: string) => {
        if (!room || typeof room !== "string") return;
        const allowed = await this.realtime.authorizeRoomJoin(accountId, room);
        if (allowed) {
          socket.join(room);
        }
      });

      socket.on("leave_room", (room: string) => {
        if (!room || typeof room !== "string") return;
        socket.leave(room);
      });

      // Gracefully handle admin force-disconnect
      socket.on("force_disconnect", (data: { reason: string }) => {
        console.log(`[Socket] force_disconnect received by ${accountId}: ${data?.reason}`);
        socket.disconnect(true);
      });

      // We do not store game state here. The socket only communicates.

      socket.on("join_map", (data) => {
        console.log(`[Socket] ${accountId} attempting to join map`);
        this.engine.events.emit("clientJoinRequest", { accountId, socketId: socket.id, data });
        void this.broadcastPresence(accountId, "playing");
      });

      socket.on("input", (input: PlayerInput) => {
        // The Socket layer only communicates.
        // It passes intent directly to the engine's event bus or input queue.
        this.engine.events.emit("playerInput", { accountId, input });
      });

      // --- PHASE 3: MMO Real-Time Combat Listeners ---
      socket.on("combat_action", (data) => {
        // data: { targetId, abilityId } or legacy { move }
        this.engine.events.emit("combatRequestAction", {
          accountId,
          targetId: data.targetId,
          abilityId: data.abilityId || data.move?.name,
          move: data.move,
        });
      });

      // --- PHASE 4: Encounter Checks ---
      socket.on("encounter_check", (data) => {
        // data: { mapId, x, y }
        this.engine.events.emit("triggerEncounter", {
          providerType: "tall_grass",
          accountId,
          socketId: socket.id,
          mapId: data.mapId,
          x: data.x,
          y: data.y
        });
      });

      socket.on("battle_submit_action", (data) => {
        // data: { battleId, action, moveId, itemId, mapId }
        this.engine.events.emit("battleSubmitAction", {
          battleId: data.battleId,
          action: data.action,
          moveId: data.moveId,
          itemId: data.itemId,
          socketId: socket.id,
          mapId: data.mapId
        });
      });

      socket.on("admin_save_map", async (data) => {
        try {
          const user = await prisma.user.findUnique({
            where: { id: accountId },
            select: { permissionLevel: true },
          });
          if (!user || !canWriteStudioContent(user.permissionLevel)) return;
          this.engine.events.emit("adminSaveMap", data);
        } catch (err) {
          console.warn("[Socket] admin_save_map failed:", err);
        }
      });

      // After REST WorldMap save: invalidate server cache + hot-reload all clients.
      socket.on("admin_reload_map", async (data: { mapId?: string }) => {
        if (!data?.mapId || typeof data.mapId !== "string") return;
        try {
          const user = await prisma.user.findUnique({
            where: { id: accountId },
            select: { permissionLevel: true },
          });
          if (!user || !canWriteStudioContent(user.permissionLevel)) return;
          this.engine.events.emit("adminReloadMap", { mapId: data.mapId });
        } catch (err) {
          console.warn("[Socket] admin_reload_map failed:", err);
        }
      });

      // --- PHASE 6: NPCs & Dialogue ---
      socket.on("npc_interact", (data) => {
        // data: { mapId, targetId }
        this.engine.events.emit("npcInteractRequest", {
          accountId,
          socketId: socket.id,
          mapId: data.mapId,
          targetId: data.targetId
        });
      });

      socket.on("dialogue_select", (data) => {
        // data: { mapId, targetId, nextNode }
        this.engine.events.emit("dialogueSelectAction", {
          accountId,
          socketId: socket.id,
          mapId: data.mapId,
          targetId: data.targetId,
          nextNode: data.nextNode,
          action: data.action,
          questSlug: data.questSlug
        });
      });

      // --- PHASE 7: Gathering & Economy ---
      socket.on("gather_interact", (data) => {
        // data: { mapId, targetX, targetY }
        this.engine.events.emit("gatherInteractRequest", {
          accountId,
          socketId: socket.id,
          mapId: data.mapId,
          x: data.targetX,
          y: data.targetY
        });
      });

      // --- PHASE 8: Social & Party Systems ---
      // --- PHASE 9: Global Trading Center (GTC) ---
      socket.on("gtc_create_listing", (data) => {
        this.engine.events.emit("gtcCreateListing", {
          accountId,
          socketId: socket.id,
          ...data
        });
      });

      socket.on("gtc_purchase_listing", (data) => {
        this.engine.events.emit("gtcPurchaseListing", {
          accountId,
          socketId: socket.id,
          listingId: data.listingId
        });
      });

      socket.on("pickup_loot", (data) => {
        // data: { mapId, x, y }
        this.engine.events.emit("pickupLootRequest", {
          accountId,
          socketId: socket.id,
          mapId: data.mapId,
          x: data.x,
          y: data.y
        });
      });
      
      socket.on("party_chat", (message) => {
        this.engine.events.emit("partyChat", { accountId, message });
      });
      socket.on("party_invite", (targetName) => {
        this.engine.events.emit("partyInvite", { accountId, targetName });
      });
      socket.on("party_join", (leaderName) => {
        this.engine.events.emit("partyJoin", { accountId, leaderName });
      });
      socket.on("party_leave", () => {
        this.engine.events.emit("partyLeave", { accountId });
      });
      
      socket.on("global_chat", (message) => {
        if (!message || typeof message !== 'string') return;
        this.engine.events.emit("requestPlayersInMap", {
          mapId: undefined,
          callback: (players: any[]) => {
            const player = players.find(p => p.socketId === socket.id || p.accountId === accountId);
            const sender = player?.name || "Tamer";
            this.io.emit("global_chat_msg", {
              sender,
              message,
              timestamp: Date.now()
            });
          }
        });
      });

      // --- PHASE 9: Demo Features (Combat & Local Chat) ---
      socket.on("chat_message", (message) => {
        if (!message || typeof message !== 'string') return;
        this.engine.events.emit("requestPlayersInMap", {
          mapId: undefined,
          callback: (players: any[]) => {
            const player = players.find(p => p.socketId === socket.id || p.accountId === accountId);
            const sender = player?.name || "Tamer";
            const room = player?.mapId;
            this.engine.events.emit("networkBroadcast", {
              room,
              event: "player_chat",
              data: { socketId: socket.id, sender, message }
            });
          }
        });
      });

      // Staff announce to current map (Moderator+)
      socket.on("staff_announce", async (message: string) => {
        if (!message || typeof message !== "string") return;
        try {
          const user = await prisma.user.findUnique({
            where: { id: accountId },
            select: { permissionLevel: true, username: true },
          });
          if (!user || !hasPermission(user.permissionLevel, PERMISSION_LEVELS.MODERATOR)) return;

          this.engine.events.emit("requestPlayersInMap", {
            mapId: undefined,
            callback: (players: any[]) => {
              const player = players.find(
                (p) => p.socketId === socket.id || p.accountId === accountId
              );
              const room = player?.mapId;
              if (!room) return;
              this.engine.events.emit("networkBroadcast", {
                room,
                event: "player_chat",
                data: {
                  socketId: "STAFF",
                  sender: `[STAFF] ${user.username || player?.name || "Staff"}`,
                  message: message.slice(0, 280),
                },
              });
            },
          });
        } catch (err) {
          console.warn("[Socket] staff_announce failed:", err);
        }
      });

      // Staff soft-kick from map (Admin+)
      socket.on("staff_kick", async (targetSocketId: string) => {
        if (!targetSocketId || typeof targetSocketId !== "string") return;
        try {
          const user = await prisma.user.findUnique({
            where: { id: accountId },
            select: { permissionLevel: true },
          });
          if (!user || !hasPermission(user.permissionLevel, PERMISSION_LEVELS.ADMIN)) return;

          const target = this.io.sockets.sockets.get(targetSocketId);
          if (!target) return;
          target.emit("force_disconnect", { reason: "Removed from the map by staff." });
          this.engine.events.emit("playerDisconnected", {
            accountId: (target as any).userId,
            socketId: target.id,
          });
          target.disconnect(true);
        } catch (err) {
          console.warn("[Socket] staff_kick failed:", err);
        }
      });

      socket.on("combat_cast", (data) => {
        // Hotbar sends { abilityId, targetId }. Capture tools are rejected server-side.
        this.engine.events.emit("combatRequestAction", {
          accountId,
          targetId: data.targetId,
          abilityId: data.abilityId || data.move?.name,
          move: data.move,
        });
      });

      socket.on("craft_item", (recipeSlug) => {
        this.engine.events.emit("craftRequestAction", {
          accountId,
          socketId: socket.id,
          recipeSlug
        });
      });

      socket.on("shop_buy", (data) => {
        this.engine.events.emit("shopBuy", {
          accountId,
          socketId: socket.id,
          itemSlug: data?.itemSlug,
          quantity: data?.quantity,
        });
      });

      socket.on("shop_sell", (data) => {
        this.engine.events.emit("shopSell", {
          accountId,
          socketId: socket.id,
          itemSlug: data?.itemSlug,
          quantity: data?.quantity,
        });
      });

      socket.on("shop_catalog", () => {
        this.engine.events.emit("shopCatalogRequest", { socketId: socket.id });
      });

      socket.on("claim_starter", (data) => {
        this.engine.events.emit("claimStarter", {
          accountId,
          socketId: socket.id,
          speciesSlug: data?.speciesSlug,
        });
      });

      socket.on("disconnect", () => {
        console.log(`[Socket] Client disconnected: ${socket.id} (Account: ${accountId})`);
        this.engine.events.emit("playerDisconnected", { accountId, socketId: socket.id });

        // Only mark offline when the user has no remaining sockets
        const stillConnected = Array.from(this.io.sockets.sockets.values()).some(
          (s) => (s as any).userId === accountId && s.id !== socket.id
        );
        if (!stillConnected) {
          void this.broadcastPresence(accountId, "offline");
        }
      });
    });
    
    // Bridge coarse MMO ecosystem events → website realtime bus (Milestone 3)
    this.engine.events.on(
      "ecosystemBroadcast",
      ({ type, payload }: { type: string; payload: Record<string, unknown> }) => {
        void this.realtime.emitGlobal(type, payload, { source: "mmo" });
      }
    );

    // Listen for GameEngine broadcasts to send deltas back
    // Supports single `room`, multi-room AOI `rooms[]`, and binary Buffer payloads.
    this.engine.events.on(
      "networkBroadcast",
      ({
        room,
        rooms,
        event,
        data,
      }: {
        room?: string;
        rooms?: string[];
        event: string;
        data: unknown;
      }) => {
        const targets =
          rooms && rooms.length > 0 ? rooms : room ? [room] : null;

        if (targets) {
          for (const r of targets) {
            this.io.to(r).emit(event, data);
          }
        } else {
          this.io.emit(event, data);
        }
      }
    );

    this.engine.events.on("directMessage", ({ socketId, event, data }) => {
      this.io.to(socketId).emit(event, data);
    });
    
    this.engine.events.on("joinRoom", ({ socketId, room }) => {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) socket.join(room);
    });
    
    this.engine.events.on("leaveRoom", ({ socketId, room }) => {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) socket.leave(room);
    });
  }
}
