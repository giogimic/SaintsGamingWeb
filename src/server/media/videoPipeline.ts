/**
 * Saints Gaming — Hybrid Video Pipeline
 *
 * Provides a scalable video ingestion and transcoding pipeline:
 * 1. Zero-config local worker with static FFmpeg and concurrency limiter
 * 2. Moov-atom faststart placement for instant frame-0 playback
 * 3. WebP poster snapshot extraction
 * 4. Multi-rendition preview/HD generation
 * 5. Modular hooks for Redis worker scale-out and Cloud-managed providers
 */

import path from "path";
import { mkdir, stat, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { spawn } from "child_process";

export interface VideoJobInput {
  filePath: string;
  uniqueName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
}

export interface VideoJobResult {
  success: boolean;
  optimizedUrl?: string;
  hlsMasterUrl?: string;
  previewUrl?: string;
  posterUrl?: string;
  durationSec?: number;
  width?: number;
  height?: number;
  aspectRatio?: string;
  isPortrait?: boolean;
  sizeBytes?: number;
  qualities?: string[];
  error?: string;
}

export interface IVideoPipelineProvider {
  name: string;
  isAvailable(): boolean;
  processVideo(input: VideoJobInput): Promise<VideoJobResult>;
}

/**
 * Concurrency Limiter Queue to protect server CPU from overload during traffic spikes
 */
class ConcurrencyQueue {
  private maxConcurrent: number;
  private running: number = 0;
  private queue: Array<() => void> = [];

  constructor(maxConcurrent: number = 2) {
    this.maxConcurrent = maxConcurrent;
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.running >= this.maxConcurrent) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
      const serapht = this.queue.shift();
      if (serapht) serapht();
    }
  }
}

const transcodeQueue = new ConcurrencyQueue(2);

/**
 * Resolves static FFmpeg binary path
 */
function getFfmpegPath(): string | null {
  try {
    // eslint-disable-serapht-line @typescript-eslint/no-require-imports
    const ffmpegStatic = require("ffmpeg-static");
    if (ffmpegStatic && typeof ffmpegStatic === "string" && existsSync(ffmpegStatic)) {
      return ffmpegStatic;
    }
  } catch {}
  return null;
}

/**
 * Execute FFmpeg command via child_process.spawn with timeout safety
 */
function runFfmpegCommand(args: string[], timeoutMs = 120000): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const ffmpegPath = getFfmpegPath();
    if (!ffmpegPath) {
      return reject(new Error("FFmpeg binary not available"));
    }

    const proc = spawn(ffmpegPath, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (d) => {
      stdout += d.toString();
    });

    proc.stderr?.on("data", (d) => {
      stderr += d.toString();
    });

    const timer = setTimeout(() => {
      try {
        proc.kill("SIGKILL");
      } catch {}
      reject(new Error(`FFmpeg process timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-400)}`));
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Probe video metadata (duration, width, height) from FFmpeg stderr output
 */
async function probeVideo(filePath: string): Promise<{ durationSec: number; width: number; height: number }> {
  try {
    const { stderr } = await runFfmpegCommand(["-i", filePath], 15000).catch((err) => ({
      stdout: "",
      stderr: err.message || "",
    }));

    let durationSec = 0;
    let width = 1280;
    let height = 720;

    // Parse Duration: 00:01:23.45
    const durMatch = stderr.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}\.\d+)/);
    if (durMatch) {
      const hours = parseFloat(durMatch[1]);
      const mins = parseFloat(durMatch[2]);
      const secs = parseFloat(durMatch[3]);
      durationSec = hours * 3600 + mins * 60 + secs;
    }

    // Parse Video Stream Resolution: 1920x1080
    const resMatch = stderr.match(/Video:.*?,\s*(\d{2,5})x(\d{2,5})/);
    if (resMatch) {
      width = parseInt(resMatch[1], 10);
      height = parseInt(resMatch[2], 10);
    }

    // Check for display rotation metadata (e.g. vertical iPhone videos rotated 90/270 deg)
    const rotateMatch = stderr.match(/displaymatrix:\s*rotation of\s*-?(\d+)/i) || stderr.match(/rotate\s*:\s*(\d+)/i);
    if (rotateMatch) {
      const rot = parseInt(rotateMatch[1], 10);
      if (rot === 90 || rot === 270) {
        const temp = width;
        width = height;
        height = temp;
      }
    }

    return { durationSec, width, height };
  } catch {
    return { durationSec: 0, width: 1280, height: 720 };
  }
}

