import { io, type Socket } from "socket.io-client";
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "crypto";

export const prisma = new PrismaClient();
export const BASE = process.env.BASE_URL || "http://localhost:3000";

export async function ensureUser(username: string) {
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

export function connectAs(userId: string): Promise<Socket> {
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

export function once<T = unknown>(socket: Socket, event: string, ms = 12000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting ${event}`)), ms);
    socket.once(event, (data: T) => {
      clearTimeout(t);
      resolve(data);
    });
  });
}
