"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
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
  reportSocialPost,
  deleteSocialPost,
  updateSocialPost,
  votePoll,
  pinSocialPost
} from "@/app/actions/social";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Input } from "@/shared/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { 
  Heart, Loader2, MessageSquare, TrendingUp, Hash, Smile, Paperclip, 
  X, Image as ImageIcon, Share, Bookmark, Compass, Search, VolumeX, Volume2,
  MoreHorizontal, Eye, EyeOff, Plus, Trash2, Coins, Flag,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ArrowRight, BarChart2, Pin, Play, Pause, Maximize2, UploadCloud,
  BadgeCheck, Crown, ShieldCheck, FileArchive, Download, Music, Disc, Send, Copy, Sparkles, Check, Flame, Users
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { UserBadges } from "@/web/components/achievements/user-badges";
import { formatDistanceToNow } from "date-fns";
import EmojiPicker from "emoji-picker-react";
import { GiphyFetch } from "@giphy/js-fetch-api";
import { Grid } from "@giphy/react-components";
import { FeedVideoPlayer } from "@/web/components/feed/FeedVideoPlayer";
import { UploadProgressBar } from "@/web/components/feed/UploadProgressBar";
import { uploadSocialFileWithProgress, UploadProgressState } from "@/web/lib/upload-client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

// Initialize Giphy Fetch
const gf = new GiphyFetch(process.env.NEXT_PUBLIC_GIPHY_API_KEY || "sXpGFDGZs0Dv1mmz014D8zDvwYkE7a7A");

type MutedKeyword = { id: string; keyword: string; type: string; createdAt: Date };
type FeedTabType = "for-you" | "following" | "clips" | "trending";