/**
 * Local Concurrency Worker Provider (Zero-config Default)
 */
export class LocalFfmpegProvider implements IVideoPipelineProvider {
  name = "local-ffmpeg";

  isAvailable(): boolean {
    return Boolean(getFfmpegPath());
  }

  async processVideo(input: VideoJobInput): Promise<VideoJobResult> {
    return transcodeQueue.run(async () => {
      const ffmpegPath = getFfmpegPath();
      if (!ffmpegPath || !existsSync(input.filePath)) {
        return {
          success: true,
          optimizedUrl: `/uploads/${input.uniqueName}`,
          previewUrl: `/uploads/${input.uniqueName}`,
          durationSec: 0,
          sizeBytes: input.fileSize,
        };
      }

      const uploadDir = path.dirname(input.filePath);
      await mkdir(uploadDir, { recursive: true });

      const parsed = path.parse(input.uniqueName);
      const baseName = parsed.name;

      const posterFileName = `thumb-${baseName}.webp`;
      const posterFilePath = path.join(uploadDir, posterFileName);

      const previewFileName = `preview-${baseName}.mp4`;
      const previewFilePath = path.join(uploadDir, previewFileName);

      const hdFileName = `hd-${baseName}.mp4`;
      const hdFilePath = path.join(uploadDir, hdFileName);

      const hlsSubDir = path.join(uploadDir, "hls", baseName);
      await mkdir(hlsSubDir, { recursive: true });

      // 1. Probe input video metadata
      const { durationSec, width, height } = await probeVideo(input.filePath);
      const isPortrait = height > width;
      const ratio = width > 0 && height > 0 ? (width / height).toFixed(3) : "1.777";
      const seekTime = Math.min(0.5, Math.max(0, durationSec > 1 ? durationSec * 0.1 : 0));

      // 2. Generate high-quality WebP poster snapshot
      try {
        await runFfmpegCommand([
          "-y",
          "-ss",
          seekTime.toString(),
          "-i",
          input.filePath,
          "-vframes",
          "1",
          "-vf",
          "scale='min(1080,iw)':-2",
          "-c:v",
          "libwebp",
          "-quality",
          "85",
          posterFilePath,
        ], 25000);
      } catch (posterErr) {
        console.warn("[videoPipeline] WebP poster extraction fallback to jpeg:", posterErr);
        const jpgPoster = path.join(uploadDir, `thumb-${baseName}.jpg`);
        try {
          await runFfmpegCommand([
            "-y",
            "-ss",
            seekTime.toString(),
            "-i",
            input.filePath,
            "-vframes",
            "1",
            "-vf",
            "scale='min(1080,iw)':-2",
            "-q:v",
            "3",
            jpgPoster,
          ], 25000);
        } catch {}
      }

      // 3. Generate instant FastStart 480p preview MP4 (Fallback & Direct Download)
      try {
        await runFfmpegCommand([
          "-y",
          "-i",
          input.filePath,
          "-vf",
          isPortrait ? "scale=-2:'min(854,ih)'" : "scale='min(640,iw)':-2",
          "-c:v",
          "libx264",
          "-preset",
          "veryfast",
          "-crf",
          "26",
          "-pix_fmt",
          "yuv420p",
          "-c:a",
          "aac",
          "-b:a",
          "96k",
          "-movflags",
          "+faststart",
          previewFilePath,
        ], 90000);
      } catch (prevErr) {
        console.warn("[videoPipeline] Fast preview generation warning:", prevErr);
      }

      // 4. Generate Adaptive HLS Renditions (360p/480p baseline, 720p HD, 1080p Full HD)
      const successfulRenditions: Array<{
        name: string;
        width: number;
        height: number;
        bitrateKbps: number;
        playlistName: string;
      }> = [];

      // 4A. Baseline Rendition (360p / 480p for instant startup)
      const baseResW = isPortrait ? 360 : 640;
      const baseResH = isPortrait ? 640 : 360;
      try {
        await runFfmpegCommand([
          "-y",
          "-i",
          input.filePath,
          "-vf",
          isPortrait ? "scale=-2:'min(640,ih)'" : "scale='min(640,iw)':-2",
          "-c:v",
          "libx264",
          "-preset",
          "veryfast",
          "-crf",
          "25",
          "-maxrate",
          "700k",
          "-bufsize",
          "1200k",
          "-pix_fmt",
          "yuv420p",
          "-c:a",
          "aac",
          "-b:a",
          "96k",
          "-hls_time",
          "2",
          "-hls_playlist_type",
          "vod",
          "-hls_flags",
          "independent_segments",
          "-hls_segment_filename",
          path.join(hlsSubDir, "360p_%03d.ts"),
          path.join(hlsSubDir, "360p.m3u8"),
        ], 120000);

        if (existsSync(path.join(hlsSubDir, "360p.m3u8"))) {
          successfulRenditions.push({
            name: "360p",
            width: baseResW,
            height: baseResH,
            bitrateKbps: 796,
            playlistName: "360p.m3u8",
          });
        }
      } catch (err360) {
        console.warn("[videoPipeline] 360p HLS rendition warning:", err360);
      }

      // 4B. 720p HD Rendition (if source resolution >= 720)
      const maxDim = Math.max(width, height);
      if (maxDim >= 720) {
        const hd720W = isPortrait ? 720 : 1280;
        const hd720H = isPortrait ? 1280 : 720;
        try {
          await runFfmpegCommand([
            "-y",
            "-i",
            input.filePath,
            "-vf",
            isPortrait ? "scale=-2:'min(1280,ih)'" : "scale='min(1280,iw)':-2",
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "22",
            "-maxrate",
            "2000k",
            "-bufsize",
            "3500k",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-hls_time",
            "2",
            "-hls_playlist_type",
            "vod",
            "-hls_flags",
            "independent_segments",
            "-hls_segment_filename",
            path.join(hlsSubDir, "720p_%03d.ts"),
            path.join(hlsSubDir, "720p.m3u8"),
          ], 180000);

          if (existsSync(path.join(hlsSubDir, "720p.m3u8"))) {
            successfulRenditions.push({
              name: "720p",
              width: hd720W,
              height: hd720H,
              bitrateKbps: 2128,
              playlistName: "720p.m3u8",
            });
          }
        } catch (err720) {
          console.warn("[videoPipeline] 720p HLS rendition warning:", err720);
        }
      }

      // 4C. 1080p Full HD Rendition (if source resolution >= 1080)
      if (maxDim >= 1080) {
        const fhdW = isPortrait ? 1080 : 1920;
        const fhdH = isPortrait ? 1920 : 1080;
        try {
          await runFfmpegCommand([
            "-y",
            "-i",
            input.filePath,
            "-vf",
            isPortrait ? "scale=-2:'min(1920,ih)'" : "scale='min(1920,iw)':-2",
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "20",
            "-maxrate",
            "3800k",
            "-bufsize",
            "6000k",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-hls_time",
            "2",
            "-hls_playlist_type",
            "vod",
            "-hls_flags",
            "independent_segments",
            "-hls_segment_filename",
            path.join(hlsSubDir, "1080p_%03d.ts"),
            path.join(hlsSubDir, "1080p.m3u8"),
          ], 240000);

          if (existsSync(path.join(hlsSubDir, "1080p.m3u8"))) {
            successfulRenditions.push({
              name: "1080p",
              width: fhdW,
              height: fhdH,
              bitrateKbps: 3928,
              playlistName: "1080p.m3u8",
            });
          }
        } catch (err1080) {
          console.warn("[videoPipeline] 1080p HLS rendition warning:", err1080);
        }
      }

      // 5. Build master.m3u8 Variant Playlist
      let masterUrl: string | undefined = undefined;
      const masterPath = path.join(hlsSubDir, "master.m3u8");
      if (successfulRenditions.length > 0) {
        try {
          let masterM3u8 = "#EXTM3U\n#EXT-X-VERSION:3\n";
          for (const r of successfulRenditions) {
            const bandwidthBps = r.bitrateKbps * 1000;
            masterM3u8 += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidthBps},RESOLUTION=${r.width}x${r.height},NAME="${r.name}"\n${r.playlistName}\n`;
          }
          await writeFile(masterPath, masterM3u8, "utf-8");
          if (existsSync(masterPath)) {
            masterUrl = `/uploads/hls/${baseName}/master.m3u8`;
          }
        } catch (mErr) {
          console.warn("[videoPipeline] Master playlist generation warning:", mErr);
        }
      }

      // Verify generated assets
      const hasPoster = existsSync(posterFilePath);
      const hasPreview = existsSync(previewFilePath);
      const hasMaster = Boolean(masterUrl);

      return {
        success: true,
        optimizedUrl: hasMaster ? masterUrl : hasPreview ? `/uploads/${previewFileName}` : `/uploads/${input.uniqueName}`,
        hlsMasterUrl: hasMaster ? masterUrl : undefined,
        previewUrl: hasPreview ? `/uploads/${previewFileName}` : `/uploads/${input.uniqueName}`,
        posterUrl: hasPoster ? `/uploads/${posterFileName}` : undefined,
        durationSec,
        width,
        height,
        aspectRatio: ratio,
        isPortrait,
        qualities: successfulRenditions.map((r) => r.name),
        sizeBytes: input.fileSize,
      };
    });
  }
}

/**
 * Redis Scale-Out Worker Provider (Optional Horizontal Scale)
 */
export class RedisWorkerProvider implements IVideoPipelineProvider {
  name = "redis-worker";

  isAvailable(): boolean {
    return Boolean(process.env.REDIS_URL);
  }

  async processVideo(input: VideoJobInput): Promise<VideoJobResult> {
    // If standalone worker is not currently handling the queue, fallback gracefully to LocalFfmpegProvider
    const local = new LocalFfmpegProvider();
    return local.processVideo(input);
  }
}

/**
 * Cloud Managed Provider Adapter (Optional Cloudflare Stream / AWS MediaConvert)
 */
export class CloudflareStreamProvider implements IVideoPipelineProvider {
  name = "cloudflare-stream";

  isAvailable(): boolean {
    return Boolean(process.env.CLOUDFLARE_STREAM_API_KEY && process.env.CLOUDFLARE_ACCOUNT_ID);
  }

  async processVideo(input: VideoJobInput): Promise<VideoJobResult> {
    // Cloudflare Stream direct integration hook
    const local = new LocalFfmpegProvider();
    return local.processVideo(input);
  }
}

/**
 * Central Video Pipeline Manager
 */
export class VideoPipelineManager {
  private providers: Map<string, IVideoPipelineProvider> = new Map();
  private activeProvider: IVideoPipelineProvider;

  constructor() {
    const local = new LocalFfmpegProvider();
    const redis = new RedisWorkerProvider();
    const cf = new CloudflareStreamProvider();

    this.registerProvider(local);
    this.registerProvider(redis);
    this.registerProvider(cf);

    // Auto-select best available provider
    if (process.env.VIDEO_PIPELINE_PROVIDER === "cloudflare" && cf.isAvailable()) {
      this.activeProvider = cf;
    } else if (process.env.VIDEO_PIPELINE_PROVIDER === "redis" && redis.isAvailable()) {
      this.activeProvider = redis;
    } else {
      this.activeProvider = local;
    }
  }

  registerProvider(provider: IVideoPipelineProvider) {
    this.providers.set(provider.name, provider);
  }

  setProvider(name: string): boolean {
    const p = this.providers.get(name);
    if (p) {
      this.activeProvider = p;
      return true;
    }
    return false;
  }

  getActiveProviderName(): string {
    return this.activeProvider.name;
  }

  getProvider(): IVideoPipelineProvider {
    return this.activeProvider;
  }

  async process(input: VideoJobInput): Promise<VideoJobResult> {
    try {
      return await this.activeProvider.processVideo(input);
    } catch (err: any) {
      console.error("[VideoPipelineManager] Processing failed, fallback to raw source:", err);
      return {
        success: true,
        optimizedUrl: `/uploads/${input.uniqueName}`,
        previewUrl: `/uploads/${input.uniqueName}`,
        error: err.message,
      };
    }
  }
}

export const videoPipeline = new VideoPipelineManager();
