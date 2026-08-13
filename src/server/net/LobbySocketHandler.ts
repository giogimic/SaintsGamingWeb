/**
 * Saints Gaming — Authoritative Real-Time Lobby & Studio Socket Handler
 *
 * Provides real-time shard management, movement synchronization, local/global/party chat,
 * soft locks for Studio collaboration, and peer presence over Socket.IO.
 */

import type { Server, Socket } from "socket.io";
import {
  toBaseMapId,
  pickPublicShardAssignment,
  type PublicShardCandidate,
} from "@/shared/net/mapIds";

export interface ConnectedPlayer {
  socketId: string;
  accountId: string;
  name: string;
  spriteId: string;
  instanceId: string;
  mapId: string;
  x: number;
  y: number;
  direction: string;
  moving: boolean;
  hp: number;
  maxHp: number;
  joinedAt: number;
}

export interface SoftLock {
  resource: string;
  userId: string;
  displayName: string;
  at: string;
  expiresAt: string;
}

export class LobbySocketHandler {
  private io: Server;
  /** Active players keyed by socket.id */
  private players = new Map<string, ConnectedPlayer>();
  /** Maps accountId -> socket.id for 1-account-1-seat enforcement */
  private accountSockets = new Map<string, string>();
  /** Active rooms: instanceId -> Set of socket.id */
  private roomMembers = new Map<string, Set<string>>();
  /** Soft locks for Studio editing */
  private locks = new Map<string, SoftLock>();

  constructor(io: Server) {
    this.io = io;
    this.attach();
  }

