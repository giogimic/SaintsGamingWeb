"use client";

import { useState, useTransition } from "react";
import { updateProfileMedia, uploadProfileImage, deleteProfileImage } from "@/app/actions/profile";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Video, Music, Image as ImageIcon, Trash2 } from "lucide-react";
import Image from "next/image";

interface ProfileMediaSettingsProps {
  initialVideoUrl: string | null;
  initialMusicUrl: string | null;
  images: { id: string; url: string }[];
}

export function ProfileMediaSettings({ initialVideoUrl, initialMusicUrl, images }: ProfileMediaSettingsProps) {
  const [isPending, startTransition] = useTransition();
  const [videoUrl, setVideoUrl] = useState(initialVideoUrl || "");
  const [musicUrl, setMusicUrl] = useState(initialMusicUrl || "");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleSaveUrls = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const formData = new FormData();
      formData.append("youtubeVideoUrl", videoUrl);
      formData.append("youtubeMusicUrl", musicUrl);
      try {
        await updateProfileMedia(formData);
      } catch (err) {
        console.error("Failed to save media URLs", err);
      }
    });
  };

  const handleAddImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) return;
    setUploadingImage(true);
    try {
      await uploadProfileImage(imageUrl);
      setImageUrl("");
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to add image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteImage = async (id: string) => {
    try {
      await deleteProfileImage(id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Card className="bg-card/50 border-border/50 mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Video className="w-5 h-5 text-primary" /> Media Showcase</CardTitle>
        <CardDescription>Embed YouTube videos, music playlists, and images on your public profile.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        
        <form onSubmit={handleSaveUrls} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Video className="w-4 h-4 text-muted-foreground" /> YouTube Video / Playlist URL
            </label>
            <Input 
              placeholder="https://www.youtube.com/watch?v=..." 
              value={videoUrl} 
              onChange={(e) => setVideoUrl(e.target.value)} 
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Music className="w-4 h-4 text-muted-foreground" /> YouTube Music Playlist URL
            </label>
            <Input 
              placeholder="https://www.youtube.com/watch?v=...&list=..." 
              value={musicUrl} 
              onChange={(e) => setMusicUrl(e.target.value)} 
            />
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save YouTube Links
          </Button>
        </form>

        <div className="border-t border-border/50 pt-6">
          <label className="text-sm font-medium flex items-center gap-2 mb-4">
            <ImageIcon className="w-4 h-4 text-muted-foreground" /> Image Gallery (Max 4)
          </label>
          
          <form onSubmit={handleAddImage} className="flex gap-2 mb-6">
            <Input 
              placeholder="https://example.com/image.png" 
              value={imageUrl} 
              onChange={(e) => setImageUrl(e.target.value)} 
              disabled={images.length >= 4 || uploadingImage}
            />
            <Button type="submit" disabled={!imageUrl || images.length >= 4 || uploadingImage}>
              {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Image"}
            </Button>
          </form>

          {images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {images.map(img => (
                <div key={img.id} className="relative aspect-video rounded-md overflow-hidden group border border-border/50">
                  <Image src={img.url} alt="Profile Gallery Image" fill className="object-cover" />
                  <div className="absolute inset-0 bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <Button variant="destructive" size="icon" onClick={() => handleDeleteImage(img.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  );
}
