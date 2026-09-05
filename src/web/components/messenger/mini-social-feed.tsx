"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { User as UserIcon, Heart, MessageSquare, EyeOff, Loader2, Play, Maximize2, Sparkles } from "lucide-react";
import { getMiniFeed, togglePostReaction, replyToSocialPost, recordWatchHistory, toggleBookmark } from "@/app/actions/social";
import { Button } from "@/web/components/ui/button";
import { Textarea } from "@/web/components/ui/textarea";
import { UiPresetEmbed } from "@/web/components/social/UiPresetEmbed";
import { ShortsViewerModal } from "@/web/components/social/shorts-viewer-modal";
import { toast } from "sonner";

type MiniPost = {
  id: string;
  body: string;
  mediaUrl: string | null;
  thumbnailUrl?: string | null;
  createdAt: Date;
  author: { id: string; username: string; image: string | null; isVIP?: boolean; isFounder?: boolean };
  hasLiked: boolean;
  hasBookmarked?: boolean;
  likesCount: number;
  repliesCount: number;
  shareCount?: number;
};

const isVideo = (url: string) => /\.(mp4|webm|mov|ogg|ogv|mkv|m4v|m3u8)$/i.test(url);

function formatVideoSrc(url: string): string {
  if (!url) return "";
  if (url.includes("#t=")) return url;
  const hashIndex = url.indexOf("#");
  if (hashIndex !== -1) {
    return `${url.substring(0, hashIndex)}#t=0.001`;
  }
  return `${url}#t=0.001`;
}

