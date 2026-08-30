"use client";

// Cache for client-side extracted video posters to prevent re-extracting frames
const thumbnailPosterCache = new Map<string, string>();

/**
 * Capture a frame from a video File or URL as a JPEG Data URL.
 * Defaults to 0.5s into the video to avoid initial black frames.
 */
export async function captureVideoFrame(
  videoSource: string | File,
  seekTime: number = 0.5
): Promise<string> {
  return new Promise((resolve, reject) => {
    let sourceUrl = "";
    let isObjectUrl = false;

    if (typeof videoSource === "string") {
      // Check cache first
      if (thumbnailPosterCache.has(videoSource)) {
        return resolve(thumbnailPosterCache.get(videoSource)!);
      }
      sourceUrl = videoSource;
    } else if (videoSource instanceof File) {
      sourceUrl = URL.createObjectURL(videoSource);
      isObjectUrl = true;
    } else {
      return reject(new Error("Invalid video source provided"));
    }

    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    let timeoutId: NodeJS.Timeout | null = setTimeout(() => {
      cleanup();
      reject(new Error("Thumbnail extraction timed out"));
    }, 8000);

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      video.src = "";
      video.load();
      if (isObjectUrl) {
        URL.revokeObjectURL(sourceUrl);
      }
    };

    const onError = () => {
      cleanup();
      reject(new Error("Failed to load video for thumbnail extraction"));
    };

    const onLoadedMetadata = () => {
      // Clamp seek time to valid duration
      const targetTime = Math.max(0, Math.min(seekTime, (video.duration || 1) - 0.1));
      video.currentTime = targetTime;
    };

    const onSeeked = () => {
      try {
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 360;

        // Cap max dimensions for efficient storage
        const maxDimension = 1280;
        let drawWidth = width;
        let drawHeight = height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            drawWidth = maxDimension;
            drawHeight = Math.round((height * maxDimension) / width);
          } else {
            drawHeight = maxDimension;
            drawWidth = Math.round((width * maxDimension) / height);
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = drawWidth;
        canvas.height = drawHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          cleanup();
          return reject(new Error("Could not get canvas 2D context"));
        }

        ctx.drawImage(video, 0, 0, drawWidth, drawHeight);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

        if (typeof videoSource === "string") {
          thumbnailPosterCache.set(videoSource, dataUrl);
        }

        cleanup();
        resolve(dataUrl);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    video.src = sourceUrl;
  });
}

/**
 * Convert Base64 Data URL to a File for upload
 */
export function dataUrlToFile(dataUrl: string, filename = "thumbnail.jpg"): File {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

/**
 * Get cached poster data URL if already extracted
 */
export function getCachedVideoPoster(videoUrl: string): string | undefined {
  return thumbnailPosterCache.get(videoUrl);
}
