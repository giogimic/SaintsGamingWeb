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

const MAX_FILE_SIZE = parseInt(
  process.env.MAX_UPLOAD_SIZE || "5242880",
  10
); // 5MB default

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

/** Validate file magic bytes match the MIME type (basic check) */
function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false;

  if (mimeType === "image/webp") {
    const isRiff = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46; // RIFF
    const isWebp = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50; // WEBP
    return isRiff && isWebp;
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
