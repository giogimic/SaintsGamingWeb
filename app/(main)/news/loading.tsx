import { Newspaper } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function NewsLoading() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
            <Newspaper className="h-8 w-8 text-primary" /> News & Announcements
          </h1>
          <div className="h-5 w-64 bg-muted animate-pulse rounded mt-2"></div>
        </div>
        <div className="h-10 w-48 bg-muted animate-pulse rounded-md"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="h-[380px] bg-card/40 border-border/50 overflow-hidden flex flex-col sg-glass">
            <div className="h-48 w-full bg-muted/60 animate-pulse"></div>
            <CardContent className="p-6 flex-1 flex flex-col space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-5 w-20 bg-muted animate-pulse rounded-full"></div>
                <div className="h-4 w-24 bg-muted animate-pulse rounded ml-auto"></div>
              </div>
              <div className="space-y-2">
                <div className="h-6 w-full bg-muted animate-pulse rounded"></div>
                <div className="h-6 w-3/4 bg-muted animate-pulse rounded"></div>
              </div>
              <div className="flex-1"></div>
              <div className="flex items-center gap-2 mt-auto">
                <div className="h-6 w-6 rounded-full bg-muted animate-pulse"></div>
                <div className="h-4 w-20 bg-muted animate-pulse rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
