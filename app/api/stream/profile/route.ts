import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import cache from "@/lib/cache";

const profileSchema = z.object({
  platform: z.enum(["twitch", "youtube", "kick"]),
  channelUrl: z.string().url().max(150),
  isLive: z.boolean().default(false),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = profileSchema.parse(body);

    let profile = await prisma.streamProfile.findFirst({
      where: { userId: session.user.id }
    });

    if (profile) {
      profile = await prisma.streamProfile.update({
        where: { id: profile.id },
        data: {
          platform: data.platform,
          channelUrl: data.channelUrl,
          isLive: data.isLive,
          updatedAt: new Date(),
        }
      });
    } else {
      profile = await prisma.streamProfile.create({
        data: {
          userId: session.user.id,
          platform: data.platform,
          channelUrl: data.channelUrl,
          isLive: data.isLive,
          isApproved: false,
        }
      });
    }

    // Invalidate streams cache
    cache.invalidatePrefix("streams");

    return NextResponse.json(profile, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input", errors: error.issues }, { status: 400 });
    }
    console.error("Stream profile error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
