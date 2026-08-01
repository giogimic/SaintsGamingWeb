/**
 * Upload legacy local files from public/uploads (or UPLOAD_DIR) into S3.
 *
 * Usage:
 *   npx tsx scripts/migrate-local-uploads-to-s3.ts --dry-run
 *   npx tsx scripts/migrate-local-uploads-to-s3.ts
 *   npx tsx scripts/migrate-local-uploads-to-s3.ts --skip-existing
 *
 * Requires S3_BUCKET + credentials + CDN_BASE_URL (same as runtime uploads).
 * Does NOT rewrite DB URLs — keys stay uploads/<filename> so CDN paths match
 * relative /uploads/... URLs when the CDN fronts that prefix.
 */

import { readdir, readFile, stat } from "fs/promises";
import path from "path";
import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  isS3Enabled,
  objectKeyForFilename,
  publicUrlForFilename,
  readS3Env,
} from "../src/web/lib/s3-storage-utils";
import { putUploadObject } from "../src/web/lib/s3-storage";

const dryRun = process.argv.includes("--dry-run");
const skipExisting = process.argv.includes("--skip-existing");

function guessContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".zip":
      return "application/zip";
    case ".7z":
      return "application/x-7z-compressed";
    case ".rar":
      return "application/vnd.rar";
    case ".gz":
      return "application/gzip";
    case ".tar":
      return "application/x-tar";
    default:
      return "application/octet-stream";
  }
}

async function listFilesRecursive(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await listFilesRecursive(full)));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

async function objectExists(
  client: S3Client,
  bucket: string,
  key: string
): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const uploadDir = process.env.UPLOAD_DIR || "public/uploads";
  const absDir = path.join(process.cwd(), uploadDir);
  const config = readS3Env();

  console.log(`[uploads→s3] dir=${absDir}`);
  console.log(`[uploads→s3] dryRun=${dryRun} skipExisting=${skipExisting}`);

  if (!isS3Enabled(config) && !dryRun) {
    console.error(
      "[uploads→s3] S3 not configured. Set S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, CDN_BASE_URL."
    );
    process.exitCode = 1;
    return;
  }

  if (dryRun && !isS3Enabled(config)) {
    console.warn("[uploads→s3] S3 env incomplete — listing local files only.");
  }

  const files = await listFilesRecursive(absDir);
  console.log(`[uploads→s3] found ${files.length} file(s)`);

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  const client =
    isS3Enabled(config) && skipExisting
      ? new S3Client({
          region: config.region || "us-east-1",
          endpoint: config.endpoint,
          forcePathStyle: config.forcePathStyle,
          credentials: {
            accessKeyId: config.accessKeyId!,
            secretAccessKey: config.secretAccessKey!,
          },
        })
      : null;

  for (const filePath of files) {
    const uniqueName = path.relative(absDir, filePath).split(path.sep).join("/");
    if (!uniqueName || uniqueName.includes("..")) {
      skipped++;
      continue;
    }

    const key = objectKeyForFilename(uniqueName);
    const cdnUrl = config.cdnBaseUrl
      ? publicUrlForFilename(uniqueName, config.cdnBaseUrl)
      : `/uploads/${uniqueName}`;

    if (skipExisting && client && config.bucket) {
      if (await objectExists(client, config.bucket, key)) {
        skipped++;
        continue;
      }
    }

    if (dryRun) {
      const size = (await stat(filePath)).size;
      console.log(`[dry-run] ${uniqueName} → ${key} (${size} bytes) url=${cdnUrl}`);
      uploaded++;
      continue;
    }

    try {
      const body = await readFile(filePath);
      const stored = await putUploadObject({
        uniqueName,
        body,
        contentType: guessContentType(uniqueName),
      });
      if (!stored) {
        failed++;
        console.error(`[fail] ${uniqueName}: put returned null`);
        continue;
      }
      uploaded++;
      if (uploaded % 25 === 0) {
        console.log(`[uploads→s3] uploaded ${uploaded}/${files.length}...`);
      }
    } catch (err) {
      failed++;
      console.error(`[fail] ${uniqueName}:`, err);
    }
  }

  console.log(
    JSON.stringify(
      {
        dir: absDir,
        dryRun,
        found: files.length,
        uploaded,
        skipped,
        failed,
        s3Enabled: isS3Enabled(config),
      },
      null,
      2
    )
  );

  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
