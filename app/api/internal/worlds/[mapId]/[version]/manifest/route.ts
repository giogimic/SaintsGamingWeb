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
  { params }: { params: Promise<{ mapId: string; version: string }> }
) {
  // Allow internal server-to-server or standard NextAuth clients
  const isInternal = checkAuth(req);
  const session = await auth();
  
  if (!isInternal && !session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { mapId, version } = await params;
  let manifestRegions: { regionX: number, regionZ: number, artifactChecksum: string }[] = [];
  let resolvedVersionInt = 0;

  if (version === "draft") {
    const activeRegions = await prisma.worldRegion.findMany({
      where: { mapId },
      include: { artifact: true }
    });
    manifestRegions = activeRegions.map(r => ({
      regionX: r.regionX,
      regionZ: r.regionZ,
      artifactChecksum: r.artifact?.checksum || "",
    })).filter(r => r.artifactChecksum !== "");
  } else {
    if (version === "published") {
      const worldMap = await prisma.worldMap.findUnique({
        where: { id: mapId },
        select: { publishedVersion: true }
      });
      if (!worldMap || worldMap.publishedVersion <= 0) {
        return NextResponse.json({ error: "Map has no published version" }, { status: 404 });
      }
      resolvedVersionInt = worldMap.publishedVersion;
    } else {
      resolvedVersionInt = parseInt(version, 10);
      if (isNaN(resolvedVersionInt)) {
        return NextResponse.json({ error: "Invalid version" }, { status: 400 });
      }
    }

    const mapVersion = await prisma.worldMapVersion.findFirst({
      where: {
        mapId,
        version: resolvedVersionInt
      },
      include: {
        regions: true
      }
    });

    if (!mapVersion) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }
    
    manifestRegions = mapVersion.regions.map(r => ({
      regionX: r.regionX,
      regionZ: r.regionZ,
      artifactChecksum: r.artifactChecksum,
    }));
  }

  let generatorIdentity = {
    generatorId: "unknown",
    generatorVersion: 1,
    configHash: ""
  };
  
  // Try to find the matching bootstrap revision
  const revision = await prisma.worldBootstrapRevision.findFirst({
    where: { mapId, status: "COMPLETED" },
    orderBy: { createdAt: 'desc' }
  });
  if (revision) {
    generatorIdentity = {
      generatorId: "unknown", // generatorId was removed from WorldBootstrapRevision
      generatorVersion: parseInt(revision.generatorVersion, 10) || 1,
      configHash: revision.configHash || ""
    };
  }

  const manifest = {
    mapId,
    version: resolvedVersionInt,
    ...generatorIdentity,
    regions: manifestRegions
  };

  return NextResponse.json(manifest);
}
