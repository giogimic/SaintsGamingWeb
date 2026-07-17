"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarkdownEditor } from "./markdown-editor";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

interface ReplyFormProps {
  threadId: string;
}

export function ReplyForm({ threadId }: ReplyFormProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [forumPin, setForumPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/forum/replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, threadId, forumPin }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to post reply");
      }

      setBody("");
      toast.success("Reply posted successfully!");
      router.refresh();
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-8">
      <h3 className="text-xl font-bold mb-4">Post a Reply</h3>
      <Card className="bg-card/40 border-border/50 sg-glass">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/15 text-destructive text-sm p-4 rounded-md border border-destructive/30">
                {error}
              </div>
            )}
            
            <div className="min-h-[150px]">
              <MarkdownEditor
                value={body}
                onChange={(val) => {
                  setBody(val);
                  if (error) setError("");
                }}
                placeholder="Write your reply here... Markdown is supported."
                draftKey={`reply-${threadId}`}
              />
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="w-full sm:w-64">
                <Input 
                  type="password"
                  placeholder="Forum PIN (if set)"
                  value={forumPin}
                  onChange={(e) => setForumPin(e.target.value)}
                  className="bg-background/50"
                  maxLength={20}
                />
              </div>
              <Button type="submit" disabled={isLoading || !body.trim()} className="w-full sm:w-auto">
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Submit Reply
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
