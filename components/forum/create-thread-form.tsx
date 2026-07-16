"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownEditor } from "./markdown-editor";
import { AlertCircle } from "lucide-react";

export function CreateThreadForm({ 
  subcategoryId, 
  categorySlug, 
  subcategorySlug 
}: { 
  subcategoryId: string;
  categorySlug: string;
  subcategorySlug: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError("Title and content are required.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/forum/thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, subcategoryId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to create thread");
      }

      router.push(`/forum/thread/${data.slug}`);
      router.refresh();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title" className="text-lg">Thread Title</Label>
        <Input 
          id="title" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          placeholder="What's on your mind?"
          className="text-lg py-6"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-lg">Content</Label>
        <MarkdownEditor 
          value={body} 
          onChange={setBody} 
          placeholder="Use Markdown to format your post..." 
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-3 rounded-md">
          <AlertCircle className="h-4 w-4" />
          <p>{error}</p>
        </div>
      )}

      <div className="flex justify-end gap-4">
        <Button 
          type="button" 
          variant="ghost" 
          onClick={() => router.push(`/forum/${categorySlug}/${subcategorySlug}`)}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !title.trim() || !body.trim()}>
          {isLoading ? "Posting..." : "Post Thread"}
        </Button>
      </div>
    </form>
  );
}
