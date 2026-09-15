"use server";

import { prisma } from "@/web/lib/prisma";
import { revalidatePath } from "next/cache";
import { checkAdminPermission } from "../admin/game-admin";
import { getOrphanedReferences } from "./cross-references";
import { resolveWorldDependencies } from "./world-resolver";

export interface ValidationGateResult {
  valid: boolean;
  errorCount: number;
  warningCount: number;
  errors: string[];
  warnings: string[];
}

export interface ContentSummary {
  dungeonCount: number;
  shopCount: number;
  mountCount: number;
  worldEventCount: number;
  simulationPresetCount: number;
}

/**
 * Validate all world definitions prior to publishing.
 * Runs reference integrity checks, orphan detection, and template sanity checks.
 */
export async function validateWorldForPublish(
  gameId: string = "saints",
  profileId: string = "default"
): Promise<ValidationGateResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // 1. Cross-reference orphan checks
    const orphans = await getOrphanedReferences();
    for (const orph of orphans) {
      errors.push(orph.reason);
    }

    // 2. Query all templates for baseline integrity
    const [dungeons, shops, mounts, events, simulations] = await Promise.all([
      prisma.dungeonTemplate.findMany({ where: { gameId, profileId }, include: { mapReferences: true } }),
      prisma.shopTemplate.findMany({ where: { gameId, profileId }, include: { inventory: true } }),
      prisma.mountTemplate.findMany({ where: { gameId, profileId } }),
      prisma.worldEventTemplate.findMany({ where: { gameId, profileId } }),
      prisma.simulationPreset.findMany({ where: { gameId, profileId } }),
    ]);

    // Check active simulation preset
    const activeSims = simulations.filter((s) => s.isActive);
    if (activeSims.length > 1) {
      warnings.push(`Multiple simulation presets are marked active (${activeSims.map((s) => s.slug).join(", ")}). Only one should be active.`);
    }

    // Check shop item pricing
    for (const shop of shops) {
      if (!shop.inventory || shop.inventory.length === 0) {
        warnings.push(`Shop "${shop.slug}" has no items configured in stock.`);
      }
    }

    // Check dungeon map references
    for (const d of dungeons) {
      if (!d.mapReferences || d.mapReferences.length === 0) {
        warnings.push(`Dungeon "${d.slug}" has no map references configured.`);
      }
    }

    return {
      valid: errors.length === 0,
      errorCount: errors.length,
      warningCount: warnings.length,
      errors,
      warnings,
    };
  } catch (err: any) {
    console.error("[validateWorldForPublish]", err);
    return {
      valid: false,
      errorCount: 1,
      warningCount: 0,
      errors: [`Validation gate failed: ${err.message}`],
      warnings: [],
    };
  }
}

/**
 * Capture an immutable publish snapshot of the current world definitions.
 */
export async function createPublishSnapshot(input: {
  gameId?: string;
  profileId?: string;
  title: string;
  description?: string;
  version?: string;
  startingMapId?: string;
  defaultMapId?: string;
}) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  const gameId = input.gameId || "saints";
  const profileId = input.profileId || "default";

  try {
    // 1. Run validation gates
    const validation = await validateWorldForPublish(gameId, profileId);

    // 2. Fetch all templates
    const [dungeons, shops, mounts, events, simulations] = await Promise.all([
      prisma.dungeonTemplate.findMany({ where: { gameId, profileId } }),
      prisma.shopTemplate.findMany({ where: { gameId, profileId } }),
      prisma.mountTemplate.findMany({ where: { gameId, profileId } }),
      prisma.worldEventTemplate.findMany({ where: { gameId, profileId } }),
      prisma.simulationPreset.findMany({ where: { gameId, profileId } }),
    ]);

    const contentSummary: ContentSummary = {
      dungeonCount: dungeons.length,
      shopCount: shops.length,
      mountCount: mounts.length,
      worldEventCount: events.length,
      simulationPresetCount: simulations.length,
    };

    const compiledManifest = await resolveWorldDependencies(gameId);

    const payload = {
      projectId: gameId,
      profileId,
      timestamp: new Date().toISOString(),
      startingMapId: input.startingMapId,
      defaultMapId: input.defaultMapId,
      dungeons,
      shops,
      mounts,
      events,
      simulations,
      ...compiledManifest,
    };

    const versionTag =
      input.version?.trim() ||
      `v1.0.${Date.now().toString().slice(-6)}`;

    const saved = await prisma.worldRelease.create({
      data: {
        projectId: gameId,
        version: versionTag,
        title: input.title.trim() || `Release ${versionTag}`,
        description: input.description,
        status: validation.valid ? "PUBLISHED" : "DRAFT",
        validationReport: JSON.stringify(validation),
        contentSummary: JSON.stringify(contentSummary),
        manifestData: JSON.stringify(payload),
      },
    });

    if (saved.status === "PUBLISHED") {
      // Archive previous snapshots for this profile
      await prisma.worldRelease.updateMany({
        where: {
          projectId: gameId,
          status: "PUBLISHED",
          id: { not: saved.id },
        },
        data: {
          status: "ARCHIVED",
        },
      });
    }

    return { success: true as const, data: saved, validation };
  } catch (err: any) {
    console.error("[createPublishSnapshot]", err);
    return { success: false as const, error: "Failed to create publish snapshot" };
  }
}

