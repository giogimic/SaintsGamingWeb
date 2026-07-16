"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Lock, Pin, Unlock, PinOff } from "lucide-react";
import { Loader2 } from "lucide-react";

export function ThreadModeration({ threadId, isLocked, isPinned }: { threadId: string, isLocked: boolean, isPinned: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"lock" | "pin" | null>(null);

  const toggleLock = async () => {
    setLoading("lock");
    try {
      await fetch(`/api/forum/threads/${threadId}/moderate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLocked: !isLocked })
      });
      router.refresh();
    } finally {
      setLoading(null);
    }
  };

  const togglePin = async () => {
    setLoading("pin");
    try {
      await fetch(`/api/forum/threads/${threadId}/moderate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !isPinned })
      });
      router.refresh();
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex gap-2">
      <Button 
        variant={isPinned ? "default" : "outline"} 
        size="sm" 
        onClick={togglePin} 
        disabled={!!loading}
        className={isPinned ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
      >
        {loading === "pin" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : isPinned ? <PinOff className="h-4 w-4 mr-2" /> : <Pin className="h-4 w-4 mr-2" />}
        {isPinned ? "Unpin" : "Pin"}
      </Button>
      <Button 
        variant={isLocked ? "destructive" : "outline"} 
        size="sm" 
        onClick={toggleLock} 
        disabled={!!loading}
      >
        {loading === "lock" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : isLocked ? <Unlock className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
        {isLocked ? "Unlock" : "Lock"}
      </Button>
    </div>
  );
}
