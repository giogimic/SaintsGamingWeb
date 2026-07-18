"use client";

import { useState } from "react";
import { MoreHorizontal, Flag, FolderInput, Share2, Trash2, Edit } from "lucide-react";
import { useRouter } from "next/navigation";
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
  isAuthor?: boolean;
  subcategorySlug?: string;
  slug?: string;
}

export function ThreadActions({ threadId, userPermissionLevel = 0, isAuthor = false, subcategorySlug, slug }: ThreadActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const canEdit = isAuthor || userPermissionLevel >= 300;

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

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this thread? This action cannot be undone.")) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/forum/thread/${threadId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Thread deleted successfully");
        if (subcategorySlug) {
          router.push(`/forum/${subcategorySlug}`);
        } else {
          router.push("/forum");
        }
      } else {
        toast.error("Failed to delete thread");
      }
    } catch {
      toast.error("Failed to delete thread");
    } finally {
      setLoading(false);
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
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={handleShare} className="cursor-pointer">
            <Share2 className="w-4 h-4 mr-2" /> Share
          </DropdownMenuItem>
          {canEdit && slug && (
            <DropdownMenuItem onClick={() => router.push(`/forum/t/${slug}/edit`)} className="cursor-pointer">
              <Edit className="w-4 h-4 mr-2" /> Edit Thread
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleReport}>
            <Flag className="h-4 w-4 mr-2" /> Report Thread
          </DropdownMenuItem>
          {userPermissionLevel >= 300 && (
            <DropdownMenuItem onClick={handleMove}>
              <FolderInput className="h-4 w-4 mr-2" /> Move Thread
            </DropdownMenuItem>
          )}
          {(isAuthor || userPermissionLevel >= 300) && (
            <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" /> Delete Thread
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
