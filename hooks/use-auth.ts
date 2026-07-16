import { useSession } from "next-auth/react";
import { PERMISSION_LEVELS } from "@/lib/permissions";

export function useAuth() {
  const { data: session, status } = useSession();

  const user = session?.user;
  const isAuthenticated = status === "authenticated";
  const isLoading = status === "loading";

  const level = user?.permissionLevel ?? 0;

  // Permission checks using the canonical PERMISSION_LEVELS constants
  const isUser = level >= PERMISSION_LEVELS.USER;               // 20
  const isModerator = level >= PERMISSION_LEVELS.MODERATOR;     // 200
  const isAdmin = level >= PERMISSION_LEVELS.ADMIN;             // 400
  const isHeadAdmin = level >= PERMISSION_LEVELS.HEAD_ADMIN;    // 500
  const isDeveloper = level >= PERMISSION_LEVELS.DEVELOPER;     // 1000
  
  const devConsoleEnabled = user?.devConsoleEnabled || false;

  return {
    session,
    user,
    status,
    isAuthenticated,
    isLoading,
    isUser,
    isModerator,
    isAdmin,
    isHeadAdmin,
    isDeveloper,
    devConsoleEnabled,
  };
}
