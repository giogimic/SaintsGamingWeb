import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PERMISSION_LEVELS } from "@/lib/permissions";
import { uploadFile } from "@/lib/upload";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userPermissionLevel = (session?.user?.permissionLevel as number) || 0;
    
    // Only MODs and above can upload files directly to the server
    if (userPermissionLevel < PERMISSION_LEVELS.MODERATOR) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ message: "No file provided" }, { status: 400 });
    }

    const result = await uploadFile(file);

    if (!result.success) {
      return NextResponse.json({ message: result.error }, { status: 400 });
    }

    return NextResponse.json({ url: result.url }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
