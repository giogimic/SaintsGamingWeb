import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const { allowed } = rateLimit(`forgot-pw:${getClientIp(req)}`, 3, 900_000);
    if (!allowed) {
      return NextResponse.json({ message: "Too many requests. Please try again later." }, { status: 429 });
    }

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // For security, always return success even if user not found to prevent email enumeration
    if (!user) {
      return NextResponse.json({ success: true });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    // Invalidate any existing reset tokens for this email
    await prisma.passwordResetToken.deleteMany({ where: { email } });

    // Save new token
    await prisma.passwordResetToken.create({
      data: {
        email,
        token,
        expires,
      }
    });

    await sendPasswordResetEmail(email, token);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
