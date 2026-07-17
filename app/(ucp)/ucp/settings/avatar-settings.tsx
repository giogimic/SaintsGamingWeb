"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Image as ImageIcon, RefreshCw } from "lucide-react";
import Image from "next/image";

export function AvatarSettings({ initialAvatarUrl }: { initialAvatarUrl: string | null }) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl || "");
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload/avatar", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Upload failed");
      }

      const data = await res.json();
      setAvatarUrl(data.url);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSyncGravatar = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/user/avatar/gravatar", {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Gravatar sync failed");
      }

      const data = await res.json();
      setAvatarUrl(data.url);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ImageIcon className="w-5 h-5 text-primary" /> Avatar Settings</CardTitle>
        <CardDescription>
          Customize how you appear across the site. Upload a custom image or sync from Gravatar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full border-4 border-border/50 overflow-hidden bg-muted flex items-center justify-center shrink-0">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="Avatar" width={96} height={96} className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          
          <div className="flex flex-col gap-3">
            <div>
              <input 
                type="file" 
                id="avatar-upload" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileChange} 
                disabled={uploading}
              />
              <Button asChild variant="secondary" disabled={uploading}>
                <label htmlFor="avatar-upload" className="cursor-pointer">
                  {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImageIcon className="w-4 h-4 mr-2" />}
                  Upload New Avatar
                </label>
              </Button>
            </div>
            
            <Button variant="outline" onClick={handleSyncGravatar} disabled={syncing}>
              {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Sync from Gravatar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
