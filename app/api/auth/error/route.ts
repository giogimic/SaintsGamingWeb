import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const error = searchParams.get("error");
  
  // Use x-forwarded-host if available to prevent localhost redirect issues in proxy setups
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  
  let baseUrl = request.nextUrl.origin;
  if (forwardedHost) {
    baseUrl = `${forwardedProto}://${forwardedHost}`;
  }
  
  const loginUrl = new URL("/login", baseUrl);
  if (error) {
    loginUrl.searchParams.set("error", error);
  }
  
  const response = NextResponse.redirect(loginUrl);
  
  // Helper to safely delete cookies, including those with strict prefixes
  const clearCookie = (name: string, isSecure: boolean) => {
    response.cookies.set({
      name,
      value: "",
      expires: new Date(0),
      path: "/",
      secure: isSecure,
    });
  };

  clearCookie("authjs.session-token", false);
  clearCookie("__Secure-authjs.session-token", true);
  clearCookie("next-auth.session-token", false);
  clearCookie("__Secure-next-auth.session-token", true);
  
  clearCookie("authjs.csrf-token", false);
  clearCookie("__Host-authjs.csrf-token", true);
  clearCookie("next-auth.csrf-token", false);
  clearCookie("__Host-next-auth.csrf-token", true);
  
  return response;
}
