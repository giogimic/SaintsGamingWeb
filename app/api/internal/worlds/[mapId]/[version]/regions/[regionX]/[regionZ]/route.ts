import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/auth";

const prisma = new PrismaClient();

function checkAuth(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth) return false;
  
  const token = auth.replace("Bearer ", "");
  const secret =
    process.env.GO_MMO_INTERNAL_SECRET ||
    process.env.SAINTS_INTERNAL_SECRET ||
    process.env.AUTH_SECRET ||
    "";
    
  return token === secret && secret !== "";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ mapId: string; version: string; regionX: string; regionZ: string }> }
) {
  // Allow internal server-to-server or standard NextAuth clients
  const isInternal = checkAuth(req);
  const session = await auth();
  
  if (!isInternal && !session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { mapId, version, regionX, regionZ } = await params;
  
  const rx = parseInt(regionX, 10);
  const rz = parseInt(regionZ, 10);
  
  if (isNaN(rx) || isNaN(rz)) {
    return NextResponse.json({ error: "Invalid region parameters" }, { status: 400 });
  }

  if (version === "draft") {
    const activeRegion = await prisma.worldRegion.findFirst({
      where: { mapId, regionX: rx, regionZ: rz },
      include: { artifact: true }
    });
    
    if (!activeRegion || !activeRegion.artifact) {
      return NextResponse.json({ error: "Draft region artifact missing" }, { status: 404 });
    }
    
    return new NextResponse(activeRegion.artifact.voxelData as any, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Region-Checksum": activeRegion.artifact.checksum
      }
    });
  }

  let resolvedVersionInt = 0;
  
  const project = await prisma.worldProject.findFirst({
    where: { OR: [{ id: "saints" }, { slug: "saints" }] },
    select: { id: true, activeVersion: true }
  });
  const candidateProjectIds = ["saints"];
  if (project?.id && project.id !== "saints") {
    candidateProjectIds.push(project.id);
  }

  if (version === "published") {
    resolvedVersionInt = project?.activeVersion || 0;
  } else {
    resolvedVersionInt = parseInt(version, 10);
    if (isNaN(resolvedVersionInt)) {
      resolvedVersionInt = project?.activeVersion || 0;
    }
  }

  // Authoritative path: look up the specific version region to get the checksum
  let worldRelease = await prisma.worldRelease.findFirst({
    where: {
      projectId: { in: candidateProjectIds },
      version: `v1.0.${resolvedVersionInt}`
    },
    orderBy: { createdAt: "desc" }
  });

  if (!worldRelease) {
    worldRelease = await prisma.worldRelease.findFirst({
      where: {
        projectId: { in: candidateProjectIds },
        status: "LIVE"
      },
      orderBy: { createdAt: "desc" }
    });
  }

  if (!worldRelease) {
    worldRelease = await prisma.worldRelease.findFirst({
      where: {
        projectId: { in: candidateProjectIds }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  if (!worldRelease) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  const manifestData = JSON.parse(worldRelease.manifestData || "{}");
  const atlas = manifestData.atlas || {};
  const checksum = atlas[`${mapId}_${rx}_${rz}`];

  if (!checksum) {
    return NextResponse.json({ error: "Region not found for this version" }, { status: 404 });
  }

  // Lookup the artifact by its checksum
  const artifact = await prisma.worldRegionArtifact.findUnique({
    where: { checksum }
  });

  if (!artifact) {
    return NextResponse.json({ error: "Artifact missing" }, { status: 404 });
  }

  // Send raw compressed buffer back to Go
  return new NextResponse(artifact.voxelData as any, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "X-Region-Checksum": artifact.checksum
    }
  });
}