export function MiniSocialFeed() {
  const [posts, setPosts] = useState<MiniPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [viewingShortsPost, setViewingShortsPost] = useState<MiniPost | null>(null);

  useEffect(() => {
    async function loadFeed() {
      try {
        const feed = await getMiniFeed();
        setPosts(feed);
        // Track views for all loaded posts
        for (const post of feed) {
          recordWatchHistory(post.id).catch(() => {});
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadFeed();
  }, []);

  async function handleLike(postId: string) {
    const prevPosts = posts;
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          hasLiked: !p.hasLiked,
          likesCount: p.hasLiked ? Math.max(0, p.likesCount - 1) : p.likesCount + 1
        };
      }
      return p;
    }));
    try {
      await togglePostReaction(postId);
    } catch (e) {
      console.error(e);
      // Roll back
      setPosts(prevPosts);
      toast.error("Failed to update reaction");
    }
  }

  async function handleBookmark(postId: string) {
    const prevPosts = posts;
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          hasBookmarked: !p.hasBookmarked,
        };
      }
      return p;
    }));
    try {
      await toggleBookmark(postId);
    } catch (e) {
      console.error(e);
      setPosts(prevPosts);
    }
  }

  async function handleReply(postId: string, textOverride?: string) {
    const text = textOverride || replyBody;
    if (!text.trim()) return;
    const prevPosts = posts;
    setIsReplying(true);
    setReplyBody("");
    setReplyingTo(null);
    // Update reply count optimistically
    setPosts(prev => prev.map(p => {
      if (p.id === postId) return { ...p, repliesCount: p.repliesCount + 1 };
      return p;
    }));

    try {
      await replyToSocialPost(postId, text.trim());
    } catch (e) {
      console.error(e);
      // Rollback on failure
      setPosts(prevPosts);
      setReplyBody(text);
      toast.error("Failed to post comment");
    } finally {
      setIsReplying(false);
    }
  }

  function handleHide(postId: string) {
    setHiddenIds(prev => new Set(prev).add(postId));
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full p-4">
        <span className="text-sm text-muted-foreground animate-pulse">Loading The Feed...</span>
      </div>
    );
  }

  const visiblePosts = posts.filter(p => !hiddenIds.has(p.id));

  if (visiblePosts.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No recent posts to show.
      </div>
    );
  }

  return (
    <>
      <div className="p-2 space-y-3 pb-6">
        {visiblePosts.map((post) => (
          <div 
            key={post.id} 
            className="p-3 bg-[#050b14]/40 hover:bg-[#050b14]/70 backdrop-blur-xl border border-white/[0.08] hover:border-primary/40 rounded-xl text-sm group relative transition-all shadow-md"
          >
            {/* Hide button */}
            <button
              onClick={(e) => { e.stopPropagation(); handleHide(post.id); }}
              className="absolute top-2 right-2 p-1 rounded-full text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted/50 transition-all opacity-0 group-hover:opacity-100 z-10"
              title="Not interested"
            >
              <EyeOff className="w-3 h-3" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-muted overflow-hidden relative shrink-0">
                {post.author.image ? (
                  <Image src={post.author.image} alt={post.author.username} fill className="object-cover" />
                ) : (
                  <UserIcon className="w-3 h-3 m-auto mt-1.5 text-muted-foreground" />
                )}
              </div>
              <div className="flex items-center justify-between flex-1 min-w-0 pr-6">
                <Link href={`/user/${post.author.username}`} className="font-semibold hover:underline truncate text-xs" onClick={(e) => e.stopPropagation()}>
                  {post.author.username}
                </Link>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {new Date(post.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            
            {/* Clickable Post Body: Opens Shorts/Feed Player */}
            <div 
              className="whitespace-pre-wrap break-words text-muted-foreground group-hover:text-foreground leading-relaxed line-clamp-3 cursor-pointer transition-colors"
              onClick={() => setViewingShortsPost(post)}
            >
              {post.body.split(/(\[ui-preset:[a-zA-Z0-9_-]+\])/g).map((part, i) => {
                if (part.startsWith("[ui-preset:") && part.endsWith("]")) {
                  const presetId = part.slice(11, -1);
                  return <UiPresetEmbed key={i} presetId={presetId} />;
                }
                return <span key={i}>{part}</span>;
              })}
            </div>

            {/* Media thumbnail with Shorts launch click */}
            {post.mediaUrl && (
              <div 
                className="mt-2 rounded-lg overflow-hidden border border-white/10 max-h-32 relative group/media cursor-pointer bg-black/60 flex items-center justify-center"
                onClick={() => setViewingShortsPost(post)}
                title="Watch post"
              >
                {isVideo(post.mediaUrl) ? (
                  <>
                    <video 
                      src={formatVideoSrc(post.mediaUrl)} 
                      poster={post.thumbnailUrl || undefined}
                      preload="metadata" 
                      playsInline 
                      muted 
                      className="w-full max-h-32 object-cover opacity-85 group-hover/media:opacity-100 transition-opacity" 
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover/media:bg-black/10 transition-all">
                      <div className="p-2 rounded-full bg-primary text-primary-foreground shadow-lg group-hover/media:scale-110 transition-transform">
                        <Play className="w-4 h-4 fill-current" />
                      </div>
                    </div>
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-white flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-primary" /> Reel
                    </div>
                  </>
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={post.mediaUrl} alt="" className="w-full max-h-32 object-cover group-hover/media:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/media:opacity-100 flex items-center justify-center transition-opacity">
                      <div className="p-1.5 rounded-full bg-black/60 text-white backdrop-blur-xs">
                        <Maximize2 className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Interactive actions */}
            <div className="flex items-center justify-between mt-2 pt-1" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); handleLike(post.id); }}
                  className={`flex items-center gap-1 text-xs transition-colors ${
                    post.hasLiked ? 'text-red-500 font-semibold' : 'text-muted-foreground hover:text-red-500'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${post.hasLiked ? 'fill-current' : ''}`} />
                  <span>{post.likesCount > 0 ? post.likesCount : ""}</span>
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); setReplyingTo(replyingTo === post.id ? null : post.id); }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{post.repliesCount > 0 ? post.repliesCount : ""}</span>
                </button>
              </div>

              {/* Fullscreen Reel Launch Button */}
              <button
                onClick={(e) => { e.stopPropagation(); setViewingShortsPost(post); }}
                className="flex items-center gap-1 text-[11px] text-primary/80 hover:text-primary font-medium transition-colors"
                title="Watch post in fullscreen feed"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Watch</span>
              </button>
            </div>


            {/* Inline reply */}
            {replyingTo === post.id && (
              <div className="mt-2 pt-2 border-t border-border/50 animate-in fade-in slide-in-from-top-1">
                <Textarea
                  placeholder="Write a reply..."
                  className="resize-none border-0 focus-visible:ring-0 px-0 bg-transparent text-xs min-h-[40px]"
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  maxLength={280}
                  autoFocus
                />
                <div className="flex justify-end gap-1.5 mt-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-[10px] px-2"
                    onClick={() => { setReplyingTo(null); setReplyBody(""); }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    className="h-6 text-[10px] px-2"
                    disabled={!replyBody.trim() || isReplying}
                    onClick={() => handleReply(post.id)}
                  >
                    {isReplying ? <Loader2 className="w-3 h-3 animate-spin" /> : "Reply"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
        <div className="text-center pt-2">
          <Link href="/profile/inbox" className="text-xs text-primary hover:underline">
            View Full Dashboard →
          </Link>
        </div>
      </div>

      {/* TikTok / Shorts Fullscreen Swiper Modal */}
      {viewingShortsPost && (
        <ShortsViewerModal
          post={viewingShortsPost}
          posts={visiblePosts}
          onClose={() => setViewingShortsPost(null)}
          onLike={handleLike}
          onBookmark={handleBookmark}
          onReply={(postId, text) => handleReply(postId, text)}
          onPostChange={(nextPost) => setViewingShortsPost(nextPost)}
        />
      )}
    </>
  );
}
