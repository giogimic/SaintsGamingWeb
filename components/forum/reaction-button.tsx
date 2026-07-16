"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThumbsUp } from "lucide-react";

export function ReactionButton({ targetType, targetId, initialCount, hasReacted }: { targetType: "thread" | "reply", targetId: string, initialCount: number, hasReacted: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [optimisticState, addOptimisticState] = useOptimistic(
    { count: initialCount, reacted: hasReacted },
    (state, newReacted: boolean) => ({
      count: state.count + (newReacted ? 1 : -1),
      reacted: newReacted,
    })
  );

  const toggleReaction = async () => {
    const newReactedState = !optimisticState.reacted;
    
    startTransition(async () => {
      addOptimisticState(newReactedState);
      
      try {
        await fetch(`/api/forum/reactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetType, targetId, emoji: "👍" })
        });
        router.refresh();
      } catch (err) {
        console.error("Failed to toggle reaction", err);
      }
    });
  };

  return (
    <Button 
      variant={optimisticState.reacted ? "secondary" : "ghost"} 
      size="sm" 
      onClick={toggleReaction} 
      disabled={isPending}
      className={`transition-all duration-200 ${optimisticState.reacted ? "text-primary bg-primary/10 border border-primary/20 shadow-[0_0_10px_oklch(var(--primary)/20%)]" : "hover:text-primary"}`}
    >
      <ThumbsUp className={`h-4 w-4 mr-2 transition-transform ${optimisticState.reacted ? "fill-primary scale-110" : "scale-100"}`} /> 
      {optimisticState.count}
    </Button>
  );
}
