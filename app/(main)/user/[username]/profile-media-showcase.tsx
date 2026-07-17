"use client";

import { Video, Music, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

interface ProfileMediaShowcaseProps {
  videoUrl: string | null;
  musicUrl: string | null;
  images: { id: string; url: string }[];
}

function getYouTubeEmbedUrl(url: string | null) {
  if (!url) return null;
  
  // Check for playlist first
  const listMatch = url.match(/[?&]list=([^#\&\?]+)/);
  if (listMatch && listMatch[1]) {
    return `https://www.youtube.com/embed/videoseries?list=${listMatch[1]}`;
  }

  // Check for single video
  const vidMatch = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
  if (vidMatch && vidMatch[2].length === 11) {
    return `https://www.youtube.com/embed/${vidMatch[2]}`;
  }

  return null;
}

export function ProfileMediaShowcase({ videoUrl, musicUrl, images }: ProfileMediaShowcaseProps) {
  const videoEmbed = getYouTubeEmbedUrl(videoUrl);
  const musicEmbed = getYouTubeEmbedUrl(musicUrl);

  if (!videoEmbed && !musicEmbed && images.length === 0) {
    return null; // Nothing to show
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* Video Showcase */}
      {videoEmbed && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Video className="w-6 h-6 text-primary" />
            Video Showcase
          </h2>
          <div className="rounded-xl overflow-hidden shadow-lg border border-border/50 bg-card">
            <div className="aspect-video relative">
              <iframe
                src={videoEmbed}
                className="absolute inset-0 w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Music Playlist */}
        {musicEmbed && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Music className="w-6 h-6 text-primary" />
              Music Playlist
            </h2>
            <div className="rounded-xl overflow-hidden shadow-lg border border-border/50 bg-card h-[300px] relative">
               <iframe
                src={musicEmbed}
                className="absolute inset-0 w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          </div>
        )}

        {/* Image Gallery */}
        {images.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <ImageIcon className="w-6 h-6 text-primary" />
              Gallery
            </h2>
            <div className={`grid gap-4 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {images.map((img) => (
                <div key={img.id} className="aspect-video relative rounded-xl overflow-hidden border border-border/50 shadow-md">
                  <Image 
                    src={img.url} 
                    alt="User Showcase Image" 
                    fill 
                    className="object-cover hover:scale-105 transition-transform duration-500" 
                  />
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
