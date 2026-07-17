import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true }
    });

    if (!user || !user.email) {
      return NextResponse.json({ message: "No email associated with account" }, { status: 400 });
    }

    const emailHash = crypto.createHash('md5').update(user.email.trim().toLowerCase()).digest('hex');
    const gravatarUrl = `https://www.gravatar.com/avatar/${emailHash}?s=256&d=404`;

    // Check if the gravatar exists
    const response = await fetch(gravatarUrl, { method: 'HEAD' });
    if (!response.ok) {
      return NextResponse.json({ message: "No Gravatar found for this email" }, { status: 404 });
    }

    const finalUrl = `https://www.gravatar.com/avatar/${emailHash}?s=256&d=identicon`;

    // Update user's avatar in database
    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: finalUrl }
    });

    return NextResponse.json({ url: finalUrl }, { status: 200 });
  } catch (error) {
    console.error("Gravatar sync error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
