import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";
import { worldBakeService } from "@/server/services/bake/WorldBakeService";
import { VoxelRegionRepository } from "@/server/repositories/VoxelRegionRepository";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');
    if (!jobId) {
      return NextResponse.json({ error: "jobId required" }, { status: 400 });
    }

    // Attempt to get realtime progress from the service
    const progress = worldBakeService.getProgress(jobId);
    
    // Also fetch the persistent revision state and regions
    const revision = await prisma.worldBootstrapRevision.findFirst({
      where: { jobId },
      include: { regions: true }
    });

    if (!revision) {
      return NextResponse.json({ error: "Revision not found" }, { status: 404 });
    }

    // Get the exact artifact data for regions that have completed
    const completedRegions = revision.regions.map(r => ({
      regionX: r.regionX,
      regionZ: r.regionZ,
      checksum: r.artifactChecksum
    }));

    // If the client asks for specific chunks/regions, we can fetch them.
    // For now, we will return the checksums, and if the client needs the payload,
    // they can either fetch it from a separate route or we bundle it here if small enough.
    // Given the architecture, the browser will likely download them. Let's include the raw data
    // if requested, but for now we'll just send the checksums and let a helper route fetch the chunks,
    // OR since it's the preview, we can just return the voxel data directly if it's small.
    // For Phase 3, we'll return the binary payloads directly for completed regions.
    
    const fetchPayloads = searchParams.get('includePayloads') === 'true';
    let payloads: Record<string, string> = {}; // base64 encoded payloads
    
    if (fetchPayloads && completedRegions.length > 0) {
      const checksums = completedRegions.map(r => r.checksum);
      const artifacts = await VoxelRegionRepository.getRegionArtifactsByChecksums(checksums);
      
      for (const [chk, buf] of Object.entries(artifacts)) {
        if (buf) {
          payloads[chk] = Buffer.from(buf).toString('base64');
        }
      }
    }

    return NextResponse.json({
      status: revision.status,
      completedRegions: progress ? progress.completedRegions : completedRegions.length,
      totalRegions: progress ? progress.totalRegions : completedRegions.length,
      progressPercent: progress ? progress.progressPercent : (revision.status === 'COMPLETED' ? 100 : 0),
      activeWorkers: progress?.activeWorkers || 0,
      regions: completedRegions,
      payloads
    });

  } catch (error: any) {
    console.error('[GenerateDraftStatus] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
