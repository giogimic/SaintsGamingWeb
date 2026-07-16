"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service locally or in console
    console.error("Caught by app/error.tsx boundary:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full sg-glass border-destructive/30 sg-3d-card overflow-hidden relative">
        {/* Subtle red glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/10 rounded-full blur-[50px] pointer-events-none" />

        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive animate-pulse" />
          <span className="text-xs text-destructive font-mono font-bold uppercase tracking-wider">
            System Failure
          </span>
        </div>

        <CardContent className="p-8 text-center relative z-10">
          <h2 className="text-2xl font-bold mb-3">Something went wrong</h2>
          <p className="text-muted-foreground text-sm mb-6">
            A critical error occurred while rendering this component. We&apos;ve logged the issue.
          </p>
          
          <div className="bg-muted/50 rounded-md p-3 mb-6 text-left border border-border/50">
            <code className="text-xs text-muted-foreground break-all line-clamp-3 font-mono">
              {error.message || "Unknown rendering error occurred in React."}
            </code>
          </div>

          <Button 
            onClick={() => reset()} 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Attempt Recovery
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
