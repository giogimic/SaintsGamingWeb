import { describe, it, expect } from "vitest";
import { 
  VideoPipelineManager, 
  LocalFfmpegProvider, 
  RedisWorkerProvider, 
  CloudflareStreamProvider,
  videoPipeline
} from "./videoPipeline";
import path from "path";

describe("Video Processing Pipeline Suite", () => {
  it("initializes VideoPipelineManager with default local provider", () => {
    const manager = new VideoPipelineManager();
    expect(manager.getActiveProviderName()).toBe("local-ffmpeg");
  });

  it("allows registering and switching between pluggable providers", () => {
    const manager = new VideoPipelineManager();
    const redisProvider = new RedisWorkerProvider();
    const cfProvider = new CloudflareStreamProvider();

    manager.registerProvider(redisProvider);
    manager.registerProvider(cfProvider);

    manager.setProvider("redis-worker");
    expect(manager.getActiveProviderName()).toBe("redis-worker");

    manager.setProvider("cloudflare-stream");
    expect(manager.getActiveProviderName()).toBe("cloudflare-stream");
  });

  it("LocalFfmpegProvider handles non-video file extensions gracefully", async () => {
    const localProvider = new LocalFfmpegProvider();
    const result = await localProvider.processVideo({
      filePath: path.join(process.cwd(), "public", "dummy.txt"),
      uniqueName: "dummy.txt",
      originalName: "notes.txt",
      mimeType: "text/plain",
      fileSize: 120,
    });

    expect(result.success).toBe(true);
    expect(result.durationSec).toBe(0);
  });

  it("videoPipeline singleton processes jobs with fallback safety", async () => {
    const result = await videoPipeline.process({
      filePath: path.join(process.cwd(), "public", "test.mp4"),
      uniqueName: "test.mp4",
      originalName: "test.mp4",
      mimeType: "video/mp4",
      fileSize: 1024,
    });

    expect(result.success).toBe(true);
    expect(result.optimizedUrl).toBeDefined();
    expect(result.previewUrl).toBeDefined();
  });

  it("handles prewarmMedia safely without crashing", async () => {
    const { prewarmMedia, prewarmAdjacentFeedMedia } = await import("../../web/lib/hls-prewarm");
    await expect(prewarmMedia(undefined)).resolves.toBeUndefined();
    await expect(prewarmMedia("")).resolves.toBeUndefined();
    expect(() => prewarmAdjacentFeedMedia([undefined, ""])).not.toThrow();
  });
});