const isArchive = (url: string) => {
  if (!url) return false;
  try {
    const cleanPath = url.split("?")[0].split("#")[0];
    return /\.(zip|rar|7z|tar|bz2|gz)$/i.test(cleanPath);
  } catch {
    return /\.(zip|rar|7z|tar|bz2|gz)($|\?|#)/i.test(url);
  }
};

const isVideo = (url: string) => {
  if (!url) return false;
  try {
    const cleanPath = url.split("?")[0].split("#")[0];
    return /\.(mp4|webm|mov|ogg|ogv|mkv|m4v)$/i.test(cleanPath);
  } catch {
    return /\.(mp4|webm|mov|ogg|ogv|mkv|m4v)($|\?|#)/i.test(url);
  }
};

// Force video decoder to immediately render frame 0 instead of black box
function formatVideoSrc(url: string): string {
  if (!url) return "";
  if (url.includes("#t=")) return url;
  const hashIndex = url.indexOf("#");
  if (hashIndex !== -1) {
    return `${url.substring(0, hashIndex)}#t=0.001`;
  }
  return `${url}#t=0.001`;
}

export function TheFeed() {
  const { data: session } = useSession();
  const currentUserPermission = (session?.user as any)?.permissionLevel || 0;

  const [posts, setPosts] = useState<any[]>([]);
  const [trending, setTrending] = useState<{name: string, usageCount: number}[]>([]);
  const [body, setBody] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [feedTab, setFeedTab] = useState<FeedTabType>("for-you");
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
  
  // Media / GIF & Upload Progress Tracking
  const [mediaUrl, setMediaUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [mainUploadState, setMainUploadState] = useState<UploadProgressState | null>(null);
  const mainUploadCancelRef = useRef<(() => void) | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showGiphy, setShowGiphy] = useState(false);
  const [giphySearch, setGiphySearch] = useState("");

  // Interactions & Reply Uploads
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [replyMediaUrl, setReplyMediaUrl] = useState("");
  const [isUploadingReply, setIsUploadingReply] = useState(false);
  const [replyUploadStates, setReplyUploadStates] = useState<Record<string, UploadProgressState | null>>({});
  const replyUploadCancelRefs = useRef<Record<string, () => void>>({});
  const [loadedReplies, setLoadedReplies] = useState<Record<string, any[]>>({});
  const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>({});
  
  // Feed-wide sound persistence and active video coordinator
  const [activePlayingVideoId, setActivePlayingVideoId] = useState<string | null>(null);
  const [isFeedMuted, setIsFeedMuted] = useState<boolean>(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("saints_feed_muted");
      if (saved !== null) {
        setIsFeedMuted(saved === "true");
      }
    } catch {}
  }, []);

  const handleSetFeedMuted = useCallback((muted: boolean) => {
    setIsFeedMuted(muted);
    try {
      localStorage.setItem("saints_feed_muted", String(muted));
    } catch {}
  }, []);

  // TikTok-style Shorts Swiper Overlay
  const [viewingShortsPost, setViewingShortsPost] = useState<any | null>(null);
  const [isShortsCommentsOpen, setIsShortsCommentsOpen] = useState(false);
  const [isShortsMuted, setIsShortsMuted] = useState(false);
  const [shortsPlaying, setShortsPlaying] = useState(true);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const lastWheelTime = useRef<number>(0);

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Poll state
  const [showPollForm, setShowPollForm] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);

  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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

  const loadFeed = useCallback(async (isLoadMore = false) => {
    if (isLoadMore) {
      setIsFetchingMore(true);
    } else {
      setLoading(true);
      setHasMore(true);
    }

    try {
      setPosts(currentPosts => {
        const cursor = isLoadMore && currentPosts.length > 0 ? currentPosts[currentPosts.length - 1].id : undefined;
        getTheFeed(filter || undefined, broadenFeed, cursor).then(feed => {
          if (feed.length < 35) {
            setHasMore(false);
          } else {
            setHasMore(true);
          }
          setPosts(prev => {
            if (!isLoadMore) return feed;
            const existingIds = new Set(prev.map(p => p.id));
            const newPosts = feed.filter((p: any) => !existingIds.has(p.id));
            return [...prev, ...newPosts];
          });
        }).catch(err => {
          console.error(err);
        }).finally(() => {
          setLoading(false);
          setIsFetchingMore(false);
        });
        return currentPosts;
      });

      getTrendingTags().then(tags => setTrending(tags)).catch(() => {});
    } catch (e) {
      console.error(e);
      setLoading(false);
      setIsFetchingMore(false);
    }
  }, [broadenFeed, filter]);

  useEffect(() => {
    setSearchResults(null);
    setSearchQuery("");
    loadFeed(false);
  }, [filter, broadenFeed, loadFeed]);

  // Infinite Scroll IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || loading || isFetchingMore || searchResults !== null) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading && !isFetchingMore && searchResults === null) {
          loadFeed(true);
        }
      },
      { rootMargin: "600px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, isFetchingMore, searchResults, loadFeed]);

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
      toast.success("Post reported. Thanks for keeping the feed clean!");
      setActivePostMenu(null);
    } catch (e) {
      console.error(e);
      toast.error("Failed to report post");
    }
  }

  async function handleDeletePost(postId: string) {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      await deleteSocialPost(postId);
      toast.success("Post deleted");
      setPosts(prev => prev.filter(p => p.id !== postId));
      setActivePostMenu(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to delete post");
    }
  }

  async function handlePinToggle(postId: string, currentPinStatus: boolean) {
    try {
      await pinSocialPost(postId, !currentPinStatus);
      toast.success(currentPinStatus ? "Post unpinned" : "Post pinned to top");
      setActivePostMenu(null);
      loadFeed();
    } catch (e: any) {
      toast.error(e.message || "Failed to pin/unpin post");
    }
  }

  async function handleSaveEdit(postId: string) {
    if (!editBody.trim()) return;
    try {
      await updateSocialPost(postId, editBody);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, body: editBody } : p));
      setEditingPostId(null);
      toast.success("Post updated");
    } catch (e) {
      console.error(e);
      toast.error("Failed to update post");
    }
  }

  async function handleTip(postId: string) {
    try {
      const res = await tipSocialPost(postId, 5);
      if (res && !res.success) {
        toast.error(res.error || "Failed to send tip");
        return;
      }
      toast.success("Sent 5 Gold to the creator!");
    } catch (e: any) {
      toast.error(e.message || "Failed to send tip");
    }
  }

  async function handleVote(pollId: string, optionId: string) {
    try {
      await votePoll(pollId, optionId);
      loadFeed();
    } catch (e: any) {
      toast.error(e.message || "Failed to vote");
    }
  }

  async function handleSubscribe(creatorId: string) {
    try {
      await subscribeToCreator(creatorId);
      toast.success("Subscribed successfully!");
      loadFeed();
    } catch (e: any) {
      toast.error(e.message || "Failed to subscribe");
    }
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() && !mediaUrl) return;
    if (body.length > 1000) {
      toast.error("Post exceeds 1000 characters limit");
      return;
    }
    setIsPosting(true);
    try {
      const validPollOptions = pollOptions.filter(o => o.trim() !== "");
      const pollData = showPollForm && pollQuestion.trim() && validPollOptions.length >= 2 
        ? { question: pollQuestion, options: validPollOptions } 
        : undefined;

      await createSocialPost(body, mediaUrl || undefined, {
        isSubscriberOnly,
        voiceoverUrl: voiceoverUrl || undefined,
        backgroundTrackUrl: backgroundTrackUrl || undefined,
        voiceoverVolume,
        backgroundTrackVolume,
        chapters: chapters || undefined,
        captionsText: captionsText || undefined,
        poll: pollData
      });
      toast.success("Post created successfully!");
      setBody("");
      setMediaUrl("");
      setIsSubscriberOnly(false);
      setVoiceoverUrl("");
      setBackgroundTrackUrl("");
      setChapters("");
      setCaptionsText("");
      setVoiceoverVolume(1.0);
      setBackgroundTrackVolume(1.0);
      setShowPollForm(false);
      setPollQuestion("");
      setPollOptions(["", ""]);
      loadFeed(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to create post");
    } finally {
      setIsPosting(false);
    }
  }

  async function handleReply(e: React.FormEvent, parentPostId: string) {
    e.preventDefault();
    if (!replyBody.trim() && !replyMediaUrl) return;
    if (replyBody.length > 1000) {
      toast.error("Reply exceeds 1000 characters limit");
      return;
    }
    setIsPosting(true);
    try {
      await replyToSocialPost(parentPostId, replyBody, replyMediaUrl || undefined);
      setReplyingTo(null);
      setReplyBody("");
      setReplyMediaUrl("");
      toast.success("Reply posted!");
      await handleLoadReplies(parentPostId);
      setPosts(prev => prev.map(p => p.id === parentPostId ? { ...p, repliesCount: (p.repliesCount || 0) + 1 } : p));
      if (viewingShortsPost && viewingShortsPost.id === parentPostId) {
        setViewingShortsPost((prev: any) => prev ? { ...prev, repliesCount: (prev.repliesCount || 0) + 1 } : null);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to post reply");
    } finally {
      setIsPosting(false);
    }
  }

  async function uploadFileBlob(file: File, isReply = false, replyPostId?: string) {
    if (!file) return;

    if (isReply && replyPostId) {
      setIsUploadingReply(true);
      if (replyUploadCancelRefs.current[replyPostId]) {
        replyUploadCancelRefs.current[replyPostId]();
      }

      const { promise, cancel } = uploadSocialFileWithProgress(
        file,
        "/api/upload/social",
        (state) => {
          setReplyUploadStates(prev => ({ ...prev, [replyPostId]: state }));
        }
      );

      replyUploadCancelRefs.current[replyPostId] = cancel;

      try {
        const data = await promise;
        setReplyMediaUrl(data.url);
        toast.success("Media attached successfully!");
        setTimeout(() => {
          setReplyUploadStates(prev => ({ ...prev, [replyPostId]: null }));
        }, 1500);
      } catch (err: any) {
        if (err?.message !== "Upload cancelled by user") {
          toast.error(err?.message || "Upload failed");
        }
      } finally {
        setIsUploadingReply(false);
        delete replyUploadCancelRefs.current[replyPostId];
      }
    } else {
      setIsUploading(true);
      if (mainUploadCancelRef.current) {
        mainUploadCancelRef.current();
      }

      const { promise, cancel } = uploadSocialFileWithProgress(
        file,
        "/api/upload/social",
        (state) => {
          setMainUploadState(state);
        }
      );

      mainUploadCancelRef.current = cancel;

      try {
        const data = await promise;
        setMediaUrl(data.url);
        toast.success("Media attached successfully!");
        setTimeout(() => {
          setMainUploadState(null);
        }, 1500);
      } catch (err: any) {
        if (err?.message !== "Upload cancelled by user") {
          toast.error(err?.message || "Upload failed");
        }
      } finally {
        setIsUploading(false);
        mainUploadCancelRef.current = null;
      }
    }
  }

  function handleCancelMainUpload() {
    if (mainUploadCancelRef.current) {
      mainUploadCancelRef.current();
      mainUploadCancelRef.current = null;
      setIsUploading(false);
      setTimeout(() => setMainUploadState(null), 1000);
      toast.info("Upload cancelled");
    }
  }

  function handleCancelReplyUpload(postId: string) {
    if (replyUploadCancelRefs.current[postId]) {
      replyUploadCancelRefs.current[postId]();
      delete replyUploadCancelRefs.current[postId];
      setIsUploadingReply(false);
      setTimeout(() => {
        setReplyUploadStates(prev => ({ ...prev, [postId]: null }));
      }, 1000);
      toast.info("Reply upload cancelled");
    }
  }

  function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>, isReply = false, replyPostId?: string) {
    const file = e.target.files?.[0];
    if (file) uploadFileBlob(file, isReply, replyPostId);
    e.target.value = "";
  }

  function handlePaste(e: React.ClipboardEvent, isReply = false, replyPostId?: string) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          uploadFileBlob(file, isReply, replyPostId);
          break;
        }
      }
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFileBlob(e.dataTransfer.files[0], false);
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
      toast.success("Bookmark updated");
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
        toast.success("Post link copied to clipboard!");
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
    if (!text) return null;
    const parts = text.split(/(#[a-zA-Z0-9_]+|@[a-zA-Z0-9_]+)/g);
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
      if (part.startsWith("@")) {
        const username = part.replace("@", "");
        return (
          <Link 
            key={i} 
            href={`/user/${username}`}
            className="text-primary hover:underline font-bold"
          >
            {part}
          </Link>
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

  // Filter posts based on active feedTab
  const basePosts = searchResults !== null ? searchResults : posts;
  const displayPosts = useMemo(() => {
    if (searchResults !== null) return searchResults;
    if (feedTab === "clips") {
      return basePosts.filter(p => p.mediaUrl && isVideo(p.mediaUrl));
    }
    if (feedTab === "trending") {
      return [...basePosts].sort((a, b) => (b.likesCount + (b.shareCount || 0)) - (a.likesCount + (a.shareCount || 0)));
    }
    return basePosts;
  }, [searchResults, feedTab, basePosts]);

  const renderPost = (post: any, isReply = false, parentId?: string) => {
    if (hiddenPostIds.has(post.id)) return null;

    const postHashtags = post.hashtags || [];
    const isShortsEligible = post.mediaUrl && (isVideo(post.mediaUrl) || !isArchive(post.mediaUrl));

    return (
      <motion.div 
        key={post.id} 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className={`p-4 sm:p-5 hover:bg-muted/10 transition-colors flex gap-3.5 sm:gap-4 relative group/post ${
          isReply ? 'pl-8 sm:pl-12 bg-muted/5' : ''
        }`}
      >
        {/* Left Column: Avatar & Thread Line */}
        <div className="flex flex-col items-center shrink-0">
          <Link 
            href={`/user/${post.author?.username}`}
            className="w-10 h-10 rounded-full bg-muted overflow-hidden relative ring-1 ring-border/60 hover:ring-primary/60 transition-all shrink-0 shadow-xs"
          >
            {post.author?.image ? (
              <Image src={post.author.image} alt={post.author.username} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-muted-foreground bg-muted text-sm">
                {post.author?.username?.charAt(0).toUpperCase()}
              </div>
            )}
          </Link>
          
          {/* Thread connector rail if post has replies expanded */}
          {!isReply && loadedReplies[post.id] && loadedReplies[post.id].length > 0 && (
            <div className="w-0.5 flex-1 bg-border/60 my-2 rounded-full" />
          )}
        </div>

        {/* Right Main Content */}
        <div className="flex-1 min-w-0">
          {/* Header Row */}
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <Link 
              href={`/user/${post.author?.username}`}
              className="font-bold text-sm hover:underline truncate text-foreground flex items-center gap-1"
            >
              {post.author?.username}
            </Link>
            
            {post.author?.isFounder && (
              <span title="Founder"><Crown className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" /></span>
            )}
            {post.author?.isVIP && (
              <span title="VIP"><BadgeCheck className="w-3.5 h-3.5 text-blue-500 fill-blue-500" /></span>
            )}
            {post.author?.isTrusted && (
              <span title="Trusted User"><ShieldCheck className="w-3.5 h-3.5 text-green-500 fill-green-500" /></span>
            )}
            
            {post.author?.achievements && post.author.achievements.length > 0 && (
              <div className="ml-0.5">
                <UserBadges achievements={post.author.achievements} inline={true} />
              </div>
            )}

            <span className="text-xs text-muted-foreground truncate hidden sm:inline">
              @{post.author?.username}
            </span>

            {!post.isForumThread && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleSubscribe(post.author.id); }}
                className="ml-1 text-xs text-primary font-medium hover:underline opacity-80 hover:opacity-100"
              >
                Follow
              </button>
            )}

            {post.isForumThread && (
              <span className="ml-1 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm bg-primary/20 text-primary">
                Forum Thread
              </span>
            )}

            <span className="text-muted-foreground/40 mx-1">•</span>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </span>

            {post.viewCount > 0 && (
              <span className="text-[11px] text-muted-foreground/70 flex items-center gap-0.5 ml-auto shrink-0 font-mono">
                <Eye className="w-3 h-3" /> {post.viewCount}
              </span>
            )}
            
            {post.isPinned && (
              <span className="text-[10px] text-primary flex items-center gap-0.5 ml-2 shrink-0 border border-primary/30 px-1.5 py-0.5 rounded-full uppercase font-bold tracking-wider bg-primary/5">
                <Pin className="w-3 h-3 fill-current" /> Pinned
              </span>
            )}
            
            {/* Post Context Menu */}
            {!isReply && (
              <div className="relative ml-1">
                <button
                  onClick={() => setActivePostMenu(activePostMenu === post.id ? null : post.id)}
                  className="p-1 rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {activePostMenu === post.id && (
                  <div className="absolute right-0 top-8 z-50 w-60 bg-popover border border-border rounded-xl shadow-2xl py-1 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-xl">
                    <button
                      onClick={() => handleNotInterested(post.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-muted/50 transition-colors"
                    >
                      <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                      Not interested in this post
                    </button>
                    <button
                      onClick={() => handleReport(post.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-destructive/10 text-destructive transition-colors"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      Report Post
                    </button>
                    {post.isAuthor && (
                      <>
                        <button
                          onClick={() => {
                            setEditingPostId(post.id);
                            setEditBody(post.body);
                            setActivePostMenu(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-muted/50 transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Edit Post
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-destructive/10 text-destructive transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Post
                        </button>
                      </>
                    )}
                    {currentUserPermission >= 300 && (
                      <button
                        onClick={() => handlePinToggle(post.id, post.isPinned)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-muted/50 transition-colors"
                      >
                        <Pin className={`w-3.5 h-3.5 ${post.isPinned ? "fill-current" : ""}`} />
                        {post.isPinned ? "Unpin Post" : "Pin Post"}
                      </button>
                    )}
                    {postHashtags.map((tag: string) => (
                      <button
                        key={tag}
                        onClick={() => handleMuteFromPost(tag, "HASHTAG")}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-muted/50 transition-colors"
                      >
                        <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />
                        Mute #{tag}
                      </button>
                    ))}
                    <div className="border-t border-border/50 my-1" />
                    <button
                      onClick={() => {
                        setActivePostMenu(null);
                        setShowMutedPopover(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-muted/50 transition-colors text-muted-foreground"
                    >
                      <VolumeX className="w-3.5 h-3.5" />
                      Manage muted keywords...
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Post Content Body */}
          {editingPostId === post.id ? (
            <div className="mb-3 space-y-2">
              <Textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                className="w-full text-sm rounded-xl"
              />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => setEditingPostId(null)}>Cancel</Button>
                <Button size="sm" onClick={() => handleSaveEdit(post.id)}>Save</Button>
              </div>
            </div>
          ) : (
            <div className="text-sm leading-relaxed mb-3 text-foreground/95" style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
              {post.isForumThread ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{post.body}</ReactMarkdown>
                </div>
              ) : renderBody(post.body)}
            </div>
          )}
          
          {/* Embedded Polls */}
          {post.polls && post.polls.length > 0 && (
            <div className="mb-3 space-y-2 mt-2">
              {post.polls.map((poll: any) => {
                const totalVotes = poll.options.reduce((sum: number, o: any) => sum + (o._count?.votes || 0), 0);
                return (
                  <div key={poll.id} className="bg-muted/20 p-4 rounded-2xl border border-border/50 shadow-xs">
                    <p className="font-bold text-sm mb-3">{poll.question}</p>
                    <div className="space-y-2">
                      {poll.options.map((opt: any) => {
                        const hasVoted = opt.votes && opt.votes.length > 0;
                        const votes = opt._count?.votes || 0;
                        const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                        
                        return (
                          <div 
                            key={opt.id} 
                            onClick={() => handleVote(poll.id, opt.id)}
                            className="relative overflow-hidden rounded-xl border border-border/50 bg-background hover:bg-muted/40 transition-colors cursor-pointer p-3 flex justify-between items-center group"
                          >
                            <div 
                              className={`absolute inset-0 opacity-20 ${hasVoted ? 'bg-primary' : 'bg-muted-foreground'}`}
                              style={{ width: `${percentage}%`, transition: 'width 0.5s ease-out' }}
                            />
                            <span className={`relative z-10 text-xs font-semibold ${hasVoted ? 'text-primary' : ''}`}>
                              {opt.text}
                            </span>
                            <span className="relative z-10 text-xs text-muted-foreground font-mono">
                              {percentage}% ({votes})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground text-right font-mono">
                      {totalVotes} total vote{totalVotes !== 1 ? 's' : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {post.isForumThread && post.threadUrl && (
            <div className="mb-3">
              <Link href={post.threadUrl} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                Read full forum discussion <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* Media Attachment (Video / Archive / Image) */}
          {post.mediaUrl && (
            <div className="mb-3 mt-1.5">
              {isArchive(post.mediaUrl) ? (
                <div 
                  className="rounded-2xl overflow-hidden border border-border/50 bg-muted/20 p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setViewingShortsPost(post)}
                >
                  <FileArchive className="w-10 h-10 text-primary mb-2" />
                  <span className="text-xs font-semibold text-primary break-all px-4 mb-2">{post.mediaUrl.split('/').pop()}</span>
                  <a 
                    href={post.mediaUrl} 
                    download 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center gap-2 px-4 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary rounded-full transition-colors font-bold text-xs shadow-xs" 
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download className="w-3.5 h-3.5" /> Download Archive
                  </a>
                </div>
              ) : isVideo(post.mediaUrl) ? (
                <FeedVideoPlayer
                  id={post.id}
                  src={post.mediaUrl}
                  activePlayingId={activePlayingVideoId}
                  setActivePlayingId={setActivePlayingVideoId}
                  onOpenReel={() => {
                    setViewingShortsPost(post);
                    handleRecordView(post.id);
                  }}
                  onRecordView={() => handleRecordView(post.id)}
                  onLike={() => handleLike(post.id, isReply, parentId)}
                  hasLiked={post.hasLiked}
                  isSharedMuted={isFeedMuted}
                  setIsSharedMuted={handleSetFeedMuted}
                />
              ) : (
                <div 
                  className="rounded-2xl overflow-hidden border border-border/40 bg-black/40 flex items-center justify-center max-h-[520px] relative group/img cursor-pointer shadow-xs"
                  onClick={() => setViewingShortsPost(post)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={post.mediaUrl} 
                    alt="Post attachment" 
                    className="max-h-[520px] w-auto max-w-full object-contain hover:scale-[1.01] transition-transform duration-200" 
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <div className="p-2 rounded-full bg-black/60 text-white backdrop-blur-sm shadow-md">
                      <Maximize2 className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Integrated Action Bar */}
          <div className="flex items-center justify-between text-muted-foreground mt-2.5 max-w-md pt-1">
            {/* Like */}
            {!post.isForumThread && (
              <button 
                onClick={() => handleLike(post.id, isReply, parentId)}
                className={`flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-red-500 group/btn ${post.hasLiked ? 'text-red-500' : ''}`}
                title="Like"
              >
                <div className={`p-1.5 rounded-full group-hover/btn:bg-red-500/10 transition-colors ${post.hasLiked ? 'text-red-500' : ''}`}>
                  <Heart className={`w-4 h-4 ${post.hasLiked ? 'fill-current text-red-500 scale-110' : ''} transition-transform`} />
                </div>
                <span>{post.likesCount > 0 ? post.likesCount : ""}</span>
              </button>
            )}
            
            {/* Reply */}
            {!isReply && !post.isForumThread && (
              <button 
                onClick={() => {
                  if (replyingTo === post.id) {
                    setReplyingTo(null);
                    setReplyBody("");
                    setReplyMediaUrl("");
                  } else {
                    setReplyingTo(post.id);
                    setReplyBody("");
                    setReplyMediaUrl("");
                  }
                }}
                className={`flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-primary group/btn ${replyingTo === post.id ? 'text-primary' : ''}`}
                title="Reply"
              >
                <div className="p-1.5 rounded-full group-hover/btn:bg-primary/10 transition-colors">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <span>{post.repliesCount > 0 ? post.repliesCount : ""}</span>
              </button>
            )}

            {/* Share */}
            {!post.isForumThread && (
              <button 
                onClick={() => handleShare(post)}
                className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-green-500 group/btn"
                title="Share link"
              >
                <div className="p-1.5 rounded-full group-hover/btn:bg-green-500/10 transition-colors">
                  <Share className="w-4 h-4" />
                </div>
                <span>{post.shareCount > 0 ? post.shareCount : ""}</span>
              </button>
            )}

            {/* Shorts / Reel Launcher */}
            {isShortsEligible && !post.isForumThread && (
              <button 
                onClick={() => {
                  setViewingShortsPost(post);
                  handleRecordView(post.id);
                }}
                className="flex items-center gap-1.5 text-xs font-semibold transition-colors text-primary hover:text-primary/80 group/btn"
                title="Watch in full-screen Saints Reel mode"
              >
                <div className="p-1.5 rounded-full group-hover/btn:bg-primary/10 transition-colors">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                </div>
                <span className="hidden sm:inline">Reel</span>
              </button>
            )}

            {/* Gold Tip */}
            {!post.isForumThread && (
              <button 
                onClick={() => handleTip(post.id)}
                className="flex items-center gap-1 text-xs font-medium transition-colors text-yellow-500/80 hover:text-yellow-500 group/btn"
                title="Tip 5 Gold"
              >
                <div className="p-1.5 rounded-full group-hover/btn:bg-yellow-500/10 transition-colors">
                  <Coins className="w-4 h-4" />
                </div>
                <span className="hidden sm:inline">Tip</span>
              </button>
            )}

            {/* Bookmark */}
            {!isReply && !post.isForumThread && (
              <button 
                onClick={() => handleBookmark(post.id)}
                className={`flex items-center gap-1 text-xs font-medium transition-colors hover:text-yellow-500 group/btn ${post.hasBookmarked ? 'text-yellow-500' : ''}`}
                title="Bookmark"
              >
                <div className="p-1.5 rounded-full group-hover/btn:bg-yellow-500/10 transition-colors">
                  <Bookmark className={`w-4 h-4 ${post.hasBookmarked ? 'fill-current text-yellow-500' : ''}`} />
                </div>
              </button>
            )}
          </div>

          {/* Inline Reply Box */}
          {replyingTo === post.id && !isReply && (
            <div className="mt-3 flex gap-3 items-start animate-in fade-in slide-in-from-top-2">
              <div className="flex-1">
                <form 
                  onSubmit={(e) => handleReply(e, post.id)} 
                  onPaste={(e) => handlePaste(e, true, post.id)}
                  className="bg-muted/30 p-3 rounded-2xl border border-border/50 relative shadow-xs"
                >
                  <Textarea 
                    placeholder="Post your reply... (paste or drag image/video)"
                    className="resize-none border-0 focus-visible:ring-0 px-0 bg-transparent text-xs min-h-[50px]"
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    maxLength={1000}
                    autoFocus
                  />

                  {/* Reply Upload Progress Bar */}
                  {replyUploadStates[post.id] && (
                    <div className="my-2">
                      <UploadProgressBar 
                        uploadState={replyUploadStates[post.id]} 
                        onCancel={() => handleCancelReplyUpload(post.id)} 
                      />
                    </div>
                  )}

                  {replyMediaUrl && !replyUploadStates[post.id] && (
                    <div className="relative my-2 rounded-xl overflow-hidden border border-border/50 bg-black/10 flex items-center justify-center max-h-[200px]">
                      <Button 
                        type="button" 
                        variant="destructive" 
                        size="icon" 
                        className="absolute top-2 right-2 w-6 h-6 rounded-full z-10 shadow-md"
                        onClick={() => setReplyMediaUrl("")}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                      {isArchive(replyMediaUrl) ? (
                        <div className="flex flex-col items-center justify-center p-4 text-center w-full">
                          <FileArchive className="w-8 h-8 text-primary mb-1" />
                          <span className="text-xs font-medium text-primary/80">Archive Attached</span>
                          <span className="text-[10px] text-muted-foreground break-all max-w-[90%]">{replyMediaUrl.split('/').pop()}</span>
                        </div>
                      ) : isVideo(replyMediaUrl) ? (
                        <video src={formatVideoSrc(replyMediaUrl)} controls className="max-h-[200px] w-auto max-w-full rounded" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={replyMediaUrl} alt="Reply preview" className="max-h-[200px] w-auto max-w-full object-contain rounded" />
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/50">
                     <div className="flex items-center gap-1">
                       <div>
                         <input 
                           type="file" 
                           id={`social-reply-media-upload-${post.id}`} 
                           accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,video/ogg,video/x-matroska,video/m4v" 
                           className="hidden" 
                           onChange={(e) => handleMediaUpload(e, true, post.id)} 
                           disabled={Boolean(replyUploadStates[post.id]) || isPosting}
                         />
                         <Button asChild variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:text-primary disabled:opacity-50" title="Attach Image or Video">
                           <label htmlFor={`social-reply-media-upload-${post.id}`} className="cursor-pointer">
                             <ImageIcon className="w-3.5 h-3.5" />
                           </label>
                         </Button>
                       </div>

                       <div>
                         <input 
                           type="file" 
                           id={`social-reply-archive-upload-${post.id}`} 
                           accept=".zip,.rar,.7z,.tar,.bz2,.gz,application/zip,application/x-zip-compressed,application/x-7z-compressed,application/vnd.rar,application/x-rar-compressed,application/x-tar,application/x-bzip2,application/gzip" 
                           className="hidden" 
                           onChange={(e) => handleMediaUpload(e, true, post.id)} 
                           disabled={Boolean(replyUploadStates[post.id]) || isPosting}
                         />
                         <Button asChild variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:text-primary disabled:opacity-50" title="Attach Archive">
                           <label htmlFor={`social-reply-archive-upload-${post.id}`} className="cursor-pointer">
                             <Paperclip className="w-3.5 h-3.5" />
                           </label>
                         </Button>
                       </div>

                       <span className={`text-[11px] ml-2 ${replyBody.length > 900 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                         {replyBody.length} / 1000
                       </span>
                     </div>
                     <div className="flex gap-2">
                       <Button type="button" variant="ghost" size="sm" className="h-7 text-xs rounded-full" onClick={() => { setReplyingTo(null); setReplyBody(""); setReplyMediaUrl(""); }}>Cancel</Button>
                       <Button type="submit" size="sm" className="h-7 text-xs rounded-full font-bold px-4" disabled={(!replyBody.trim() && !replyMediaUrl) || isPosting || isUploadingReply}>Reply</Button>
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
              className="text-xs font-semibold text-primary hover:underline mt-2.5 flex items-center gap-1"
            >
              {loadingReplies[post.id] ? <Loader2 className="w-3 h-3 animate-spin inline" /> : null}
              <span>Show {post.repliesCount} repl{post.repliesCount === 1 ? 'y' : 'ies'}</span>
            </button>
          )}

          {/* Render Nested Replies */}
          {!isReply && loadedReplies[post.id] && (
            <div className="mt-2 space-y-0 divide-y divide-border/30 border-t border-border/30">
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

  const navigateShorts = useCallback((direction: number) => {
    if (!viewingShortsPost || !displayPosts.length) return;
    const currentIndex = displayPosts.findIndex((p: any) => p.id === viewingShortsPost.id);
    if (currentIndex === -1) return;
    const nextIndex = currentIndex + direction;
    if (nextIndex >= 0 && nextIndex < displayPosts.length) {
      setViewingShortsPost(displayPosts[nextIndex]);
      setCaptionExpanded(false);
      setShortsPlaying(true);
      setShowHeartAnimation(false);
      if (displayPosts[nextIndex].id) {
        handleRecordView(displayPosts[nextIndex].id);
      }
    }
  }, [viewingShortsPost, displayPosts, handleRecordView]);

  // Lock body scroll when Shorts Viewer is open
  useEffect(() => {
    if (viewingShortsPost) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [viewingShortsPost]);

  // Global mouse wheel listener for Shorts navigation
  useEffect(() => {
    if (!viewingShortsPost) return;

    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.closest(".shorts-comments-scroll")) return;

      e.preventDefault();
      const now = Date.now();
      if (now - lastWheelTime.current < 320) return;

      if (e.deltaY > 15) {
        lastWheelTime.current = now;
        navigateShorts(1);
      } else if (e.deltaY < -15) {
        lastWheelTime.current = now;
        navigateShorts(-1);
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [viewingShortsPost, navigateShorts]);

  // Keyboard navigation for Shorts Viewer
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!viewingShortsPost) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        navigateShorts(1);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        navigateShorts(-1);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setViewingShortsPost(null);
        setIsShortsCommentsOpen(false);
      } else if (e.key === "m" || e.key === "M") {
        setIsShortsMuted(prev => !prev);
      } else if (e.key === " ") {
        e.preventDefault();
        setShortsPlaying(prev => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewingShortsPost, navigateShorts]);

  const lastTapRef = useRef<number>(0);
  const handleShortsTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (viewingShortsPost && !viewingShortsPost.hasLiked) {
        handleLike(viewingShortsPost.id);
      }
      setShowHeartAnimation(true);
      setTimeout(() => setShowHeartAnimation(false), 900);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      setTimeout(() => {
        if (lastTapRef.current === now) {
          setShortsPlaying(prev => !prev);
        }
      }, 300);
    }
  };

  const currentShortsIndex = viewingShortsPost 
    ? displayPosts.findIndex((p: any) => p.id === viewingShortsPost.id) 
    : -1;

  return (
    <div className="w-full flex flex-col xl:flex-row items-start justify-center gap-6 relative min-h-screen">
      
      {/* Full-Screen Immersive Shorts / Reel Swiper Modal with Adjacent Preloading */}
      {mounted && viewingShortsPost && createPortal(
        <div 
          className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[999999] bg-black/95 backdrop-blur-2xl flex items-center justify-center select-none overflow-hidden m-0 p-0 animate-in fade-in duration-200"
          onTouchStart={(e) => {
            touchStartY.current = e.touches[0].clientY;
          }}
          onTouchEnd={(e) => {
            if (touchStartY.current === null) return;
            const deltaY = touchStartY.current - e.changedTouches[0].clientY;
            if (deltaY > 35) {
              navigateShorts(1);
            } else if (deltaY < -35) {
              navigateShorts(-1);
            }
            touchStartY.current = null;
          }}
        >
          {/* Top Bar Controls */}
          <div className="absolute top-4 left-4 z-50 flex items-center gap-3">
            <button 
              onClick={() => { setViewingShortsPost(null); setIsShortsCommentsOpen(false); }}
              className="p-2.5 bg-black/70 hover:bg-black/95 border border-white/20 rounded-full text-white backdrop-blur-md transition-all shadow-lg hover:scale-105"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/70 border border-white/20 text-white backdrop-blur-md text-xs font-bold shadow-md">
              <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
              <span>Saints Reel</span>
            </div>
          </div>

          <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
            <button 
              onClick={() => setIsShortsMuted(!isShortsMuted)}
              className="p-2.5 bg-black/70 hover:bg-black/95 border border-white/20 rounded-full text-white backdrop-blur-md transition-all shadow-lg hover:scale-105"
              title={isShortsMuted ? "Unmute (M)" : "Mute (M)"}
            >
              {isShortsMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-green-400" />}
            </button>
          </div>

          {/* Up & Down Floating Navigation Chevrons on PC */}
          <div className="absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 hidden md:flex flex-col items-center gap-3 z-40">
            <button 
              onClick={() => navigateShorts(-1)}
              disabled={currentShortsIndex === 0}
              className="p-3.5 rounded-full bg-black/70 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:scale-110 shadow-xl"
              title="Previous (Scroll Up / ↑)"
            >
              <ChevronUp className="w-6 h-6" />
            </button>
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/50 bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-xs">
              Scroll
            </span>
            <button 
              onClick={() => navigateShorts(1)}
              disabled={currentShortsIndex === displayPosts.length - 1}
              className="p-3.5 rounded-full bg-black/70 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:scale-110 shadow-xl"
              title="Next (Scroll Down / ↓)"
            >
              <ChevronDown className="w-6 h-6" />
            </button>
          </div>

          {/* Adjacent Video Prefetching to eliminate buffer delay and black flashes */}
          {currentShortsIndex < displayPosts.length - 1 && displayPosts[currentShortsIndex + 1]?.mediaUrl && isVideo(displayPosts[currentShortsIndex + 1].mediaUrl) && (
            <video
              src={formatVideoSrc(displayPosts[currentShortsIndex + 1].mediaUrl)}
              preload="auto"
              muted
              className="hidden"
            />
          )}
          {currentShortsIndex > 0 && displayPosts[currentShortsIndex - 1]?.mediaUrl && isVideo(displayPosts[currentShortsIndex - 1].mediaUrl) && (
            <video
              src={formatVideoSrc(displayPosts[currentShortsIndex - 1].mediaUrl)}
              preload="auto"
              muted
              className="hidden"
            />
          )}

          {/* Main Shorts Container Frame */}
          <div className="w-full max-w-[480px] md:max-w-3xl lg:max-w-4xl xl:max-w-5xl h-[94vh] md:h-[88vh] md:max-h-[920px] relative rounded-3xl overflow-hidden bg-black/90 border border-white/20 shadow-2xl flex items-center justify-center mx-3 sm:mx-6">
            
            {/* Ambient Blurred Background */}
            {viewingShortsPost.mediaUrl && !isArchive(viewingShortsPost.mediaUrl) && (
              <div 
                className="absolute inset-0 bg-cover bg-center blur-3xl opacity-35 scale-125 pointer-events-none transition-opacity duration-500"
                style={{ backgroundImage: `url(${viewingShortsPost.mediaUrl})` }}
              />
            )}

            {/* Central Media Content */}
            <div 
              className="w-full h-full relative flex items-center justify-center cursor-pointer"
              onClick={handleShortsTap}
            >
              {viewingShortsPost.mediaUrl && isVideo(viewingShortsPost.mediaUrl) ? (
                <video
                  key={viewingShortsPost.id}
                  src={formatVideoSrc(viewingShortsPost.mediaUrl)}
                  autoPlay={shortsPlaying}
                  loop
                  playsInline
                  muted={isShortsMuted}
                  className="max-h-[88vh] md:max-h-[84vh] w-auto max-w-full object-contain mx-auto bg-black rounded-2xl transition-opacity duration-300"
                />
              ) : viewingShortsPost.mediaUrl && isArchive(viewingShortsPost.mediaUrl) ? (
                <div className="flex flex-col items-center justify-center p-8 text-center bg-card/60 backdrop-blur-md rounded-2xl border border-white/10 m-4">
                  <FileArchive className="w-16 h-16 text-primary mb-3" />
                  <h3 className="font-bold text-lg text-white mb-1">Archive Attachment</h3>
                  <p className="text-xs text-muted-foreground break-all mb-4">{viewingShortsPost.mediaUrl.split('/').pop()}</p>
                  <a 
                    href={viewingShortsPost.mediaUrl} 
                    download 
                    className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-bold text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-lg"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download className="w-4 h-4" /> Download File
                  </a>
                </div>
              ) : viewingShortsPost.mediaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  key={viewingShortsPost.id}
                  src={viewingShortsPost.mediaUrl} 
                  alt="Shorts media" 
                  className="max-h-[88vh] md:max-h-[84vh] w-auto max-w-full object-contain mx-auto rounded-2xl shadow-xl" 
                />
              ) : (
                <div className="w-full h-full flex flex-col justify-between p-8 bg-gradient-to-b from-primary/20 via-background/80 to-black text-white">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden relative bg-muted border border-white/20">
                      {viewingShortsPost.author?.image ? (
                        <Image src={viewingShortsPost.author.image} alt={viewingShortsPost.author.username} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-lg">
                          {viewingShortsPost.author?.username?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-base flex items-center gap-1.5">
                        {viewingShortsPost.author?.username}
                        {viewingShortsPost.author?.isFounder && <Crown className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                        {viewingShortsPost.author?.isVIP && <BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-500" />}
                      </h4>
                      <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(viewingShortsPost.createdAt))} ago</p>
                    </div>
                  </div>

                  <div className="my-auto py-6">
                    <p className="text-lg md:text-xl font-medium leading-relaxed drop-shadow-md whitespace-pre-wrap">
                      {viewingShortsPost.body}
                    </p>
                  </div>

                  <div className="text-xs text-primary/80 font-bold tracking-widest uppercase flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> Saints Post Reel
                  </div>
                </div>
              )}

              {/* Play/Pause Center Indicator */}
              {!shortsPlaying && viewingShortsPost.mediaUrl && isVideo(viewingShortsPost.mediaUrl) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none animate-in fade-in zoom-in duration-150">
                  <div className="p-5 rounded-full bg-black/70 text-white backdrop-blur-md border border-white/20 shadow-2xl">
                    <Play className="w-10 h-10 fill-white" />
                  </div>
                </div>
              )}

              {/* Blooming Double-Tap Heart Animation */}
              {showHeartAnimation && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                  <motion.div
                    initial={{ scale: 0.3, opacity: 0 }}
                    animate={{ scale: [0.3, 1.4, 1], opacity: [0, 1, 0] }}
                    transition={{ duration: 0.8 }}
                  >
                    <Heart className="w-28 h-28 text-red-500 fill-red-500 drop-shadow-2xl" />
                  </motion.div>
                </div>
              )}

              {/* Gradient Bottom Shadow */}
              <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

              {/* Bottom Caption & Author Details */}
              <div className="absolute bottom-4 left-4 right-16 z-20 text-white pointer-events-auto">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-sm drop-shadow-md flex items-center gap-1">
                    @{viewingShortsPost.author?.username}
                    {viewingShortsPost.author?.isFounder && <Crown className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />}
                    {viewingShortsPost.author?.isVIP && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />}
                  </span>
                  <span className="text-[11px] text-white/70">• {formatDistanceToNow(new Date(viewingShortsPost.createdAt))} ago</span>
                </div>

                {viewingShortsPost.body && (
                  <div className="text-xs text-white/90 leading-snug drop-shadow-md mb-2">
                    <p className={captionExpanded ? "" : "line-clamp-2"}>
                      {renderBody(viewingShortsPost.body)}
                    </p>
                    {viewingShortsPost.body.length > 90 && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setCaptionExpanded(!captionExpanded); }}
                        className="text-[11px] font-bold text-primary hover:underline mt-0.5"
                      >
                        {captionExpanded ? "less" : "more"}
                      </button>
                    )}
                  </div>
                )}

                {/* Audio Ticker */}
                <div className="flex items-center gap-2 text-[11px] text-white/80 mt-1 bg-black/40 px-2.5 py-1 rounded-full w-fit border border-white/10 backdrop-blur-xs">
                  <Music className="w-3 h-3 text-primary animate-spin" style={{ animationDuration: '4s' }} />
                  <span className="truncate max-w-[180px]">
                    {viewingShortsPost.backgroundTrackUrl ? "Background Audio Stem" : `Original Audio - @${viewingShortsPost.author?.username}`}
                  </span>
                </div>
              </div>

              {/* Right Side Floating TikTok Action Rail */}
              <div 
                className="absolute right-3 bottom-8 flex flex-col items-center gap-4 z-30 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Creator Avatar with Follow Button */}
                <div className="relative mb-2">
                  <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-primary bg-muted relative shadow-lg">
                    {viewingShortsPost.author?.image ? (
                      <Image src={viewingShortsPost.author.image} alt={viewingShortsPost.author.username} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-white bg-primary/40">
                        {viewingShortsPost.author?.username?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => handleSubscribe(viewingShortsPost.author.id)}
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground rounded-full p-0.5 hover:scale-110 transition-transform shadow-md"
                    title="Subscribe"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Like Button */}
                <button 
                  onClick={() => handleLike(viewingShortsPost.id)}
                  className="flex flex-col items-center gap-1 text-white hover:scale-110 transition-transform"
                >
                  <div className={`p-2.5 rounded-full backdrop-blur-md border border-white/10 shadow-lg ${viewingShortsPost.hasLiked ? 'bg-red-500/20 text-red-500' : 'bg-black/50 text-white'}`}>
                    <Heart className={`w-6 h-6 ${viewingShortsPost.hasLiked ? 'fill-red-500 text-red-500' : ''}`} />
                  </div>
                  <span className="text-[11px] font-bold drop-shadow-md">{viewingShortsPost.likesCount || 0}</span>
                </button>

                {/* Comments Button */}
                <button 
                  onClick={() => {
                    setIsShortsCommentsOpen(!isShortsCommentsOpen);
                    if (!loadedReplies[viewingShortsPost.id]) {
                      handleLoadReplies(viewingShortsPost.id);
                    }
                  }}
                  className="flex flex-col items-center gap-1 text-white hover:scale-110 transition-transform"
                >
                  <div className={`p-2.5 rounded-full backdrop-blur-md border border-white/10 shadow-lg ${isShortsCommentsOpen ? 'bg-primary text-primary-foreground' : 'bg-black/50 text-white'}`}>
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold drop-shadow-md">{viewingShortsPost.repliesCount || 0}</span>
                </button>

                {/* Bookmark Button */}
                <button 
                  onClick={() => handleBookmark(viewingShortsPost.id)}
                  className="flex flex-col items-center gap-1 text-white hover:scale-110 transition-transform"
                >
                  <div className={`p-2.5 rounded-full backdrop-blur-md border border-white/10 shadow-lg ${viewingShortsPost.hasBookmarked ? 'bg-yellow-500/20 text-yellow-500' : 'bg-black/50 text-white'}`}>
                    <Bookmark className={`w-6 h-6 ${viewingShortsPost.hasBookmarked ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                  </div>
                  <span className="text-[11px] font-bold drop-shadow-md">Save</span>
                </button>

                {/* Share Button */}
                <button 
                  onClick={() => handleShare(viewingShortsPost)}
                  className="flex flex-col items-center gap-1 text-white hover:scale-110 transition-transform"
                >
                  <div className="p-2.5 rounded-full bg-black/50 text-white backdrop-blur-md border border-white/10 shadow-lg">
                    <Share className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold drop-shadow-md">{viewingShortsPost.shareCount || 0}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Slide-Over Comments Drawer */}
          {isShortsCommentsOpen && (
            <div 
              className="fixed inset-x-0 bottom-0 md:inset-y-0 md:right-0 md:left-auto w-full md:w-96 bg-background/95 backdrop-blur-2xl border-t md:border-t-0 md:border-l border-border/60 z-50 flex flex-col h-[70vh] md:h-full shadow-2xl animate-in slide-in-from-bottom md:slide-in-from-right duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-border/50 flex items-center justify-between">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" /> Comments ({viewingShortsPost.repliesCount || 0})
                </h3>
                <button 
                  onClick={() => setIsShortsCommentsOpen(false)}
                  className="p-1.5 rounded-full hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 shorts-comments-scroll">
                {loadingReplies[viewingShortsPost.id] ? (
                  <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : !loadedReplies[viewingShortsPost.id] || loadedReplies[viewingShortsPost.id].length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-10">No comments yet. Be the first to start the conversation!</p>
                ) : (
                  loadedReplies[viewingShortsPost.id].map((reply: any) => (
                    <div key={reply.id} className="p-3 bg-muted/20 rounded-xl border border-border/40 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs">{reply.author?.username}</span>
                        <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(reply.createdAt))} ago</span>
                      </div>
                      <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">{renderBody(reply.body)}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Comment Input */}
              <form onSubmit={(e) => handleReply(e, viewingShortsPost.id)} className="p-3 border-t border-border/50 bg-muted/10 flex items-center gap-2">
                <Input 
                  placeholder="Add a comment... (max 1000)" 
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  maxLength={1000}
                  className="h-9 text-xs rounded-full bg-muted/30"
                />
                <Button 
                  type="submit" 
                  size="sm" 
                  disabled={!replyBody.trim() || isPosting}
                  className="h-9 rounded-full px-4 text-xs font-bold shrink-0 shadow-sm"
                >
                  {isPosting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </Button>
              </form>
            </div>
          )}
        </div>,
        document.body
      )}

      {/* Main Feed Column */}
      <div className="flex-1 w-full max-w-4xl 2xl:max-w-5xl min-w-0 space-y-4">
        
        {/* Stream Header & Navigation Tabs */}
        <div className="p-4 border border-border/50 rounded-2xl sticky top-20 bg-background/85 backdrop-blur-xl z-10 shadow-sm">
          
          {/* Top Bar: Title & Search */}
          <div className="flex justify-between items-center mb-3.5 gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-xl sm:text-2xl tracking-tight sg-text-gradient">
                {filter ? `#${filter}` : "The Feed"}
              </h2>
              {filter && (
                <Button variant="ghost" size="sm" className="h-7 text-xs rounded-full" onClick={() => setFilter(null)}>
                  Clear
                </Button>
              )}
            </div>

            {/* Quick Search & Controls */}
            <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
              <form onSubmit={handleSearch} className="flex-1 max-w-xs flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search feed..."
                    className="h-8 pl-8 pr-8 text-xs bg-muted/30 border-border/50 rounded-full"
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
              </form>

              {/* Broaden Discovery Toggle */}
              <button
                onClick={handleBroadenToggle}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border shrink-0 ${
                  broadenFeed 
                    ? 'bg-primary/10 text-primary border-primary/30 shadow-xs' 
                    : 'bg-muted/30 text-muted-foreground border-border/50 hover:border-primary/30 hover:text-foreground'
                }`}
                title="Broaden Discovery (Interleave community recommendations)"
              >
                <Compass className={`w-3.5 h-3.5 ${broadenFeed ? 'animate-spin' : ''}`} style={broadenFeed ? { animationDuration: '3s' } : {}} />
                <span className="hidden sm:inline">Discovery</span>
              </button>

              {/* Muted Keywords Popover */}
              <Popover open={showMutedPopover} onOpenChange={setShowMutedPopover}>
                <PopoverTrigger className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all border shrink-0 ${
                    mutedKeywords.length > 0
                      ? 'bg-orange-500/10 text-orange-500 border-orange-500/30'
                      : 'bg-muted/30 text-muted-foreground border-border/50 hover:border-primary/30'
                  }`}>
                    <VolumeX className="w-3.5 h-3.5" />
                    {mutedKeywords.length > 0 && <span className="text-[10px]">{mutedKeywords.length}</span>}
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
          </div>

          {/* Stream Selector Navigation Tabs */}
          <div className="flex items-center gap-2 pt-1 border-t border-border/40 overflow-x-auto no-scrollbar">
            <button
              onClick={() => { setFeedTab("for-you"); setFilter(null); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all relative shrink-0 ${
                feedTab === "for-you" && !filter
                  ? "text-primary bg-primary/10 border border-primary/30 shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30 border border-transparent"
              }`}
            >
              For You
            </button>
            <button
              onClick={() => { setFeedTab("clips"); setFilter(null); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all relative shrink-0 flex items-center gap-1.5 ${
                feedTab === "clips"
                  ? "text-primary bg-primary/10 border border-primary/30 shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30 border border-transparent"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
              Clips & Reels
            </button>
            <button
              onClick={() => { setFeedTab("trending"); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all relative shrink-0 flex items-center gap-1.5 ${
                feedTab === "trending"
                  ? "text-primary bg-primary/10 border border-primary/30 shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30 border border-transparent"
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              Hot & Trending
            </button>
          </div>

          {/* Search results banner */}
          {searchResults !== null && (
            <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center gap-2 text-xs text-muted-foreground">
              <Search className="w-3.5 h-3.5 text-primary" />
              <span>{searchResults.length} post{searchResults.length !== 1 ? "s" : ""} found for &quot;{searchQuery}&quot;</span>
              <button onClick={clearSearch} className="text-primary hover:underline ml-auto font-medium">Clear search</button>
            </div>
          )}
        </div>

        {/* Integrated Post Composer */}
        {searchResults === null && (
          <Card 
            className={`bg-card/60 backdrop-blur-md shadow-sm border-border/50 rounded-2xl overflow-hidden focus-within:ring-1 focus-within:ring-primary/50 transition-all relative ${
              isDragging ? "ring-2 ring-primary border-primary bg-primary/5" : ""
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Drag & Drop Visual Overlay */}
            {isDragging && (
              <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-2xl flex flex-col items-center justify-center z-30 pointer-events-none backdrop-blur-xs animate-in fade-in duration-150">
                <UploadCloud className="w-10 h-10 text-primary animate-bounce mb-2" />
                <span className="text-sm font-bold text-primary">Drop media or files to attach</span>
              </div>
            )}

            <CardContent className="p-0">
              <form onSubmit={handlePost}>
                <div className="p-4 flex gap-3 items-start">
                  <div className="w-10 h-10 rounded-full bg-muted overflow-hidden relative shrink-0 ring-1 ring-border/60">
                    {session?.user?.image ? (
                      <Image src={session.user.image} alt={session.user.name || "You"} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-muted-foreground bg-muted text-sm">
                        {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Textarea 
                      placeholder="What's happening in Saints Gaming? Drop a clip, use #hashtags..."
                      className="resize-none border-0 focus-visible:ring-0 p-0 bg-transparent text-sm sm:text-base min-h-[75px]"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      onPaste={(e) => handlePaste(e, false)}
                      maxLength={1000}
                    />
                  </div>
                </div>

                {/* Upload Progress Bar */}
                {mainUploadState && (
                  <div className="mx-4 mb-3">
                    <UploadProgressBar 
                      uploadState={mainUploadState} 
                      onCancel={handleCancelMainUpload} 
                    />
                  </div>
                )}

                {/* Attached Media Preview with Zero Black Box */}
                {mediaUrl && !mainUploadState && (
                  <div className="relative mx-4 mb-3 rounded-2xl overflow-hidden border border-border/50 bg-black/10 flex items-center justify-center max-h-[320px]">
                    <Button 
                      type="button" 
                      variant="destructive" 
                      size="icon" 
                      className="absolute top-2 right-2 w-7 h-7 rounded-full z-10 shadow-md"
                      onClick={() => setMediaUrl("")}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                    {isArchive(mediaUrl) ? (
                      <div className="flex flex-col items-center justify-center p-6 text-center w-full">
                        <FileArchive className="w-10 h-10 text-primary mb-2" />
                        <span className="text-sm font-semibold text-primary/90">Archive Attached</span>
                        <span className="text-xs text-muted-foreground mt-1 break-all max-w-[80%]">{mediaUrl.split('/').pop()}</span>
                      </div>
                    ) : isVideo(mediaUrl) ? (
                      <video src={formatVideoSrc(mediaUrl)} controls className="max-h-[320px] w-auto max-w-full rounded-xl" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mediaUrl} alt="Upload preview" className="max-h-[320px] w-auto max-w-full object-contain rounded-xl" />
                    )}
                  </div>
                )}

                {/* Poll Form Overlay */}
                {showPollForm && (
                  <div className="mx-4 mb-3 p-4 bg-muted/20 border border-border/50 rounded-2xl space-y-3">
                    <Input placeholder="Ask a poll question..." value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} className="bg-background rounded-xl text-xs" />
                    {pollOptions.map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <Input placeholder={`Option ${i + 1}`} value={opt} onChange={e => {
                          const newOpts = [...pollOptions];
                          newOpts[i] = e.target.value;
                          setPollOptions(newOpts);
                        }} className="bg-background rounded-xl text-xs" />
                        {pollOptions.length > 2 && (
                          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {pollOptions.length < 4 && (
                      <Button type="button" variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => setPollOptions([...pollOptions, ""])}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Option
                      </Button>
                    )}
                  </div>
                )}

                {/* Bottom Toolbar & Post Button */}
                <div className="flex justify-between items-center px-4 py-3 bg-muted/20 border-t border-border/50">
                  <div className="flex items-center gap-1">
                    {/* Media Upload */}
                    <div>
                      <input 
                        type="file" 
                        id="social-media-upload-main" 
                        accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,video/ogg,video/x-matroska,video/m4v" 
                        className="hidden" 
                        onChange={(e) => handleMediaUpload(e, false)} 
                        disabled={Boolean(mainUploadState) || isPosting}
                      />
                      <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary disabled:opacity-50" title="Attach Media (Image / Video)">
                        <label htmlFor="social-media-upload-main" className="cursor-pointer">
                          <ImageIcon className="w-4 h-4" />
                        </label>
                      </Button>
                    </div>

                    {/* Archive Upload */}
                    <div>
                      <input 
                        type="file" 
                        id="social-archive-upload-main" 
                        accept=".zip,.rar,.7z,.tar,.bz2,.gz,application/zip,application/x-zip-compressed,application/x-7z-compressed,application/vnd.rar,application/x-rar-compressed,application/x-tar,application/x-bzip2,application/gzip" 
                        className="hidden" 
                        onChange={(e) => handleMediaUpload(e, false)} 
                        disabled={Boolean(mainUploadState) || isPosting}
                      />
                      <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary disabled:opacity-50" title="Attach Archive (.zip/.rar)">
                        <label htmlFor="social-archive-upload-main" className="cursor-pointer">
                          <Paperclip className="w-4 h-4" />
                        </label>
                      </Button>
                    </div>

                    {/* Emoji Picker */}
                    <Popover>
                      <PopoverTrigger className="p-1.5 rounded-full text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors" title="Add Emoji">
                        <Smile className="w-4 h-4" />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 border-none shadow-none bg-transparent" side="bottom" align="start">
                        <EmojiPicker onEmojiClick={(e) => setBody(prev => prev + e.emoji)} />
                      </PopoverContent>
                    </Popover>

                    {/* Giphy Picker */}
                    <Popover open={showGiphy} onOpenChange={setShowGiphy}>
                      <PopoverTrigger className="p-1.5 rounded-full text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors" title="Choose GIF">
                        <span className="font-extrabold text-[10px] border border-current px-1 rounded">GIF</span>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-3 h-96 overflow-y-auto" side="bottom" align="start">
                        <input 
                          type="text" 
                          placeholder="Search GIFs..." 
                          className="w-full p-2 mb-3 bg-muted rounded-md text-xs outline-none"
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

                    {/* Poll Toggle */}
                    <Button type="button" variant="ghost" size="icon" className={`h-8 w-8 rounded-full hover:text-primary transition-colors ${showPollForm ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`} onClick={() => setShowPollForm(!showPollForm)} title="Create Poll">
                      <BarChart2 className="w-4 h-4" />
                    </Button>

                    {/* Advanced Creator Tools */}
                    <Popover open={showAdvanced} onOpenChange={setShowAdvanced}>
                      <PopoverTrigger className="p-1.5 rounded-full text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors" title="Advanced Audio / Stems / Chapters">
                        <Plus className="w-4 h-4" />
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-4 max-h-[400px] overflow-y-auto" side="top" align="start">
                        <h4 className="font-bold text-sm mb-3">Advanced Creator Tools</h4>
                        
                        <div className="space-y-4">
                          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                            <input type="checkbox" checked={isSubscriberOnly} onChange={(e) => setIsSubscriberOnly(e.target.checked)} />
                            Subscriber-Only Post
                          </label>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold">Voiceover Audio Stem URL</label>
                            <Input className="h-7 text-xs" value={voiceoverUrl} onChange={(e) => setVoiceoverUrl(e.target.value)} placeholder="https://..." />
                            <div className="flex items-center gap-2">
                              <span className="text-[10px]">Vol:</span>
                              <input type="range" min="0" max="2" step="0.1" value={voiceoverVolume} onChange={(e) => setVoiceoverVolume(parseFloat(e.target.value))} className="flex-1" />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold">Background Music Stem URL</label>
                            <Input className="h-7 text-xs" value={backgroundTrackUrl} onChange={(e) => setBackgroundTrackUrl(e.target.value)} placeholder="https://..." />
                            <div className="flex items-center gap-2">
                              <span className="text-[10px]">Vol:</span>
                              <input type="range" min="0" max="2" step="0.1" value={backgroundTrackVolume} onChange={(e) => setBackgroundTrackVolume(parseFloat(e.target.value))} className="flex-1" />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold">Captions / Transcript</label>
                            <Textarea className="min-h-[60px] text-xs p-2" value={captionsText} onChange={(e) => setCaptionsText(e.target.value)} placeholder="Enter transcript..." />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold">Smart Chapters (JSON)</label>
                            <Textarea className="min-h-[60px] text-xs p-2 font-mono" value={chapters} onChange={(e) => setChapters(e.target.value)} placeholder={'[{"time": 0, "title": "Intro"}]'} />
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-mono ${body.length > 900 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                      {body.length} / 1000
                    </span>
                    <Button type="submit" disabled={(!body.trim() && !mediaUrl) || isPosting || isUploading || body.length > 1000} className="rounded-full px-6 font-bold shadow-md h-9 text-xs">
                      {isPosting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Post"}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Integrated Social Feed Stream Container */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 bg-card/30 rounded-2xl border border-border/40 backdrop-blur-sm">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
            <span className="text-xs text-muted-foreground font-medium">Connecting to stream...</span>
          </div>
        ) : displayPosts.length === 0 ? (
          <div className="text-center p-14 bg-card/30 rounded-2xl border border-border/50 border-dashed backdrop-blur-sm">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20 text-primary" />
            <p className="text-muted-foreground font-semibold text-sm">
              {searchResults !== null 
                ? "No posts match your search query." 
                : feedTab === "clips" 
                  ? "No video clips found in this feed view."
                  : "No posts found. Be the first to start a conversation!"}
            </p>
          </div>
        ) : (
          <div className="space-y-4 pb-20">
            {/* Unified Stream Container with Hairline Dividers */}
            <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl shadow-sm overflow-hidden divide-y divide-border/30">
              {displayPosts.map(post => renderPost(post))}
            </div>
            
            {/* Infinite Scroll Sentinel */}
            {searchResults === null && (
              <div ref={sentinelRef} className="py-8 flex flex-col items-center justify-center min-h-[60px] text-muted-foreground">
                {isFetchingMore && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary bg-primary/10 px-4 py-2 rounded-full border border-primary/20 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    <span>Streaming more posts...</span>
                  </div>
                )}
                {!hasMore && displayPosts.length > 0 && (
                  <div className="text-center py-4">
                    <div className="w-8 h-1 bg-border/60 rounded-full mx-auto mb-2.5" />
                    <p className="text-[11px] text-muted-foreground/80 font-bold uppercase tracking-widest">
                      You&apos;re all caught up
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Trending Sidebar */}
      <div className="w-80 hidden xl:block sticky top-20 h-fit max-h-[calc(100vh-6rem)] overflow-y-auto bg-card/40 border border-border/50 rounded-2xl p-5 shadow-sm space-y-4 shrink-0 backdrop-blur-md">
        <h3 className="font-extrabold text-base mb-1 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" /> Trending Now
        </h3>
        <p className="text-xs text-muted-foreground mb-3">Popular hashtags across Saints Gaming</p>
        <div className="space-y-2">
          {trending.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No trends yet.</p>
          ) : (
            trending.map((t, idx) => (
              <button 
                key={t.name}
                onClick={() => {
                  setFilter(t.name);
                  setFeedTab("for-you");
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/40 hover:border-primary/40 hover:bg-muted/30 transition-all text-left group shadow-2xs"
              >
                <div>
                  <div className="text-[10px] text-muted-foreground mb-0.5 font-medium">{idx + 1} · Trending</div>
                  <div className="font-bold text-xs group-hover:text-primary transition-colors">#{t.name}</div>
                </div>
                <div className="text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md font-mono font-medium">
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
