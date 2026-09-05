"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/shared/store/useAppStore";

/**
 * Refreshes UCP server components when FiveM pushes character/bank updates
 * for the signed-in user.
 */
export function UcpLiveRefresh() {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const lastCharacter = useAppStore((s) => s.lastFivemCharacterUpdate);
  const lastBank = useAppStore((s) => s.lastFivemBankUpdate);
  const lastHandled = useRef<number>(0);

  useEffect(() => {
    if (!userId) return;
    const stamps = [lastCharacter, lastBank]
      .filter((s) => s && s.userId === userId)
      .map((s) => s!.receivedAt);
    const newest = stamps.length ? Math.max(...stamps) : 0;
    if (newest <= lastHandled.current) return;
    lastHandled.current = newest;
    router.refresh();
  }, [userId, lastCharacter, lastBank, router]);

  return null;
}
