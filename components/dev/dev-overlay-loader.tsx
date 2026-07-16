import { auth } from "@/auth";
import { DevOverlay } from "./dev-overlay";
import { PERMISSION_LEVELS } from "@/lib/permissions";

export async function DevOverlayLoader() {
  const session = await auth();

  if (session?.user?.permissionLevel !== undefined && session.user.permissionLevel >= PERMISSION_LEVELS.DEVELOPER && session?.user?.devConsoleEnabled) {
    return <DevOverlay />;
  }
  
  return null;
}
