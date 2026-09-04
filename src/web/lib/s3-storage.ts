import "server-only";

/**
 * Optional S3-compatible object storage (AWS S3, MinIO, Cloudflare R2, etc.).
 * Disabled unless S3_BUCKET + credentials + CDN_BASE_URL are set.
 */

import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  isS3Enabled,
  objectKeyForFilename,
  objectKeyFromStoredUrl,
  publicUrlForFilename,
  readS3Env,
  type S3EnvConfig,
} from "./s3-storage-utils";

export {
  isS3Enabled,
  objectKeyForFilename,
  objectKeyFromStoredUrl,
  publicUrlForFilename,
  readS3Env,
};

let client: S3Client | null = null;
let clientConfigKey: string | null = null;

function configKey(config: S3EnvConfig): string {
  return [
    config.bucket,
    config.region,
    config.endpoint || "",
    config.forcePathStyle ? "1" : "0",
    config.accessKeyId,
  ].join("|");
}

function getClient(config: S3EnvConfig = readS3Env()): S3Client | null {
  if (!isS3Enabled(config)) return null;
  const key = configKey(config);
  if (client && clientConfigKey === key) return client;

  client = new S3Client({
    region: config.region || "us-east-1",
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId!,
      secretAccessKey: config.secretAccessKey!,
    },
  });
  clientConfigKey = key;
  return client;
}

export async function putUploadObject(input: {
  uniqueName: string;
  body: Buffer;
  contentType: string;
}): Promise<{ url: string; key: string } | null> {
  const config = readS3Env();
  const s3 = getClient(config);
  if (!s3 || !config.bucket || !config.cdnBaseUrl) return null;

  const key = objectKeyForFilename(input.uniqueName);
  await s3.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: input.body,
      ContentType: input.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return {
    key,
    url: publicUrlForFilename(input.uniqueName, config.cdnBaseUrl),
  };
}

export async function deleteUploadObject(url: string): Promise<boolean> {
  const config = readS3Env();
  const s3 = getClient(config);
  if (!s3 || !config.bucket) return false;

  const key = objectKeyFromStoredUrl(url, config.cdnBaseUrl);
  if (!key) return false;

  await s3.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    })
  );
  return true;
}
