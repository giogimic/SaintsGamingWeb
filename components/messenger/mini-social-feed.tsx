"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { User as UserIcon, Heart, MessageSquare, EyeOff, Loader2 } from "lucide-react";
import { getMiniFeed, togglePostReaction, replyToSocialPost, recordWatchHistory } from "@/app/actions/social";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type MiniPost = {
  id: string;
  body: string;
  mediaUrl: string | null;
  createdAt: Date;
  author: { id: string; username: string; image: string | null };
  hasLiked: boolean;
  likesCount: number;
  repliesCount: number;
};

export function MiniSocialFeed() {
  const [posts, setPosts] = useState<MiniPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [isReplying, setIsReplying] = useState(false);

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
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          hasLiked: !p.hasLiked,
          likesCount: p.hasLiked ? p.likesCount - 1 : p.likesCount + 1
        };
      }
      return p;
    }));
    try {
      await togglePostReaction(postId);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleReply(postId: string) {
    if (!replyBody.trim()) return;
    setIsReplying(true);
    try {
      await replyToSocialPost(postId, replyBody);
      setReplyBody("");
      setReplyingTo(null);
      // Update reply count optimistically
      setPosts(prev => prev.map(p => {
        if (p.id === postId) return { ...p, repliesCount: p.repliesCount + 1 };
        return p;
      }));
    } catch (e) {
      console.error(e);
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
    <div className="p-2 space-y-3 pb-6">
      {visiblePosts.map((post) => (
        <div key={post.id} className="p-3 bg-card border border-border/50 rounded-lg text-sm group relative">
          {/* Hide button */}
          <button
            onClick={() => handleHide(post.id)}
            className="absolute top-2 right-2 p-1 rounded-full text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted/50 transition-all opacity-0 group-hover:opacity-100"
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
            <div className="flex items-center justify-between flex-1">
              <Link href={`/user/${post.author.username}`} className="font-semibold hover:underline truncate">
                {post.author.username}
              </Link>
              <span className="text-[10px] text-muted-foreground">
                {new Date(post.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          <p className="whitespace-pre-wrap break-words text-muted-foreground leading-relaxed line-clamp-3">
            {post.body}
          </p>

          {/* Media thumbnail */}
          {post.mediaUrl && (
            <div className="mt-2 rounded-md overflow-hidden border border-border/50 max-h-24 relative">
              {post.mediaUrl.endsWith(".mp4") || post.mediaUrl.endsWith(".webm") ? (
                <video src={post.mediaUrl} className="w-full max-h-24 object-cover opacity-70" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.mediaUrl} alt="" className="w-full max-h-24 object-cover" />
              )}
            </div>
          )}

          {/* Interactive actions */}
          <div className="flex items-center gap-4 mt-2 pt-1">
            <button
              onClick={() => handleLike(post.id)}
              className={`flex items-center gap-1 text-xs transition-colors ${
                post.hasLiked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'
              }`}
            >
              <Heart className={`w-3 h-3 ${post.hasLiked ? 'fill-current' : ''}`} />
              <span>{post.likesCount > 0 ? post.likesCount : ""}</span>
            </button>

            <button
              onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <MessageSquare className="w-3 h-3" />
              <span>{post.repliesCount > 0 ? post.repliesCount : ""}</span>
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
  );
}
