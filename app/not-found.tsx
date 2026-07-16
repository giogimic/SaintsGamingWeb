"use client";

import Link from "next/link";
import { Ghost, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background/50 relative overflow-hidden p-4">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <Card className="max-w-md w-full sg-glass border-border/30 relative z-10 sg-3d-card overflow-hidden">
        {/* Terminal Header Mockup */}
        <div className="bg-muted/30 border-b border-border/50 px-4 py-2 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
          <span className="text-xs text-muted-foreground ml-2 font-mono">ERROR 404</span>
        </div>

        <CardContent className="p-8 sm:p-12 text-center">
          <div className="mx-auto w-20 h-20 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-center justify-center mb-6 sg-glow">
            <Ghost className="h-10 w-10 text-destructive animate-pulse" />
          </div>

          <h1 className="text-4xl font-bold mb-3 tracking-tight">
            Lost in the <span className="sg-text-gradient">Void</span>
          </h1>
          
          <p className="text-muted-foreground mb-8">
            The page you&apos;re looking for has been disconnected, deleted, or never existed in the first place.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" className="border-border/50 hover:bg-muted/50 transition-all cursor-pointer" onClick={() => window.history.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Return Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
