import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadFile } from "@/lib/upload";

export async function POST(req: Request) {
  try {
    const session = await auth();
    
    // Any authenticated user can upload images for forums
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ message: "No file provided" }, { status: 400 });
    }

    // uploadFile has a 5MB limit and only allows images
    const result = await uploadFile(file);

    if (!result.success) {
      return NextResponse.json({ message: result.error }, { status: 400 });
    }

    return NextResponse.json({ url: result.url }, { status: 201 });
  } catch (error) {
    console.error("Forum upload error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
