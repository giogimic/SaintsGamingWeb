import type { NextAuthConfig } from "next-auth";
// Providers live in auth.ts (needs Prisma/bcrypt). This file is safe for proxy.ts.

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnAdmin = nextUrl.pathname.startsWith("/admin");
      const isOnProfile = nextUrl.pathname.startsWith("/profile");

      if (isOnAdmin) {
        // Admin routes are protected by permission level in middleware, but basic check here:
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isOnProfile) {
        if (isLoggedIn) return true;
        return false;
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // user is available during sign-in
        token.id = user.id;
        token.permissionLevel = user.permissionLevel;
        token.username = user.username;
        token.role = user.role;
        token.devConsoleEnabled = user.devConsoleEnabled || false;
        token.forcePasswordChange = user.forcePasswordChange || false;
      }
      if (trigger === "update" && session?.user) {
        // Note: handle updates if necessary
        token.permissionLevel = session.user.permissionLevel;
        token.username = session.user.username;
        token.role = session.user.role;
        token.devConsoleEnabled = session.user.devConsoleEnabled;
        token.forcePasswordChange = session.user.forcePasswordChange;
      }
      return token;
    },
    async session({ session, token }) {
      // If the token was invalidated (e.g. DB wiped), clear the user from the session
      if (!token || !token.id) {
        // By deleting the user property entirely, we ensure NextAuth properly reflects an unauthenticated state
        delete (session as any).user;
        return session;
      }

      if (session.user) {
        session.user.id = token.id as string;
        session.user.permissionLevel = token.permissionLevel as number;
        session.user.username = token.username as string;
        session.user.role = token.role as any  
        session.user.devConsoleEnabled = token.devConsoleEnabled as boolean;
        session.user.forcePasswordChange = token.forcePasswordChange as boolean;
      }
      return session;
    },
  },
  providers: [], // We'll add providers in auth.ts to avoid Edge issues with bcrypt/prisma
} satisfies NextAuthConfig;
