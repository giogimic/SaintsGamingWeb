import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createServer, type Server as HttpServer } from "http";
import { Server } from "socket.io";
import { io as ClientSocket, type Socket as ClientSocketType } from "socket.io-client";
import { LobbySocketHandler } from "./LobbySocketHandler";
import { RealtimeEvents } from "../../shared/net/protocol";

describe("Realtime Dungeon Socket Pipeline (Phase 11)", () => {
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
        port = typeof addr === "object" && addr ? addr.port : 0;
        resolve();
      });
    });
  });

  afterEach(async () => {
    ioServer.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  function createClient(accountId: string): Promise<ClientSocketType> {
    return new Promise((resolve) => {
      const socket = ClientSocket(`http://localhost:${port}`, {
        auth: { token: accountId },
        transports: ["websocket"],
      });
      socket.on("connect", () => resolve(socket));
    });
  }

  it("handles dungeon instance creation, member warping, live objective sync, and dungeon completion", async () => {
    const leaderClient = await createClient("leader_paladin");
    const memberClient = await createClient("member_cleric");

    // 1. Leader requests dungeon instance creation
    const warpPromiseLeader = new Promise<any>((resolve) => {
      leaderClient.on(RealtimeEvents.DUNGEON_WARP, (data) => resolve(data));
    });
    const warpPromiseMember = new Promise<any>((resolve) => {
      memberClient.on(RealtimeEvents.DUNGEON_WARP, (data) => resolve(data));
    });

    leaderClient.emit(RealtimeEvents.DUNGEON_CREATE, {
      dungeonSlug: "dungeon_shadow_crypt",
      baseMapId: "DUNGEON_SHADOW_CRYPT",
      partyId: "party_holy_crusade",
      partyMembers: ["leader_paladin", "member_cleric"],
      durationMinutes: 45,
      objectives: [
        { key: "kill_skeletons", required: 2 },
        { key: "kill_crypt_lord", required: 1 },
      ],
    });

    const [leaderWarp, memberWarp] = await Promise.all([warpPromiseLeader, warpPromiseMember]);
    expect(leaderWarp.instanceId).toBeDefined();
    expect(leaderWarp.baseMapId).toBe("DUNGEON_SHADOW_CRYPT");
    expect(leaderWarp.dungeonSlug).toBe("dungeon_shadow_crypt");
    expect(memberWarp.instanceId).toBe(leaderWarp.instanceId);

    const instanceId = leaderWarp.instanceId;

    // Both sockets join the dungeon instance room on the server
    leaderClient.emit(RealtimeEvents.JOIN_MAP, {
      mapId: instanceId,
      name: "Paladin Leader",
      accountId: "leader_paladin",
    });
    memberClient.emit(RealtimeEvents.JOIN_MAP, {
      mapId: instanceId,
      name: "Cleric Member",
      accountId: "member_cleric",
    });

    // Wait for room joins to settle
    await new Promise((r) => setTimeout(r, 100));

    // 2. Test live objective updates and completion broadcast
    const completionPromise = new Promise<any>((resolve) => {
      memberClient.on(RealtimeEvents.DUNGEON_COMPLETED, (data) => resolve(data));
    });

    // Progress 1: Slay 2 skeletons
    leaderClient.emit(RealtimeEvents.DUNGEON_OBJECTIVE_UPDATE, {
      instanceId,
      objectiveKey: "kill_skeletons",
      amount: 2,
    });

    // Progress 2: Slay Crypt Lord
    leaderClient.emit(RealtimeEvents.DUNGEON_OBJECTIVE_UPDATE, {
      instanceId,
      objectiveKey: "kill_crypt_lord",
      amount: 1,
    });

    const completion = await completionPromise;
    expect(completion.instanceId).toBe(instanceId);
    expect(completion.dungeonSlug).toBe("dungeon_shadow_crypt");
    expect(completion.clearedAt).toBeDefined();

    leaderClient.disconnect();
    memberClient.disconnect();
  });
});
