import { NextResponse } from "next/server";
import { auth } from "@/auth";
import jwt from "jsonwebtoken";

export async function GET(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ message: "Server misconfiguration: AUTH_SECRET missing" }, { status: 500 });
  }

  // Create a short-lived, HMAC signed token that the Go MMO backend can parse
  // using golang-jwt (which expects HMAC, not NextAuth's default JWE).
  const token = jwt.sign(
    {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
    },
    secret,
    { algorithm: "HS256", expiresIn: "5m" }
  );

  return NextResponse.json({ token });
}
