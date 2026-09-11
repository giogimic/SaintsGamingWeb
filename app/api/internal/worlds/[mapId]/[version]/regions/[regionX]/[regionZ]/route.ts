import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

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
  const sessionToken = req.cookies.get("next-auth.session-token") || req.cookies.get("__Secure-next-auth.session-token");
  
  if (!isInternal && !sessionToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { mapId, version, regionX, regionZ } = await params;
  const versionInt = parseInt(version, 10);
  const rx = parseInt(regionX, 10);
  const rz = parseInt(regionZ, 10);
  
  if (isNaN(versionInt) || isNaN(rx) || isNaN(rz)) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  // Authoritative path: look up the specific version region to get the checksum
  const versionRegion = await prisma.worldMapVersionRegion.findFirst({
    where: {
      version: {
        mapId,
        version: versionInt
      },
      regionX: rx,
      regionZ: rz
    }
  });

  if (!versionRegion) {
    return NextResponse.json({ error: "Region not found for this version" }, { status: 404 });
  }

  // Lookup the artifact by its checksum
  const artifact = await prisma.worldRegionArtifact.findUnique({
    where: { checksum: versionRegion.artifactChecksum }
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
