import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { ingestAsset } from "@/web/lib/assetUpload";

export const dynamic = "force-dynamic";

/**
 * POST /api/assets/upload — Ingest a SourceAsset (and optional UsableAsset)
 * Multipart Form Data:
 *  - file: File (required)
 *  - gameId: string (optional, defaults to "tuxemon")
 *  - name: string (optional)
 *  - type: string (optional, e.g. "CHARACTER", "OBJECT", "TILE", "AUDIO")
 *  - category: string (optional)
 *  - tags: string (optional, JSON array or comma-separated)
 *  - createUsable: string | boolean ("true" | "false")
 *  - visibility: string ("PERSONAL" | "PROJECT" | "COMMUNITY" | "PUBLIC")
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized — sign in required to upload assets." },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided in form data." },
        { status: 400 }
      );
    }

    const gameId = (formData.get("gameId") as string) || "tuxemon";
    const name = formData.get("name") as string | undefined;
    const type = formData.get("type") as string | undefined;
    const category = formData.get("category") as string | undefined;
    const rawTags = formData.get("tags") as string | null;
    let tags: string[] | undefined = undefined;
    if (rawTags) {
      try {
        tags = JSON.parse(rawTags);
      } catch {
        tags = rawTags.split(",").map((t) => t.trim()).filter(Boolean);
      }
    }

    const createUsable = formData.get("createUsable") !== "false";
    const visibility = (formData.get("visibility") as any) || "COMMUNITY";
    const width = Number(formData.get("width")) || undefined;
    const height = Number(formData.get("height")) || undefined;

    const result = await ingestAsset({
      userId: session.user.id,
      file,
      gameId,
      name,
      type,
      category,
      tags,
      createUsable,
      visibility,
      width,
      height,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to process asset upload." },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[api/assets/upload] Error processing asset upload:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}
