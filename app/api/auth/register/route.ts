import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { sendWelcomeEmail } from "@/lib/email";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const { allowed } = rateLimit(`register:${getClientIp(req)}`, 5, 3600_000);
    if (!allowed) {
      return NextResponse.json({ message: "Too many registration attempts. Please try again later." }, { status: 429 });
    }
    const body = await req.json();
    const { email, username, password } = registerSchema.parse(body);

    // Check if email or username already exists
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUserByEmail) {
      return NextResponse.json(
        { user: null, message: "User with this email already exists" },
        { status: 409 }
      );
    }

    const existingUserByUsername = await prisma.user.findUnique({
      where: { username },
    });
    if (existingUserByUsername) {
      return NextResponse.json(
        { user: null, message: "Username is already taken" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        permissionLevel: 20, // Default to USER (matches PERMISSION_LEVELS.USER)
      },
    });

    // Send welcome email asynchronously without blocking the response
    sendWelcomeEmail(newUser.email, newUser.username).catch((err) => {
      console.error("Failed to send welcome email:", err);
    });

    return NextResponse.json(
      {
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
        },
        message: "User created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: "Invalid input data", errors: error.issues },
        { status: 400 }
      );
    }
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}
