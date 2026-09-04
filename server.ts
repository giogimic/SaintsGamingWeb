import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { RealtimeService } from "./src/server/realtime/RealtimeService";
import { bootstrapDemoContent } from "./src/server/DemoBootstrap";

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
            '.m3u8': 'application/vnd.apple.mpegurl',
            '.ts': 'video/MP2T',
            '.m4s': 'video/iso.segment',
            '.mpd': 'application/dash+xml',
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.mov': 'video/quicktime',
            '.m4v': 'video/mp4',
            '.mkv': 'video/x-matroska',
            '.ogv': 'video/ogg',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.ogg': 'audio/ogg',
            '.m4a': 'audio/mp4',
            '.aac': 'audio/aac',
            '.zip': 'application/zip',
            '.rar': 'application/vnd.rar',
            '.7z': 'application/x-7z-compressed',
          };
          const contentType = mimeTypes[ext] || 'application/octet-stream';
          const stat = fs.statSync(filePath);
          const fileSize = stat.size;
          const range = req.headers.range;

          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader('Content-Type', contentType);
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Headers', 'Range, Accept, Origin, Content-Type');

          if (ext === '.m3u8') {
            res.setHeader('Cache-Control', 'public, max-age=10');
          } else {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }

          // Support HTTP 206 Partial Content for video/audio seeking and chunked streaming
          if (range && (contentType.startsWith('video/') || contentType.startsWith('audio/'))) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            if (isNaN(start) || start >= fileSize || (parts[1] && end >= fileSize) || start > end) {
              res.statusCode = 416;
              res.setHeader('Content-Range', `bytes */${fileSize}`);
              res.end();
              return;
            }

            const chunkSize = end - start + 1;
            res.statusCode = 206;
            res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
            res.setHeader('Content-Length', chunkSize.toString());
            fs.createReadStream(filePath, { start, end }).pipe(res);
            return;
          }

          res.statusCode = 200;
          res.setHeader('Content-Length', fileSize.toString());
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

  // Initialize RealtimeService to route events to Go MMO server
  const goMmoUrl = process.env.NEXT_PUBLIC_GO_MMO_URL || "http://127.0.0.1:3001";
  _realtimeService = new RealtimeService(goMmoUrl);
  (globalThis as any).__sg_realtime_service = _realtimeService;

  // Maps / Studio content seed always (API path), even when Go owns game sockets.
  await bootstrapDemoContent();

  console.log(`> Lobby & Studio Realtime Event Router active (Target: ${goMmoUrl})`);

  server.listen(port, hostname, () => {
    console.log(`> Saints Web Server ready on http://${hostname}:${port}`);
    console.log(`> Saints Realtime Platform initialized`);
  });
});
