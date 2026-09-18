import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { requireServerApiKey } from "@/web/lib/server-auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireServerApiKey(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Get banned users
    const bannedUsers = await prisma.user.findMany({
      where: { isBanned: true },
      select: { username: true, id: true, banReason: true },
    });

    // We can also fetch linked characters or IP bans if implemented in the future
    
    return NextResponse.json({ bannedUsers });
  } catch (error) {
    console.error("[API_SAMP_BANS]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
