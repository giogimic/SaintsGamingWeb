"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function ForcePasswordRedirect({ forcePasswordChange }: { forcePasswordChange?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (forcePasswordChange && pathname !== "/force-password-change") {
      // Allow logout to proceed
      if (pathname.startsWith("/api/auth")) return;
      router.push("/force-password-change");
    }
  }, [forcePasswordChange, pathname, router]);

  return null;
}
