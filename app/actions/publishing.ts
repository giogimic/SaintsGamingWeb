"use server";

import { prisma } from "@/web/lib/prisma";
import { revalidatePath } from "next/cache";
import { checkAdminPermission } from "./game-admin";
import { getOrphanedReferences } from "./cross-references";

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

    const payload = {
      gameId,
      profileId,
      timestamp: new Date().toISOString(),
      dungeons,
      shops,
      mounts,
      events,
      simulations,
    };

    const versionTag =
      input.version?.trim() ||
      `v1.0.${Date.now().toString().slice(-6)}`;

    const saved = await prisma.worldPublishSnapshot.create({
      data: {
        gameId,
        profileId,
        version: versionTag,
        title: input.title.trim() || `Release ${versionTag}`,
        description: input.description,
        status: validation.valid ? "PUBLISHED" : "DRAFT",
        validationReport: JSON.stringify(validation),
        contentSummary: JSON.stringify(contentSummary),
        snapshotPayload: JSON.stringify(payload),
      },
    });

    revalidatePath("/studio");
    return { success: true as const, data: saved, validation };
  } catch (err: any) {
    console.error("[createPublishSnapshot]", err);
    return { success: false as const, error: "Failed to create publish snapshot" };
  }
}

/**
 * List all historical publish snapshots.
 */
export async function listPublishSnapshots(gameId: string = "saints", profileId: string = "default") {
  try {
    const rows = await prisma.worldPublishSnapshot.findMany({
      where: { gameId, profileId },
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
    const snapshot = await prisma.worldPublishSnapshot.findUnique({
      where: { id: snapshotId },
    });

    if (!snapshot) return { success: false, error: "Snapshot not found" };

    const payload = JSON.parse(snapshot.snapshotPayload);
    const { dungeons, shops, mounts, events, simulations } = payload;

    // Restore dungeons
    if (Array.isArray(dungeons)) {
      for (const d of dungeons) {
        await prisma.dungeonTemplate.upsert({
          where: { slug: d.slug },
          create: d,
          update: d,
        });
      }
    }

    // Restore shops
    if (Array.isArray(shops)) {
      for (const s of shops) {
        await prisma.shopTemplate.upsert({
          where: { slug: s.slug },
          create: s,
          update: s,
        });
      }
    }

    // Restore mounts
    if (Array.isArray(mounts)) {
      for (const m of mounts) {
        await prisma.mountTemplate.upsert({
          where: { slug: m.slug },
          create: m,
          update: m,
        });
      }
    }

    // Restore events
    if (Array.isArray(events)) {
      for (const e of events) {
        await prisma.worldEventTemplate.upsert({
          where: { slug: e.slug },
          create: e,
          update: e,
        });
      }
    }

    // Restore simulation presets
    if (Array.isArray(simulations)) {
      for (const sim of simulations) {
        await prisma.simulationPreset.upsert({
          where: { slug: sim.slug },
          create: sim,
          update: sim,
        });
      }
    }

    revalidatePath("/studio");
    return { success: true as const };
  } catch (err: any) {
    console.error("[rollbackToSnapshot]", err);
    return { success: false as const, error: "Failed to restore snapshot" };
  }
}
