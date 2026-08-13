import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createServer, type Server as HttpServer } from "http";
import { Server } from "socket.io";
import { io as ClientSocket, type Socket as ClientSocketType } from "socket.io-client";
import { LobbySocketHandler } from "./LobbySocketHandler";
import { SessionManager } from "./SessionManager";
import { ShardManager } from "./ShardManager";
import { StudioCollaborationService } from "./StudioCollaborationService";
import { ChatService } from "./ChatService";
import { REALTIME_PROTOCOL_VERSION, RealtimeEvents } from "../../shared/net/protocol";

describe("Realtime Modular Services", () => {
  describe("SessionManager", () => {
    let sessionMgr: SessionManager;

    beforeEach(() => {
      sessionMgr = new SessionManager();
    });

    it("registers new session and enforces 1-account-1-seat by evicting older socket", () => {
      const dummySocket1 = { id: "sock_1", handshake: { address: "127.0.0.1" } } as any;
      const dummySocket2 = { id: "sock_2", handshake: { address: "127.0.0.1" } } as any;

      const evictedFirst = sessionMgr.registerSession(dummySocket1, "user_abc");
      expect(evictedFirst).toBeNull();
      expect(sessionMgr.getSocketId("user_abc")).toBe("sock_1");

      // Register same account on a second socket
      const evictedSecond = sessionMgr.registerSession(dummySocket2, "user_abc");
      expect(evictedSecond).toBe("sock_1");
      expect(sessionMgr.getSocketId("user_abc")).toBe("sock_2");
      expect(sessionMgr.getAccountId("sock_1")).toBeUndefined();
      expect(sessionMgr.getAccountId("sock_2")).toBe("user_abc");
    });
  });

  describe("ShardManager", () => {
    let shardMgr: ShardManager;

    beforeEach(() => {
      shardMgr = new ShardManager();
    });

    it("resolves correct shard instance ids for public, private, and PIE", () => {
      const publicId = shardMgr.resolveInstanceId("DEMO_SANDBOX", "acc_1", { isLobby: true });
      expect(publicId).toBe("DEMO_SANDBOX_ch1");

      const pieId = shardMgr.resolveInstanceId("DEMO_SANDBOX", "acc_1", { pie: true });
      expect(pieId).toBe("studio_pie_acc_1");

      const privateId = shardMgr.resolveInstanceId("DEMO_SANDBOX", "acc_1", { isPrivate: true });
      expect(privateId).toBe("BASE_acc_1");
    });

    it("tracks players, positions, and peer snapshots in shards", () => {
      const p1 = {
        socketId: "s1",
        accountId: "a1",
        name: "Alice",
        spriteId: "hero1",
        instanceId: "DEMO_SANDBOX_ch1",
        mapId: "DEMO_SANDBOX",
        x: 10,
        y: 12,
        direction: "down",
        moving: false,
        hp: 100,
        maxHp: 100,
        joinedAt: Date.now(),
      };

      const p2 = {
        socketId: "s2",
        accountId: "a2",
        name: "Bob",
        spriteId: "hero2",
        instanceId: "DEMO_SANDBOX_ch1",
        mapId: "DEMO_SANDBOX",
        x: 14,
        y: 15,
        direction: "up",
        moving: false,
        hp: 100,
        maxHp: 100,
        joinedAt: Date.now(),
      };

      shardMgr.joinShard(p1);
      shardMgr.joinShard(p2);

      const peersOfP1 = shardMgr.getPeersInShard("DEMO_SANDBOX_ch1", "s1");
      expect(peersOfP1["s2"]).toBeDefined();
      expect(peersOfP1["s2"].name).toBe("Bob");
      expect(peersOfP1["s1"]).toBeUndefined();

      shardMgr.updatePlayerPosition("s1", 11, 12, "right", true);
      expect(shardMgr.getPlayer("s1")?.x).toBe(11);
      expect(shardMgr.getPlayer("s1")?.moving).toBe(true);

      shardMgr.leaveShard("s2");
      const peersAfterLeave = shardMgr.getPeersInShard("DEMO_SANDBOX_ch1", "s1");
      expect(peersAfterLeave["s2"]).toBeUndefined();
    });
  });

  describe("StudioCollaborationService", () => {
    let studioService: StudioCollaborationService;

    beforeEach(() => {
      studioService = new StudioCollaborationService();
    });

    it("acquires, protects, and releases soft locks with ownership check", () => {
      const lock1 = {
        resource: "map_DEMO_SANDBOX",
        userId: "user_1",
        displayName: "Editor Alice",
        at: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10000).toISOString(),
      };

      const res1 = studioService.acquireLock(lock1);
      expect(res1.success).toBe(true);

      // User 2 attempts to acquire same resource
      const lock2 = {
        resource: "map_DEMO_SANDBOX",
        userId: "user_2",
        displayName: "Editor Bob",
        at: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10000).toISOString(),
      };
      const res2 = studioService.acquireLock(lock2);
      expect(res2.success).toBe(false);

      // User 2 cannot release user 1's lock
      expect(studioService.releaseLock("map_DEMO_SANDBOX", "user_2")).toBe(false);

      // User 1 releases lock
      expect(studioService.releaseLock("map_DEMO_SANDBOX", "user_1")).toBe(true);
    });

    it("increments map revisions on tile changes", () => {
      expect(studioService.getRevision("MAP_A")).toBe(1);

      const op = { r: 5, c: 5, layerIdx: 0, before: 1, after: 17 };
      const broadcast = studioService.applyTileChanges("MAP_A", [op], "user_1", "Alice");

      expect(broadcast.revision).toBe(2);
      expect(studioService.getRevision("MAP_A")).toBe(2);
      expect(broadcast.ops.length).toBe(1);
    });
  });

  describe("ChatService", () => {
    let chatService: ChatService;

    beforeEach(() => {
      chatService = new ChatService();
    });

    it("validates length and rejects oversized or empty messages", () => {
      const empty = chatService.validateAndFormatMessage("s1", "Alice", "   ", "LOCAL");
      expect(empty.ok).toBe(false);

      const huge = chatService.validateAndFormatMessage("s1", "Alice", "a".repeat(501), "LOCAL");
      expect(huge.ok).toBe(false);

      const valid = chatService.validateAndFormatMessage("s1", "Alice", "Hello World!", "LOCAL");
      expect(valid.ok).toBe(true);
      expect(valid.payload?.message).toBe("Hello World!");
    });

    it("enforces rate limits on rapid message bursts", () => {
      for (let i = 0; i < 5; i++) {
        const res = chatService.validateAndFormatMessage("s1", "Alice", `Message ${i}`, "LOCAL");
        expect(res.ok).toBe(true);
      }

      // 6th message in window should be rate limited
      const limited = chatService.validateAndFormatMessage("s1", "Alice", "Spam", "LOCAL");
      expect(limited.ok).toBe(false);
      expect(limited.error).toContain("Rate limit");
    });
  });
});

