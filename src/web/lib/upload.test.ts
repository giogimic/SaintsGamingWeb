import { describe, it, expect } from "vitest";
import { 
  uploadFile, 
  uploadSocialMedia, 
  deleteUploadedFile,
  ALLOWED_IMAGE_MIME_TYPES, 
  ALLOWED_VIDEO_MIME_TYPES, 
  ALLOWED_ARCHIVE_MIME_TYPES, 
  ALLOWED_SOCIAL_MIME_TYPES 
} from "./upload";

describe("Upload Module & Security Validation", () => {
  it("exports comprehensive allowed MIME types for social media", () => {
    expect(ALLOWED_IMAGE_MIME_TYPES).toContain("image/jpeg");
    expect(ALLOWED_IMAGE_MIME_TYPES).toContain("image/png");
    expect(ALLOWED_IMAGE_MIME_TYPES).toContain("image/gif");
    expect(ALLOWED_IMAGE_MIME_TYPES).toContain("image/webp");

    expect(ALLOWED_VIDEO_MIME_TYPES).toContain("video/mp4");
    expect(ALLOWED_VIDEO_MIME_TYPES).toContain("video/webm");
    expect(ALLOWED_VIDEO_MIME_TYPES).toContain("video/quicktime");
    expect(ALLOWED_VIDEO_MIME_TYPES).toContain("video/ogg");

    expect(ALLOWED_ARCHIVE_MIME_TYPES).toContain("application/zip");

    ALLOWED_IMAGE_MIME_TYPES.forEach(t => expect(ALLOWED_SOCIAL_MIME_TYPES).toContain(t));
    ALLOWED_VIDEO_MIME_TYPES.forEach(t => expect(ALLOWED_SOCIAL_MIME_TYPES).toContain(t));
    ALLOWED_ARCHIVE_MIME_TYPES.forEach(t => expect(ALLOWED_SOCIAL_MIME_TYPES).toContain(t));
  });

  it("rejects unauthorized file MIME types", async () => {
    const invalidFile = new File(["console.log('malicious')"], "exploit.js", { type: "application/javascript" });
    const result = await uploadSocialMedia(invalidFile);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid file type");
  });

  it("rejects files whose magic bytes do not match declared MIME type (content spoofing)", async () => {
    const spoofedFile = new File(["fake png content that is not actually png"], "fake.png", { type: "image/png" });
    const result = await uploadSocialMedia(spoofedFile);
    expect(result.success).toBe(false);
    expect(result.error).toContain("does not match its declared type");
  });

  it("rejects oversized images (>15MB) in social media upload", async () => {
    // 16MB buffer
    const largeBuffer = new Uint8Array(16 * 1024 * 1024);
    // Valid PNG magic bytes
    largeBuffer[0] = 0x89;
    largeBuffer[1] = 0x50;
    largeBuffer[2] = 0x4e;
    largeBuffer[3] = 0x47;
    const oversizedFile = new File([largeBuffer], "huge.png", { type: "image/png" });
    const result = await uploadSocialMedia(oversizedFile);
    expect(result.success).toBe(false);
    expect(result.error).toContain("File too large");
  });

  it("successfully validates and uploads a legitimate PNG image", async () => {
    const validPngBuffer = new Uint8Array(64);
    validPngBuffer[0] = 0x89;
    validPngBuffer[1] = 0x50;
    validPngBuffer[2] = 0x4e;
    validPngBuffer[3] = 0x47;

    const file = new File([validPngBuffer], "screenshot.png", { type: "image/png" });
    const result = await uploadSocialMedia(file);
    expect(result.success).toBe(true);
    expect(result.url).toBeDefined();
    expect(result.mimeType).toBe("image/png");
    if (result.url) await deleteUploadedFile(result.url);
  });

  it("successfully validates and uploads a legitimate MP4 video", async () => {
    const validMp4Buffer = new Uint8Array(64);
    // bytes 4-7 = "ftyp"
    validMp4Buffer[4] = 0x66; // 'f'
    validMp4Buffer[5] = 0x74; // 't'
    validMp4Buffer[6] = 0x79; // 'y'
    validMp4Buffer[7] = 0x70; // 'p'

    const file = new File([validMp4Buffer], "clip.mp4", { type: "video/mp4" });
    const result = await uploadSocialMedia(file);
    expect(result.success).toBe(true);
    expect(result.url).toBeDefined();
    expect(result.mimeType).toBe("video/mp4");
    if (result.url) await deleteUploadedFile(result.url);
  });
});
