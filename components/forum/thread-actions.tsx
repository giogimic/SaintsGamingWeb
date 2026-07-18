"use client";

import { useState } from "react";
import { MoreHorizontal, Flag, FolderInput, Share2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface ThreadActionsProps {
  threadId: string;
  userPermissionLevel?: number;
}

export function ThreadActions({ threadId, userPermissionLevel = 0 }: ThreadActionsProps) {
  const [loading, setLoading] = useState(false);

  const handleReport = async () => {
    const reason = prompt("Please provide a reason for reporting this thread:");
    if (!reason) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/forum/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, reason })
      });
      if (res.ok) {
        toast.success("Report submitted successfully");
      } else {
        toast.error("Failed to submit report");
      }
    } catch {
      toast.error("Failed to submit report");
    } finally {
      setLoading(false);
    }
  };

  const handleMove = async () => {
    const newSubcategoryId = prompt("Enter the ID of the new Subcategory:");
    if (!newSubcategoryId) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/forum/thread/${threadId}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subcategoryId: newSubcategoryId })
      });
      if (res.ok) {
        toast.success("Thread moved successfully");
        window.location.reload();
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to move thread");
      }
    } catch {
      toast.error("Failed to move thread");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button onClick={handleShare} className="hover:text-foreground transition-colors p-1" title="Share">
        <Share2 className="h-4 w-4" />
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger className="hover:text-foreground transition-colors p-1" disabled={loading}>
            <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleReport}>
            <Flag className="h-4 w-4 mr-2" /> Report Thread
          </DropdownMenuItem>
          {userPermissionLevel >= 300 && (
            <DropdownMenuItem onClick={handleMove}>
              <FolderInput className="h-4 w-4 mr-2" /> Move Thread
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
