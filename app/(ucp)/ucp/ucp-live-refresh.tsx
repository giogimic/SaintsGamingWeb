"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

/**
 * Refreshes UCP server components when game servers push updates
 * for the signed-in user.
 */
export function UcpLiveRefresh() {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id;

  // Placeholder — will be wired to SA-MP or other game server events later
  return null;
}
