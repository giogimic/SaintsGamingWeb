/**
 * Dev-only two-socket lobby shard smoke.
 * Uses SocketHandler bypass auth (handshake.auth.token = userId) when NODE_ENV=development.
 *
 * Usage: npx tsx scripts/smoke-lobby-mp.ts
 */
import { io, type Socket } from "socket.io-client";
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "crypto";

const prisma = new PrismaClient();
const BASE = process.env.BASE_URL || "http://localhost:3000";

async function ensureUser(username: string) {
  const email = `${username}@smoke.local`;
  let u = await prisma.user.findUnique({ where: { username } });
  if (!u) {
    u = await prisma.user.create({
      data: {
        username,
        email,
        displayName: username,
        permissionLevel: 20,
        passwordHash: createHash("sha256").update(randomBytes(8)).digest("hex"),
      },
    });
  }
  return u;
}

function connectAs(userId: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(BASE, {
      transports: ["websocket"],
      auth: { token: userId },
      timeout: 15000,
    });
    const t = setTimeout(() => reject(new Error("connect timeout " + userId)), 15000);
    socket.on("connect", () => {
      clearTimeout(t);
      resolve(socket);
    });
    socket.on("connect_error", (err) => {
      clearTimeout(t);
      reject(err);
    });
  });
}

function once<T = unknown>(socket: Socket, event: string, ms = 12000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting ${event}`)), ms);
    socket.once(event, (data: T) => {
      clearTimeout(t);
      resolve(data);
    });
  });
}

async function main() {
  const a = await ensureUser("smoke_a");
  const b = await ensureUser("smoke_b");
  console.log("[smoke-lobby-mp] users", a.id, b.id);

  const sa = await connectAs(a.id);
  const sb = await connectAs(b.id);
  console.log("[smoke-lobby-mp] sockets connected");

  const joinedA = once<{ instanceId?: string; mapId?: string }>(sa, "map_joined");
  sa.emit("join_map", {
    mapId: "DEMO_SANDBOX",
    lobby: true,
    name: "SmokeA",
    x: 10,
    y: 10,
  });
  const mapA = await joinedA;
  console.log("[smoke-lobby-mp] A map_joined", mapA);

  const peersOnB = once<Record<string, unknown>>(sb, "map_players");
  const joinedB = once<{ instanceId?: string; mapId?: string }>(sb, "map_joined");
  const aSawB = new Promise<{ name?: string; socketId?: string }>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout waiting A→SmokeB player_joined")), 12000);
    const handler = (data: { name?: string; socketId?: string }) => {
      if (data?.name === "SmokeB") {
        clearTimeout(t);
        sa.off("player_joined", handler);
        resolve(data);
      }
    };
    sa.on("player_joined", handler);
  });

  sb.emit("join_map", {
    mapId: "DEMO_SANDBOX",
    lobby: true,
    name: "SmokeB",
    x: 12,
    y: 10,
  });

  const [mapB, peers, peerJoin] = await Promise.all([joinedB, peersOnB, aSawB]);
  console.log("[smoke-lobby-mp] B map_joined", mapB);
  console.log("[smoke-lobby-mp] B map_players keys", Object.keys(peers || {}));
  console.log("[smoke-lobby-mp] A player_joined", peerJoin);

  const sameShard = mapA.instanceId && mapA.instanceId === mapB.instanceId;
  const bSeesA = Object.keys(peers || {}).length >= 1;
  const aSeesB = peerJoin?.name === "SmokeB";

  // Join-storm regression: A re-emits join_map (same socket). Soft rejoin must
  // NOT permanently player_left A — B should still see A (or get player_joined).
  let aLeftB = false;
  const onLeft = (data: { socketId?: string }) => {
    if (data?.socketId === sa.id) aLeftB = true;
  };
  sb.on("player_left", onLeft);
  const aRejoined = once<{ instanceId?: string }>(sa, "map_joined");
  const peersAfterStorm = once<Record<string, unknown>>(sa, "map_players");
  sa.emit("join_map", {
    mapId: "DEMO_SANDBOX",
    lobby: true,
    name: "SmokeA",
    x: 10,
    y: 10,
  });
  const [mapA2, peers2] = await Promise.all([aRejoined, peersAfterStorm]);
  // Give B a beat to receive any leave/join
  await new Promise((r) => setTimeout(r, 300));
  sb.off("player_left", onLeft);

  const stillSameShard = mapA2.instanceId === mapA.instanceId;
  const aStillSeesB = Object.keys(peers2 || {}).length >= 1;

  sa.disconnect();
  sb.disconnect();
  await prisma.$disconnect();

  if (!sameShard) {
    console.error("[smoke-lobby-mp] FAIL: different shards", mapA.instanceId, mapB.instanceId);
    process.exit(1);
  }
  if (!bSeesA || !aSeesB) {
    console.error("[smoke-lobby-mp] FAIL: peers not visible", { bSeesA, aSeesB });
    process.exit(1);
  }
  if (!stillSameShard || !aStillSeesB) {
    console.error("[smoke-lobby-mp] FAIL: soft rejoin lost seat/peers", {
      stillSameShard,
      aStillSeesB,
      mapA2,
      aLeftB,
    });
    process.exit(1);
  }
  if (aLeftB) {
    console.error("[smoke-lobby-mp] FAIL: soft rejoin emitted player_left to peer");
    process.exit(1);
  }

  console.log(
    "[smoke-lobby-mp] PASS same shard",
    mapA.instanceId,
    "+ mutual visibility + soft rejoin"
  );
}

main().catch(async (err) => {
  console.error("[smoke-lobby-mp] ERROR", err);
  await prisma.$disconnect();
  process.exit(1);
});
