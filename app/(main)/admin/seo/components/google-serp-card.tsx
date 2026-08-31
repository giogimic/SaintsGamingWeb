"use client";

import { Globe, MoreVertical, Star, ExternalLink, Sparkles } from "lucide-react";
import { Badge } from "@/shared/ui/badge";

interface GoogleSerpCardProps {
  mode: "desktop" | "mobile";
  siteName: string;
  url: string;
  title: string;
  description: string;
  showSitelinks?: boolean;
  showRating?: boolean;
  ratingValue?: number;
  ratingCount?: number;
  showDate?: boolean;
  dateStr?: string;
  highlightKeywords?: string[];
}

export function GoogleSerpCard({
  mode,
  siteName,
  url,
  title,
  description,
  showSitelinks = true,
  showRating = false,
  ratingValue = 4.9,
  ratingCount = 1420,
  showDate = false,
  dateStr = "Aug 30, 2026",
  highlightKeywords = [],
}: GoogleSerpCardProps) {
  // Format URL into Google breadcrumb style: https://www.saintsgaming.net > forum > general
  let displayUrl = url.trim() || "https://www.saintsgaming.net";
  let breadcrumbParts = displayUrl.replace(/^https?:\/\//, "").split("/").filter(Boolean);
  let domain = breadcrumbParts[0] || "saintsgaming.net";
  let pathBreadcrumb = breadcrumbParts.slice(1).join(" › ");

  // Highlight focus keywords if provided
  const renderHighlighted = (text: string) => {
    if (!highlightKeywords.length || !text) return text;

    const regex = new RegExp(`(${highlightKeywords.map(k => k.trim()).filter(Boolean).join("|")})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, i) => {
      const isMatch = highlightKeywords.some(k => k.trim().toLowerCase() === part.toLowerCase());
      if (isMatch) {
        return (
          <mark key={i} className="bg-amber-400/20 text-amber-300 font-semibold px-0.5 rounded">
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  const sitelinks = [
    { title: "Community Forums", url: "/forum", desc: "Discussion boards, guides, news, and player community." },
    { title: "The Lobby", url: "/lobby", desc: "Multiplayer 2.5D social realm, capture beasts, explore." },
    { title: "Dedicated Game Servers", url: "/servers", desc: "Live server status, connect endpoints, and modpacks." },
    { title: "Live Creator Streams", url: "/streams", desc: "Watch live Twitch & Kick creators in our community." },
  ];

  if (mode === "mobile") {
    return (
      <div className="w-full max-w-md mx-auto bg-[#1f1f1f] text-[#e8eaed] rounded-2xl p-4 shadow-xl border border-zinc-800 font-sans select-none">
        {/* Mobile Header: Favicon + Site Name + URL + Overflow Menu */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
              S
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-[#dadce0] truncate leading-tight">
                {siteName || "Saints Gaming"}
              </div>
              <div className="text-[11px] text-[#9aa0a6] truncate leading-tight">
                https://{domain}{pathBreadcrumb ? ` › ${pathBreadcrumb}` : ""}
              </div>
            </div>
          </div>
          <button type="button" className="text-[#9aa0a6] hover:text-white p-1 rounded-full shrink-0">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile Title */}
        <div className="text-[17px] leading-snug font-medium text-[#8ab4f8] hover:underline cursor-pointer line-clamp-2 mt-1">
          {renderHighlighted(title || "Saints Gaming - Game Servers & Community")}
        </div>

        {/* Optional Rating / Review */}
        {showRating && (
          <div className="flex items-center gap-1 text-[12px] text-[#9aa0a6] mt-1">
            <div className="flex items-center text-amber-400">
              <Star className="w-3.5 h-3.5 fill-current" />
            </div>
            <span className="font-semibold text-[#dadce0]">{ratingValue.toFixed(1)}</span>
            <span>({ratingCount.toLocaleString()})</span>
            <span className="text-zinc-500">•</span>
            <span>Community platform</span>
          </div>
        )}

        {/* Mobile Snippet Description */}
        <div className="text-[13px] text-[#bdc1c6] leading-relaxed mt-1.5 line-clamp-3">
          {showDate && <span className="text-[#9aa0a6] font-normal mr-1">{dateStr} —</span>}
          {renderHighlighted(description || "A chill gaming community since 2007. Dedicated game servers, modpacks, community forums, live streams, and embedded 2.5D MMO experience.")}
        </div>

        {/* Mobile Sitelinks Grid */}
        {showSitelinks && (
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-zinc-800">
            {sitelinks.map((s, idx) => (
              <div key={idx} className="bg-zinc-800/60 hover:bg-zinc-800 p-2 rounded-lg border border-zinc-700/50 cursor-pointer">
                <div className="text-[12px] font-medium text-[#8ab4f8] truncate">{s.title}</div>
                <div className="text-[10px] text-[#9aa0a6] line-clamp-1 mt-0.5">{s.desc}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Desktop Google SERP Result
  return (
    <div className="w-full max-w-3xl bg-[#202124] text-[#bdc1c6] rounded-xl p-5 shadow-xl border border-zinc-800 font-sans select-none">
      {/* Desktop Header: Favicon + Breadcrumb + Overflow Menu */}
      <div className="flex items-center gap-3 mb-1">
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-purple-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
          S
        </div>
        <div className="flex items-center gap-1.5 text-[14px] text-[#dadce0] leading-none min-w-0">
          <span className="font-normal text-white">{siteName || "Saints Gaming"}</span>
          <span className="text-[#9aa0a6] text-xs">https://{domain}{pathBreadcrumb ? ` › ${pathBreadcrumb}` : ""}</span>
        </div>
        <button type="button" className="text-[#9aa0a6] hover:text-white ml-auto">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Desktop Title */}
      <div className="text-[20px] leading-tight font-normal text-[#8ab4f8] hover:underline cursor-pointer mb-1 inline-block">
        {renderHighlighted(title || "Saints Gaming - Dedicated Game Servers, Mod Packs & Community")}
      </div>

      {/* Optional Rating */}
      {showRating && (
        <div className="flex items-center gap-1.5 text-[13px] text-[#9aa0a6] mb-1">
          <div className="flex items-center text-amber-400">
            <Star className="w-3.5 h-3.5 fill-current" />
            <Star className="w-3.5 h-3.5 fill-current" />
            <Star className="w-3.5 h-3.5 fill-current" />
            <Star className="w-3.5 h-3.5 fill-current" />
            <Star className="w-3.5 h-3.5 fill-current" />
          </div>
          <span className="font-semibold text-[#dadce0]">Rating: {ratingValue.toFixed(1)}</span>
          <span className="text-zinc-500">·</span>
          <span>{ratingCount.toLocaleString()} reviews</span>
        </div>
      )}

      {/* Desktop Snippet Description */}
      <div className="text-[14px] leading-relaxed text-[#bdc1c6] line-clamp-2">
        {showDate && <span className="text-[#9aa0a6] font-normal mr-1.5">{dateStr} —</span>}
        {renderHighlighted(description || "A chill gaming community since 2007. No elitism, no toxicity. Dedicated game servers, custom modpacks, community forums, live streams, and embedded 2.5D MMO experience.")}
      </div>

      {/* Desktop Sitelinks 2x2 Rich Snippet */}
      {showSitelinks && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 mt-4 pt-3 border-t border-zinc-800/80">
          {sitelinks.map((s, idx) => (
            <div key={idx} className="cursor-pointer group">
              <div className="text-[15px] font-normal text-[#8ab4f8] group-hover:underline flex items-center gap-1">
                {s.title}
              </div>
              <div className="text-[13px] text-[#9aa0a6] leading-snug line-clamp-1 mt-0.5">
                {s.desc}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
