"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { MarkdownEditor } from "@/components/forum/markdown-editor";
import { ImageUpload } from "./image-upload";
import { formatDistanceToNow } from "date-fns";

 
type Article = any; // simplified for this component

export function NewsManager({ initialArticles }: { initialArticles: Article[] }) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form State
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, excerpt, body, coverImage, isPublished }),
      });
      if (res.ok) {
        setIsCreating(false);
        setTitle(""); setExcerpt(""); setBody(""); setCoverImage(null); setIsPublished(false);
        router.refresh();
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isCreating) {
    return (
      <form onSubmit={handleCreate} className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Write News Article</h2>
          <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={e => setTitle(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="excerpt">Excerpt (Short description)</Label>
            <Textarea id="excerpt" value={excerpt} onChange={e => setExcerpt(e.target.value)} />
          </div>

          <ImageUpload value={coverImage} onChange={setCoverImage} label="Cover Image" />

          <div className="space-y-2">
            <Label>Article Body (Markdown)</Label>
            <MarkdownEditor value={body} onChange={setBody} />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="publish" checked={isPublished} onCheckedChange={(c: boolean) => setIsPublished(!!c)} />
            <label htmlFor="publish" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Publish immediately
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading || !title || !body}>
            {isLoading ? "Saving..." : "Save Article"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Article
        </Button>
      </div>

      <div className="border border-border/50 rounded-lg overflow-hidden bg-background">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
            <tr>
              <th className="px-4 py-3 font-medium">Article</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Author</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {initialArticles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No articles found. Create one to get started.
                </td>
              </tr>
            ) : (
              initialArticles.map((article: Article) => (
                <tr key={article.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{article.title}</td>
                  <td className="px-4 py-3">
                    {article.isPublished ? (
                      <span className="inline-flex items-center text-green-500 bg-green-500/10 px-2 py-1 rounded-full text-xs">
                        <Eye className="h-3 w-3 mr-1" /> Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-muted-foreground bg-muted px-2 py-1 rounded-full text-xs">
                        <EyeOff className="h-3 w-3 mr-1" /> Draft
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{article.author.username}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDistanceToNow(new Date(article.createdAt), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
