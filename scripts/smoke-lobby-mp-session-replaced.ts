/**
 * Proves same-account two sockets never share a seat (session_replaced),
 * while two different accounts still see each other.
 *
 * Usage: npx tsx scripts/smoke-lobby-mp-session-replaced.ts
 */
import { io, type Socket } from "socket.io-client";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = process.env.BASE_URL || "http://localhost:3000";

async function user(username: string) {
  const u = await prisma.user.findUnique({ where: { username } });
  if (!u) throw new Error(`missing ${username} — run smoke-lobby-mp first`);
  return u;
}

function connectAs(userId: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(BASE, {
      transports: ["websocket"],
      auth: { token: userId },
      timeout: 15000,
    });
    const t = setTimeout(() => reject(new Error("connect timeout")), 15000);
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

function once<T>(socket: Socket, event: string, ms = 12000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout ${event}`)), ms);
    socket.once(event, (data: T) => {
      clearTimeout(t);
      resolve(data);
    });
  });
}

function join(socket: Socket, name: string, x: number, y: number) {
  socket.emit("join_map", {
    mapId: "DEMO_SANDBOX",
    lobby: true,
    name,
    x,
    y,
    spriteId: "adventurer",
  });
}

async function main() {
  const a = await user("smoke_a");
  const b = await user("smoke_b");

  // --- Different accounts: mutual visibility ---
  const sa1 = await connectAs(a.id);
  const sb = await connectAs(b.id);
  const ja = once<{ instanceId: string }>(sa1, "map_joined");
  join(sa1, "AccA", 14, 15);
  const mapA = await ja;

  const jb = once<{ instanceId: string }>(sb, "map_joined");
  const aSawB = new Promise<{ name?: string; socketId?: string }>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout A→AccB player_joined")), 12000);
    const handler = (data: { name?: string; socketId?: string }) => {
      if (data?.name === "AccB" && data.socketId !== sa1.id) {
        clearTimeout(t);
        sa1.off("player_joined", handler);
        resolve(data);
      }
    };
    sa1.on("player_joined", handler);
  });
  join(sb, "AccB", 16, 15);
  const [mapB, peer] = await Promise.all([jb, aSawB]);
  if (mapA.instanceId !== mapB.instanceId || peer?.name !== "AccB") {
    console.error("[session-replaced] FAIL different-account visibility", {
      mapA,
      mapB,
      peer,
    });
    process.exit(1);
  }
  console.log("[session-replaced] different accounts OK on", mapA.instanceId);

  // --- Same account second socket: first gets session_replaced ---
  const replaced = once<{ reason?: string }>(sa1, "session_replaced");
  const sa2 = await connectAs(a.id);
  const ja2 = once<{ instanceId: string }>(sa2, "map_joined");
  const peersOnSa2 = once<Record<string, { name?: string }>>(sa2, "map_players");
  join(sa2, "AccA-tab2", 14, 15);
  const [rep, mapA2, peers2] = await Promise.all([replaced, ja2, peersOnSa2]);

  const peerNames = Object.values(peers2 || {}).map((p) => p?.name);
  console.log("[session-replaced]", {
    reason: rep?.reason?.slice(0, 60),
    mapA2: mapA2.instanceId,
    peersOnTab2: peerNames,
  });

  sa1.disconnect();
  sa2.disconnect();
  sb.disconnect();
  await prisma.$disconnect();

  if (!rep?.reason) {
    console.error("[session-replaced] FAIL no session_replaced on first socket");
    process.exit(1);
  }
  // Tab2 should still see AccB (different account), not a ghost of AccA
  if (!peerNames.includes("AccB")) {
    console.error("[session-replaced] FAIL tab2 lost AccB", peerNames);
    process.exit(1);
  }

  console.log("[session-replaced] PASS");
}

main().catch(async (e) => {
  console.error("[session-replaced] ERROR", e);
  await prisma.$disconnect();
  process.exit(1);
});
