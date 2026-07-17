"use client";

import { useState, useEffect } from "react";
import { getWatchHistory, clearWatchHistory } from "@/app/actions/social";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Clock, Search, Trash2, Heart, MessageSquare, Loader2, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";

export default function WatchHistoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [isClearing, setIsClearing] = useState(false);

  async function loadHistory(query?: string, p?: number) {
    setLoading(true);
    try {
      const result = await getWatchHistory(query || activeSearch, p || page);
      setItems(result.items);
      setTotal(result.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setActiveSearch(searchQuery);
    setPage(1);
    await loadHistory(searchQuery, 1);
  }

  function clearSearch() {
    setSearchQuery("");
    setActiveSearch("");
    setPage(1);
    loadHistory("", 1);
  }

  async function handleClear() {
    if (!confirm("Are you sure you want to clear your entire watch history?")) return;
    setIsClearing(true);
    try {
      await clearWatchHistory();
      setItems([]);
      setTotal(0);
    } catch (e) {
      console.error(e);
    } finally {
      setIsClearing(false);
    }
  }

  async function handlePageChange(newPage: number) {
    setPage(newPage);
    await loadHistory(activeSearch, newPage);
  }

  const totalPages = Math.ceil(total / 20);

  const renderBody = (text: string) => {
    const parts = text.split(/(#[a-zA-Z0-9_]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("#")) {
        return <span key={i} className="text-primary font-medium">{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="w-full px-4 md:px-8 py-8 xl:px-12 animate-in fade-in">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/profile"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Profile</Link>
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Clock className="w-8 h-8 text-primary" />
              Watch History
            </h1>
            <p className="text-muted-foreground mt-1">
              {total > 0 ? `${total} posts in your history` : "Posts you've viewed will appear here."}
            </p>
          </div>
          {total > 0 && (
            <Button 
              variant="outline" 
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={handleClear}
              disabled={isClearing}
            >
              {isClearing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Clear History
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="max-w-lg mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search your watch history by post content..."
            className="pl-10 pr-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button type="button" onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {activeSearch && (
          <p className="text-xs text-muted-foreground mt-2">
            Showing results for &quot;{activeSearch}&quot; — <button onClick={clearSearch} className="text-primary hover:underline">clear</button>
          </p>
        )}
      </form>

      {/* History List */}
      <div className="max-w-3xl space-y-4">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center p-12 bg-muted/10 rounded-2xl border border-border/50 border-dashed">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-20 text-primary" />
            <p className="text-muted-foreground font-medium">
              {activeSearch ? "No history entries match your search." : "Your watch history is empty."}
            </p>
          </div>
        ) : (
          <>
            {items.map((entry) => {
              const post = entry.post;
              if (!post) return null;
              return (
                <div key={entry.id} className="flex gap-4 p-4 border border-border/50 rounded-xl bg-card hover:bg-muted/5 transition-colors shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-muted overflow-hidden relative shrink-0">
                    {post.author?.image ? (
                      <Image src={post.author.image} alt={post.author.username} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-muted-foreground bg-muted">
                        {post.author?.username?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold truncate">{post.author?.username}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        · {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                      </span>
                      <div className="ml-auto flex items-center gap-1 bg-muted/50 rounded-full px-2 py-0.5">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground font-medium">
                          Viewed {formatDistanceToNow(new Date(entry.viewedAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed mb-3" style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                      {renderBody(post.body)}
                    </p>

                    {post.mediaUrl && (
                      <div className="mb-3 rounded-xl overflow-hidden border border-border/50 bg-black flex items-center justify-center max-h-[200px] relative">
                        {post.mediaUrl.endsWith(".mp4") || post.mediaUrl.endsWith(".webm") ? (
                          <video src={post.mediaUrl} className="max-h-[200px] w-auto max-w-full opacity-80" />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={post.mediaUrl} alt="Attachment" className="max-h-[200px] w-auto max-w-full object-contain" />
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-6 text-muted-foreground mt-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium">
                        <Heart className="w-4 h-4" />
                        {post._count?.reactions > 0 && post._count.reactions}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-medium">
                        <MessageSquare className="w-4 h-4" />
                        {post._count?.replies > 0 && post._count.replies}
                      </div>
                      <Button variant="ghost" size="sm" asChild className="ml-auto h-8 px-2">
                        <Link href={`/profile/inbox?post=${post.id}`}>View Post</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => handlePageChange(page - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-4">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => handlePageChange(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
