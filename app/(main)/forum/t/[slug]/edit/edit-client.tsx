"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

export default function EditThreadClient({ threadId, initialTitle, initialBody, slug, subcategorySlug }: { threadId: string, initialTitle: string, initialBody: string, slug: string, subcategorySlug: string }) {
  const router = useRouter();
  
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/forum/thread/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body })
      });

      if (res.ok) {
        toast.success("Thread updated successfully");
        router.push(`/forum/t/${slug}`);
        router.refresh();
      } else {
        toast.error("Failed to update thread");
      }
    } catch {
      toast.error("Failed to update thread");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/forum/t/${slug}`}>
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-3xl font-black uppercase tracking-tight">Edit Thread</h1>
      </div>

      <div className="sg-glass border border-border/50 rounded-2xl p-6 sm:p-8 space-y-6">
        <div>
          <label className="block text-sm font-bold mb-2 text-muted-foreground uppercase tracking-wider">
            Thread Title
          </label>
          <Input 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            placeholder="Enter a descriptive title..."
            className="text-lg bg-background/50"
          />
        </div>

        <div>
          <label className="block text-sm font-bold mb-2 text-muted-foreground uppercase tracking-wider">
            Content
          </label>
          <Textarea 
            value={body} 
            onChange={e => setBody(e.target.value)} 
            placeholder="Write your content here... (Markdown supported)"
            className="min-h-[400px] font-mono text-sm bg-background/50"
          />
        </div>

        <div className="flex justify-end pt-4 border-t border-border/50">
          <Button onClick={handleSave} disabled={saving} size="lg" className="px-8 bg-primary text-primary-foreground hover:bg-primary/90">
            {saving ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
