import { MessageSquare } from "lucide-react";

export default function ForumLoading() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3 sg-text-gradient">
            <MessageSquare className="h-8 w-8 text-primary" /> Community Forums
          </h1>
          <div className="h-5 w-72 bg-muted animate-pulse rounded mt-2"></div>
        </div>
      </div>

      <div className="space-y-8">
        {[1, 2].map((category) => (
          <div key={category} className="rounded-xl border border-border/50 overflow-hidden bg-card/40 sg-glass">
            <div className="bg-muted/50 px-6 py-3 border-b border-border/50">
              <div className="h-6 w-48 bg-muted animate-pulse rounded"></div>
            </div>
            <div className="divide-y divide-border/50">
              {[1, 2, 3].map((sub) => (
                <div key={sub} className="px-6 py-4 flex flex-col sm:flex-row gap-4 sm:items-center">
                  <div className="flex-1 flex gap-4">
                    <div className="mt-1">
                      <div className="h-6 w-6 rounded-md bg-muted animate-pulse"></div>
                    </div>
                    <div className="space-y-2 w-full max-w-md">
                      <div className="h-6 w-1/2 bg-muted animate-pulse rounded"></div>
                      <div className="h-4 w-3/4 bg-muted animate-pulse rounded"></div>
                    </div>
                  </div>
                  
                  <div className="hidden md:flex flex-col items-center justify-center min-w-[100px] border-l border-border/50 pl-4">
                    <div className="h-5 w-8 bg-muted animate-pulse rounded mb-1"></div>
                    <div className="h-3 w-16 bg-muted animate-pulse rounded"></div>
                  </div>

                  <div className="sm:w-64 border-t sm:border-t-0 sm:border-l border-border/50 pt-3 sm:pt-0 sm:pl-4 space-y-2">
                    <div className="h-4 w-full bg-muted animate-pulse rounded"></div>
                    <div className="h-4 w-2/3 bg-muted animate-pulse rounded"></div>
                    <div className="h-3 w-1/3 bg-muted animate-pulse rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
