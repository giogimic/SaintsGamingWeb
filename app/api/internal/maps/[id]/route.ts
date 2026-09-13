import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Validate internal token
  const authHeader = request.headers.get("Authorization");
  const internalSecret = process.env.SAINTS_INTERNAL_SECRET || process.env.AUTH_SECRET || "";
  
  if (!internalSecret || authHeader !== `Bearer ${internalSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const versionStr = request.nextUrl.searchParams.get("version");
  const version = parseInt(versionStr || "0", 10);

  if (!id || version <= 0) {
    return NextResponse.json({ error: "missing id or version" }, { status: 400 });
  }

  const mapVersion = await prisma.worldMapVersion.findUnique({
    where: {
      mapId_version: {
        mapId: id,
        version: version,
      },
    },
    include: {
      regions: true,
    },
  });

  if (!mapVersion) {
    return NextResponse.json({ error: "map release not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    release: mapVersion,
  });
}