/**
 * Fetch draft maps from the internal MMO server.
 */
export async function fetchDraftMaps() {
  try {
    const goMmoBase = process.env.GO_MMO_INTERNAL_URL || process.env.NEXT_PUBLIC_GO_MMO_URL || 'http://localhost:24011';
    const res = await fetch(`${goMmoBase}/api/maps?action=drafts`);
    if (res.ok) {
      return { success: true, data: await res.json() };
    }
    return { success: false, error: "Failed to fetch maps" };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * List all historical publish snapshots.
 */
export async function listPublishSnapshots(gameId: string = "saints", profileId: string = "default") {
  try {
    const rows = await prisma.worldRelease.findMany({
      where: { projectId: gameId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return { success: true as const, data: rows };
  } catch (err) {
    console.error("[listPublishSnapshots]", err);
    return { success: false as const, data: [], error: "Failed to list snapshots" };
  }
}

/**
 * Rollback / Restore world definitions from an immutable publish snapshot.
 */
export async function rollbackToSnapshot(snapshotId: string) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  try {
    const snapshot = await prisma.worldRelease.findUnique({
      where: { id: snapshotId },
    });

    if (!snapshot) return { success: false, error: "Snapshot not found" };

    const payload = JSON.parse(snapshot.manifestData);
    const { maps, atlas } = payload;

    // Restore Maps
    if (Array.isArray(maps)) {
      for (const m of maps) {
        await prisma.worldMap.upsert({
          where: { id: m.id },
          create: {
            id: m.id,
            gameId: snapshot.projectId,
            name: m.name,
            gridData: m.gridData,
            gatesData: m.gatesData || "[]",
            encountersData: m.encountersData || "[]",
            entitiesData: m.entitiesData || "[]",
            freeformLayersData: m.freeformLayersData || "[]",
            mapType: m.mapType || "TILE",
          },
          update: {
            name: m.name,
            gridData: m.gridData,
            gatesData: m.gatesData || "[]",
            encountersData: m.encountersData || "[]",
            entitiesData: m.entitiesData || "[]",
            freeformLayersData: m.freeformLayersData || "[]",
            mapType: m.mapType || "TILE",
          },
        });
      }
    }

    // Restore Atlas Regions
    if (atlas && typeof atlas === 'object') {
      for (const [key, checksum] of Object.entries(atlas)) {
        // key format: "mapId_regionX_regionZ"
        const parts = key.split('_');
        if (parts.length >= 3) {
          const mapId = parts.slice(0, parts.length - 2).join('_');
          const regionX = parseInt(parts[parts.length - 2], 10);
          const regionZ = parseInt(parts[parts.length - 1], 10);
          
          if (!isNaN(regionX) && !isNaN(regionZ)) {
            // Upsert the WorldRegion pointing to the immutable artifact
            await prisma.worldRegion.upsert({
              where: {
                mapId_regionX_regionZ: {
                  mapId,
                  regionX,
                  regionZ
                }
              },
              create: {
                mapId,
                regionX,
                regionZ,
                status: "COMPLETED",
                artifactChecksum: checksum as string,
              },
              update: {
                status: "COMPLETED",
                artifactChecksum: checksum as string,
              }
            });
          }
        }
      }
    }

    return { success: true as const };
  } catch (err: any) {
    console.error("[rollbackToSnapshot]", err);
    return { success: false as const, error: "Failed to rollback" };
  }
}

