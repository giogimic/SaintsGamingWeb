import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { RealtimeService } from "./src/server/realtime/RealtimeService";

const dev = process.env.NODE_ENV !== "production";
// Docker sets HOSTNAME=0.0.0.0; default to all interfaces in prod so lobby sockets work.
const hostname = process.env.HOSTNAME || (dev ? "127.0.0.1" : "0.0.0.0");
const port = parseInt(process.env.PORT || "24001", 10);

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

      // Serve Animations from external or public directories (cross-platform Linux/Debian + Windows)
      if (parsedUrl.pathname?.startsWith("/animations/")) {
        const fs = require("fs");
        const path = require("path");
        const isParagon = parsedUrl.pathname.startsWith("/animations/Paragon/");
        const rawSuffix = isParagon
          ? parsedUrl.pathname.replace(/^\/animations\/Paragon\//, '')
          : parsedUrl.pathname.replace(/^\/animations\//, '');
        let decodedSuffix = '';
        try {
          decodedSuffix = decodeURIComponent(rawSuffix);
        } catch {
          decodedSuffix = rawSuffix;
        }
        decodedSuffix = path.normalize(decodedSuffix).replace(/^(\.\.[\/\\])+/, '');
        
        // Search potential animation directory roots (Debian/Linux priority, env var, local public, Windows)
        const possibleRoots = isParagon ? [
          process.env.PARAGON_ANIMATIONS_DIR,
          "/var/saints-gaming/Paragon_animations_glb",
          "/var/www/saints-gaming/Paragon_animations_glb",
          "/opt/saints-gaming/Paragon_animations_glb",
          path.join(process.cwd(), "public", "animations", "Paragon"),
          path.join(process.cwd(), "public", "animations"),
          "C:\\saints-gaming\\Paragon_animations_glb",
        ].filter(Boolean) as string[] : [
          path.join(process.cwd(), "public", "animations"),
          path.join(process.cwd(), "public"),
          process.env.ANIMATIONS_DIR,
          "/var/saints-gaming/animations",
          "/opt/saints-gaming/animations",
          "C:\\saints-gaming\\animations",
        ].filter(Boolean) as string[];

        // Fast in-memory cache for resolved animation file paths
        if (!(global as any).__animPathCache) {
          (global as any).__animPathCache = new Map<string, string>();
        }
        const animCache: Map<string, string> = (global as any).__animPathCache;

        function resolveAnimationTarget(roots: string[], suffix: string): string | null {
          const cacheKey = suffix.toLowerCase();
          if (animCache.has(cacheKey)) {
            const cached = animCache.get(cacheKey)!;
            try {
              if (fs.existsSync(cached) && fs.statSync(cached).isFile()) return cached;
            } catch {}
            animCache.delete(cacheKey);
          }

          for (const root of roots) {
            try {
              if (!fs.existsSync(root)) continue;

              // 1. Direct path check
              const directPath = path.join(root, suffix);
              if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
                animCache.set(cacheKey, directPath);
                return directPath;
              }
              if (!suffix.endsWith('.glb') && fs.existsSync(directPath + '.glb') && fs.statSync(directPath + '.glb').isFile()) {
                animCache.set(cacheKey, directPath + '.glb');
                return directPath + '.glb';
              }

              // 2. Profile-aware alias & recursive search
              const parts = suffix.replace(/\\/g, '/').split('/').filter(Boolean);
              if (parts.length >= 2) {
                const profileName = parts[0];
                const remainder = parts.slice(1).join('/');
                const baseName = path.basename(remainder, '.glb').toLowerCase();

                // Case-insensitive profile folder match (critical on Linux ext4)
                let profileDir = path.join(root, profileName);
                if (!fs.existsSync(profileDir)) {
                  try {
                    const entries = fs.readdirSync(root, { withFileTypes: true });
                    const match = entries.find((e: any) => e.isDirectory() && e.name.toLowerCase() === profileName.toLowerCase());
                    if (match) profileDir = path.join(root, match.name);
                  } catch {}
                }

                if (fs.existsSync(profileDir) && fs.statSync(profileDir).isDirectory()) {
                  // Common Paragon folder aliases
                  const candidateSubpaths: string[] = [];
                  if (baseName === 'idle' || baseName.includes('idle')) {
                    candidateSubpaths.push(
                      'IdleAO/Idle.glb', 'IDLEAO/Idle.glb', 'AO_Idles/Idle.glb', 'IdleAO/idle.glb',
                      'Jog/Idle.glb', 'Idle_Combat.glb', 'IDleAO/Idle_Pose.glb', 'Idle_Combat_Pose.glb',
                      'Steel_Idle.glb', 'Idle.glb', 'idle.glb', '01_02_001_Start jogging.glb'
                    );
                  } else if (baseName === 'run_fwd' || baseName === 'jog_fwd' || baseName.includes('run') || baseName.includes('jog')) {
                    candidateSubpaths.push(
                      'Jog/Jog_Fwd.glb', 'Jog/jog_fwd.glb', 'Jog_Fwd.glb', 'Walk_Fwd.glb',
                      'Run_Fwd.glb', 'run_fwd.glb', 'Sprint/Sprint_Fwd.glb', '01_02_006_jogging.glb'
                    );
                  } else if (baseName === 'run_bwd' || baseName === 'jog_bwd') {
                    candidateSubpaths.push(
                      'Jog/Jog_Bwd.glb', 'Jog_Bwd.glb', 'Walk_Bwd.glb', 'Run_Bwd.glb', '01_02_003_180 turn jogging.glb'
                    );
                  } else if (baseName === 'run_left' || baseName === 'jog_left') {
                    candidateSubpaths.push(
                      'Jog/Jog_Left.glb', 'Jog_Left.glb', 'Jog/Jog_Lft.glb', 'Walk_Left.glb', 'Run_Left.glb', '01_02_004_90 turn jogging_L.glb'
                    );
                  } else if (baseName === 'run_right' || baseName === 'jog_right') {
                    candidateSubpaths.push(
                      'Jog/Jog_Right.glb', 'Jog_Right.glb', 'Jog/Jog_Rt.glb', 'Walk_Right.glb', 'Run_Right.glb', '01_02_005_90 turn jogging_R.glb'
                    );
                  } else if (baseName === 'jump_start') {
                    candidateSubpaths.push('Jump/Jump_Start.glb', 'Jump_Start.glb', '01_04_001_Jump.glb');
                  } else if (baseName === 'jump_mid' || baseName === 'jump_fall') {
                    candidateSubpaths.push('Jump/Jump_Apex.glb', 'Jump_Fall.glb', 'Jump_Fall_Loop.glb', 'Jump_Apex.glb', '01_04_004_Jump_F.glb');
                  } else if (baseName === 'jump_end' || baseName === 'jump_land') {
                    candidateSubpaths.push('Jump/Jump_Land.glb', 'Jump_Land.glb', 'Jump_InPlace_Land.glb', '01_04_005_Jump_B.glb');
                  } else if (baseName === 'death') {
                    candidateSubpaths.push('Death.glb', 'Death_A.glb', 'Death/Death_A.glb', 'Death_Fwd.glb', 'Death_Bwd.glb');
                  }

                  for (const sub of candidateSubpaths) {
                    const subFullPath = path.join(profileDir, sub);
                    if (fs.existsSync(subFullPath) && fs.statSync(subFullPath).isFile()) {
                      animCache.set(cacheKey, subFullPath);
                      return subFullPath;
                    }
                  }

                  // Recursive case-insensitive file lookup within profileDir (max depth 3)
                  const searchSubDir = (dir: string, depth = 0): string | null => {
                    if (depth > 3) return null;
                    try {
                      const list = fs.readdirSync(dir, { withFileTypes: true });
                      for (const item of list) {
                        const full = path.join(dir, item.name);
                        if (item.isFile()) {
                          const itemLower = item.name.toLowerCase();
                          if (itemLower === baseName + '.glb' || itemLower === baseName) {
                            return full;
                          }
                        } else if (item.isDirectory()) {
                          const found = searchSubDir(full, depth + 1);
                          if (found) return found;
                        }
                      }
                    } catch {}
                    return null;
                  };

                  const found = searchSubDir(profileDir);
                  if (found) {
                    animCache.set(cacheKey, found);
                    return found;
                  }
                }
              }
            } catch {}
          }
          return null;
        }

        const targetFile = resolveAnimationTarget(possibleRoots, decodedSuffix);
        
        if (targetFile) {
          const ext = path.extname(targetFile).toLowerCase();
          const mimeTypes: Record<string, string> = {
            '.fbx': 'application/octet-stream',
            '.glb': 'model/gltf-binary',
            '.gltf': 'model/gltf+json',
          };
          const contentType = mimeTypes[ext] || 'application/octet-stream';
          res.setHeader('Content-Type', contentType);
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          const readStream = fs.createReadStream(targetFile);
          readStream.pipe(res);
          return;
        }
      }

      // Serve dynamic uploads and static game assets manually with Range streaming
      if (parsedUrl.pathname?.startsWith("/uploads/") || parsedUrl.pathname?.startsWith("/game-assets/")) {
        const fs = require("fs");
        const path = require("path");
        // Prevent directory traversal and strip leading slashes for Windows path.join safety
        let suffix = parsedUrl.pathname.replace(/^\/+/, '');
        suffix = path.normalize(suffix).replace(/^(\.\.[\/\\])+/, '');
        const filePath = path.join(process.cwd(), "public", suffix);
        
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
            '.fbx': 'application/octet-stream',
            '.glb': 'model/gltf-binary',
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
  const goMmoUrl = process.env.GO_MMO_INTERNAL_URL || process.env.NEXT_PUBLIC_GO_MMO_URL || "http://127.0.0.1:24011";
  _realtimeService = new RealtimeService(goMmoUrl);
  (globalThis as any).__sg_realtime_service = _realtimeService;

  console.log(`> Lobby & Studio Realtime Event Router active (Target: ${goMmoUrl})`);

  server.listen(port, hostname, () => {
    console.log(`> Saints Web Server ready on http://${hostname}:${port}`);
    console.log(`> Saints Realtime Platform initialized`);
  });
});
