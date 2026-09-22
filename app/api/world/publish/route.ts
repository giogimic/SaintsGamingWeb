import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { STUDIO_CONTENT_WRITE_LEVEL } from "@/shared/game/studioPermissions";
import { verifyStudioPermission } from "@/server/auth/studioApiAuth";
import { AuditService } from "@/server/audit/AuditService";
import { compileAndDeployWorldRelease } from "@/app/actions/studio/world-release";

export const dynamic = 'force-dynamic';

/**
 * POST /api/world/publish
 * Promotes the current saved editor draft of the ENTIRE Working World to an immutable published release version.
 */
export async function POST(request: NextRequest) {
  try {
    const authCheck = await verifyStudioPermission(request, STUDIO_CONTENT_WRITE_LEVEL);
    if ("errorResponse" in authCheck) {
      return authCheck.errorResponse;
    }
    const user = authCheck.user;

    const body = await request.json().catch(() => ({}));
    const description = typeof body.description === 'string' ? body.description.trim() : 'Published release';
    const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : 'saints';

    const project = await prisma.worldProject.findFirst({
      where: {
        OR: [
          { slug: projectId },
          { id: projectId },
        ],
      },
      include: { maps: true },
    });
    
    if (!project) {
      return NextResponse.json({ error: `Project not found: ${projectId}` }, { status: 404 });
    }

    // Retrieve region metadata for ALL maps to ensure nothing is still generating
    const { VoxelRegionRepository } = await import('@/server/repositories/VoxelRegionRepository');
    
    for (const map of project.maps) {
      const regions = await VoxelRegionRepository.getRegionsForMap(map.id);
      for (const r of regions) {
        if (r.status !== 'COMPLETED') {
          return NextResponse.json({ error: `Map ${map.id} Region ${r.coordinates.regionX},${r.coordinates.regionZ} is not COMPLETED (status: ${r.status})` }, { status: 400 });
        }
        if (!r.checksum) {
          return NextResponse.json({ error: `Map ${map.id} Region ${r.coordinates.regionX},${r.coordinates.regionZ} is missing its artifact` }, { status: 400 });
        }
      }
    }

    // Create the Project-Wide Release
    const releaseRes = await compileAndDeployWorldRelease(project.id, undefined, description);
    if (!releaseRes.success) {
      return NextResponse.json({ error: releaseRes.error }, { status: 500 });
    }

    const nextPublishedVersion = releaseRes.version!;

    // Audit Log
    await AuditService.write({
      userId: user.id,
      action: "project.publish",
      resource: { type: "project", id: project.id },
      after: {
        version: nextPublishedVersion,
        description,
      },
    });

    return NextResponse.json({
      ok: true,
      projectId: project.id,
      publishedVersion: nextPublishedVersion,
      message: `Project published successfully as v${nextPublishedVersion}`,
    });
  } catch (error: any) {
    console.error("Failed to publish project:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to publish project" },
      { status: 500 }
    );
  }
}
