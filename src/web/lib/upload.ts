/**
 * Saints Gaming — File Upload Utilities
 *
 * Handles image/archive uploads with security validation.
 * Default: local disk under public/uploads.
 * Optional: S3-compatible storage when S3_BUCKET + credentials + CDN_BASE_URL are set.
 * All upload API routes and server actions must go through this module.
 */

import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import crypto from "crypto";
import {
  deleteUploadObject,
  isS3Enabled,
  putUploadObject,
} from "./s3-storage";
import { localPathFromUploadUrl } from "./s3-storage-utils";

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export const ALLOWED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/ogg",
  "video/x-matroska",
];

export const ALLOWED_ARCHIVE_MIME_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/x-7z-compressed",
  "application/vnd.rar",
  "application/x-rar-compressed",
  "application/x-tar",
  "application/x-bzip2",
  "application/gzip",
];

export const ALLOWED_SOCIAL_MIME_TYPES = [
  ...ALLOWED_IMAGE_MIME_TYPES,
  ...ALLOWED_VIDEO_MIME_TYPES,
  ...ALLOWED_ARCHIVE_MIME_TYPES,
];

const MAX_FILE_SIZE = parseInt(
  process.env.MAX_UPLOAD_SIZE || "5242880",
  10
); // 5MB default

const MAX_SOCIAL_FILE_SIZE = 250 * 1024 * 1024; // 250MB

const UPLOAD_DIR = process.env.UPLOAD_DIR || "public/uploads";

export interface UploadResult {
  success: boolean;
  url?: string;
  previewUrl?: string;
  posterUrl?: string;
  durationSec?: number;
  width?: number;
  height?: number;
  aspectRatio?: string;
  isPortrait?: boolean;
  filename?: string;
  mimeType?: string;
  sizeBytes?: number;
  error?: string;
  storage?: "local" | "s3";
}

/** Sanitize a filename — strip path traversal, special chars */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .slice(0, 128);
}

/** Generate a unique filename to prevent collisions */
function generateUniqueFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const hash = crypto.randomBytes(8).toString("hex");
  const timestamp = Date.now();
  return `${timestamp}-${hash}${ext}`;
}

async function persistUpload(input: {
  uniqueName: string;
  buffer: Buffer;
  contentType: string;
  sanitizedName: string;
  sizeBytes: number;
}): Promise<UploadResult> {
  if (isS3Enabled()) {
    try {
      const stored = await putUploadObject({
        uniqueName: input.uniqueName,
        body: input.buffer,
        contentType: input.contentType,
      });
      if (stored) {
        return {
          success: true,
          url: stored.url,
          filename: input.sanitizedName,
          mimeType: input.contentType,
          sizeBytes: input.sizeBytes,
          storage: "s3",
        };
      }
    } catch (err) {
      console.error("[upload] S3 put failed, falling back to local:", err);
    }
  }

  const uploadPath = path.join(/*turbopackIgnore: true*/ process.cwd(), UPLOAD_DIR);
  await mkdir(uploadPath, { recursive: true });
  const filePath = path.join(uploadPath, input.uniqueName);
  await writeFile(filePath, input.buffer);

  return {
    success: true,
    url: `/uploads/${input.uniqueName}`,
    filename: input.sanitizedName,
    mimeType: input.contentType,
    sizeBytes: input.sizeBytes,
    storage: "local",
  };
}

