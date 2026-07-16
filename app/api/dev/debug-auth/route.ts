import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Attempt to get the current session
  let session = null;
  let sessionError = null;
  try {
    session = await auth();
  } catch (err: any) {
    sessionError = err.message || String(err);
  }

  // Get raw headers
  const headers = Object.fromEntries(req.headers.entries());

  return NextResponse.json({
    status: "Diagnostics Active",
    timestamp: new Date().toISOString(),
    auth: {
      session,
      sessionError,
    },
    requestHeaders: {
      host: headers["host"] || null,
      "x-forwarded-host": headers["x-forwarded-host"] || null,
      "x-forwarded-proto": headers["x-forwarded-proto"] || null,
      "x-forwarded-for": headers["x-forwarded-for"] || null,
    },
    cookies: {
      rawCookieHeader: headers["cookie"] || "No cookies sent by browser",
    },
    environment: {
      NODE_ENV: process.env.NODE_ENV || null,
      AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST || null,
      AUTH_URL: process.env.AUTH_URL || null,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || null,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || null,
      HAS_AUTH_SECRET: !!process.env.AUTH_SECRET,
    }
  });
}
