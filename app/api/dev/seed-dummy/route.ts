import { NextResponse } from "next/server";
import { seedDummyContentAction } from "@/app/actions/admin/game-dev";

export async function POST(_req: Request) {
  try {
    const res = await seedDummyContentAction();
    if (res.success) {
      return NextResponse.json({ success: true, message: res.message });
    }
    return NextResponse.json(
      { success: false, message: res.error || "Failed to seed dummy content" },
      { status: res.error?.includes("Unauthorized") ? 401 : 400 }
    );
  } catch (error: any) {
    console.error("[POST /api/dev/seed-dummy] Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
