import NextAuth, { CredentialsSignin } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Discord from "next-auth/providers/discord";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  basePath: "/api/auth",
  debug: process.env.NODE_ENV === "development",
  logger: {
    error(code, ...message) {
      if (code.name === "JWTSessionError") return;
      console.error(code, ...message);
    },
    warn(code, ...message) {
      console.warn(code, ...message);
    },
    debug(code, ...message) {
      console.debug(code, ...message);
    }
  },
  callbacks: {
    ...authConfig.callbacks,
    async jwt(params) {
      // Run the base JWT logic first
       
      const token = await authConfig.callbacks?.jwt?.(params as any) ?? params.token;
      
      // If we have a token but this isn't a fresh sign-in, verify the user still exists in the DB.
      // This ensures that if the database is wiped or the user is deleted, their browser 
      // cookie doesn't keep them permanently "logged in".
      if (token && token.id && !params.user) {
        try {
          const dbUser = await prisma.user.findUnique({ 
            where: { id: token.id as string },
            select: { id: true, permissionLevel: true, username: true, role: true, devConsoleEnabled: true, forcePasswordChange: true, isBanned: true } 
          });
          if (!dbUser || dbUser.isBanned) {
            // Returning null causes NextAuth to crash and redirect to /api/auth/error.
            // Instead, clear the token properties so the session is empty and logs out gracefully.
            token.id = "";
            token.permissionLevel = 0;
            token.username = "";
            token.role = null;
          } else {
            // Sync mutable state (permissions, username, role) from DB so bans/promotions apply instantly
            token.permissionLevel = dbUser.permissionLevel;
            token.username = dbUser.username;
            token.role = dbUser.role;
            token.devConsoleEnabled = dbUser.devConsoleEnabled;
            token.forcePasswordChange = dbUser.forcePasswordChange;
          }
        } catch (error) {
          // If the DB is completely down/missing, clear the token as a safety measure
          console.error("JWT validation DB error:", error);
          token.id = "";
          token.permissionLevel = 0;
          token.username = "";
          token.role = null;
        }
      }
      return token;
    }
  },
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Discord({
      clientId: process.env.AUTH_DISCORD_ID,
      clientSecret: process.env.AUTH_DISCORD_SECRET,
      profile(profile) {
        return {
          id: profile.id,
          name: profile.global_name || profile.username,
          email: profile.email,
          image: `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`,
          // Mapping for our custom schema fields:
          username: profile.username,
          permissionLevel: 20, // USER (matches PERMISSION_LEVELS.USER)
          devConsoleEnabled: false,
          forcePasswordChange: false,
        };
      },
    }),
    Credentials({
      credentials: {
        identifier: { label: "Username or Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("[AUTH] Authorize called with credentials:", { identifier: credentials?.identifier });
        const parsedCredentials = loginSchema.safeParse(credentials);

        if (!parsedCredentials.success) {
          console.error("[AUTH] Schema validation failed:", parsedCredentials.error.errors);
          throw new CredentialsSignin("Invalid credentials");
        }

        const { identifier, password } = parsedCredentials.data;
        
        try {
          const user = await prisma.user.findFirst({
            where: {
              OR: [
                { email: identifier.toLowerCase() },
                { username: identifier }
              ]
            },
            include: { role: true }
          });

          if (!user) {
            console.error(`[AUTH] Login failed: No user found for identifier '${identifier}'`);
            throw new CredentialsSignin("Invalid credentials");
          }

          if (!user.passwordHash) {
            console.error(`[AUTH] Login failed: User '${identifier}' has no passwordHash (might be a Discord-only account)`);
            throw new CredentialsSignin("Invalid credentials");
          }

          if (user.isBanned) {
            console.warn(`[AUTH] Login denied: User '${identifier}' is banned`);
            throw new CredentialsSignin("Banned");
          }

          const passwordsMatch = await bcrypt.compare(password, user.passwordHash);

          if (passwordsMatch) {
            console.log(`[AUTH] Login successful for user '${identifier}'`);
            return {
              id: user.id,
              email: user.email,
              name: user.displayName,
              username: user.username,
              image: user.image,
              permissionLevel: user.permissionLevel,
              role: user.role,
              devConsoleEnabled: user.devConsoleEnabled,
              forcePasswordChange: user.forcePasswordChange,
            };
          } else {
            console.error(`[AUTH] Login failed: Password mismatch for user '${identifier}'`);
          }
        } catch (error) {
          console.error("[AUTH] Database or runtime error during login:", error);
          throw error;
        }

        console.log("[AUTH] Invalid credentials catch-all reached");
        throw new CredentialsSignin("Invalid credentials");
      },
    }),
  ],
});
