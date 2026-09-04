"use client";

import { MessageSquare, Image as ImageIcon, ExternalLink, Share2 } from "lucide-react";
import { Badge } from "@/web/components/ui/badge";

interface SocialCardsPreviewProps {
  siteName: string;
  url: string;
  title: string;
  description: string;
  ogImage: string;
  twitterHandle: string;
}

export function SocialCardsPreview({
  siteName,
  url,
  title,
  description,
  ogImage,
  twitterHandle,
}: SocialCardsPreviewProps) {
  const cleanUrl = url.trim() || "https://www.saintsgaming.net";
  const domain = cleanUrl.replace(/^https?:\/\//, "").split("/")[0] || "saintsgaming.net";
  const fallbackImage = "/og-image.jpg";
  const previewImage = ogImage.trim() || fallbackImage;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Twitter / X Summary with Large Image Card */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-[#1da1f2] fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Twitter / X Card (Large Image)
          </span>
          <Badge variant="outline" className="text-[10px] bg-secondary/30">summary_large_image</Badge>
        </div>

        <div className="w-full bg-[#16181c] border border-zinc-800 rounded-2xl overflow-hidden shadow-lg select-none">
          {/* Card Image Banner */}
          <div className="relative aspect-[1.91/1] w-full bg-zinc-900 flex items-center justify-center overflow-hidden border-b border-zinc-800">
            {previewImage.startsWith("/") || previewImage.startsWith("http") ? (
              <img
                src={previewImage}
                alt="Card Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to placeholder visual on broken image
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4 pointer-events-none">
              <div className="text-xs text-white/70 font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                {domain}
              </div>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-3.5 space-y-1">
            <div className="text-[12px] text-zinc-400 font-mono truncate">{domain}</div>
            <div className="text-[15px] font-bold text-white leading-snug line-clamp-2">
              {title || "Saints Gaming - Game Servers, Mod Packs & Community"}
            </div>
            <div className="text-[13px] text-zinc-400 leading-relaxed line-clamp-2">
              {description || "A chill gaming community since 2007. Dedicated game servers, custom modpacks, forums, and live streams."}
            </div>
            {twitterHandle && (
              <div className="text-[11px] text-[#1da1f2] pt-1">
                Via @{twitterHandle.replace(/^@/, "")}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Open Graph / Discord Rich Embed Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-[#5865f2]" />
            Discord / OpenGraph Embed
          </span>
          <Badge variant="outline" className="text-[10px] bg-secondary/30">og:type = website</Badge>
        </div>

        <div className="w-full bg-[#2b2d31] border-l-4 border-l-[#5865f2] rounded-r-lg p-3.5 shadow-lg select-none space-y-2">
          <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
            {siteName || "Saints Gaming"}
          </div>

          <div className="text-[15px] font-semibold text-[#00a8fc] hover:underline cursor-pointer leading-tight line-clamp-2">
            {title || "Saints Gaming - Dedicated Game Servers & Community"}
          </div>

          <div className="text-[13px] text-[#dbdee1] leading-relaxed line-clamp-3">
            {description || "A chill gaming community since 2007. Dedicated game servers, custom modpacks, community forums, live streams, and embedded 2.5D MMO experience."}
          </div>

          {/* Embed Image Thumbnail / Banner */}
          <div className="rounded-md overflow-hidden aspect-[1.91/1] max-h-48 bg-zinc-900 border border-zinc-700/50 mt-2">
            <img
              src={previewImage}
              alt="OG Banner"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
