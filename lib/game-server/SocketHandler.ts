import { Server, Socket } from "socket.io";
import { GameEngine } from "./GameEngine";
import { PlayerInput } from "./types";

export class SocketHandler {
  constructor(private io: Server, private engine: GameEngine) {}

  public initialize() {
    this.io.on("connection", (socket: Socket) => {
      console.log(`[Socket] Client connected: ${socket.id}`);
      
      // Temporary auth placeholder (later uses genuine Account ID)
      const accountId = `acc_${socket.id}`;
      
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

      socket.on("capture_attempt", (data) => {
        // data: { battleId, targetId, item }
        this.engine.events.emit("combatRequestCapture", {
          battleId: data.battleId,
          entityId: `player_${accountId}`,
          targetId: data.targetId,
          item: data.item
        });
      });

      socket.on("disconnect", () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
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
