"use client";

import { useState, useRef } from "react";
import { User } from "@prisma/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Save } from "lucide-react";

type ProfileFormProps = {
  user: {
    username: string;
    displayName: string | null;
    bio: string | null;
    image: string | null;
    youtubeVideoUrl: string | null;
    discordId: string | null;
  };
  updateProfileAction: (formData: FormData) => Promise<void>;
};

export function ProfileForm({ user, updateProfileAction }: ProfileFormProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.image);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload/avatar", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setAvatarUrl(data.url);
      } else {
        console.error("Failed to upload avatar");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    if (avatarUrl) {
      formData.append("image", avatarUrl);
    }
    
    await updateProfileAction(formData);
    setIsSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Avatar Section */}
      <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 mb-6">
        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <div className="w-24 h-24 rounded-full overflow-hidden bg-muted border-2 border-border/50 relative flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl text-muted-foreground">{user.username.charAt(0).toUpperCase()}</span>
            )}
            
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              {isUploading ? <Loader2 className="h-6 w-6 animate-spin text-white" /> : <Camera className="h-6 w-6 text-white" />}
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleAvatarUpload}
          />
        </div>
        <div className="space-y-1 text-center sm:text-left flex-1 pt-2">
          <h3 className="text-lg font-medium">Profile Picture</h3>
          <p className="text-sm text-muted-foreground">Click the image to upload a new avatar. JPG, PNG, or GIF up to 5MB.</p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Username</Label>
          <Input disabled value={user.username || ""} className="bg-muted/50" />
          <p className="text-xs text-muted-foreground">Usernames cannot be changed currently.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name</Label>
          <Input id="displayName" name="displayName" defaultValue={user.displayName || ""} placeholder="How you want to be called" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" name="bio" defaultValue={user.bio || ""} placeholder="Tell the community about yourself..." rows={4} />
      </div>

      <div className="space-y-4 pt-4 border-t border-border/50">
        <h3 className="text-lg font-medium">Social Links</h3>
        
        <div className="space-y-2">
          <Label htmlFor="youtubeVideoUrl">YouTube Video URL</Label>
          <Input id="youtubeVideoUrl" name="youtubeVideoUrl" defaultValue={user.youtubeVideoUrl || ""} placeholder="https://youtube.com/watch?v=..." />
          <p className="text-xs text-muted-foreground">This video will play on your public profile.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="discordId">Discord ID (Optional)</Label>
          <Input id="discordId" name="discordId" defaultValue={user.discordId || ""} placeholder="Your Discord Username or ID" />
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <Button type="submit" disabled={isSaving || isUploading}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
