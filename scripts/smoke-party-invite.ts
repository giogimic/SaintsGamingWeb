/**
 * Dev smoke: party invite → accept between two lobby sockets.
 * Usage: npx tsx scripts/smoke-party-invite.ts
 */
import { io, type Socket } from "socket.io-client";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = process.env.BASE_URL || "http://localhost:3000";

async function user(username: string) {
  const u = await prisma.user.findUnique({ where: { username } });
  if (!u) throw new Error(`missing user ${username} — run smoke-lobby-mp first`);
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

function once<T>(socket: Socket, event: string, ms = 10000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout ${event}`)), ms);
    socket.once(event, (data: T) => {
      clearTimeout(t);
      resolve(data);
    });
  });
}

async function main() {
  const a = await user("smoke_a");
  const b = await user("smoke_b");
  const sa = await connectAs(a.id);
  const sb = await connectAs(b.id);

  const ja = once(sa, "map_joined");
  const jb = once(sb, "map_joined");
  sa.emit("join_map", { mapId: "DEMO_SANDBOX", lobby: true, name: "SmokeA", x: 8, y: 8 });
  sb.emit("join_map", { mapId: "DEMO_SANDBOX", lobby: true, name: "SmokeB", x: 9, y: 8 });
  await Promise.all([ja, jb]);

  const invite = once<{ fromName?: string; fromAccountId?: string }>(sb, "party_invite");
  const updateA = once<{ type?: string; members?: string[] }>(sa, "party_update");
  const updateB = once<{ type?: string; members?: string[] }>(sb, "party_update");

  sa.emit("party_invite", "smoke_b");
  const inv = await invite;
  console.log("[smoke-party] invite", inv);
  if (inv.fromAccountId !== a.id) throw new Error("bad fromAccountId");

  sb.emit("party_invite_accept");
  const [ua, ub] = await Promise.all([updateA, updateB]);
  console.log("[smoke-party] updates", ua, ub);

  sa.disconnect();
  sb.disconnect();
  await prisma.$disconnect();

  const members = new Set([...(ua.members || []), ...(ub.members || [])]);
  if (ua.type !== "UPDATE" || !members.has(a.id) || !members.has(b.id)) {
    console.error("[smoke-party] FAIL", { ua, ub });
    process.exit(1);
  }
  console.log("[smoke-party] PASS");
}

main().catch(async (e) => {
  console.error("[smoke-party] ERROR", e);
  await prisma.$disconnect();
  process.exit(1);
});
