"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { ImageUploadButton } from "@/components/admin/image-upload-button";
import { MarkdownEditor } from "@/components/forum/markdown-editor";

interface NewsEditorProps {
  article?: any;  
  saveAction: (formData: FormData) => Promise<void>;
  deleteAction: (id: string) => Promise<void>;
  backHref?: string;
}

export function NewsEditor({ article = null, saveAction, deleteAction, backHref = "/admin/news" }: NewsEditorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [promoLinks, setPromoLinks] = useState(article?.promoLinks || []);
  const [mediaAssets, setMediaAssets] = useState(article?.mediaAssets || []);
  const [coverImage, setCoverImage] = useState(article?.coverImage || "");
  const [body, setBody] = useState(article?.body || "");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.append("promoLinks", JSON.stringify(promoLinks));
    formData.append("mediaAssets", JSON.stringify(mediaAssets));
    
    try {
      await saveAction(formData);
    } catch (err: unknown) {
      alert((err instanceof Error ? err.message : "Unknown error"));
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!article?.id || !confirm("Are you sure you want to delete this article?")) return;
    setLoading(true);
    try {
      await deleteAction(article.id);
      router.push(backHref);
    } catch (err: unknown) {
      alert((err instanceof Error ? err.message : "Unknown error"));
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <Link href={backHref} className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to News
        </Link>
        {article && (
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete Article
          </Button>
        )}
      </div>

      <h1 className="text-3xl font-bold tracking-tight">
        {article ? "Edit Article" : "Create New Article"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {article && <input type="hidden" name="id" value={article.id} />}
        
        <div className="space-y-4 bg-card p-6 rounded-xl border border-border/50">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required defaultValue={article?.title} placeholder="Article Title" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="excerpt">Excerpt</Label>
            <Input id="excerpt" name="excerpt" defaultValue={article?.excerpt} placeholder="A short summary..." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coverImage">Cover Image URL (or raw SVG)</Label>
            <div className="flex gap-2">
              <Input 
                id="coverImage" 
                name="coverImage" 
                value={coverImage} 
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://..." 
                className="flex-1"
              />
              <ImageUploadButton 
                onUploadComplete={(url) => setCoverImage(url)} 
              />
            </div>
            {coverImage && coverImage.startsWith("/") && (
              <p className="text-xs text-muted-foreground mt-1">Uploaded file: {coverImage}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Content (Markdown)</Label>
            <MarkdownEditor 
              name="body"
              value={body}
              onChange={setBody}
              placeholder="## Heading..."
              draftKey={`news_${article?.id || 'new'}`}
              isNews={true}
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox id="isPublished" name="isPublished" defaultChecked={article?.isPublished} />
            <Label htmlFor="isPublished">Publish Article</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="publishedAt">Scheduled Release Time (Optional)</Label>
            <Input 
              id="publishedAt" 
              name="publishedAt" 
              type="datetime-local" 
              defaultValue={article?.publishedAt ? new Date(article.publishedAt).toISOString().slice(0, 16) : ""}
            />
            <p className="text-xs text-muted-foreground">If left blank, it will be published immediately when &quot;Publish Article&quot; is checked.</p>
          </div>
        </div>

        {/* Promo Links Section */}
        <div className="space-y-4 bg-card p-6 rounded-xl border border-border/50">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">Promo Links (CTAs)</h3>
            <Button type="button" variant="outline" size="sm" onClick={() => setPromoLinks([...promoLinks, { title: "", url: "", type: "store" }])}>
              <Plus className="mr-2 h-4 w-4" /> Add Link
            </Button>
          </div>
          {promoLinks.map((link: any  , index: number) => (
            <div key={index} className="flex gap-2 items-start">
              <Input placeholder="Title" value={link.title} onChange={e => {
                const newLinks = [...promoLinks];
                newLinks[index].title = e.target.value;
                setPromoLinks(newLinks);
              }} />
              <Input placeholder="URL" value={link.url} onChange={e => {
                const newLinks = [...promoLinks];
                newLinks[index].url = e.target.value;
                setPromoLinks(newLinks);
              }} />
              <select className="flex h-10 w-40 rounded-md border border-input bg-background px-3 py-2 text-sm" value={link.type} onChange={e => {
                const newLinks = [...promoLinks];
                newLinks[index].type = e.target.value;
                setPromoLinks(newLinks);
              }}>
                <option value="store">Store</option>
                <option value="website">Website</option>
                <option value="social">Social</option>
              </select>
              <Button type="button" variant="destructive" size="icon" onClick={() => {
                const newLinks = [...promoLinks];
                newLinks.splice(index, 1);
                setPromoLinks(newLinks);
              }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Media Assets Section */}
        <div className="space-y-4 bg-card p-6 rounded-xl border border-border/50">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">Media Assets</h3>
            <Button type="button" variant="outline" size="sm" onClick={() => setMediaAssets([...mediaAssets, { title: "", url: "", type: "youtube" }])}>
              <Plus className="mr-2 h-4 w-4" /> Add Asset
            </Button>
          </div>
          {mediaAssets.map((asset: any  , index: number) => (
            <div key={index} className="flex gap-2 items-start">
              <Input placeholder="Title" value={asset.title} onChange={e => {
                const newAssets = [...mediaAssets];
                newAssets[index].title = e.target.value;
                setMediaAssets(newAssets);
              }} />
              <Input placeholder="URL (or YouTube ID)" value={asset.url} onChange={e => {
                const newAssets = [...mediaAssets];
                newAssets[index].url = e.target.value;
                setMediaAssets(newAssets);
              }} />
              <select className="flex h-10 w-40 rounded-md border border-input bg-background px-3 py-2 text-sm" value={asset.type} onChange={e => {
                const newAssets = [...mediaAssets];
                newAssets[index].type = e.target.value;
                setMediaAssets(newAssets);
              }}>
                <option value="youtube">YouTube</option>
                <option value="image">Image</option>
                <option value="archive">Download</option>
              </select>
              <Button type="button" variant="destructive" size="icon" onClick={() => {
                const newAssets = [...mediaAssets];
                newAssets.splice(index, 1);
                setMediaAssets(newAssets);
              }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> Save Article</>}
        </Button>
      </form>
    </div>
  );
}
