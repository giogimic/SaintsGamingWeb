import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { bootstrapDemoContent } from "./src/server/DemoBootstrap";
import { RealtimeService } from "./src/server/realtime/RealtimeService";
import { attachRedisAdapter } from "./src/server/net/redisAdapter";

const dev = process.env.NODE_ENV !== "production";
// Docker sets HOSTNAME=0.0.0.0; default to all interfaces in prod so lobby sockets work.
const hostname = process.env.HOSTNAME || (dev ? "localhost" : "0.0.0.0");
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Singleton — API routes import this to publish events via RealtimeService
let _realtimeService: RealtimeService | null = null;
export function getRealtimeService(): RealtimeService | null {
  return _realtimeService;
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
            engine: "go-mmo",
            note: "lobby sockets on Go — see NEXT_PUBLIC_GO_MMO_URL",
          })
        );
        return;
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  // Attach Socket.io to the Next.js HTTP server (forum RealtimeProvider only)
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

  // Maps / Studio content seed always (API path), even when Go owns game sockets.
  await bootstrapDemoContent();

  console.log(`> TS GameEngine removed — lobby/Studio realtime strictly on Go MMO`);

  server.listen(port, hostname, () => {
    console.log(`> Saints Web Server ready on http://${hostname}:${port}`);
    console.log(`> Saints Realtime Platform initialized`);
  });
});
