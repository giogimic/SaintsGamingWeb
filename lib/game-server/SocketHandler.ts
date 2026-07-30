import { Server, Socket } from "socket.io";
import { GameEngine } from "./GameEngine";
import { PlayerInput } from "./types";

export class SocketHandler {
  constructor(private io: Server, private engine: GameEngine) {}

  public initialize() {
    this.io.on("connection", (socket: Socket) => {
      console.log(`[Socket] Client connected: ${socket.id}`);
      
      // Maintain a map of socket.id -> accountId for this connection
      let accountId = `acc_${socket.id}`;
      
      // We do not store game state here. The socket only communicates.
      
      socket.on("join_map", (data) => {
        if (data.accountId) {
          accountId = data.accountId;
        }
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
