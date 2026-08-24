import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { bootstrapDemoContent } from "./src/server/DemoBootstrap";
import { RealtimeService } from "./src/server/realtime/RealtimeService";
import { attachRedisAdapter } from "./src/server/net/redisAdapter";
import { LobbySocketHandler } from "./src/server/net/LobbySocketHandler";

const dev = process.env.NODE_ENV !== "production";
// Docker sets HOSTNAME=0.0.0.0; default to all interfaces in prod so lobby sockets work.
const hostname = process.env.HOSTNAME || (dev ? "localhost" : "0.0.0.0");
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

let _realtimeService: RealtimeService | null = null;
export function getRealtimeService(): RealtimeService | null {
  return _realtimeService || (globalThis as any).__sg_realtime_service || null;
}

app.prepare().then(async () => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);

      // Live player count for status widgets (GET only). Mutations go through Next route + Admin+ auth.
      if (parsedUrl.pathname === "/api/game/server-status" && (req.method === "GET" || !req.method)) {
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            players: null,
            capacity: 500,
            status: "online",
            engine: "hybrid",
            note: "unified lobby/Studio realtime sockets enabled",
          })
        );
        return;
      }

      // Serve dynamic uploads manually since Next.js caches public/ at build time
      if (parsedUrl.pathname?.startsWith("/uploads/")) {
        const fs = require("fs");
        const path = require("path");
        // Prevent directory traversal
        const safeSuffix = path.normalize(parsedUrl.pathname).replace(/^(\.\.[\/\\])+/, '');
        const filePath = path.join(process.cwd(), "public", safeSuffix);
        
        if (fs.existsSync(filePath)) {
          const ext = path.extname(filePath).toLowerCase();
          const mimeTypes: Record<string, string> = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.ogg': 'audio/ogg'
          };
          res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
          res.setHeader('Cache-Control', 'public, max-age=31536000');
          fs.createReadStream(filePath).pipe(res);
          return;
        }
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  // Attach Socket.io to the Next.js HTTP server
  const io = new Server(server, {
    cors: {
      origin: (requestOrigin, callback) => {
        // Dynamically mirror request origin for credentialed requests across subdomains
        callback(null, requestOrigin || "*");
      },
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  await attachRedisAdapter(io);
  _realtimeService = new RealtimeService(io);
  (globalThis as any).__sg_realtime_service = _realtimeService;
  new LobbySocketHandler(io);

  // Maps / Studio content seed always (API path), even when Go owns game sockets.
  await bootstrapDemoContent();

  console.log(`> Lobby & Studio Realtime Socket Handler active`);

  server.listen(port, hostname, () => {
    console.log(`> Saints Web Server ready on http://${hostname}:${port}`);
    console.log(`> Saints Realtime Platform initialized`);
  });
});
