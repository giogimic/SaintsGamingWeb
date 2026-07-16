"use client";

import { useState, useEffect } from "react";
import { X, Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const hasConsented = localStorage.getItem("cookie-consent") || document.cookie.includes("cookie-consent=true");
    if (!hasConsented) {
      setTimeout(() => setIsVisible(true), 0);
    }
  }, []);

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

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="fixed bottom-0 left-0 right-0 z-[100] p-4 pointer-events-none flex justify-center"
        >
          <div className="bg-background/95 backdrop-blur-md border border-border shadow-2xl p-6 rounded-2xl max-w-4xl w-full pointer-events-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-3 rounded-full hidden sm:block">
                <Cookie className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Cookie className="h-5 w-5 text-primary sm:hidden" />
                  We value your privacy
                </h3>
                <p className="text-sm text-muted-foreground">
                  We use cookies and similar technologies to enhance your browsing experience, serve personalized content, and analyze our traffic. 
                  By clicking &quot;Accept All&quot;, you consent to our use of cookies in accordance with our Privacy Policy.
                </p>
              </div>
            </div>
            
            <div className="flex w-full sm:w-auto items-center gap-2 shrink-0">
              <Button variant="outline" className="w-full sm:w-auto" onClick={handleDecline}>
                Decline
              </Button>
              <Button className="w-full sm:w-auto" onClick={handleAccept}>
                Accept All
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="hidden sm:inline-flex rounded-full" 
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
