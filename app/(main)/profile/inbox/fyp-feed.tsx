"use client";

import { useState, useEffect } from "react";
import { getFYPFeed, getTrendingTags, createSocialPost, togglePostReaction } from "@/app/actions/social";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Loader2, MessageSquare, TrendingUp, Hash } from "lucide-react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";

export function FYPFeed() {
  const [posts, setPosts] = useState<any[]>([]);
  const [trending, setTrending] = useState<{name: string, usageCount: number}[]>([]);
  const [body, setBody] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadFeed() {
    setLoading(true);
    try {
      const [feed, tags] = await Promise.all([
        getFYPFeed(filter || undefined),
        getTrendingTags()
      ]);
      setPosts(feed);
      setTrending(tags);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFeed();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || body.length > 280) return;
    setIsPosting(true);
    try {
      await createSocialPost(body);
      setBody("");
      loadFeed();
    } catch (e) {
      console.error(e);
    } finally {
      setIsPosting(false);
    }
  }

  async function handleLike(postId: string) {
    // Optimistic update
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
    } catch {
      // revert if failed
      loadFeed();
    }
  }

  // Format body with links for hashtags
  const renderBody = (text: string) => {
    const parts = text.split(/(#[a-zA-Z0-9_]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("#")) {
        return (
          <span 
            key={i} 
            className="text-primary hover:underline cursor-pointer font-medium"
            onClick={() => setFilter(part.replace("#", ""))}
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex h-full bg-background overflow-hidden animate-in fade-in relative">
      
      {/* Main Feed Column */}
      <div className="flex-1 flex flex-col border-r border-border/50 max-w-3xl">
        <div className="p-4 border-b border-border/50 sticky top-0 bg-background/80 backdrop-blur-md z-10 flex justify-between items-center">
          <h2 className="font-bold text-xl flex items-center gap-2">
            {filter ? <><Hash className="w-5 h-5 text-primary"/> {filter}</> : "For You Page"}
          </h2>
          {filter && (
            <Button variant="ghost" size="sm" onClick={() => setFilter(null)}>
              Clear Filter
            </Button>
          )}
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-6">
          {/* Post Composer */}
          <Card className="bg-card shadow-sm border-border/50">
            <CardContent className="p-4">
              <form onSubmit={handlePost}>
                <Textarea 
                  placeholder="What's happening? Use #hashtags to join trends!"
                  className="resize-none border-0 focus-visible:ring-0 px-0 bg-transparent text-base min-h-[80px]"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={280}
                />
                <div className="flex justify-between items-center mt-2 border-t border-border/50 pt-3">
                  <span className={`text-xs ${body.length > 250 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {body.length} / 280
                  </span>
                  <Button type="submit" disabled={!body.trim() || isPosting || body.length > 280} className="rounded-full px-6">
                    {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Feed */}
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : posts.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No posts found. Be the first to start a conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map(post => (
                <div key={post.id} className="flex gap-4 p-4 border border-border/50 rounded-xl bg-card hover:bg-muted/10 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-muted overflow-hidden relative shrink-0">
                    {post.author.image ? (
                      <Image src={post.author.image} alt={post.author.username} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-muted-foreground bg-muted">
                        {post.author.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold">{post.author.username}</span>
                      <span className="text-xs text-muted-foreground">
                        · {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed mb-3" style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                      {renderBody(post.body)}
                    </p>
                    <div className="flex items-center gap-6 text-muted-foreground">
                      <button 
                        onClick={() => handleLike(post.id)}
                        className={`flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-red-500 ${post.hasLiked ? 'text-red-500' : ''}`}
                      >
                        <Heart className={`w-4 h-4 ${post.hasLiked ? 'fill-current' : ''}`} />
                        {post.likesCount > 0 && post.likesCount}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Trending Sidebar */}
      <div className="w-80 hidden lg:block bg-muted/5 p-6 overflow-y-auto">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" /> Trending Now
        </h3>
        <div className="space-y-3">
          {trending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No trends yet.</p>
          ) : (
            trending.map((t, idx) => (
              <button 
                key={t.name}
                onClick={() => setFilter(t.name)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-card border border-border/50 hover:border-primary/50 transition-colors text-left group"
              >
                <div>
                  <div className="text-xs text-muted-foreground mb-1">{idx + 1} · Trending</div>
                  <div className="font-bold group-hover:text-primary transition-colors">#{t.name}</div>
                </div>
                <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                  {t.usageCount} posts
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
