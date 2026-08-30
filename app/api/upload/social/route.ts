import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadSocialMedia } from "@/web/lib/upload";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max execution time for high-res video uploads

export async function POST(req: Request) {
  try {
    const session = await auth();
    
    // Any authenticated user can upload social media files
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ message: "No file provided" }, { status: 400 });
    }

    const result = await uploadSocialMedia(file);

    if (!result.success) {
      return NextResponse.json({ message: result.error }, { status: 400 });
    }

    return NextResponse.json({ 
      url: result.url,
      previewUrl: result.previewUrl || result.url,
      posterUrl: result.posterUrl,
      durationSec: result.durationSec,
      aspectRatio: result.aspectRatio,
      width: result.width,
      height: result.height,
    }, { status: 201 });
  } catch (error) {
    console.error("Social upload error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
