import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string;
      permissionLevel: number;
      username: string;
      devConsoleEnabled: boolean;
      forcePasswordChange: boolean;
      role?: any;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    permissionLevel: number;
    username: string;
    devConsoleEnabled: boolean;
    forcePasswordChange: boolean;
    role?: any;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    permissionLevel?: number;
    username?: string;
    devConsoleEnabled?: boolean;
    forcePasswordChange?: boolean;
    role?: any;
  }
}
