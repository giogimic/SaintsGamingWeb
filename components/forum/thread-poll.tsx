"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { BarChart2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface ThreadPollProps {
  poll: any; // include options and votes
  currentUserId?: string;
}

export function ThreadPoll({ poll, currentUserId }: ThreadPollProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const totalVotes = poll.options.reduce((acc: number, opt: any) => acc + opt.votes.length, 0);
  const userVote = poll.options.find((opt: any) => 
    opt.votes.some((v: any) => v.userId === currentUserId)
  );

  const handleVote = async (optionId: string) => {
    if (!currentUserId) {
      toast.error("You must be logged in to vote.");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`/api/forum/poll/${poll.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to vote");
      }

      toast.success("Vote recorded!");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card/60 sg-glass border-b border-border/50 p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-2">
        <BarChart2 className="h-5 w-5 text-primary" />
        <h3 className="text-xl font-bold">{poll.question}</h3>
      </div>
      
      <div className="space-y-4 max-w-2xl">
        {poll.options.map((opt: any) => {
          const votesCount = opt.votes.length;
          const percentage = totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0;
          const isUserChoice = userVote?.id === opt.id;

          return (
            <div key={opt.id} className="relative">
              <button
                onClick={() => !userVote && handleVote(opt.id)}
                disabled={!!userVote || loading}
                className={`w-full text-left p-3 rounded-md border transition-all ${
                  isUserChoice 
                    ? "border-primary bg-primary/10 ring-1 ring-primary" 
                    : "border-border/50 bg-background/50 hover:border-primary/50"
                } ${!!userVote ? "cursor-default" : "cursor-pointer"}`}
              >
                <div className="flex justify-between items-center mb-2 relative z-10">
                  <span className={`font-medium ${isUserChoice ? "text-primary font-bold flex items-center gap-2" : ""}`}>
                    {opt.text}
                    {isUserChoice && <CheckCircle2 className="h-4 w-4" />}
                  </span>
                  {userVote && (
                    <span className="text-sm font-semibold text-muted-foreground">
                      {votesCount} ({percentage}%)
                    </span>
                  )}
                </div>
                {userVote && (
                  <Progress value={percentage} className="h-2" />
                )}
              </button>
            </div>
          );
        })}
      </div>
      <div className="text-sm text-muted-foreground mt-2">
        Total votes: {totalVotes}
      </div>
    </div>
  );
}
