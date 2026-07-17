"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  getTrendingTags, 
  createSocialPost,
  getTheFeed, 
  togglePostReaction, 
  replyToSocialPost, 
  toggleBookmark,
  incrementShareCount,
  recordWatchHistory,
  getPostReplies,
  getMutedKeywords,
  addMutedKeyword,
  removeMutedKeyword,
  getUserFeedPreferences,
  updateFeedPreferences,
  searchFeed,
  tipSocialPost,
  subscribeToCreator,
  reportSocialPost
} from "@/app/actions/social";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Heart, Loader2, MessageSquare, TrendingUp, Hash, Smile, Paperclip, 
  X, Image as ImageIcon, Share, Bookmark, Compass, Search, VolumeX, 
  MoreHorizontal, Eye, EyeOff, Plus, Trash2, DollarSign, Flag
} from "lucide-react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import EmojiPicker from "emoji-picker-react";
import { GiphyFetch } from "@giphy/js-fetch-api";
import { Grid } from "@giphy/react-components";
import { VideoPlayer } from "@/components/shared/video-player";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
// Initialize Giphy Fetch
const gf = new GiphyFetch(process.env.NEXT_PUBLIC_GIPHY_API_KEY || "sXpGFDGZs0Dv1mmz014D8zDvwYkE7a7A");

type MutedKeyword = { id: string; keyword: string; type: string; createdAt: Date };

