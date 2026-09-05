/**
 * Pure helpers for optional S3/CDN uploads (unit-testable without AWS SDK).
 */

export interface S3EnvConfig {
  bucket?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  cdnBaseUrl?: string;
}

export function readS3Env(
  env: Record<string, string | undefined> = process.env
): S3EnvConfig {
  return {
    bucket: env.S3_BUCKET?.trim() || undefined,
    region: env.S3_REGION?.trim() || "us-east-1",
    accessKeyId: env.S3_ACCESS_KEY_ID?.trim() || undefined,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY?.trim() || undefined,
    endpoint: env.S3_ENDPOINT?.trim() || undefined,
    forcePathStyle:
      env.S3_FORCE_PATH_STYLE === "1" ||
      env.S3_FORCE_PATH_STYLE === "true",
    cdnBaseUrl: (env.CDN_BASE_URL || env.SERAPHT_PUBLIC_CDN_BASE_URL)?.trim() || undefined,
  };
}

/** S3 is enabled when bucket + credentials + CDN base URL are set. */
export function isS3Enabled(config: S3EnvConfig = readS3Env()): boolean {
  return Boolean(
    config.bucket &&
      config.accessKeyId &&
      config.secretAccessKey &&
      config.cdnBaseUrl
  );
}

export function normalizeCdnBaseUrl(base: string): string {
  return base.replace(/\/+$/, "");
}

/** Object key under the bucket (always uploads/<filename>). */
export function objectKeyForFilename(uniqueName: string): string {
  const safe = uniqueName.replace(/^\/+/, "").replace(/\.\./g, "");
  return `uploads/${safe}`;
}

/** Public URL returned to clients when S3/CDN is enabled. */
export function publicUrlForFilename(uniqueName: string, cdnBaseUrl: string): string {
  return `${normalizeCdnBaseUrl(cdnBaseUrl)}/${objectKeyForFilename(uniqueName)}`;
}

/**
 * Resolve an S3 object key from a stored URL (CDN absolute or /uploads/... relative).
 * Returns null when the URL is not an upload we manage.
 */
export function objectKeyFromStoredUrl(
  url: string,
  cdnBaseUrl?: string
): string | null {
  if (!url) return null;

  if (cdnBaseUrl) {
    const base = normalizeCdnBaseUrl(cdnBaseUrl);
    if (url.startsWith(`${base}/`)) {
      const key = url.slice(base.length + 1);
      return key.startsWith("uploads/") ? key : null;
    }
  }

  if (url.startsWith("/uploads/")) {
    return objectKeyForFilename(url.slice("/uploads/".length));
  }

  // Absolute URL whose path is /uploads/...
  try {
    const parsed = new URL(url);
    if (parsed.pathname.startsWith("/uploads/")) {
      return objectKeyForFilename(parsed.pathname.slice("/uploads/".length));
    }
  } catch {
    /* not a URL */
  }

  return null;
}

/** Local disk path for a relative /uploads/... URL. */
export function localPathFromUploadUrl(url: string, cwd: string = process.cwd()): string | null {
  if (!url.startsWith("/uploads/")) return null;
  const relative = url.replace(/^\/+/, ""); // uploads/foo.jpg
  return pathJoin(cwd, "public", relative);
}

function pathJoin(...parts: string[]): string {
  // Avoid Node path so this stays pure for simple tests
  return parts
    .filter(Boolean)
    .map((p, i) => (i === 0 ? p.replace(/\/+$/, "") : p.replace(/^\/+|\/+$/g, "")))
    .join("/");
}
