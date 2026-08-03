"use client";

import { useState, useEffect } from "react";
import { X, Cookie } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname();
  const isGameShell =
    !!pathname && (pathname.startsWith("/lobby") || pathname.startsWith("/studio"));

  useEffect(() => {
    if (isGameShell) {
      setIsVisible(false);
      return;
    }
    const hasConsented =
      localStorage.getItem("cookie-consent") || document.cookie.includes("cookie-consent=true");
    if (!hasConsented) {
      setTimeout(() => setIsVisible(true), 0);
    }
  }, [isGameShell]);

  const handleAccept = () => {
    localStorage.setItem("cookie-consent", "true");
    document.cookie = "cookie-consent=true; path=/; max-age=31536000; SameSite=Lax";
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem("cookie-consent", "false");
    document.cookie = "cookie-consent=false; path=/; max-age=31536000; SameSite=Lax";
    setIsVisible(false);
  };

  if (isGameShell) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="pointer-events-none fixed bottom-0 left-0 right-0 z-[100] flex justify-center p-4"
        >
          <div className="pointer-events-auto flex w-full max-w-4xl flex-col items-start justify-between gap-4 rounded-2xl border border-border bg-background/95 p-6 shadow-2xl backdrop-blur-md sm:flex-row sm:items-center">
            <div className="flex items-start gap-4">
              <div className="hidden rounded-full bg-primary/10 p-3 sm:block">
                <Cookie className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  <Cookie className="h-5 w-5 text-primary sm:hidden" />
                  We value your privacy
                </h3>
                <p className="text-sm text-muted-foreground">
                  We use cookies and similar technologies to enhance your browsing experience,
                  serve personalized content, and analyze our traffic. By clicking &quot;Accept
                  All&quot;, you consent to our use of cookies in accordance with our Privacy
                  Policy.
                </p>
              </div>
            </div>

            <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto" onClick={handleDecline}>
                Decline
              </Button>
              <Button className="w-full sm:w-auto" onClick={handleAccept}>
                Accept All
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="hidden rounded-full sm:inline-flex"
                onClick={() => setIsVisible(false)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
