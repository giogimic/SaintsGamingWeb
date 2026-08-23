import { MessageSquare, Sparkles } from "lucide-react";

export default function ForumLoading() {
  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      
      {/* Hero Skeleton */}
      <div className="rounded-3xl border border-border/40 bg-card/40 p-8 sm:p-12 animate-pulse space-y-6">
        <div className="h-6 w-48 bg-muted rounded-full" />
        <div className="h-12 w-96 bg-muted rounded-2xl" />
        <div className="h-5 w-full max-w-2xl bg-muted rounded-lg" />
        <div className="h-11 w-full max-w-xl bg-muted rounded-xl mt-4" />
      </div>

      {/* Categories Skeleton */}
      <div className="space-y-10">
        {[1, 2].map((category) => (
          <div key={category} className="rounded-3xl border border-border/50 overflow-hidden bg-card/30 sg-glass">
            <div className="bg-muted/50 px-6 sm:px-8 py-5 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
                <div className="space-y-2">
                  <div className="h-6 w-48 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-64 bg-muted animate-pulse rounded" />
                </div>
              </div>
              <div className="h-6 w-20 bg-muted animate-pulse rounded-full hidden sm:block" />
            </div>

            <div className="p-6 sm:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((sub) => (
                  <div key={sub} className="bg-background/50 border border-border/40 rounded-2xl p-5 space-y-4 animate-pulse">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-muted" />
                      <div className="space-y-2 flex-1">
                        <div className="h-5 w-3/4 bg-muted rounded" />
                        <div className="h-3 w-full bg-muted rounded" />
                      </div>
                    </div>
                    <div className="h-16 bg-muted/30 rounded-xl border border-border/30" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

