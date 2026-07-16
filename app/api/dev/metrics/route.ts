import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSION_LEVELS } from "@/lib/permissions";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true, username: true }
  });

  if (!user || user.permissionLevel < PERMISSION_LEVELS.DEVELOPER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  return NextResponse.json({
    uptime: Math.floor(uptime),
    memoryHeap: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    memoryRss: Math.round(memoryUsage.rss / 1024 / 1024),
    environment: process.env.NODE_ENV,
    activeSession: user.username || session.user.email,
  });
}
