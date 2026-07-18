"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, X, Check, MoreHorizontal, Flag, CheckCircle, Heart } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from "react-markdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface ReplyActionsProps {
  replyId: string;
  threadId: string;
  initialBody: string;
  canEdit: boolean;
  isThreadAuthor: boolean;
  isSolution: boolean;
  createdAt: Date;
  initialLikesCount: number;
  initialHasLiked: boolean;
}

export function ReplyActions({ replyId, threadId, initialBody, canEdit, isThreadAuthor, isSolution, createdAt, initialLikesCount, initialHasLiked }: ReplyActionsProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [body, setBody] = useState(initialBody);
  const [loading, setLoading] = useState(false);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [hasLiked, setHasLiked] = useState(initialHasLiked);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this reply?")) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/forum/replies/${replyId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Reply deleted");
        router.refresh();
      } else {
        toast.error("Failed to delete reply");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/forum/replies/${replyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body })
      });
      if (res.ok) {
        setIsEditing(false);
        toast.success("Reply updated");
        router.refresh();
      } else {
        toast.error("Failed to update reply");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMarkSolution = async () => {
    try {
      const res = await fetch(`/api/forum/thread/${threadId}/accept-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyId: isSolution ? null : replyId })
      });
      if (res.ok) {
        toast.success(isSolution ? "Solution removed" : "Marked as solution");
        router.refresh();
      }
    } catch {
      toast.error("Failed to update solution status");
    }
  };

  const handleReport = async () => {
    const reason = prompt("Please provide a reason for reporting this reply:");
    if (!reason) return;
    
    try {
      const res = await fetch(`/api/forum/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyId, reason })
      });
      if (res.ok) {
        toast.success("Report submitted successfully");
      } else {
        toast.error("Failed to submit report");
      }
    } catch {
      toast.error("Failed to submit report");
    }
  };

  const handleLike = async () => {
    try {
      const res = await fetch(`/api/forum/reply/${replyId}/like`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setHasLiked(data.liked);
        setLikesCount(prev => data.liked ? prev + 1 : prev - 1);
      } else {
        toast.error("Failed to update like status");
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 relative">
      {isSolution && (
        <div className="absolute top-0 right-0 left-0 bg-green-500/10 border-b border-green-500/20 px-6 py-2 flex items-center gap-2 text-green-500 text-sm font-medium z-10">
          <CheckCircle className="w-4 h-4" /> Accepted Solution
        </div>
      )}

      <div className={`px-6 py-3 border-b border-border/50 flex justify-between items-center bg-muted/10 ${isSolution ? 'pt-10' : ''}`}>
        <span className="text-xs text-muted-foreground">{createdAt.toLocaleDateString()} at {createdAt.toLocaleTimeString()}</span>
        <div className="flex items-center gap-3 relative z-20">
          <button 
            onClick={handleLike} 
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${hasLiked ? "text-pink-500 bg-pink-500/10 hover:bg-pink-500/20" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}
          >
            <Heart className={`h-4 w-4 ${hasLiked ? "fill-current" : ""}`} />
            <span className="text-xs font-medium">{likesCount > 0 ? likesCount : ""}</span>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hover:text-foreground transition-colors p-1" disabled={loading}>
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {canEdit && (
                <>
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit2 className="h-4 w-4 mr-2" /> Edit Reply
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </>
              )}
              {isThreadAuthor && (
                <DropdownMenuItem onClick={handleMarkSolution} className={isSolution ? "text-amber-500" : "text-green-500"}>
                  <CheckCircle className="h-4 w-4 mr-2" /> {isSolution ? "Unmark Solution" : "Mark as Solution"}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleReport}>
                <Flag className="h-4 w-4 mr-2" /> Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="p-6 flex-1 min-h-[150px]">
        {isEditing ? (
          <div className="space-y-3 w-full">
            <Textarea 
              value={body} 
              onChange={e => setBody(e.target.value)}
              className="min-h-[100px] font-mono text-sm bg-background/50"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => { setIsEditing(false); setBody(initialBody); }}>
                <X className="h-4 w-4 mr-2" /> Cancel
              </Button>
              <Button size="sm" onClick={handleEdit} disabled={loading || body.trim() === ""}>
                <Check className="h-4 w-4 mr-2" /> Save Changes
              </Button>
            </div>
          </div>
        ) : (
          <div className="prose prose-invert prose-sm sm:prose-base max-w-none prose-headings:text-foreground prose-a:text-primary hover:prose-a:text-primary/80 prose-strong:text-foreground break-words">
            <ReactMarkdown>{initialBody}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