  private attach() {
    this.io.on("connection", (socket: Socket) => {
      const rawToken = String(socket.handshake.auth?.token || socket.handshake.query?.token || "").trim();
      const accountId = rawToken.replace(/^dev:/, "");

      if (accountId) {
        // Enforce 1-account-1-seat: notify previous socket if open
        const existingSocketId = this.accountSockets.get(accountId);
        if (existingSocketId && existingSocketId !== socket.id) {
          const oldSocket = this.io.sockets.sockets.get(existingSocketId);
          if (oldSocket) {
            oldSocket.emit("session_replaced", {
              reason: "Signed in from another window or device.",
            });
            this.handlePlayerLeave(oldSocket, true);
          }
        }
        this.accountSockets.set(accountId, socket.id);
      }

      // --- JOIN MAP ---
      socket.on("join_map", (data: any) => {
        try {
          const playerAccountId = String(data?.accountId || accountId || socket.id);
          const rawMapId = String(data?.mapId || "DEMO_SANDBOX");
          const baseMapId = toBaseMapId(rawMapId) || "DEMO_SANDBOX";
          const isLobby = Boolean(data?.lobby);
          const isPrivate = Boolean(data?.isPrivate);
          const isPie = Boolean(data?.pie);

          let targetInstanceId: string;
          if (isPie) {
            targetInstanceId = `studio_pie_${playerAccountId}`;
          } else if (isPrivate) {
            targetInstanceId = `BASE_${playerAccountId}`;
          } else if (isLobby) {
            // Build shard candidates for this base map
            const candidates: PublicShardCandidate[] = [];
            for (const [instId, members] of this.roomMembers.entries()) {
              if (toBaseMapId(instId) === baseMapId) {
                candidates.push({
                  instanceId: instId,
                  mapId: baseMapId,
                  playerCount: members.size,
                });
              }
            }
            const pick = pickPublicShardAssignment(baseMapId, candidates, 50);
            targetInstanceId = pick.instanceId;
          } else {
            targetInstanceId = `${baseMapId}_ch1`;
          }

          const existingPlayer = this.players.get(socket.id);
          const isSoftRejoin = existingPlayer && existingPlayer.instanceId === targetInstanceId;

          const player: ConnectedPlayer = {
            socketId: socket.id,
            accountId: playerAccountId,
            name: String(data?.name || existingPlayer?.name || "Player"),
            spriteId: String(data?.spriteId || existingPlayer?.spriteId || "adventurer"),
            instanceId: targetInstanceId,
            mapId: baseMapId,
            x: typeof data?.x === "number" ? data.x : existingPlayer?.x ?? 14,
            y: typeof data?.y === "number" ? data.y : existingPlayer?.y ?? 15,
            direction: String(data?.direction || existingPlayer?.direction || "down"),
            moving: false,
            hp: typeof data?.hp === "number" ? data.hp : existingPlayer?.hp ?? 100,
            maxHp: typeof data?.maxHp === "number" ? data.maxHp : existingPlayer?.maxHp ?? 100,
            joinedAt: existingPlayer?.joinedAt ?? Date.now(),
          };

          if (!isSoftRejoin && existingPlayer) {
            // Player changed instances — leave old room
            this.leaveRoom(socket, existingPlayer.instanceId);
          }

          this.players.set(socket.id, player);
          this.joinRoom(socket, targetInstanceId);

          // 1. Send confirmation to joining client
          socket.emit("map_joined", {
            instanceId: targetInstanceId,
            mapId: baseMapId,
            x: player.x,
            y: player.y,
          });

          // 2. Gather peers in the target instance
          const peersRecord: Record<string, ConnectedPlayer> = {};
          const room = this.roomMembers.get(targetInstanceId);
          if (room) {
            for (const memberId of room) {
              if (memberId !== socket.id) {
                const peer = this.players.get(memberId);
                if (peer) {
                  peersRecord[memberId] = peer;
                }
              }
            }
          }
          socket.emit("map_players", peersRecord);

          // 3. Broadcast to peers in that shard
          socket.to(targetInstanceId).emit("player_joined", {
            socketId: player.socketId,
            accountId: player.accountId,
            name: player.name,
            spriteId: player.spriteId,
            x: player.x,
            y: player.y,
            direction: player.direction,
            hp: player.hp,
            maxHp: player.maxHp,
          });
        } catch (err) {
          console.error("[LobbySocket] join_map error:", err);
        }
      });

      // --- MOVEMENT ---
      socket.on("move", (data: any) => {
        try {
          const player = this.players.get(socket.id);
          if (!player) return;

          if (typeof data?.x === "number") player.x = data.x;
          if (typeof data?.y === "number") player.y = data.y;
          if (typeof data?.direction === "string") player.direction = data.direction;
          player.moving = Boolean(data?.moving);

          // Broadcast to other players in shard
          socket.to(player.instanceId).emit("player_moved", {
            socketId: socket.id,
            x: player.x,
            y: player.y,
            direction: player.direction,
            moving: player.moving,
          });

          // Acknowledge position to client
          socket.emit("move_ack", {
            x: player.x,
            y: player.y,
          });
        } catch (err) {
          console.error("[LobbySocket] move error:", err);
        }
      });

      // --- LOCAL CHAT ---
      socket.on("chat_message", (text: unknown) => {
        try {
          const msg = typeof text === "string" ? text.trim() : "";
          if (!msg) return;
          const player = this.players.get(socket.id);
          const senderName = player?.name || "Player";
          const instanceId = player?.instanceId;

          const payload = {
            socketId: socket.id,
            sender: senderName,
            message: msg,
            timestamp: Date.now(),
            channel: "LOCAL",
          };

          if (instanceId) {
            this.io.to(instanceId).emit("player_chat", payload);
          } else {
            socket.emit("player_chat", payload);
          }
        } catch (err) {
          console.error("[LobbySocket] chat_message error:", err);
        }
      });

      // --- GLOBAL CHAT ---
      socket.on("global_chat", (text: unknown) => {
        try {
          const msg = typeof text === "string" ? text.trim() : "";
          if (!msg) return;
          const player = this.players.get(socket.id);
          const senderName = player?.name || "Player";

          this.io.emit("global_chat_msg", {
            socketId: socket.id,
            sender: senderName,
            message: msg,
            timestamp: Date.now(),
          });
        } catch (err) {
          console.error("[LobbySocket] global_chat error:", err);
        }
      });

      // --- PARTY CHAT ---
      socket.on("party_chat", (text: unknown) => {
        try {
          const msg = typeof text === "string" ? text.trim() : "";
          if (!msg) return;
          const player = this.players.get(socket.id);
          const senderName = player?.name || "Player";
          const instanceId = player?.instanceId;

          const payload = {
            socketId: socket.id,
            sender: senderName,
            message: msg,
            timestamp: Date.now(),
          };

          if (instanceId) {
            this.io.to(instanceId).emit("party_chat_msg", payload);
          } else {
            socket.emit("party_chat_msg", payload);
          }
        } catch (err) {
          console.error("[LobbySocket] party_chat error:", err);
        }
      });

      // --- STAFF ANNOUNCEMENTS ---
      socket.on("staff_announce", (msg: unknown) => {
        try {
          const text = typeof msg === "string" ? msg.trim() : "";
          if (!text) return;
          const player = this.players.get(socket.id);
          this.io.emit("player_chat", {
            socketId: "STAFF",
            sender: `[STAFF] ${player?.name || "Admin"}`,
            message: text,
            channel: "SYSTEM",
            timestamp: Date.now(),
          });
        } catch (err) {
          console.error("[LobbySocket] staff_announce error:", err);
        }
      });

      // --- PARTY INVITE ---
      socket.on("party_invite", (data: { toAccountId?: string; toName?: string }) => {
        try {
          const player = this.players.get(socket.id);
          if (!player) return;

          let targetSocketId: string | undefined;
          if (data?.toAccountId) {
            targetSocketId = this.accountSockets.get(data.toAccountId);
          }
          if (!targetSocketId && data?.toName) {
            for (const [sId, p] of this.players.entries()) {
              if (p.name.toLowerCase() === data.toName.toLowerCase()) {
                targetSocketId = sId;
                break;
              }
            }
          }

          if (targetSocketId) {
            this.io.to(targetSocketId).emit("party_invite", {
              fromName: player.name,
              fromAccountId: player.accountId,
            });
          }
        } catch (err) {
          console.error("[LobbySocket] party_invite error:", err);
        }
      });

      // --- STUDIO SOFT LOCKS ---
      socket.on("studio_lock", (data: SoftLock) => {
        if (!data?.resource) return;
        this.locks.set(data.resource, data);
        this.io.emit("studio_lock", data);
      });

      socket.on("studio_unlock", (data: { resource: string }) => {
        if (!data?.resource) return;
        this.locks.delete(data.resource);
        this.io.emit("studio_unlock", data);
      });

      // --- CONTENT RELOAD (Map saves) ---
      socket.on("content_reload", (data: any) => {
        this.io.emit("content_reload", data);
      });

      // --- DISCONNECT ---
      socket.on("disconnect", () => {
        this.handlePlayerLeave(socket, false);
      });
    });
  }

  private joinRoom(socket: Socket, instanceId: string) {
    socket.join(instanceId);
    let members = this.roomMembers.get(instanceId);
    if (!members) {
      members = new Set<string>();
      this.roomMembers.set(instanceId, members);
    }
    members.add(socket.id);
  }

  private leaveRoom(socket: Socket, instanceId: string) {
    socket.leave(instanceId);
    const members = this.roomMembers.get(instanceId);
    if (members) {
      members.delete(socket.id);
      if (members.size === 0) {
        this.roomMembers.delete(instanceId);
      }
    }
    socket.to(instanceId).emit("player_left", { socketId: socket.id });
    socket.to(instanceId).emit("player_left", socket.id);
  }

  private handlePlayerLeave(socket: Socket, replaced: boolean) {
    const player = this.players.get(socket.id);
    if (player) {
      this.leaveRoom(socket, player.instanceId);
      this.players.delete(socket.id);
    }
    if (!replaced && player?.accountId) {
      if (this.accountSockets.get(player.accountId) === socket.id) {
        this.accountSockets.delete(player.accountId);
      }
    }
  }
}
