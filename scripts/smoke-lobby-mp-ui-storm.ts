/**
 * Simulates the real /lobby join storm (character load + connect + late-join)
 * and verifies peers still see each other after the storm.
 *
 * Usage: npx tsx scripts/smoke-lobby-mp-ui-storm.ts
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

function emitLobbyJoin(socket: Socket, name: string, x: number, y: number) {
  socket.emit("join_map", {
    mapId: "DEMO_SANDBOX",
    lobby: true,
    isPrivate: false,
    pie: false,
    name,
    x,
    y,
    spriteId: "adventurer",
  });
}

async function main() {
  const a = await user("smoke_a");
  const b = await user("smoke_b");
  const sa = await connectAs(a.id);
  const sb = await connectAs(b.id);

  const peersOnA = new Map<string, string>();
  const peersOnB = new Map<string, string>();
  let leftOnB = 0;

  sa.on("player_joined", (d: { socketId?: string; name?: string }) => {
    if (d?.socketId && d.socketId !== sa.id) peersOnA.set(d.socketId, d.name || "?");
  });
  sa.on("player_left", (d: { socketId?: string }) => {
    if (d?.socketId) peersOnA.delete(d.socketId);
  });
  sa.on("map_players", (players: Record<string, { name?: string }>) => {
    peersOnA.clear();
    for (const [id, p] of Object.entries(players || {})) {
      if (id !== sa.id) peersOnA.set(id, p?.name || "?");
    }
  });

  sb.on("player_joined", (d: { socketId?: string; name?: string }) => {
    if (d?.socketId && d.socketId !== sb.id) peersOnB.set(d.socketId, d.name || "?");
  });
  sb.on("player_left", (d: { socketId?: string }) => {
    if (d?.socketId === sa.id) leftOnB++;
    if (d?.socketId) peersOnB.delete(d.socketId);
  });
  sb.on("map_players", (players: Record<string, { name?: string }>) => {
    peersOnB.clear();
    for (const [id, p] of Object.entries(players || {})) {
      if (id !== sb.id) peersOnB.set(id, p?.name || "?");
    }
  });

  // A: UI storm — 3 rapid joins (load + connect + late)
  const ja1 = once<{ instanceId: string }>(sa, "map_joined");
  emitLobbyJoin(sa, "StormA", 14, 15);
  emitLobbyJoin(sa, "StormA", 14, 15);
  emitLobbyJoin(sa, "StormA", 14, 15);
  const mapA = await ja1;
  await new Promise((r) => setTimeout(r, 200));

  // B joins once
  const jb = once<{ instanceId: string }>(sb, "map_joined");
  emitLobbyJoin(sb, "StormB", 16, 15);
  const mapB = await jb;
  await new Promise((r) => setTimeout(r, 400));

  // A storms again after B is present (late-join effect)
  leftOnB = 0;
  emitLobbyJoin(sa, "StormA", 14, 15);
  emitLobbyJoin(sa, "StormA", 14, 15);
  await new Promise((r) => setTimeout(r, 500));

  console.log("[ui-storm]", {
    mapA: mapA.instanceId,
    mapB: mapB.instanceId,
    peersOnA: [...peersOnA.entries()],
    peersOnB: [...peersOnB.entries()],
    leftOnBAfterRestorm: leftOnB,
  });

  sa.disconnect();
  sb.disconnect();
  await prisma.$disconnect();

  const same = mapA.instanceId === mapB.instanceId;
  const aSeesB = [...peersOnA.values()].includes("StormB") || peersOnA.size >= 1;
  const bSeesA = [...peersOnB.values()].some((n) => n === "StormA") || peersOnB.size >= 1;

  if (!same || !aSeesB || !bSeesA) {
    console.error("[ui-storm] FAIL mutual visibility", { same, aSeesB, bSeesA });
    process.exit(1);
  }
  if (leftOnB > 0 && peersOnB.size === 0) {
    console.error("[ui-storm] FAIL B lost A after storm", { leftOnB });
    process.exit(1);
  }

  console.log("[ui-storm] PASS");
}

main().catch(async (e) => {
  console.error("[ui-storm] ERROR", e);
  await prisma.$disconnect();
  process.exit(1);
});