export function TheFeed() {
  const [posts, setPosts] = useState<any[]>([]);
  const [trending, setTrending] = useState<{name: string, usageCount: number}[]>([]);
  const [body, setBody] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Advanced Options
  const [isSubscriberOnly, setIsSubscriberOnly] = useState(false);
  const [voiceoverUrl, setVoiceoverUrl] = useState("");
  const [backgroundTrackUrl, setBackgroundTrackUrl] = useState("");
  const [voiceoverVolume, setVoiceoverVolume] = useState(1.0);
  const [backgroundTrackVolume, setBackgroundTrackVolume] = useState(1.0);
  const [chapters, setChapters] = useState("");
  const [captionsText, setCaptionsText] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Media / GIF
  const [mediaUrl, setMediaUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [showGiphy, setShowGiphy] = useState(false);
  const [giphySearch, setGiphySearch] = useState("");

  // Interactions
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [loadedReplies, setLoadedReplies] = useState<Record<string, any[]>>({});
  const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>({});
  
  // Video Viewer Overlay
  const [viewingVideo, setViewingVideo] = useState<any | null>(null);

  // === Feed Upgrade State ===
  const [broadenFeed, setBroadenFeed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [mutedKeywords, setMutedKeywords] = useState<MutedKeyword[]>([]);
  const [showMutedPopover, setShowMutedPopover] = useState(false);
  const [newMuteKeyword, setNewMuteKeyword] = useState("");
  const [newMuteType, setNewMuteType] = useState<"KEYWORD" | "HASHTAG">("KEYWORD");
  const [hiddenPostIds, setHiddenPostIds] = useState<Set<string>>(new Set());
  const [activePostMenu, setActivePostMenu] = useState<string | null>(null);

  // Load preferences on mount
  useEffect(() => {
    async function loadPrefs() {
      try {
        const [prefs, muted] = await Promise.all([
          getUserFeedPreferences(),
          getMutedKeywords()
        ]);
        setBroadenFeed(prefs.broadenFeed);
        setMutedKeywords(muted);
      } catch (e) {
        console.error(e);
      }
    }
    loadPrefs();
  }, []);

  async function loadFeed() {
    setLoading(true);
    try {
      const [feed, tags] = await Promise.all([
        getTheFeed(filter || undefined, broadenFeed),
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
    setSearchResults(null);
    setSearchQuery("");
    loadFeed();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, broadenFeed]);

  // === Broaden Toggle ===
  async function handleBroadenToggle() {
    const newVal = !broadenFeed;
    setBroadenFeed(newVal);
    try {
      await updateFeedPreferences(newVal);
    } catch (e) {
      console.error(e);
    }
  }

  // === Search ===
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchFeed(searchQuery);
      setSearchResults(results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  }

  function clearSearch() {
    setSearchQuery("");
    setSearchResults(null);
  }

  // === Muted Keywords ===
  async function handleAddMute() {
    if (!newMuteKeyword.trim()) return;
    try {
      const entry = await addMutedKeyword(newMuteKeyword, newMuteType);
      setMutedKeywords(prev => [entry, ...prev]);
      setNewMuteKeyword("");
      // Reload feed to apply filter
      loadFeed();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleRemoveMute(id: string) {
    try {
      await removeMutedKeyword(id);
      setMutedKeywords(prev => prev.filter(m => m.id !== id));
      loadFeed();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleMuteFromPost(keyword: string, type: "KEYWORD" | "HASHTAG") {
    try {
      const entry = await addMutedKeyword(keyword, type);
      setMutedKeywords(prev => [entry, ...prev]);
      setActivePostMenu(null);
      loadFeed();
    } catch (e) {
      console.error(e);
    }
  }

  // === Not Interested (local hide) ===
  function handleNotInterested(postId: string) {
    setHiddenPostIds(prev => new Set(prev).add(postId));
    setActivePostMenu(null);
  }

  async function handleReport(postId: string) {
    try {
      await reportSocialPost(postId);
      alert("Post reported to community standards review.");
      handleNotInterested(postId);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleTip(postId: string) {
    try {
      await tipSocialPost(postId, 5); // Default $5 tip for now
      toast.success("Sent a $5 tip to the creator!");
    } catch (e: any) {
      toast.error(e.message || "Failed to send tip");
    }
  }

  async function handleSubscribe(creatorId: string) {
    try {
      await subscribeToCreator(creatorId);
      alert("Subscribed successfully!");
      loadFeed();
    } catch (e: any) {
      alert(e.message || "Failed to subscribe");
    }
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() && !mediaUrl) return;
    if (body.length > 280) return;
    setIsPosting(true);
    try {
      if (replyingTo) {
        await replyToSocialPost(replyingTo, body, mediaUrl || undefined);
        setReplyingTo(null);
        toast.success("Reply posted!");
        await handleLoadReplies(replyingTo);
      } else {
        await createSocialPost(body, mediaUrl || undefined, {
          isSubscriberOnly,
          voiceoverUrl: voiceoverUrl || undefined,
          backgroundTrackUrl: backgroundTrackUrl || undefined,
          voiceoverVolume,
          backgroundTrackVolume,
          chapters: chapters || undefined,
          captionsText: captionsText || undefined,
        });
        toast.success("Post created successfully!");
        loadFeed();
      }
      setBody("");
      setMediaUrl("");
      setIsSubscriberOnly(false);
      setVoiceoverUrl("");
      setBackgroundTrackUrl("");
      setChapters("");
      setCaptionsText("");
      setVoiceoverVolume(1.0);
      setBackgroundTrackVolume(1.0);
    } catch (e) {
      console.error(e);
    } finally {
      setIsPosting(false);
    }
  }

  async function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload/social", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Upload failed");
      }

      const data = await res.json();
      setMediaUrl(data.url);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleLike(postId: string, isReply = false, parentId?: string) {
    const updateList = (list: any[]) => list.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          hasLiked: !p.hasLiked,
          likesCount: p.hasLiked ? p.likesCount - 1 : p.likesCount + 1
        };
      }
      return p;
    });

    if (isReply && parentId) {
      setLoadedReplies(prev => ({
        ...prev,
        [parentId]: updateList(prev[parentId] || [])
      }));
    } else {
      setPosts(prev => updateList(prev));
      if (searchResults) setSearchResults(prev => prev ? updateList(prev) : null);
    }
    
    try {
      await togglePostReaction(postId);
    } catch {
      if (!isReply) loadFeed();
    }
  }

  async function handleBookmark(postId: string) {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) return { ...p, hasBookmarked: !p.hasBookmarked };
      return p;
    }));
    if (searchResults) {
      setSearchResults(prev => prev ? prev.map(p => {
        if (p.id === postId) return { ...p, hasBookmarked: !p.hasBookmarked };
        return p;
      }) : null);
    }
    try {
      await toggleBookmark(postId);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleShare(post: any) {
    try {
      await incrementShareCount(post.id);
      const url = window.location.origin + "/profile/inbox?post=" + post.id;
      if (navigator.share) {
        await navigator.share({ title: "Saints Gaming", text: "Check out this post!", url });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Link copied to clipboard!");
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleLoadReplies(postId: string) {
    setLoadingReplies(prev => ({ ...prev, [postId]: true }));
    try {
      const reps = await getPostReplies(postId);
      setLoadedReplies(prev => ({ ...prev, [postId]: reps }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReplies(prev => ({ ...prev, [postId]: false }));
    }
  }

  const handleRecordView = useCallback(async (postId: string) => {
    try {
      await recordWatchHistory(postId);
    } catch (e) {
      console.error(e);
    }
  }, []);

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

  const fetchGifs = (offset: number) => {
    if (giphySearch) {
      return gf.search(giphySearch, { offset, limit: 10 });
    }
    return gf.trending({ offset, limit: 10 });
  };

  const renderPost = (post: any, isReply = false, parentId?: string) => {
    if (hiddenPostIds.has(post.id)) return null;

    const postHashtags = post.hashtags || [];
    
    return (
      <motion.div 
        key={post.id} 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`flex gap-4 p-4 border-b border-border/50 bg-card hover:bg-muted/5 transition-colors ${isReply ? 'ml-12 border-l border-t-0 rounded-none' : 'rounded-xl border'}`}
      >
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
            <button 
              onClick={(e) => { e.stopPropagation(); handleSubscribe(post.author.id); }}
              className="ml-2 text-xs text-primary font-medium hover:underline"
            >
              Subscribe
            </button>
            <span className="text-muted-foreground/50 mx-1.5">•</span>
            <span className="text-xs text-muted-foreground shrink-0">
              · {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </span>
            {post.viewCount > 0 && (
              <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5 ml-auto shrink-0">
                <Eye className="w-3 h-3" /> {post.viewCount}
              </span>
            )}
            
            {/* Post menu (Not Interested / Mute) */}
            {!isReply && (
              <div className="relative ml-1">
                <button
                  onClick={() => setActivePostMenu(activePostMenu === post.id ? null : post.id)}
                  className="p-1 rounded-full text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {activePostMenu === post.id && (
                  <div className="absolute right-0 top-8 z-50 w-60 bg-popover border border-border rounded-lg shadow-xl py-1 animate-in fade-in slide-in-from-top-2 duration-150">
                    <button
                      onClick={() => handleNotInterested(post.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted/50 transition-colors"
                    >
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                      Not interested in this post
                    </button>
                    <button
                      onClick={() => handleReport(post.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-destructive/10 text-destructive transition-colors"
                    >
                      <Flag className="w-4 h-4" />
                      Report as AI Sludge / Low Effort
                    </button>
                    {postHashtags.map((tag: string) => (
                      <button
                        key={tag}
                        onClick={() => handleMuteFromPost(tag, "HASHTAG")}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted/50 transition-colors"
                      >
                        <VolumeX className="w-4 h-4 text-muted-foreground" />
                        Mute #{tag}
                      </button>
                    ))}
                    <div className="border-t border-border/50 my-1" />
                    <button
                      onClick={() => {
                        setActivePostMenu(null);
                        setShowMutedPopover(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted/50 transition-colors text-muted-foreground"
                    >
                      <VolumeX className="w-4 h-4" />
                      Manage muted keywords...
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="text-sm leading-relaxed mb-3" style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
            {renderBody(post.body)}
          </p>
          
          {post.mediaUrl && (
            <div 
              className="mb-3 rounded-xl overflow-hidden border border-border/50 bg-black flex items-center justify-center max-h-[400px] relative group cursor-pointer" 
              onClick={() => {
                setViewingVideo(post);
                if (post.mediaUrl.endsWith(".mp4") || post.mediaUrl.endsWith(".webm")) {
                  handleRecordView(post.id);
                }
              }}
            >
              {post.mediaUrl.endsWith(".mp4") || post.mediaUrl.endsWith(".webm") ? (
                <>
                  <video src={post.mediaUrl} className="max-h-[400px] w-auto max-w-full opacity-90 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black/40 backdrop-blur-sm rounded-full p-3">
                      <svg className="w-8 h-8 text-white fill-white" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    </div>
                  </div>
                </>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.mediaUrl} alt="Post attachment" className="max-h-[400px] w-auto max-w-full object-contain" />
              )}
            </div>
          )}

          <div className="flex items-center gap-6 text-muted-foreground mt-2">
            <button 
              onClick={() => handleLike(post.id, isReply, parentId)}
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-red-500 ${post.hasLiked ? 'text-red-500' : ''}`}
            >
              <Heart className={`w-4 h-4 ${post.hasLiked ? 'fill-current' : ''}`} />
              {post.likesCount > 0 && post.likesCount}
            </button>
            
            {!isReply && (
              <button 
                onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
                className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-primary"
              >
                <MessageSquare className="w-4 h-4" />
                {post.repliesCount > 0 && post.repliesCount}
              </button>
            )}

            <button 
              onClick={() => handleShare(post)}
              className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-primary"
            >
              <Share className="w-4 h-4" />
              {post.shareCount > 0 && post.shareCount}
            </button>

            <button 
              onClick={() => handleTip(post.id)}
              className="flex items-center gap-1.5 text-xs font-medium transition-colors text-green-500/80 hover:text-green-500"
            >
              <DollarSign className="w-4 h-4" />
              Tip
            </button>

            <div className="flex-1" />

            {!isReply && (
              <button 
                onClick={() => handleBookmark(post.id)}
                className={`flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-yellow-500 ml-auto ${post.hasBookmarked ? 'text-yellow-500' : ''}`}
              >
                <Bookmark className={`w-4 h-4 ${post.hasBookmarked ? 'fill-current' : ''}`} />
              </button>
            )}
          </div>

          {/* Inline Reply Box */}
          {replyingTo === post.id && !isReply && (
            <div className="mt-4 flex gap-3 items-start animate-in fade-in slide-in-from-top-2">
              <div className="flex-1">
                <form onSubmit={handlePost} className="bg-muted/30 p-3 rounded-xl border border-border/50">
                  <Textarea 
                    placeholder="Post your reply..."
                    className="resize-none border-0 focus-visible:ring-0 px-0 bg-transparent text-sm min-h-[60px]"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    maxLength={280}
                    autoFocus
                  />
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/50">
                     <div className="flex items-center gap-2">
                       <span className={`text-xs ${body.length > 250 ? 'text-destructive' : 'text-muted-foreground'}`}>
                         {body.length} / 280
                       </span>
                     </div>
                     <div className="flex gap-2">
                       <Button type="button" variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>Cancel</Button>
                       <Button type="submit" size="sm" disabled={!body.trim() || isPosting}>Reply</Button>
                     </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* View Replies Button */}
          {!isReply && post.repliesCount > 0 && !loadedReplies[post.id] && (
            <button 
              onClick={() => handleLoadReplies(post.id)}
              className="text-xs font-medium text-primary hover:underline mt-3"
            >
              {loadingReplies[post.id] ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : "Show replies"}
            </button>
          )}

          {/* Render Replies */}
          {!isReply && loadedReplies[post.id] && (
            <div className="mt-2 space-y-0 relative before:absolute before:inset-y-0 before:left-5 before:-ml-px before:w-0.5 before:bg-border/50">
              {loadedReplies[post.id].map(reply => renderPost(reply, true, post.id))}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  // Close post menu when clicking outside
  useEffect(() => {
    function handleClickOutside() {
      if (activePostMenu) setActivePostMenu(null);
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [activePostMenu]);

  const displayPosts = searchResults !== null ? searchResults : posts;

  return (
    <div className="flex h-full bg-background overflow-hidden animate-in fade-in relative">
      
      {/* Video Overlay (Enhanced TikTok-style viewer) */}
      {viewingVideo && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col md:flex-row animate-in fade-in zoom-in-95">
          <button 
            onClick={() => setViewingVideo(null)}
            className="absolute top-4 left-4 z-50 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="flex-1 flex items-center justify-center relative bg-black/90">
            {viewingVideo.mediaUrl?.endsWith(".mp4") || viewingVideo.mediaUrl?.endsWith(".webm") ? (
              <VideoPlayer
                src={viewingVideo.mediaUrl}
                autoPlay
                loop
                onView={() => handleRecordView(viewingVideo.id)}
                className="max-h-screen w-full"
                voiceoverUrl={viewingVideo.voiceoverUrl}
                backgroundTrackUrl={viewingVideo.backgroundTrackUrl}
                voiceoverVolume={viewingVideo.voiceoverVolume}
                backgroundTrackVolume={viewingVideo.backgroundTrackVolume}
                captionsText={viewingVideo.captionsText}
                chapters={viewingVideo.chapters ? (() => { try { return JSON.parse(viewingVideo.chapters); } catch { return null; } })() : null}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={viewingVideo.mediaUrl} alt="Post attachment" className="max-h-screen w-auto max-w-full object-contain" />
            )}
          </div>
          
          <div className="w-full md:w-[400px] bg-background border-l border-border/50 flex flex-col h-[50vh] md:h-full">
            <div className="p-4 border-b border-border/50">
              <h3 className="font-bold text-lg">Comments</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {renderPost(viewingVideo, false)}
            </div>
          </div>
        </div>
      )}

      {/* Main Feed Column */}
      <div className="flex-1 flex flex-col border-r border-border/50">
        {/* Header */}
        <div className="p-4 border-b border-border/50 sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-xl flex items-center gap-2">
              {filter ? <><Hash className="w-5 h-5 text-primary"/> {filter}</> : "The Feed"}
            </h2>
            <div className="flex items-center gap-2">
              {filter && (
                <Button variant="ghost" size="sm" onClick={() => setFilter(null)}>
                  Clear Filter
                </Button>
              )}
            </div>
          </div>

          {/* Feed Controls Bar */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Broaden Toggle */}
            <button
              onClick={handleBroadenToggle}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                broadenFeed 
                  ? 'bg-primary/10 text-primary border-primary/30 shadow-sm' 
                  : 'bg-muted/30 text-muted-foreground border-border/50 hover:border-primary/30 hover:text-foreground'
              }`}
            >
              <Compass className={`w-3.5 h-3.5 ${broadenFeed ? 'animate-spin' : ''}`} style={broadenFeed ? { animationDuration: '3s' } : {}} />
              Broaden
            </button>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 max-w-sm flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search posts..."
                  className="h-8 pl-8 pr-8 text-xs bg-muted/30 border-border/50"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <Button type="submit" size="sm" variant="ghost" className="h-8 px-2" disabled={isSearching}>
                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              </Button>
            </form>

            {/* Muted Keywords */}
            <Popover open={showMutedPopover} onOpenChange={setShowMutedPopover}>
              <PopoverTrigger className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  mutedKeywords.length > 0
                    ? 'bg-orange-500/10 text-orange-500 border-orange-500/30'
                    : 'bg-muted/30 text-muted-foreground border-border/50 hover:border-primary/30'
                }`}>
                  <VolumeX className="w-3.5 h-3.5" />
                  {mutedKeywords.length > 0 ? `${mutedKeywords.length} Muted` : "Mute"}
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" side="bottom" align="end">
                <h4 className="font-bold text-sm mb-3">Muted Keywords & Hashtags</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Posts containing these words or hashtags will be hidden from your feed.
                </p>
                
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Enter keyword..."
                    className="text-xs h-8 flex-1"
                    value={newMuteKeyword}
                    onChange={(e) => setNewMuteKeyword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddMute(); }}
                  />
                  <select
                    className="text-xs bg-muted rounded px-2 py-1 outline-none border border-border/50"
                    value={newMuteType}
                    onChange={(e) => setNewMuteType(e.target.value as "KEYWORD" | "HASHTAG")}
                  >
                    <option value="KEYWORD">Word</option>
                    <option value="HASHTAG">Tag</option>
                  </select>
                  <Button size="sm" className="h-8 px-2" onClick={handleAddMute}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {mutedKeywords.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No muted keywords yet.</p>
                  ) : (
                    mutedKeywords.map(mk => (
                      <div key={mk.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                        <span className="text-xs font-medium">
                          {mk.type === "HASHTAG" ? "#" : ""}{mk.keyword}
                          <span className="text-muted-foreground ml-1.5 text-[10px] uppercase">{mk.type}</span>
                        </span>
                        <button
                          onClick={() => handleRemoveMute(mk.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Search results indicator */}
          {searchResults !== null && (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Search className="w-3 h-3" />
              <span>{searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for &quot;{searchQuery}&quot;</span>
              <button onClick={clearSearch} className="text-primary hover:underline ml-auto">Clear</button>
            </div>
          )}
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-6">
          {/* Post Composer */}
          {searchResults === null && (
            <Card className="bg-card shadow-sm border-border/50 rounded-2xl overflow-hidden focus-within:ring-1 focus-within:ring-primary/50 transition-all">
              <CardContent className="p-0">
                <form onSubmit={handlePost}>
                  <Textarea 
                    placeholder="What's happening? Use #hashtags to join trends!"
                    className="resize-none border-0 focus-visible:ring-0 p-4 bg-transparent text-base min-h-[100px]"
                    value={replyingTo ? "" : body}
                    onChange={(e) => {
                      if(!replyingTo) setBody(e.target.value);
                    }}
                    maxLength={280}
                  />
                  
                  {mediaUrl && !replyingTo && (
                    <div className="relative mx-4 mt-2 rounded-xl overflow-hidden border border-border/50 bg-black/10 flex items-center justify-center max-h-[300px]">
                      <Button 
                        type="button"
                        variant="destructive" 
                        size="icon" 
                        className="absolute top-2 right-2 w-8 h-8 rounded-full z-10"
                        onClick={() => setMediaUrl("")}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      {mediaUrl.endsWith(".mp4") || mediaUrl.endsWith(".webm") ? (
                        <video src={mediaUrl} controls className="max-h-[300px] w-auto max-w-full" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mediaUrl} alt="Upload preview" className="max-h-[300px] w-auto max-w-full object-contain" />
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center p-3 bg-muted/20 border-t border-border/50">
                    <div className="flex items-center gap-1">
                      <Popover>
                        <PopoverTrigger className="p-2 rounded-full text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors">
                          <Smile className="w-5 h-5" />
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 border-none shadow-none bg-transparent" side="bottom" align="start">
                          <EmojiPicker onEmojiClick={(e) => setBody(prev => prev + e.emoji)} />
                        </PopoverContent>
                      </Popover>

                      <Popover open={showGiphy} onOpenChange={setShowGiphy}>
                        <PopoverTrigger className="p-2 rounded-full text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors">
                          <ImageIcon className="w-5 h-5" />
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-3 h-96 overflow-y-auto" side="bottom" align="start">
                          <input 
                            type="text" 
                            placeholder="Search GIFs..." 
                            className="w-full p-2 mb-3 bg-muted rounded-md text-sm outline-none"
                            value={giphySearch}
                            onChange={(e) => setGiphySearch(e.target.value)}
                          />
                          <Grid 
                            width={290} 
                            columns={2} 
                            fetchGifs={fetchGifs} 
                            key={giphySearch} 
                            onGifClick={(gif, e) => {
                              e.preventDefault();
                              setMediaUrl(gif.images.original.url);
                              setShowGiphy(false);
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                      
                      <div>
                        <input 
                          type="file" 
                          id="social-media-upload-main" 
                          accept="image/*,video/mp4,video/webm" 
                          className="hidden" 
                          onChange={handleMediaUpload} 
                          disabled={isUploading}
                        />
                        <Button asChild variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-primary disabled:opacity-50">
                          <label htmlFor="social-media-upload-main" className="cursor-pointer">
                            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                          </label>
                        </Button>
                      </div>

                      <Popover open={showAdvanced} onOpenChange={setShowAdvanced}>
                        <PopoverTrigger className="p-2 rounded-full text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors">
                          <Plus className="w-5 h-5" />
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4 max-h-[400px] overflow-y-auto" side="top" align="start">
                          <h4 className="font-bold text-sm mb-3">Advanced Creator Tools</h4>
                          
                          <div className="space-y-4">
                            <label className="flex items-center gap-2 text-sm">
                              <input type="checkbox" checked={isSubscriberOnly} onChange={(e) => setIsSubscriberOnly(e.target.checked)} />
                              Subscriber-Only Post
                            </label>

                            <div className="space-y-1">
                              <label className="text-xs font-semibold">Voiceover URL (Stem)</label>
                              <Input className="h-7 text-xs" value={voiceoverUrl} onChange={(e) => setVoiceoverUrl(e.target.value)} placeholder="https://..." />
                              <div className="flex items-center gap-2">
                                <span className="text-[10px]">Vol:</span>
                                <input type="range" min="0" max="2" step="0.1" value={voiceoverVolume} onChange={(e) => setVoiceoverVolume(parseFloat(e.target.value))} className="flex-1" />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-semibold">Background Track URL (Stem)</label>
                              <Input className="h-7 text-xs" value={backgroundTrackUrl} onChange={(e) => setBackgroundTrackUrl(e.target.value)} placeholder="https://..." />
                              <div className="flex items-center gap-2">
                                <span className="text-[10px]">Vol:</span>
                                <input type="range" min="0" max="2" step="0.1" value={backgroundTrackVolume} onChange={(e) => setBackgroundTrackVolume(parseFloat(e.target.value))} className="flex-1" />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-semibold">Captions / Transcript</label>
                              <Textarea className="min-h-[60px] text-xs p-2" value={captionsText} onChange={(e) => setCaptionsText(e.target.value)} placeholder="Enter full transcript for searchability and burned-in captions..." />
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-semibold">Smart Chapters (JSON)</label>
                              <Textarea className="min-h-[60px] text-xs p-2 font-mono" value={chapters} onChange={(e) => setChapters(e.target.value)} placeholder={'[{"time": 0, "title": "Intro"}, {"time": 10, "title": "Hook"}]'} />
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`ml-3 text-xs font-medium ${body.length > 250 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {body.length} / 280
                      </span>
                      <Button type="submit" disabled={(!body.trim() && !mediaUrl) || isPosting || body.length > 280} className="rounded-full px-6 font-bold shadow-md">
                        {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post"}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Feed */}
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : displayPosts.length === 0 ? (
            <div className="text-center p-12 bg-muted/10 rounded-2xl border border-border/50 border-dashed">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20 text-primary" />
              <p className="text-muted-foreground font-medium">
                {searchResults !== null ? "No posts match your search." : "No posts found. Be the first to start a conversation!"}
              </p>
            </div>
          ) : (
            <div className="space-y-4 pb-20">
              {displayPosts.map(post => renderPost(post))}
            </div>
          )}
        </div>
      </div>

      {/* Trending Sidebar */}
      <div className="w-80 hidden lg:block bg-muted/5 p-6 overflow-y-auto border-l border-border/50">
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
                className="w-full flex items-center justify-between p-3 rounded-xl bg-card border border-border/50 hover:border-primary/50 transition-colors text-left group shadow-sm"
              >
                <div>
                  <div className="text-xs text-muted-foreground mb-1 font-medium">{idx + 1} · Trending</div>
                  <div className="font-bold group-hover:text-primary transition-colors">#{t.name}</div>
                </div>
                <div className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-md font-medium">
                  {t.usageCount}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
