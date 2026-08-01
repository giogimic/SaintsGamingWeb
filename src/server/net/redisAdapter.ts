/**
 * Optional Socket.io Redis adapter for multi-instance PM2 / horizontal scale.
 * Enabled only when REDIS_URL (or REDIS_HOST) is set. No-op otherwise.
 */

import type { Server } from "socket.io";

export async function attachRedisAdapter(io: Server): Promise<boolean> {
  const redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDIS_HOST;

  if (!redisUrl && !redisHost) {
    console.log("[Realtime] Redis adapter skipped (set REDIS_URL to enable multi-instance)");
    return false;
  }

  try {
    const { createAdapter } = await import("@socket.io/redis-adapter");
    const { createClient } = await import("redis");

    const clientOpts = redisUrl
      ? { url: redisUrl }
      : {
          socket: {
            host: redisHost!,
            port: Number(process.env.REDIS_PORT || 6379),
          },
          password: process.env.REDIS_PASSWORD || undefined,
        };

    const pubClient = createClient(clientOpts as any);
    const subClient = pubClient.duplicate();

    pubClient.on("error", (err) => console.error("[Realtime] Redis pub error:", err));
    subClient.on("error", (err) => console.error("[Realtime] Redis sub error:", err));

    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log("[Realtime] Redis adapter attached — multi-instance fan-out enabled");
    return true;
  } catch (err) {
    console.error("[Realtime] Failed to attach Redis adapter:", err);
    return false;
  }
}
