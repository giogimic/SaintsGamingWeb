/**
 * Saints Gaming — Authoritative Real-Time Lobby & Studio Socket Handler
 *
 * Coordinates modular realtime services (Session, Shard, Studio Collaboration, Chat)
 * to provide authoritative multiplayer synchronization, presence, and map editing.
 */

import type { Server, Socket } from "socket.io";
import { toBaseMapId, isDungeonInstanceId } from "../../shared/net/mapIds";
import {
  REALTIME_PROTOCOL_VERSION,
  RealtimeEvents,
  type StudioSoftLock,
  type StudioTileChangeOp,
  type WhisperCommand,
  type PaintTilesCommand,
  type TestRuleCommand,
  type RuleTracePayload,
} from "../../shared/net/protocol";
import { evaluateAndExecuteRule, type RuleDefinition, type RuleEvaluationContext } from "../../shared/game/rules/ruleEngine";
import { DungeonInstanceManager } from "../../shared/game/instances/dungeonInstanceManager";
import { SessionManager } from "./SessionManager";
import { ShardManager } from "./ShardManager";
import { StudioCollaborationService } from "./StudioCollaborationService";
import { ChatService } from "./ChatService";

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

export class LobbySocketHandler {
  private io: Server;
  private sessions = new SessionManager();
  private shards = new ShardManager();
  private studio = new StudioCollaborationService();
  private chat = new ChatService();
  private dungeonManager = new DungeonInstanceManager();

  constructor(io: Server) {
    this.io = io;
    this.attach();
  }

  public getDungeonManager(): DungeonInstanceManager {
    return this.dungeonManager;
  }