describe("LobbySocketHandler Full In-Memory Integration", () => {
  let httpServer: HttpServer;
  let ioServer: Server;
  let handler: LobbySocketHandler;
  let port: number;

  beforeEach(async () => {
    httpServer = createServer();
    ioServer = new Server(httpServer, {
      cors: { origin: "*" },
    });
    handler = new LobbySocketHandler(ioServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const addr = httpServer.address();
        port = typeof addr === "object" && addr ? addr.port : 3000;
        resolve();
      });
    });
  });

  afterEach(async () => {
    ioServer.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  function createClient(accountId: string): Promise<ClientSocketType> {
    return new Promise((resolve, reject) => {
      const client = ClientSocket(`http://localhost:${port}`, {
        transports: ["websocket"],
        auth: { token: accountId },
        timeout: 5000,
      });
      client.on("connect", () => resolve(client));
      client.on("connect_error", (err) => reject(err));
    });
  }

  it("handles ping/pong diagnostics with protocol version", async () => {
    const client = await createClient("diag_user");
    const pongPromise = new Promise<any>((resolve) => {
      client.once(RealtimeEvents.PONG, resolve);
    });

    client.emit(RealtimeEvents.PING, { clientTime: 123456 });
    const pong = await pongPromise;

    expect(pong.clientTime).toBe(123456);
    expect(pong.protocolVersion).toBe(REALTIME_PROTOCOL_VERSION);
    client.disconnect();
  });

  it("replicates players, movement, and local chat across shard peers", async () => {
    const clientA = await createClient("user_a");
    const clientB = await createClient("user_b");

    // Client A joins map
    const joinAPromise = new Promise<any>((resolve) => {
      clientA.once(RealtimeEvents.MAP_JOINED, resolve);
    });
    clientA.emit(RealtimeEvents.JOIN_MAP, {
      mapId: "DEMO_SANDBOX",
      lobby: true,
      name: "Alice",
      x: 10,
      y: 10,
    });
    const mapA = await joinAPromise;
    expect(mapA.instanceId).toBe("DEMO_SANDBOX_ch1");

    // Client A listens for Client B's arrival
    const aSawBPromise = new Promise<any>((resolve) => {
      clientA.once(RealtimeEvents.PLAYER_JOINED, resolve);
    });

    // Client B joins map
    const peersOnBPromise = new Promise<any>((resolve) => {
      clientB.once(RealtimeEvents.MAP_PLAYERS, resolve);
    });
    clientB.emit(RealtimeEvents.JOIN_MAP, {
      mapId: "DEMO_SANDBOX",
      lobby: true,
      name: "Bob",
      x: 12,
      y: 10,
    });

    const [peerJoinedOnA, peersOnB] = await Promise.all([aSawBPromise, peersOnBPromise]);
    expect(peerJoinedOnA.name).toBe("Bob");
    expect(Object.keys(peersOnB).length).toBe(1);
    expect(peersOnB[clientA.id!].name).toBe("Alice");

    // Client A moves -> Client B receives player_moved
    const bSawMovePromise = new Promise<any>((resolve) => {
      clientB.once(RealtimeEvents.PLAYER_MOVED, resolve);
    });
    clientA.emit(RealtimeEvents.MOVE, { x: 11, y: 10, direction: "right", moving: true });
    const moveOnB = await bSawMovePromise;
    expect(moveOnB.x).toBe(11);
    expect(moveOnB.socketId).toBe(clientA.id);

    // Client A chats -> Client B receives player_chat
    const bSawChatPromise = new Promise<any>((resolve) => {
      clientB.once(RealtimeEvents.PLAYER_CHAT, resolve);
    });
    clientA.emit(RealtimeEvents.CHAT_MESSAGE, "Hey Bob!");
    const chatOnB = await bSawChatPromise;
    expect(chatOnB.sender).toBe("Alice");
    expect(chatOnB.message).toBe("Hey Bob!");
    expect(chatOnB.channel).toBe("LOCAL");

    // Disconnect A -> Client B receives player_left
    const aId = clientA.id;
    const bSawLeavePromise = new Promise<any>((resolve) => {
      clientB.once(RealtimeEvents.PLAYER_LEFT, resolve);
    });
    clientA.disconnect();
    const leftData = await bSawLeavePromise;
    expect(leftData.socketId || leftData).toBe(aId);

    clientB.disconnect();
  });
});
