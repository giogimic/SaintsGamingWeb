"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, X, Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export function ReplyActions({ replyId, initialBody }: { replyId: string, initialBody: string }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [body, setBody] = useState(initialBody);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this reply?")) return;
    
    setLoading(true);
    try {
      await fetch(`/api/forum/replies/${replyId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    setLoading(true);
    try {
      await fetch(`/api/forum/replies/${replyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body })
      });
      setIsEditing(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  if (isEditing) {
    return (
      <div className="mt-4 space-y-3 w-full">
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
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} disabled={loading}>
        <Edit2 className="h-4 w-4 mr-1" /> Edit
      </Button>
      <Button variant="ghost" size="sm" onClick={handleDelete} disabled={loading} className="text-destructive hover:text-destructive">
        <Trash2 className="h-4 w-4 mr-1" /> Delete
      </Button>
    </div>
  );
}
