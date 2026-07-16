import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-card/50 sg-glass border-border/30 shadow-2xl">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
          <Loader2 className="h-10 w-10 text-primary animate-spin relative z-10" />
        </div>
        <p className="text-sm font-medium text-muted-foreground animate-pulse tracking-widest uppercase">
          Loading Data...
        </p>
      </div>
    </div>
  );
}
