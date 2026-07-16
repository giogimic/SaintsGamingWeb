"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2 } from "lucide-react";
import { MarkdownEditor } from "@/components/forum/markdown-editor";
import { ImageUpload } from "./image-upload";

type Modpack = any;  

export function ModpackManager({ initialModpacks }: { initialModpacks: Modpack[] }) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form State
  const [name, setName] = useState("");
  const [game, setGame] = useState("Minecraft");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("");
  const [status, setStatus] = useState("Active");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [installNotes, setInstallNotes] = useState("");
  const [changelog, setChangelog] = useState("");

  const resetForm = () => {
    setIsCreating(false);
    setEditingId(null);
    setName(""); setGame("Minecraft"); setDescription(""); setVersion(""); 
    setStatus("Active"); setDownloadUrl(""); setLogoImage(null); 
    setInstallNotes(""); setChangelog("");
  };

  const handleEdit = (mp: Modpack) => {
    setName(mp.name);
    setGame(mp.game);
    setDescription(mp.description || "");
    setVersion(mp.version || "");
    setStatus(mp.status);
    setDownloadUrl(mp.downloadUrl || "");
    setLogoImage(mp.logoImage || null);
    setInstallNotes(mp.installNotes || "");
    setChangelog(mp.changelog || "");
    setEditingId(mp.id);
    setIsCreating(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this modpack?")) return;
    try {
      await fetch(`/api/admin/modpacks/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const url = editingId ? `/api/admin/modpacks/${editingId}` : "/api/admin/modpacks";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name, game, description, version, status, downloadUrl, logoImage, installNotes, changelog 
        }),
      });
      if (res.ok) {
        resetForm();
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.message || "Failed to save modpack");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isCreating) {
    return (
      <form onSubmit={handleSave} className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{editingId ? "Edit Modpack" : "Add Modpack"}</h2>
          <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="game">Game</Label>
            <Input id="game" value={game} onChange={e => setGame(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="version">Version</Label>
            <Input id="version" value={version} onChange={e => setVersion(e.target.value)} placeholder="e.g. 1.20.1" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(val) => setStatus(val || "Active")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="downloadUrl">Download URL</Label>
            <Input id="downloadUrl" value={downloadUrl} onChange={e => setDownloadUrl(e.target.value)} type="url" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Short Description</Label>
          <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        <ImageUpload value={logoImage} onChange={setLogoImage} label="Logo Image" />

        <div className="space-y-2">
          <Label>Installation Notes (Markdown)</Label>
          <MarkdownEditor value={installNotes} onChange={setInstallNotes} />
        </div>

        <div className="space-y-2">
          <Label>Changelog (Markdown)</Label>
          <MarkdownEditor value={changelog} onChange={setChangelog} />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading || !name || !game}>
            {isLoading ? "Saving..." : "Save Modpack"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Modpack
        </Button>
      </div>

      <div className="border border-border/50 rounded-lg overflow-hidden bg-background">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Game</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Version</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {initialModpacks.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No modpacks found. Create one to get started.
                </td>
              </tr>
            ) : (
              initialModpacks.map((mp: Modpack) => (
                <tr key={mp.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{mp.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{mp.game}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                      mp.status === "Active" ? "bg-green-500/10 text-green-500" :
                      mp.status === "Inactive" ? "bg-yellow-500/10 text-yellow-500" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {mp.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{mp.version || "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(mp)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(mp.id)}>
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
