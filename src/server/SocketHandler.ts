import { Server, Socket } from "socket.io";
import { GameEngine } from "./GameEngine";
import { PlayerInput } from "./types";
import { getToken } from "next-auth/jwt";

export class SocketHandler {
  constructor(private io: Server, private engine: GameEngine) {}

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
      
      // We do not store game state here. The socket only communicates.
      
      socket.on("join_map", (data) => {
        console.log(`[Socket] ${accountId} attempting to join map`);
        this.engine.events.emit("clientJoinRequest", { accountId, socketId: socket.id, data });
      });

      socket.on("input", (input: PlayerInput) => {
        // The Socket layer only communicates.
        // It passes intent directly to the engine's event bus or input queue.
        this.engine.events.emit("playerInput", { accountId, input });
      });

      // --- PHASE 3: MMO Real-Time Combat Listeners ---
      socket.on("combat_action", (data) => {
        // data: { battleId, targetId, move: { name, power, category } }
        this.engine.events.emit("combatRequestAction", {
          battleId: data.battleId,
          entityId: `player_${accountId}`, // In a real app we'd map account to entityId perfectly
          targetId: data.targetId,
          move: data.move
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

      socket.on("admin_save_map", (data) => {
        // In a real app we'd verify admin role here
        this.engine.events.emit("adminSaveMap", data);
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
          nextNode: data.nextNode
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
        this.engine.events.emit("globalChat", { accountId, message });
      });

      // --- PHASE 9: Demo Features (Combat & Local Chat) ---
      socket.on("chat_message", (message) => {
        // Emit to local/global for now so players see chat bubbles
        this.engine.events.emit("networkBroadcast", {
          room: undefined, // Broadcast globally for the demo until rooms are enforced
          event: "player_chat",
          data: { socketId: socket.id, message }
        });
      });

      socket.on("combat_cast", (data) => {
        // data contains { targetId, move: { name, type, power, ... } }
        this.engine.events.emit("combatRequestAction", {
          entityId: `player_${accountId}`,
          targetId: data.targetId,
          move: data.move
        });
      });

      socket.on("disconnect", () => {
        console.log(`[Socket] Client disconnected: ${socket.id} (Account: ${accountId})`);
        this.engine.events.emit("playerDisconnected", { accountId, socketId: socket.id });
      });
    });
    
    // Listen for GameEngine broadcasts to send deltas back
    this.engine.events.on("networkBroadcast", ({ room, event, data }) => {
      if (room) {
        this.io.to(room).emit(event, data);
      } else {
        this.io.emit(event, data);
      }
    });

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
