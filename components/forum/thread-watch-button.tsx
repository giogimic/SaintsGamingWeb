"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ThreadWatchButtonProps {
  threadId: string;
  initialIsWatched: boolean;
}

export function ThreadWatchButton({ threadId, initialIsWatched }: ThreadWatchButtonProps) {
  const [isWatched, setIsWatched] = useState(initialIsWatched);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const toggleWatch = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/forum/thread/${threadId}/watch`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setIsWatched(data.isSubscribed);
        toast.success(data.isSubscribed ? "You are now watching this thread" : "You are no longer watching this thread");
        router.refresh();
      } else {
        toast.error("Failed to update subscription");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={toggleWatch} 
      disabled={loading}
      className={`h-8 border-border/50 ${isWatched ? "text-primary bg-primary/10 border-primary/30 hover:bg-primary/20" : "text-muted-foreground hover:text-foreground"}`}
    >
      {isWatched ? (
        <><EyeOff className="h-4 w-4 mr-2" /> Unwatch</>
      ) : (
        <><Eye className="h-4 w-4 mr-2" /> Watch</>
      )}
    </Button>
  );
}
