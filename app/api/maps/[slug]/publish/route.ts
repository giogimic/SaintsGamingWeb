import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";
import { canWriteStudioContent, STUDIO_CONTENT_WRITE_LEVEL } from "@/shared/game/studioPermissions";
import { verifyStudioPermission } from "@/server/auth/studioApiAuth";
import { AuditService } from "@/server/audit/AuditService";
import { MapSyncService } from "@/server/mapSyncService";

export const dynamic = 'force-dynamic';

/**
 * POST /api/maps/[slug]/publish
 * Promotes the current saved editor draft of a map to an immutable published release version,
 * archives a snapshot in WorldMapVersion for rollback, and synchronizes with live runtime shards.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const authCheck = await verifyStudioPermission(request, STUDIO_CONTENT_WRITE_LEVEL);
    if ("errorResponse" in authCheck) {
      return authCheck.errorResponse;
    }
    const user = authCheck.user;

    const { slug } = await params;
    const body = await request.json().catch(() => ({}));
    const description = typeof body.description === 'string' ? body.description.trim() : 'Published release';

    const worldMap = await prisma.worldMap.findUnique({ where: { id: slug } });
    if (!worldMap) {
      return NextResponse.json({ error: `Map not found: ${slug}` }, { status: 404 });
    }

    const nextPublishedVersion = (worldMap.publishedVersion ?? 0) + 1;

    // Retrieve region metadata for snapshot
    const { VoxelRegionRepository } = await import('@/server/repositories/VoxelRegionRepository');
    const regions = await VoxelRegionRepository.getRegionsForMap(slug);

    // 1. Publish Validation
    // A publish must fail if any required region is missing, still generating, or in an error state.
    // Also, must have a valid checksum.
    // We expect the generator metadata to tell us how many regions are expected,
    // but for now we enforce that ALL retrieved draft regions must be COMPLETED and valid.
    for (const r of regions) {
      if (r.status !== 'COMPLETED') {
        return NextResponse.json({ error: `Region ${r.coordinates.regionX},${r.coordinates.regionZ} is not COMPLETED (status: ${r.status})` }, { status: 400 });
      }
      if (!r.checksum) {
        return NextResponse.json({ error: `Region ${r.coordinates.regionX},${r.coordinates.regionZ} is missing its artifact checksum` }, { status: 400 });
      }
      // Note: getRegionsForMap already joins the artifact, so if voxelData is null, the artifact is missing!
      if (!r.voxelData) {
        return NextResponse.json({ error: `Region ${r.coordinates.regionX},${r.coordinates.regionZ} points to a nonexistent artifact (checksum: ${r.checksum})` }, { status: 400 });
      }
    }

    const regionMetadata = regions.map(r => ({
      coordinates: r.coordinates,
      generator: r.generator,
      status: r.status,
      checksum: r.checksum
    }));

    const snapshotPayload = {
      id: worldMap.id,
      name: worldMap.name,
      gameId: worldMap.gameId,
      gridData: worldMap.gridData,
      gatesData: worldMap.gatesData,
      npcsData: worldMap.npcsData,
      encountersData: worldMap.encountersData,
      entitiesData: worldMap.entitiesData,
      tileLayersData: worldMap.tileLayersData,
      freeformLayersData: worldMap.freeformLayersData,
      tilesetsData: worldMap.tilesetsData,
      mapType: worldMap.mapType,
      version: worldMap.version,
      publishedVersion: nextPublishedVersion,
      publishedAt: new Date().toISOString(),
      publishedBy: user.username || user.email || user.id,
    };

    const serializedSnapshot = JSON.stringify(snapshotPayload);

    // 1. Create or upsert immutable snapshot record in WorldMapVersion
    await prisma.worldMapVersion.upsert({
      where: {
        mapId_version: {
          mapId: slug,
          version: nextPublishedVersion,
        },
      },
      create: {
        mapId: slug,
        version: nextPublishedVersion,
        name: worldMap.name,
        data: serializedSnapshot,
        description,
        publishedBy: user.username || user.email || user.id,
        regions: {
          create: regionMetadata.map(r => ({
            regionX: r.coordinates.regionX,
            regionZ: r.coordinates.regionZ,
            artifactChecksum: r.checksum as string
          }))
        }
      },
      update: {
        data: serializedSnapshot,
        description,
      },
    });

    // 2. Update WorldMap with new publishedVersion and active publishedData
    await prisma.worldMap.update({
      where: { id: slug },
      data: {
        publishedVersion: nextPublishedVersion,
        publishedData: serializedSnapshot,
      },
    });

    // 3. Synchronize with live game engine / Go MMO shards
    await MapSyncService.enqueue({
      mapId: slug,
      version: nextPublishedVersion,
      userId: user.id,
      eagerPush: true,
    });

    // 4. Audit Log
    await AuditService.write({
      userId: user.id,
      action: "map.publish",
      resource: { type: "map", id: slug },
      after: {
        version: nextPublishedVersion,
        description,
      },
    });

    return NextResponse.json({
      ok: true,
      mapId: slug,
      publishedVersion: nextPublishedVersion,
      message: `Map ${slug} published successfully as v${nextPublishedVersion}`,
    });
  } catch (error: any) {
    console.error("Failed to publish map:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to publish map" },
      { status: 500 }
    );
  }
}
