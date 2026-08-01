import { describe, expect, it } from "vitest";
import {
  isS3Enabled,
  localPathFromUploadUrl,
  normalizeCdnBaseUrl,
  objectKeyForFilename,
  objectKeyFromStoredUrl,
  publicUrlForFilename,
  readS3Env,
} from "./s3-storage-utils";

describe("readS3Env / isS3Enabled", () => {
  it("is disabled when bucket unset", () => {
    expect(
      isS3Enabled(
        readS3Env({
          S3_ACCESS_KEY_ID: "a",
          S3_SECRET_ACCESS_KEY: "b",
          CDN_BASE_URL: "https://cdn.example.com",
        })
      )
    ).toBe(false);
  });

  it("is enabled when bucket, credentials, and CDN are set", () => {
    expect(
      isS3Enabled(
        readS3Env({
          S3_BUCKET: "saints-uploads",
          S3_ACCESS_KEY_ID: "a",
          S3_SECRET_ACCESS_KEY: "b",
          CDN_BASE_URL: "https://cdn.example.com/",
        })
      )
    ).toBe(true);
  });

  it("reads force path style and endpoint", () => {
    const cfg = readS3Env({
      S3_BUCKET: "b",
      S3_ENDPOINT: "http://minio:9000",
      S3_FORCE_PATH_STYLE: "true",
      S3_ACCESS_KEY_ID: "a",
      S3_SECRET_ACCESS_KEY: "s",
      CDN_BASE_URL: "https://cdn.example.com",
    });
    expect(cfg.endpoint).toBe("http://minio:9000");
    expect(cfg.forcePathStyle).toBe(true);
  });
});

describe("URL helpers", () => {
  it("builds object keys and CDN URLs", () => {
    expect(objectKeyForFilename("123-ab.png")).toBe("uploads/123-ab.png");
    expect(publicUrlForFilename("123-ab.png", "https://cdn.example.com/")).toBe(
      "https://cdn.example.com/uploads/123-ab.png"
    );
    expect(normalizeCdnBaseUrl("https://cdn.example.com///")).toBe(
      "https://cdn.example.com"
    );
  });

  it("resolves keys from CDN and relative URLs", () => {
    expect(
      objectKeyFromStoredUrl(
        "https://cdn.example.com/uploads/1.png",
        "https://cdn.example.com"
      )
    ).toBe("uploads/1.png");
    expect(objectKeyFromStoredUrl("/uploads/1.png")).toBe("uploads/1.png");
    expect(objectKeyFromStoredUrl("https://other.com/x.png", "https://cdn.example.com")).toBe(
      null
    );
  });

  it("maps relative upload URLs to public/ disk paths", () => {
    expect(localPathFromUploadUrl("/uploads/1.png", "/app")).toBe(
      "/app/public/uploads/1.png"
    );
    expect(localPathFromUploadUrl("https://cdn.example.com/uploads/1.png")).toBe(null);
  });
});