/** Upload a standard image file from a FormData File object */
export async function uploadFile(file: File): Promise<UploadResult> {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
    return {
      success: false,
      error: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_IMAGE_MIME_TYPES.join(", ")}`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: `File too large. Maximum size: ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}MB`,
    };
  }

  const sanitized = sanitizeFilename(file.name);
  const uniqueName = generateUniqueFilename(sanitized);
  const buffer = Buffer.from(await file.arrayBuffer());

  if (!validateMagicBytes(buffer, file.type)) {
    return {
      success: false,
      error: "File content does not match its declared type",
    };
  }

  return persistUpload({
    uniqueName,
    buffer,
    contentType: file.type,
    sanitizedName: sanitized,
    sizeBytes: file.size,
  });
}

export function inferMimeType(fileName: string, providedType?: string): string {
  if (providedType && providedType !== 'application/octet-stream' && providedType.trim() !== '') {
    return providedType.toLowerCase();
  }
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.mp4':
    case '.m4v':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';
    case '.mov':
    case '.qt':
      return 'video/quicktime';
    case '.mkv':
      return 'video/x-matroska';
    case '.ogg':
    case '.ogv':
      return 'video/ogg';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.zip':
      return 'application/zip';
    case '.rar':
      return 'application/vnd.rar';
    case '.7z':
      return 'application/x-7z-compressed';
    case '.tar':
      return 'application/x-tar';
    case '.gz':
      return 'application/gzip';
    case '.bz2':
      return 'application/x-bzip2';
    default:
      return providedType || 'application/octet-stream';
  }
}

/** Upload a social media file (images up to 15MB, videos/archives up to 250MB) */
export async function uploadSocialMedia(file: File): Promise<UploadResult> {
  const mimeType = inferMimeType(file.name, file.type);

  if (!ALLOWED_SOCIAL_MIME_TYPES.includes(mimeType)) {
    return {
      success: false,
      error: `Invalid file type: ${mimeType}. Allowed: images, videos, and archives.`,
    };
  }

  const isImage = ALLOWED_IMAGE_MIME_TYPES.includes(mimeType);
  const isVideoFile = ALLOWED_VIDEO_MIME_TYPES.includes(mimeType);
  const maxSize = isImage ? 15 * 1024 * 1024 : MAX_SOCIAL_FILE_SIZE;

  if (file.size > maxSize) {
    return {
      success: false,
      error: `File too large. Maximum size for this type: ${(maxSize / 1024 / 1024).toFixed(0)}MB`,
    };
  }

  const sanitized = sanitizeFilename(file.name);
  const uniqueName = generateUniqueFilename(sanitized);
  const buffer = Buffer.from(await file.arrayBuffer());

  if (!validateMagicBytes(buffer, mimeType)) {
    return {
      success: false,
      error: "File content does not match its declared type",
    };
  }

  const baseResult = await persistUpload({
    uniqueName,
    buffer,
    contentType: mimeType,
    sanitizedName: sanitized,
    sizeBytes: file.size,
  });

  if (!baseResult.success) {
    return baseResult;
  }

  // If uploaded file is a video, run through the video pipeline for FastStart & WebP poster
  if (isVideoFile) {
    try {
      const uploadPath = path.join(/*turbopackIgnore: true*/ process.cwd(), UPLOAD_DIR);
      const localFilePath = path.join(uploadPath, uniqueName);
      
      const { videoPipeline } = await import("@/server/media/videoPipeline");
      const pipelineResult = await videoPipeline.process({
        filePath: localFilePath,
        uniqueName,
        originalName: sanitized,
        mimeType,
        fileSize: file.size,
      });

      return {
        ...baseResult,
        url: pipelineResult.optimizedUrl || baseResult.url,
        previewUrl: pipelineResult.previewUrl || baseResult.url,
        posterUrl: pipelineResult.posterUrl,
        durationSec: pipelineResult.durationSec,
        width: pipelineResult.width,
        height: pipelineResult.height,
        aspectRatio: pipelineResult.aspectRatio,
        isPortrait: pipelineResult.isPortrait,
        sizeBytes: pipelineResult.sizeBytes || baseResult.sizeBytes,
      };
    } catch (err) {
      console.warn("[uploadSocialMedia] Video pipeline processing warning, fallback to original:", err);
      return baseResult;
    }
  }

  return baseResult;
}

/** Validate file magic bytes match the MIME type */
function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 8) return false;

  // WebP: RIFF....WEBP
  if (mimeType === "image/webp") {
    if (buffer.length < 12) return false;
    const isRiff = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46; // RIFF
    const isWebp = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50; // WEBP
    return isRiff && isWebp;
  }

  // MP4 & QuickTime MOV
  if (mimeType === "video/mp4" || mimeType === "video/quicktime") {
    if (buffer.length < 8) return false;
    const boxType = buffer.toString("latin1", 4, 8);
    const validBoxTypes = ["ftyp", "moov", "mdat", "wide", "free", "skip", "pnot", "pict"];
    if (validBoxTypes.includes(boxType)) return true;
    // Check if ftyp appears anywhere in first 32 bytes
    const headerSlice = buffer.subarray(0, Math.min(32, buffer.length)).toString("latin1");
    return headerSlice.includes("ftyp") || headerSlice.includes("moov") || headerSlice.includes("mdat");
  }

  // WebM & MKV (EBML Header)
  if (mimeType === "video/webm" || mimeType === "video/x-matroska") {
    return buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3;
  }

  // OGG Video / Audio
  if (mimeType === "video/ogg" || mimeType === "application/ogg") {
    return buffer[0] === 0x4F && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53; // OggS
  }

  // Archives
  if (ALLOWED_ARCHIVE_MIME_TYPES.includes(mimeType)) {
    if (mimeType === "application/zip" || mimeType === "application/x-zip-compressed") {
      return buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04;
    }
    if (mimeType === "application/x-7z-compressed") {
      return buffer[0] === 0x37 && buffer[1] === 0x7A && buffer[2] === 0xBC && buffer[3] === 0xAF;
    }
    if (mimeType === "application/vnd.rar" || mimeType === "application/x-rar-compressed") {
      return buffer[0] === 0x52 && buffer[1] === 0x61 && buffer[2] === 0x72 && buffer[3] === 0x21;
    }
    if (mimeType === "application/x-bzip2") {
      return buffer[0] === 0x42 && buffer[1] === 0x5A && buffer[2] === 0x68;
    }
    if (mimeType === "application/gzip") {
      return buffer[0] === 0x1F && buffer[1] === 0x8B;
    }
    if (mimeType === "application/x-tar") {
      if (buffer.length >= 262) {
        return buffer[257] === 0x75 && buffer[258] === 0x73 && buffer[259] === 0x74 && buffer[260] === 0x61 && buffer[261] === 0x72;
      }
      return true;
    }
    return false;
  }

  const signatures: Record<string, number[][]> = {
    "image/jpeg": [[0xff, 0xd8, 0xff]],
    "image/png": [[0x89, 0x50, 0x4e, 0x47]],
    "image/gif": [
      [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
      [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
    ],
  };

  const sigs = signatures[mimeType];
  if (!sigs) return false;

  return sigs.some((sig) =>
    sig.every((byte, i) => buffer[i] === byte)
  );
}

/** Delete an uploaded file (local and/or S3). */
export async function deleteUploadedFile(url: string): Promise<boolean> {
  let deleted = false;

  if (isS3Enabled()) {
    try {
      deleted = (await deleteUploadObject(url)) || deleted;
    } catch (err) {
      console.error("[upload] S3 delete failed:", err);
    }
  }

  const localPath = localPathFromUploadUrl(url);
  if (localPath) {
    try {
      await unlink(localPath);
      deleted = true;
    } catch {
      /* missing local file is fine (CDN-only object) */
    }
  } else if (!isS3Enabled()) {
    // Legacy fallback for odd relative paths
    try {
      const filePath = path.join(
        /*turbopackIgnore: true*/ process.cwd(),
        "public",
        url.replace(/^\/+/, "")
      );
      await unlink(filePath);
      deleted = true;
    } catch {
      return deleted;
    }
  }

  return deleted;
}