  private attach() {
    this.io.on("connection", (socket: Socket) => {
      const rawToken = String(socket.handshake.auth?.token || socket.handshake.query?.token || "").trim();
      const accountId = rawToken.replace(/^dev:/, "");

      if (accountId) {
        // Enforce 1-account-1-seat
        const evictedSocketId = this.sessions.registerSession(socket, accountId);
        if (evictedSocketId) {
          const oldSocket = this.io.sockets.sockets.get(evictedSocketId);
          if (oldSocket) {
            oldSocket.emit(RealtimeEvents.SESSION_REPLACED, {
              reason: "Signed in from another window or device.",
            });
            this.handlePlayerDisconnect(oldSocket, true);
          }
        }
      }

      // --- HEARTBEAT & DIAGNOSTICS ---
      socket.on(RealtimeEvents.PING, (data: { clientTime?: number }) => {
        this.sessions.touchHeartbeat(socket.id);
        socket.emit(RealtimeEvents.PONG, {
          clientTime: data?.clientTime,
          serverTime: Date.now(),
          protocolVersion: REALTIME_PROTOCOL_VERSION,
        });
      });

      // --- JOIN MAP ---
      socket.on(RealtimeEvents.JOIN_MAP, (data: any) => {
        try {
          const playerAccountId = String(data?.accountId || accountId || socket.id);
          const rawMapId = String(data?.mapId || "DEMO_SANDBOX");
          const baseMapId = toBaseMapId(rawMapId) || "DEMO_SANDBOX";
          const isLobby = Boolean(data?.lobby);
          const isPrivate = Boolean(data?.isPrivate);
          const isPie = Boolean(data?.pie);
          const isDungeon = isDungeonInstanceId(rawMapId);

          const targetInstanceId = isDungeon
            ? rawMapId
            : this.shards.resolveInstanceId(baseMapId, playerAccountId, {
                isLobby,
                isPrivate,
                pie: isPie,
              });

          const existingPlayer = this.shards.getPlayer(socket.id);
          const isSoftRejoin = existingPlayer && existingPlayer.instanceId === targetInstanceId;

          const player: ConnectedPlayer = {
            socketId: socket.id,
            accountId: playerAccountId,
            name: String(data?.name || existingPlayer?.name || "Player"),
            spriteId: String(data?.assetProfileId || data?.spriteId || existingPlayer?.spriteId || "adventurer"),
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

          const joinResult = this.shards.joinShard(player);

          if (joinResult.previousInstanceId) {
            socket.leave(joinResult.previousInstanceId);
            socket.to(joinResult.previousInstanceId).emit(RealtimeEvents.PLAYER_LEFT, { socketId: socket.id });
            socket.to(joinResult.previousInstanceId).emit(RealtimeEvents.PLAYER_LEFT, socket.id);
          }

          socket.join(targetInstanceId);

          // Join connected adjacent neighbor shards for cross-border multiplayer visibility
          const peers = this.shards.getPeersInShard(targetInstanceId, socket.id);
          if (Array.isArray(data?.neighborMapIds)) {
            for (const nMapId of data.neighborMapIds) {
              const nBase = toBaseMapId(nMapId);
              if (nBase && nBase !== baseMapId) {
                const nInst = this.shards.resolveInstanceId(nBase, playerAccountId, {
                  isLobby,
                  isPrivate,
                  pie: isPie,
                });
                socket.join(nInst);
                const nPeers = this.shards.getPeersInShard(nInst, socket.id);
                for (const [pId, peer] of Object.entries(nPeers)) {
                  peers[pId] = peer;
                }
              }
            }
          }

          // 1. Send authoritative confirmation
          socket.emit(RealtimeEvents.MAP_JOINED, {
            instanceId: targetInstanceId,
            mapId: baseMapId,
            x: player.x,
            y: player.y,
            revision: this.studio.getRevision(baseMapId),
            protocolVersion: REALTIME_PROTOCOL_VERSION,
          });

          // 2. Send snapshot of existing peers
          socket.emit(RealtimeEvents.MAP_PLAYERS, peers);

          // 3. Replicate new player to shard peers
          if (!isSoftRejoin) {
            socket.to(targetInstanceId).emit(RealtimeEvents.PLAYER_JOINED, {
              socketId: player.socketId,
              accountId: player.accountId,
              name: player.name,
              spriteId: player.spriteId,
              assetProfileId: player.spriteId,
              mapId: player.mapId,
              x: player.x,
              y: player.y,
              direction: player.direction,
              hp: player.hp,
              maxHp: player.maxHp,
            });
          }
        } catch (err) {
          console.error("[LobbySocket] join_map error:", err);
        }
      });

      // --- MOVEMENT ---
      const handleMove = (data: any) => {
        try {
          const current = this.shards.getPlayer(socket.id);
          let x = typeof data?.x === "number" ? data.x : (current?.x ?? 0);
          let y = typeof data?.y === "number" ? data.y : (current?.y ?? 0);
          let direction = typeof data?.direction === "string" ? data.direction : (current?.direction || "down");
          let moving = data?.moving !== undefined ? Boolean(data?.moving) : true;

          // If payload is { type: "MOVE", direction: "...", sequence: ... }
          if (data?.type === "MOVE" && data?.direction) {
            direction = data.direction;
            const dx = direction === "left" ? -1 : direction === "right" ? 1 : 0;
            const dy = direction === "up" ? -1 : direction === "down" ? 1 : 0;
            x = (current?.x ?? 0) + dx;
            y = (current?.y ?? 0) + dy;
            moving = true;
          }

          const player = this.shards.updatePlayerPosition(socket.id, x, y, direction, moving);
          if (!player) return;

          socket.to(player.instanceId).emit(RealtimeEvents.PLAYER_MOVED, {
            socketId: socket.id,
            mapId: player.mapId,
            x: player.x,
            y: player.y,
            direction: player.direction,
            moving: player.moving,
            seq: data?.seq || data?.sequence,
          });

          socket.emit(RealtimeEvents.MOVE_ACK, {
            x: player.x,
            y: player.y,
            seq: data?.seq || data?.sequence,
            requestId: data?.requestId,
          });
        } catch (err) {
          console.error("[LobbySocket] move error:", err);
        }
      };

      socket.on(RealtimeEvents.MOVE, handleMove);
      socket.on("player_move", handleMove);
      socket.on("input", handleMove);

      // --- CHAT: LOCAL ---
      socket.on(RealtimeEvents.CHAT_MESSAGE, (text: unknown) => {
        try {
          const player = this.shards.getPlayer(socket.id);
          const result = this.chat.validateAndFormatMessage(
            socket.id,
            player?.name || "Player",
            text,
            "LOCAL"
          );
          if (!result.ok || !result.payload) return;

          if (player?.instanceId) {
            this.io.to(player.instanceId).emit(RealtimeEvents.PLAYER_CHAT, {
              ...result.payload,
              accountId: player.accountId || accountId || undefined,
            });
          } else {
            socket.emit(RealtimeEvents.PLAYER_CHAT, {
              ...result.payload,
              accountId: player?.accountId || accountId || undefined,
            });
          }
        } catch (err) {
          console.error("[LobbySocket] chat_message error:", err);
        }
      });

      // --- CHAT: GLOBAL ---
      socket.on(RealtimeEvents.GLOBAL_CHAT, (text: unknown) => {
        try {
          const player = this.shards.getPlayer(socket.id);
          const result = this.chat.validateAndFormatMessage(
            socket.id,
            player?.name || "Player",
            text,
            "GLOBAL"
          );
          if (!result.ok || !result.payload) return;

          this.io.emit(RealtimeEvents.GLOBAL_CHAT_MSG, {
            socketId: socket.id,
            accountId: player?.accountId || accountId || undefined,
            sender: result.payload.sender,
            message: result.payload.message,
            timestamp: result.payload.timestamp,
          });
        } catch (err) {
          console.error("[LobbySocket] global_chat error:", err);
        }
      });

      // --- CHAT: PARTY ---
      socket.on(RealtimeEvents.PARTY_CHAT, (text: unknown) => {
        try {
          const player = this.shards.getPlayer(socket.id);
          const result = this.chat.validateAndFormatMessage(
            socket.id,
            player?.name || "Player",
            text,
            "PARTY"
          );
          if (!result.ok || !result.payload) return;

          if (player?.instanceId) {
            this.io.to(player.instanceId).emit(RealtimeEvents.PARTY_CHAT_MSG, {
              socketId: socket.id,
              sender: result.payload.sender,
              message: result.payload.message,
              timestamp: result.payload.timestamp,
            });
          }
        } catch (err) {
          console.error("[LobbySocket] party_chat error:", err);
        }
      });

      // --- CHAT: WHISPER ---
      socket.on(RealtimeEvents.WHISPER, (cmd: WhisperCommand) => {
        try {
          const player = this.shards.getPlayer(socket.id);
          const result = this.chat.validateAndFormatMessage(
            socket.id,
            player?.name || "Player",
            cmd?.message,
            "WHISPER",
            cmd?.toPlayerName
          );
          if (!result.ok || !result.payload) return;

          // Find target recipient socket
          let targetSocketId: string | undefined;
          for (const inst of this.shards.getAllActiveInstances()) {
            for (const memberId of inst.members) {
              const p = this.shards.getPlayer(memberId);
              if (p && p.name.toLowerCase() === (cmd?.toPlayerName || "").toLowerCase()) {
                targetSocketId = memberId;
                break;
              }
            }
            if (targetSocketId) break;
          }

          if (targetSocketId) {
            this.io.to(targetSocketId).emit(RealtimeEvents.WHISPER_MSG, result.payload);
            socket.emit(RealtimeEvents.WHISPER_MSG, result.payload);
          } else {
            socket.emit(RealtimeEvents.PLAYER_CHAT, {
              socketId: "SYSTEM",
              sender: "System",
              message: `Player "${cmd?.toPlayerName}" is not online.`,
              channel: "SYSTEM",
              timestamp: Date.now(),
            });
          }
        } catch (err) {
          console.error("[LobbySocket] whisper error:", err);
        }
      });

      // --- STAFF ANNOUNCEMENTS ---
      socket.on(RealtimeEvents.STAFF_ANNOUNCE, (msg: unknown) => {
        try {
          const text = typeof msg === "string" ? msg.trim() : "";
          if (!text) return;
          const player = this.shards.getPlayer(socket.id);
          this.io.emit(RealtimeEvents.PLAYER_CHAT, {
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

      // --- STUDIO: SOFT LOCKS ---
      socket.on(RealtimeEvents.STUDIO_LOCK, (data: StudioSoftLock) => {
        if (!data?.resource) return;
        const result = this.studio.acquireLock(data);
        if (result.success) {
          this.io.emit(RealtimeEvents.STUDIO_LOCK, result.activeLock);
        }
      });

      socket.on(RealtimeEvents.STUDIO_UNLOCK, (data: { resource: string; userId?: string }) => {
        if (!data?.resource) return;
        const uid = data.userId || accountId || socket.id;
        const released = this.studio.releaseLock(data.resource, uid);
        if (released) {
          this.io.emit(RealtimeEvents.STUDIO_UNLOCK, { resource: data.resource });
        }
      });

      // --- STUDIO: TILE EDITING ---
      socket.on(RealtimeEvents.PAINT_TILES, (cmd: PaintTilesCommand) => {
        try {
          if (!cmd?.mapId || !Array.isArray(cmd?.ops) || cmd.ops.length === 0) return;
          const player = this.shards.getPlayer(socket.id);
          const authorId = player?.accountId || accountId || socket.id;
          const authorName = player?.name || "Editor";

          const broadcast = this.studio.applyTileChanges(cmd.mapId, cmd.ops, authorId, authorName);
          this.io.emit(RealtimeEvents.TILE_CHANGED, broadcast);
        } catch (err) {
          console.error("[LobbySocket] paint_tiles error:", err);
        }
      });

      // --- CONTENT RELOAD ---
      socket.on(RealtimeEvents.CONTENT_RELOAD, (data: any) => {
        this.io.emit(RealtimeEvents.CONTENT_RELOAD, data);
      });

      // --- DUNGEON & INSTANCING ---
      socket.on(RealtimeEvents.DUNGEON_CREATE, (data: any) => {
        try {
          const player = this.shards.getPlayer(socket.id);
          const leaderId = player?.accountId || accountId || socket.id;
          const dungeonSlug = String(data?.dungeonSlug || "dungeon_shadow_crypt");
          const baseMapId = String(data?.baseMapId || "DUNGEON_SHADOW_CRYPT");
          const partyId = String(data?.partyId || `party_${leaderId}`);
          const partyMembers: string[] = Array.isArray(data?.partyMembers) && data.partyMembers.length > 0
            ? data.partyMembers
            : [leaderId];
          const objectives = Array.isArray(data?.objectives) ? data.objectives : [];
          const durationMinutes = typeof data?.durationMinutes === "number" ? data.durationMinutes : 60;

          const instance = this.dungeonManager.createInstance({
            dungeonSlug,
            baseMapId,
            partyId,
            leaderId,
            partyMembers,
            durationMinutes,
            objectives,
          });

          // Warp the creator
          socket.emit(RealtimeEvents.DUNGEON_WARP, {
            instanceId: instance.instanceId,
            baseMapId: instance.baseMapId,
            dungeonSlug: instance.dungeonSlug,
            spawnPoint: { x: 12, y: 2 },
          });

          // Warp all party members in the session pool
          for (const memberId of partyMembers) {
            const memberSocketId = this.sessions.getSocketId(memberId);
            if (memberSocketId && memberSocketId !== socket.id) {
              this.io.to(memberSocketId).emit(RealtimeEvents.DUNGEON_WARP, {
                instanceId: instance.instanceId,
                baseMapId: instance.baseMapId,
                dungeonSlug: instance.dungeonSlug,
                spawnPoint: { x: 12, y: 2 },
              });
            }
          }
        } catch (err) {
          console.error("[LobbySocket] dungeon_create error:", err);
        }
      });

      socket.on(RealtimeEvents.DUNGEON_OBJECTIVE_UPDATE, (data: any) => {
        try {
          const instanceId = String(data?.instanceId || "");
          const objectiveKey = String(data?.objectiveKey || "");
          const amount = typeof data?.amount === "number" ? data.amount : 1;

          if (!instanceId || !objectiveKey) return;

          const success = this.dungeonManager.updateObjective(instanceId, objectiveKey, amount);
          const inst = this.dungeonManager.getInstance(instanceId);
          if (success && inst) {
            this.io.to(instanceId).emit(RealtimeEvents.DUNGEON_OBJECTIVE_UPDATE, {
              instanceId,
              objectiveKey,
              current: inst.objectives[objectiveKey]?.current,
              required: inst.objectives[objectiveKey]?.required,
              isCompleted: inst.isCompleted,
            });

            if (inst.isCompleted) {
              this.io.to(instanceId).emit(RealtimeEvents.DUNGEON_COMPLETED, {
                instanceId,
                dungeonSlug: inst.dungeonSlug,
                clearedAt: Date.now(),
              });
            }
          }
        } catch (err) {
          console.error("[LobbySocket] dungeon_objective_update error:", err);
        }
      });

      // --- STUDIO: RULE TESTING SANDBOX ---
      socket.on(RealtimeEvents.STUDIO_TEST_RULE, (cmd: TestRuleCommand & { ruleDef?: RuleDefinition }) => {
        try {
          if (!cmd || !cmd.ruleDef) return;

          // Build a mock sandbox context for the rule evaluation
          const mockContext: RuleEvaluationContext = {
            player: cmd.mockContext?.player || { level: 1, gold: 0, items: {}, skills: {}, reputation: {}, quests: {} },
            worldState: cmd.mockContext?.worldState || {},
            timeSlot: cmd.mockContext?.timeSlot || "DAY",
            customPredicates: cmd.mockContext?.customPredicates || {},
            tracer: (trace: RuleTracePayload) => {
              socket.emit(RealtimeEvents.RULE_TRACE, trace);
            },
          };

          // Evaluate the rule safely on the server
          evaluateAndExecuteRule(cmd.ruleDef, mockContext);
        } catch (err) {
          console.error("[LobbySocket] studio_test_rule error:", err);
          socket.emit(RealtimeEvents.RULE_TRACE, {
            ruleId: cmd.ruleId || "unknown",
            nodeType: "ERROR",
            expected: "Execution",
            actual: String(err),
            passed: false,
            timestamp: Date.now(),
          });
        }
      });

      // --- RESYNC REQUEST ---
      socket.on(RealtimeEvents.RESYNC_REQUEST, (data: { instanceId?: string; mapId?: string }) => {
        const instId = data?.instanceId || this.shards.getPlayer(socket.id)?.instanceId;
        if (!instId) return;
        const peers = this.shards.getPeersInShard(instId);
        const mapId = toBaseMapId(data?.mapId || instId);
        socket.emit(RealtimeEvents.RESYNC_STATE, {
          instanceId: instId,
          mapId,
          revision: this.studio.getRevision(mapId),
          players: peers,
          locks: this.studio.getAllLocks(),
        });
      });

      // --- DISCONNECT ---
      socket.on("disconnect", () => {
        this.handlePlayerDisconnect(socket, false);
      });
    });
  }

  private handlePlayerDisconnect(socket: Socket, replaced: boolean) {
    const leaveResult = this.shards.leaveShard(socket.id);
    if (leaveResult) {
      socket.leave(leaveResult.instanceId);
      socket.to(leaveResult.instanceId).emit(RealtimeEvents.PLAYER_LEFT, { socketId: socket.id });
      socket.to(leaveResult.instanceId).emit(RealtimeEvents.PLAYER_LEFT, socket.id);
    }
    this.chat.cleanSocket(socket.id);
    if (!replaced) {
      this.sessions.removeSession(socket.id);
    }
  }

  public getSessionManager(): SessionManager {
    return this.sessions;
  }

  public getShardManager(): ShardManager {
    return this.shards;
  }

  public getStudioService(): StudioCollaborationService {
    return this.studio;
  }
}
