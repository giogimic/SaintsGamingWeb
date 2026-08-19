/**
 * Saints Gaming — LPC External Pack Importer (asset pipeline)
 *
 * Reads APPROVED character packs from an external LPC staging workspace (see
 * AGENTS.md / the `.assets-gen/` generator + review tool) and registers each
 * pack as a CHARACTER asset in the project's asset library via the same
 * ingestAsset() pipeline used by manual Studio uploads.
 *
 * Safety boundaries:
 *  - Only reads the single `approvedDir` path it is given — never walks up,
 *    never touches pending/rejected/source-export folders.
 *  - Never runs automatically; must be invoked explicitly (see
 *    scripts/import-lpc-packs.ts).
 *  - Requires a real `userId` to attribute the upload to — does not create or
 *    guess a "system" user.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { ingestAsset } from "@/web/lib/assetUpload";
import { isValidCharacterBaseBodyType } from "@/shared/game/assetImportProfiles";

export const DEFAULT_LPC_APPROVED_DIR = path.resolve(process.cwd(), "..", ".assets-gen", "review", "approved");

export interface LpcPackImportOptions {
  /** Absolute path to `.assets-gen/review/approved/` (or equivalent). */
  approvedDir: string;
  userId: string;
  gameId?: string;
  visibility?: "PERSONAL" | "PROJECT" | "COMMUNITY" | "PUBLIC";
}

export interface LpcPackImportResult {
  imported: { packId: string; assetId: string }[];
  skipped: { packId: string; reason: string }[];
}

export interface LpcApprovedPackStatus {
  approvedDir: string;
  exists: boolean;
  packCount: number;
  packIds: string[];
}

/** Reads width/height from a PNG's IHDR chunk without any image-processing dependency. */
function readPngDimensions(buffer: Buffer): { width: number; height: number } | null {
  const isPng =
    buffer.length >= 24 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47;
  if (!isPng) return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function normalizeBodyType(bodyType?: string): string | undefined {
  if (!bodyType) return undefined;
  const lower = bodyType.trim().toLowerCase();
  return isValidCharacterBaseBodyType(lower) ? lower : undefined;
}

export async function getApprovedLpcPackStatus(approvedDir = DEFAULT_LPC_APPROVED_DIR): Promise<LpcApprovedPackStatus> {
  let entries: string[] = [];
  try {
    entries = await fs.readdir(approvedDir);
  } catch {
    return { approvedDir, exists: false, packCount: 0, packIds: [] };
  }

  const packIds: string[] = [];
  for (const entry of entries) {
    const packDir = path.join(approvedDir, entry);
    const stat = await fs.stat(packDir).catch(() => null);
    if (stat?.isDirectory()) {
      packIds.push(entry);
    }
  }

  packIds.sort((a, b) => a.localeCompare(b));
  return {
    approvedDir,
    exists: true,
    packCount: packIds.length,
    packIds,
  };
}

/**
 * Imports every approved pack folder as a single CHARACTER asset (the full
 * composited spritesheet). The external generator currently exports one
 * composited PNG per character rather than separate per-layer PNGs, so this
 * does not (yet) split packs into modular components — it registers the
 * whole approved character with full attribution intact.
 */
export async function importApprovedLpcPacks(options: LpcPackImportOptions): Promise<LpcPackImportResult> {
  const { approvedDir, userId, gameId = "tuxemon", visibility = "COMMUNITY" } = options;
  const result: LpcPackImportResult = { imported: [], skipped: [] };

  let entries: string[];
  try {
    entries = await fs.readdir(approvedDir);
  } catch (err: any) {
    throw new Error(`Cannot read approved pack directory "${approvedDir}": ${err.message}`);
  }

  for (const packId of entries) {
    const packDir = path.join(approvedDir, packId);
    const stat = await fs.stat(packDir).catch(() => null);
    if (!stat || !stat.isDirectory()) continue;

    const files = await fs.readdir(packDir);
    const pngFile = files.find((f) => f.toLowerCase().endsWith(".png"));
    const jsonFile = files.find((f) => f.toLowerCase().endsWith(".json"));

    if (!pngFile) {
      result.skipped.push({ packId, reason: "No PNG spritesheet found in pack." });
      continue;
    }

    let meta: any = {};
    if (jsonFile) {
      try {
        const raw = await fs.readFile(path.join(packDir, jsonFile), "utf-8");
        meta = JSON.parse(raw);
      } catch {
        // Malformed metadata shouldn't block import; proceed with defaults below.
      }
    }

    const pngBuffer = await fs.readFile(path.join(packDir, pngFile));
    const dims = readPngDimensions(pngBuffer);
    const file = new File([new Uint8Array(pngBuffer)], pngFile, { type: "image/png" });

    const presetTitle = meta.preset_title || meta.preset || packId;
    const bodyType = normalizeBodyType(meta.bodyType);
    const credits = Array.isArray(meta.credits) ? meta.credits : undefined;
    const faction = meta.category?.faction;
    const role = meta.category?.role;

    try {
      const ingestResult = await ingestAsset({
        userId,
        file,
        gameId,
        name: `${presetTitle} (${packId})`,
        type: "CHARACTER",
        category: "actor",
        tags: [
          "lpc-import",
          "external-pack",
          meta.preset ? `archetype:${meta.preset}` : "",
          faction ? `faction:${faction}` : "",
          role ? `role:${role}` : "",
        ].filter(Boolean),
        width: dims?.width,
        height: dims?.height,
        importProfile: "character",
        slotRole: "walk",
        baseBodyType: bodyType,
        credits,
        bundleId: packId,
        visibility,
        moderationStatus: "APPROVED",
        createUsable: true,
      });

      if (!ingestResult.success || !ingestResult.gameAsset) {
        result.skipped.push({ packId, reason: ingestResult.error || "Ingestion failed." });
        continue;
      }

      result.imported.push({ packId, assetId: ingestResult.gameAsset.id });
    } catch (err: any) {
      result.skipped.push({ packId, reason: err.message || "Unknown ingestion error." });
    }
  }

  return result;
}
