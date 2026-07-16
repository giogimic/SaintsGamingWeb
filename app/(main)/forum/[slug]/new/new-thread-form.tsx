"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function NewThreadForm({ subcategoryId, subcategorySlug }: { subcategoryId: string, subcategorySlug: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/forum/thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, subcategoryId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Something went wrong.");
      }

      const thread = await res.json();
      router.push(`/forum/t/${thread.slug}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md text-sm font-medium border border-destructive/20">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-foreground font-semibold">Title</Label>
        <Input 
          id="title"
          placeholder="Thread title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={3}
          maxLength={100}
          className="bg-card/40 border-border/50 focus-visible:ring-primary/50"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="body" className="text-foreground font-semibold">Content (Markdown supported)</Label>
        <Textarea 
          id="body"
          placeholder="What's on your mind?"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          minLength={5}
          maxLength={10000}
          className="min-h-[300px] bg-card/40 border-border/50 focus-visible:ring-primary/50"
        />
      </div>
      <div className="flex justify-end gap-4 pt-4 border-t border-border/50">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => router.push(`/forum/${subcategorySlug}`)}
          disabled={isLoading}
          className="border-border/50 hover:bg-muted/50 text-foreground"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={isLoading || !title.trim() || !body.trim()}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isLoading ? "Posting..." : "Post Thread"}
        </Button>
      </div>
    </form>
  );
}
