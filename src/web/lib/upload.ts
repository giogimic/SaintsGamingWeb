/**
 * Saints Gaming — File Upload Utilities
 *
 * Handles image uploads with security validation.
 * Stores locally initially; swap to S3-compatible storage later.
 */

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

const ALLOWED_ARCHIVE_MIME_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/x-7z-compressed",
  "application/vnd.rar",
  "application/x-rar-compressed",
  "application/x-tar",
  "application/x-bzip2",
  "application/gzip",
];

const ALLOWED_SOCIAL_MIME_TYPES = [
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
  filename?: string;
  mimeType?: string;
  sizeBytes?: number;
  error?: string;
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

/** Upload a file from a FormData File object */
export async function uploadFile(file: File): Promise<UploadResult> {
  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      success: false,
      error: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`,
    };
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: `File too large. Maximum size: ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}MB`,
    };
  }

  // Validate the original filename
  const sanitized = sanitizeFilename(file.name);
  const uniqueName = generateUniqueFilename(sanitized);

  // Ensure the upload directory exists
  const uploadPath = path.join(/*turbopackIgnore: true*/ process.cwd(), UPLOAD_DIR);
  await mkdir(uploadPath, { recursive: true });

  // Write the file
  const filePath = path.join(uploadPath, uniqueName);
  const buffer = Buffer.from(await file.arrayBuffer());

  // Double-check: validate magic bytes match the claimed MIME type
  if (!validateMagicBytes(buffer, file.type)) {
    return {
      success: false,
      error: "File content does not match its declared type",
    };
  }

  await writeFile(filePath, buffer);

  // Return the public URL path (relative to /public)
  const url = `/uploads/${uniqueName}`;

  return {
    success: true,
    url,
    filename: sanitized,
    mimeType: file.type,
    sizeBytes: file.size,
  };
}

/** Upload a social media file (allows video/mp4, video/webm and up to 10MB) */
export async function uploadSocialMedia(file: File): Promise<UploadResult> {
  // Validate MIME type
  if (!ALLOWED_SOCIAL_MIME_TYPES.includes(file.type)) {
    return {
      success: false,
      error: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_SOCIAL_MIME_TYPES.join(", ")}`,
    };
  }

  // Validate file size
  if (file.size > MAX_SOCIAL_FILE_SIZE) {
    return {
      success: false,
      error: `File too large. Maximum size: ${(MAX_SOCIAL_FILE_SIZE / 1024 / 1024).toFixed(1)}MB`,
    };
  }

  // Validate the original filename
  const sanitized = sanitizeFilename(file.name);
  const uniqueName = generateUniqueFilename(sanitized);

  // Ensure the upload directory exists
  const uploadPath = path.join(/*turbopackIgnore: true*/ process.cwd(), UPLOAD_DIR);
  await mkdir(uploadPath, { recursive: true });

  // Write the file
  const filePath = path.join(uploadPath, uniqueName);
  const buffer = Buffer.from(await file.arrayBuffer());

  // Double-check: validate magic bytes match the claimed MIME type
  if (!validateMagicBytes(buffer, file.type)) {
    return {
      success: false,
      error: "File content does not match its declared type",
    };
  }

  await writeFile(filePath, buffer);

  // Return the public URL path (relative to /public)
  const url = `/uploads/${uniqueName}`;

  return {
    success: true,
    url,
    filename: sanitized,
    mimeType: file.type,
    sizeBytes: file.size,
  };
}

/** Validate file magic bytes match the MIME type (basic check) */
function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false;

  if (mimeType === "image/webp") {
    const isRiff = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46; // RIFF
    const isWebp = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50; // WEBP
    return isRiff && isWebp;
  }

  if (mimeType === "video/mp4") {
    // Check for "ftyp" at offset 4
    if (buffer.length < 8) return false;
    return buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70; // "ftyp"
  }

  if (mimeType === "video/webm") {
    return buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3; // EBML Header
  }

  // Archive checks
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
      return true; // Weak fallback if smaller
    }
    return false;
  }

  const signatures: Record<string, number[][]> = {
    "image/jpeg": [[0xff, 0xd8, 0xff]],
    "image/png": [[0x89, 0x50, 0x4e, 0x47]],
    "image/gif": [
      [0x47, 0x49, 0x46, 0x38], // GIF8
    ],
  };

  const sigs = signatures[mimeType];
  if (!sigs) return false; // Fail secure: unknown MIME type signature fails

  return sigs.some((sig) =>
    sig.every((byte, i) => buffer[i] === byte)
  );
}

/** Delete an uploaded file (for cleanup) */
export async function deleteUploadedFile(url: string): Promise<boolean> {
  try {
    const { unlink } = await import("fs/promises");
    const filePath = path.join(/*turbopackIgnore: true*/ process.cwd(), "public", url);
    await unlink(filePath);
    return true;
  } catch {
    return false;
  }
}
