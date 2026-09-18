import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const secret = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!secret || secret !== (process.env.SAINTS_INTERNAL_SECRET || process.env.AUTH_SECRET)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const url = new URL(request.url);
  const versionParam = url.searchParams.get("version");
  const version = versionParam || undefined;

  if (!version) {
    return NextResponse.json({ ok: false, error: "version is required" }, { status: 400 });
  }

  try {
    const project = await prisma.worldProject.findFirst({
      where: {
        OR: [{ id: slug }, { slug: slug }]
      },
      select: { id: true, activeVersion: true }
    });

    const candidateProjectIds = [slug];
    if (project && project.id !== slug) {
      candidateProjectIds.push(project.id);
    }

    // Try finding the exact release by version for the project
    let release = await prisma.worldRelease.findFirst({
      where: {
        projectId: { in: candidateProjectIds },
        version,
      },
      include: {
        mapSnapshots: true,
      }
    });

    // If version is "latest" or not found, try finding active LIVE release
    if (!release) {
      release = await prisma.worldRelease.findFirst({
        where: {
          projectId: { in: candidateProjectIds },
          status: "LIVE",
        },
        include: {
          mapSnapshots: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }

    // Fallback: any published release for this project
    if (!release) {
      release = await prisma.worldRelease.findFirst({
        where: {
          projectId: { in: candidateProjectIds },
        },
        include: {
          mapSnapshots: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }

    if (!release) {
      return NextResponse.json({ ok: false, error: "Release not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      release: {
        projectId: release.projectId,
        version: release.version,
        manifestData: release.manifestData,
        publishedBy: release.publishedBy,
        snapshots: release.mapSnapshots,
      },
    });
  } catch (err: any) {
    console.error("[internal.projects] fetch failed:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
