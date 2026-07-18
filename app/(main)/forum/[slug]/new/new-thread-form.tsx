"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownEditor } from "@/components/forum/markdown-editor";
import { Plus, X, BarChart2 } from "lucide-react";

export function NewThreadForm({ subcategoryId, subcategorySlug }: { subcategoryId: string, subcategorySlug: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  
  // Poll state
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const payload: any = { title, body, subcategoryId, tags };
      if (showPoll && pollQuestion.trim() && pollOptions.filter(o => o.trim()).length >= 2) {
        payload.pollQuestion = pollQuestion.trim();
        payload.pollOptions = pollOptions.filter(o => o.trim());
      }

      const res = await fetch("/api/forum/thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      <div className="space-y-2 min-h-[350px]">
        <Label htmlFor="body" className="text-foreground font-semibold">Content (Markdown supported)</Label>
        <MarkdownEditor 
          value={body}
          onChange={setBody}
          placeholder="What's on your mind?"
          draftKey={`new-thread-${subcategoryId}`}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tags" className="text-foreground font-semibold">Tags (comma-separated)</Label>
        <Input 
          id="tags"
          placeholder="e.g. guide, update, discussion"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="bg-card/40 border-border/50 focus-visible:ring-primary/50"
        />
      </div>
      
      {!showPoll ? (
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => setShowPoll(true)}
          className="border-dashed border-border/50 text-muted-foreground w-full py-8 hover:bg-card/40 hover:text-foreground"
        >
          <BarChart2 className="h-4 w-4 mr-2" /> Attach a Poll
        </Button>
      ) : (
        <div className="p-4 sm:p-6 border border-primary/20 bg-primary/5 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-primary" /> Thread Poll
            </h3>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowPoll(false)} className="h-8 text-muted-foreground hover:text-destructive">
              <X className="h-4 w-4 mr-1" /> Remove Poll
            </Button>
          </div>
          
          <div className="space-y-2">
            <Label>Poll Question</Label>
            <Input 
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              placeholder="What do you want to ask?"
              className="bg-background/50 border-border/50"
            />
          </div>

          <div className="space-y-3">
            <Label>Poll Options (Min 2, Max 10)</Label>
            {pollOptions.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input 
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...pollOptions];
                    newOpts[idx] = e.target.value;
                    setPollOptions(newOpts);
                  }}
                  placeholder={`Option ${idx + 1}`}
                  className="bg-background/50 border-border/50"
                />
                {pollOptions.length > 2 && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon"
                    onClick={() => {
                      const newOpts = [...pollOptions];
                      newOpts.splice(idx, 1);
                      setPollOptions(newOpts);
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {pollOptions.length < 10 && (
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => setPollOptions([...pollOptions, ""])}
                className="mt-2 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" /> Add Option
              </Button>
            )}
          </div>
        </div>
      )}

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
