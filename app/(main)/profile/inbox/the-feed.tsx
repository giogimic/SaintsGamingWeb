"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  getTrendingTags, 
  getSuggestedCreators,
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
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ArrowRight, BarChart2, Pin, Play, Pause, Maximize2, Minimize, UploadCloud,
  BadgeCheck, Crown, ShieldCheck, FileArchive, Download, Music, Disc, Send, Copy, Sparkles, Check, Flame, Users, Clock, PlaySquare,
  Gamepad2, Layers
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
import { captureVideoFrame, uploadVideoPosterFile } from "@/web/lib/video-thumbnail";
import { prewarmAdjacentFeedMedia } from "@/web/lib/hls-prewarm";
import Hls from "hls.js";
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
    return /\.(mp4|webm|mov|ogg|ogv|mkv|m4v|m3u8)$/i.test(cleanPath);
  } catch {
    return /\.(mp4|webm|mov|ogg|ogv|mkv|m4v|m3u8)($|\?|#)/i.test(url);
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

function ShortsVideoStage({
  src,
  poster,
  playing,
  muted,
  autoAdvance = true,
  onEnded,
  onAspectRatioChange,
  onTimeUpdate,
  videoRefCallback,
  className = "",
}: {
  src: string;
  poster?: string | null;
  playing: boolean;
  muted: boolean;
  autoAdvance?: boolean;
  onEnded?: () => void;
  onAspectRatioChange?: (ratio: number) => void;
  onTimeUpdate?: (current: number, duration: number) => void;
  videoRefCallback?: (el: HTMLVideoElement | null) => void;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const setRefs = (el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (videoRefCallback) {
      videoRefCallback(el);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    const isHls = src.includes(".m3u8");

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        startLevel: 0,
        capLevelToPlayerSize: true,
        autoStartLoad: true,
        maxBufferLength: 12,
        maxMaxBufferLength: 24,
        enableWorker: true,
        lowLatencyMode: true,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hlsRef.current = hls;

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              video.src = formatVideoSrc(src);
              break;
          }
        }
      });
    } else if (isHls && video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
    } else {
      video.src = formatVideoSrc(src);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [playing]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
  }, [muted]);

  return (
    <video
      ref={setRefs}
      poster={poster || undefined}
      playsInline
      loop={!autoAdvance}
      muted={muted}
      autoPlay={playing}
      onEnded={() => {
        if (autoAdvance && onEnded) {
          onEnded();
        }
      }}
      onTimeUpdate={(e) => {
        const v = e.currentTarget;
        if (v.duration && onTimeUpdate) {
          onTimeUpdate(v.currentTime, v.duration);
        }
      }}
      onLoadedMetadata={(e) => {
        const v = e.currentTarget;
        if (v.duration && onTimeUpdate) {
          onTimeUpdate(v.currentTime, v.duration);
        }
        if (v.videoWidth && v.videoHeight && onAspectRatioChange) {
          onAspectRatioChange(v.videoWidth / v.videoHeight);
        }
      }}
      className={className}
    />
  );
}

export function TheFeed({ onOpenMessages }: { onOpenMessages?: () => void } = {}) {
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
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("");
  const [isExtractingThumbnail, setIsExtractingThumbnail] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [mainUploadState, setMainUploadState] = useState<UploadProgressState | null>(null);
  const mainUploadCancelRef = useRef<(() => void) | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
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

  // Fullscreen Reel Auto-Advance & Adaptive Desktop Layout State
  const [autoAdvance, setAutoAdvance] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sg_shorts_auto_advance");
      return saved !== null ? saved === "true" : true;
    }
    return true;
  });

  const [isDesktopCommentsOpen, setIsDesktopCommentsOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sg_desktop_comments_open");
      return saved !== null ? saved === "true" : true;
    }
    return true;
  });

  const [textDurationSec, setTextDurationSec] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sg_shorts_text_duration");
      return saved ? parseInt(saved, 10) : 20;
    }
    return 20;
  });

  const [textTimeRemaining, setTextTimeRemaining] = useState<number>(20);
  const [isTextPaused, setIsTextPaused] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [isModalFullscreen, setIsModalFullscreen] = useState(false);
  const [detectedAspectRatio, setDetectedAspectRatio] = useState<"portrait" | "landscape" | "square">("portrait");
  const modalContainerRef = useRef<HTMLDivElement | null>(null);

  // Mobile Auto-Open & Real-time Scrubber States
  const hasAutoOpenedMobileRef = useRef(false);
  const [videoPlayback, setVideoPlayback] = useState<{ current: number; duration: number }>({ current: 0, duration: 0 });
  const activeShortsVideoElRef = useRef<HTMLVideoElement | null>(null);
  const [isMobileComposerExpanded, setIsMobileComposerExpanded] = useState(false);
  const [isMobileSearchExpanded, setIsMobileSearchExpanded] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // === Feed Upgrade State ===
  const [broadenFeed, setBroadenFeed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [mutedKeywords, setMutedKeywords] = useState<MutedKeyword[]>([]);
  const [suggestedCreators, setSuggestedCreators] = useState<any[]>([]);
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

  // Load preferences and suggested creators on mount
  useEffect(() => {
    async function loadPrefs() {
      try {
        const [prefs, muted, creators] = await Promise.all([
          getUserFeedPreferences(),
          getMutedKeywords(),
          getSuggestedCreators()
        ]);
        setBroadenFeed(prefs.broadenFeed);
        setMutedKeywords(muted);
        setSuggestedCreators(creators || []);
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
      setSuggestedCreators(prev => prev.map(c => c.id === creatorId ? { ...c, isSubscribed: true, subscribersCount: (c.subscribersCount || 0) + 1 } : c));
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
        thumbnailUrl: thumbnailUrl || undefined,
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
      setThumbnailUrl("");
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
        
        // If server pipeline returned a clean posterUrl, use it immediately!
        if (data.posterUrl) {
          setThumbnailUrl(data.posterUrl);
        } else if (file.type.startsWith("video/") || isVideo(file.name) || isVideo(data.url)) {
          setIsExtractingThumbnail(true);
          captureVideoFrame(file, 0.5)
            .then(async (frameDataUrl) => {
              try {
                const cleanUrl = await uploadVideoPosterFile(frameDataUrl);
                setThumbnailUrl(cleanUrl);
              } catch {
                setThumbnailUrl(frameDataUrl);
              }
            })
            .catch(() => {})
            .finally(() => {
              setIsExtractingThumbnail(false);
            });
        }

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

  async function handleCustomThumbnailUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsExtractingThumbnail(true);
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload/social", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Thumbnail upload failed");
      const data = await res.json();
      setThumbnailUrl(data.url);
      toast.success("Custom video cover uploaded!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload thumbnail");
    } finally {
      setIsExtractingThumbnail(false);
      e.target.value = "";
    }
  }

  async function handleCaptureFrameAtCurrentTime() {
    if (!mediaUrl || !previewVideoRef.current) return;
    try {
      setIsExtractingThumbnail(true);
      const currentTime = previewVideoRef.current.currentTime || 0.5;
      const dataUrl = await captureVideoFrame(mediaUrl, currentTime);
      try {
        const cleanUrl = await uploadVideoPosterFile(dataUrl);
        setThumbnailUrl(cleanUrl);
      } catch {
        setThumbnailUrl(dataUrl);
      }
      toast.success(`Captured video frame at ${currentTime.toFixed(1)}s!`);
    } catch {
      toast.error("Failed to capture frame from video");
    } finally {
      setIsExtractingThumbnail(false);
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
            <div className="mb-2.5 mt-2">
              {isArchive(post.mediaUrl) ? (
                <div 
                  className="rounded-lg overflow-hidden border border-white/[0.08] bg-[#050b14]/50 p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/[0.04] transition-colors"
                  onClick={() => setViewingShortsPost(post)}
                >
                  <FileArchive className="w-9 h-9 text-primary mb-2" />
                  <span className="text-xs font-semibold text-primary break-all px-4 mb-2">{post.mediaUrl.split('/').pop()}</span>
                  <a 
                    href={post.mediaUrl} 
                    download 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center gap-2 px-3.5 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary rounded-md transition-colors font-bold text-xs shadow-xs" 
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download className="w-3.5 h-3.5" /> Download Archive
                  </a>
                </div>
              ) : isVideo(post.mediaUrl) ? (
                <div className="rounded-lg overflow-hidden border border-white/[0.08] bg-black/40">
                  <FeedVideoPlayer
                    id={post.id}
                    src={post.mediaUrl}
                    poster={post.thumbnailUrl}
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
                </div>
              ) : (
                <div 
                  className="rounded-lg overflow-hidden border border-white/[0.08] bg-black/50 flex items-center justify-center max-h-[520px] relative group/img cursor-pointer shadow-sm"
                  onClick={() => setViewingShortsPost(post)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={post.mediaUrl} 
                    alt="Post attachment" 
                    className="max-h-[520px] w-auto max-w-full object-contain hover:scale-[1.01] transition-transform duration-200" 
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <div className="p-2 rounded-md bg-black/60 text-white backdrop-blur-md shadow-md">
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

  // True OS / Monitor Fullscreen Handler
  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      modalContainerRef.current?.requestFullscreen().catch(() => {});
      setIsModalFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsModalFullscreen(false);
    }
  }, []);

  // Keyboard navigation for Shorts Viewer
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!viewingShortsPost) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === "PageDown" || e.key === "j" || e.key === "J") {
        e.preventDefault();
        navigateShorts(1);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "PageUp" || e.key === "k" || e.key === "K") {
        e.preventDefault();
        navigateShorts(-1);
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        handleToggleFullscreen();
      } else if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        setIsDesktopCommentsOpen(prev => !prev);
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
          setIsModalFullscreen(false);
        } else {
          setViewingShortsPost(null);
          setIsShortsCommentsOpen(false);
        }
      } else if (e.key === "m" || e.key === "M") {
        setIsShortsMuted(prev => !prev);
      } else if (e.key === " ") {
        e.preventDefault();
        setShortsPlaying(prev => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewingShortsPost, navigateShorts, handleToggleFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsModalFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Save Preferences
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sg_shorts_auto_advance", String(autoAdvance));
    }
  }, [autoAdvance]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sg_desktop_comments_open", String(isDesktopCommentsOpen));
    }
  }, [isDesktopCommentsOpen]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sg_shorts_text_duration", String(textDurationSec));
    }
  }, [textDurationSec]);

  // Aspect Ratio & Auto-reply Loading for Desktop Theater View
  useEffect(() => {
    if (!viewingShortsPost) return;

    // Pre-load replies for desktop side dock
    if (viewingShortsPost.id && !loadedReplies[viewingShortsPost.id]) {
      handleLoadReplies(viewingShortsPost.id);
    }

    if (!viewingShortsPost.mediaUrl || isArchive(viewingShortsPost.mediaUrl)) {
      setDetectedAspectRatio("landscape");
      return;
    }

    if (!isVideo(viewingShortsPost.mediaUrl)) {
      const img = new window.Image();
      img.src = viewingShortsPost.mediaUrl;
      img.onload = () => {
        if (img.naturalWidth && img.naturalHeight) {
          setDetectedAspectRatio(img.naturalWidth >= img.naturalHeight * 1.15 ? "landscape" : "portrait");
        }
      };
    }
  }, [viewingShortsPost, loadedReplies, handleLoadReplies]);

  // Auto-advance countdown for Text Posts & Static Images
  useEffect(() => {
    if (!viewingShortsPost) return;
    const isVid = viewingShortsPost.mediaUrl && isVideo(viewingShortsPost.mediaUrl);
    if (isVid) return;

    setTextTimeRemaining(textDurationSec);

    if (!autoAdvance || isTextPaused || isShortsCommentsOpen) return;

    const interval = setInterval(() => {
      setTextTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigateShorts(1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [viewingShortsPost, autoAdvance, textDurationSec, isTextPaused, isShortsCommentsOpen, navigateShorts]);

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

  // Deterministic adjacent video pre-warming in full-screen Shorts mode
  useEffect(() => {
    if (!viewingShortsPost || currentShortsIndex === -1) return;
    const adjacent = [
      displayPosts[currentShortsIndex + 1]?.mediaUrl,
      displayPosts[currentShortsIndex + 2]?.mediaUrl,
      displayPosts[currentShortsIndex - 1]?.mediaUrl,
    ];
    prewarmAdjacentFeedMedia(adjacent);
  }, [viewingShortsPost, currentShortsIndex, displayPosts]);

  // Deterministic adjacent video pre-warming in standard Feed Stream
  useEffect(() => {
    if (!activePlayingVideoId) return;
    const idx = displayPosts.findIndex((p: any) => p.id === activePlayingVideoId);
    if (idx !== -1) {
      prewarmAdjacentFeedMedia([
        displayPosts[idx + 1]?.mediaUrl,
        displayPosts[idx + 2]?.mediaUrl,
      ]);
    }
  }, [activePlayingVideoId, displayPosts]);

  // Scrubber Seeking Handler
  const handleScrubberSeek = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    if (activeShortsVideoElRef.current && videoPlayback.duration > 0) {
      activeShortsVideoElRef.current.currentTime = ratio * videoPlayback.duration;
      setVideoPlayback(prev => ({ ...prev, current: ratio * prev.duration }));
    }
  };

  // Auto-open full view on mobile devices on initial feed load
  useEffect(() => {
    if (typeof window === "undefined" || hasAutoOpenedMobileRef.current) return;
    const isMobile = window.innerWidth < 768;
    if (isMobile && !viewingShortsPost && displayPosts.length > 0) {
      hasAutoOpenedMobileRef.current = true;
      const initial = displayPosts.find((p: any) => p.mediaUrl && isVideo(p.mediaUrl)) || displayPosts[0];
      if (initial) {
        setViewingShortsPost(initial);
        if (initial.id) {
          handleRecordView(initial.id);
        }
      }
    }
  }, [displayPosts, viewingShortsPost, handleRecordView]);

  const handleCloseShorts = () => {
    hasAutoOpenedMobileRef.current = true;
    setViewingShortsPost(null);
    setIsShortsCommentsOpen(false);
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-start justify-center gap-4 relative min-h-screen px-2 sm:px-4">
           {/* Full-Screen Immersive Shorts / Reel Swiper Modal with Deterministic Pre-warming & Adaptive Desktop Theater */}
      {mounted && viewingShortsPost && createPortal(
        <div 
          ref={modalContainerRef}
          className="fixed inset-0 z-[999999] bg-black/95 backdrop-blur-3xl flex items-center justify-center select-none overflow-hidden m-0 p-0 animate-in fade-in duration-200"
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
          {/* Ambient Color-Reactive Backdrop */}
          {viewingShortsPost.mediaUrl && !isArchive(viewingShortsPost.mediaUrl) && (
            <div 
              className="absolute inset-0 bg-cover bg-center blur-3xl opacity-35 scale-125 pointer-events-none transition-opacity duration-700"
              style={{ backgroundImage: `url(${viewingShortsPost.thumbnailUrl || viewingShortsPost.mediaUrl})` }}
            />
          )}

          {/* Top Bar Floating Controls */}
          <div className="absolute top-4 left-4 z-50 flex items-center gap-2.5">
            <button 
              onClick={handleCloseShorts}
              className="p-2.5 bg-black/60 hover:bg-black/90 text-white rounded-full backdrop-blur-md transition-all shadow-lg hover:scale-105"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>

            {onOpenMessages && (
              <button 
                onClick={() => {
                  handleCloseShorts();
                  onOpenMessages();
                }}
                className="p-2.5 bg-black/60 hover:bg-black/90 text-white rounded-full backdrop-blur-md transition-all shadow-lg hover:scale-105"
                title="Direct Messages"
              >
                <MessageSquare className="w-5 h-5 text-primary" />
              </button>
            )}

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 text-white backdrop-blur-md text-xs font-bold shadow-md">
              <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
              <span>Saints Reel</span>
            </div>

            {/* Auto-Advance Toggle Button */}
            <button
              onClick={() => setAutoAdvance(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md transition-all shadow-md ${
                autoAdvance 
                  ? "bg-primary/25 text-primary border border-primary/40 hover:bg-primary/35" 
                  : "bg-black/60 text-white/70 border border-white/10 hover:bg-black/80"
              }`}
              title="Toggle Auto-Play Next Post"
            >
              <PlaySquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Auto-Next:</span>
              <span className="font-bold">{autoAdvance ? "ON" : "OFF"}</span>
            </button>

            {/* Text Post / Image Reading Duration Selector */}
            {(!viewingShortsPost.mediaUrl || !isVideo(viewingShortsPost.mediaUrl)) && (
              <div className="relative">
                <button
                  onClick={() => setShowDurationPicker(prev => !prev)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/15 text-xs font-mono backdrop-blur-md transition-all shadow-md"
                  title="Change duration before next post auto-plays"
                >
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>{autoAdvance ? `${textTimeRemaining}s / ${textDurationSec}s` : `${textDurationSec}s`}</span>
                  <ChevronDown className="w-3 h-3 text-white/60" />
                </button>
                {showDurationPicker && (
                  <div className="absolute top-full mt-1.5 left-0 bg-black/95 border border-white/20 rounded-xl p-1.5 shadow-2xl backdrop-blur-xl z-50 flex flex-col gap-1 min-w-[130px]">
                    <span className="text-[10px] text-white/50 px-2 py-0.5 font-bold uppercase tracking-wider">Auto Duration</span>
                    {[5, 10, 15, 20, 30, 45, 60].map((sec) => (
                      <button
                        key={sec}
                        onClick={() => {
                          setTextDurationSec(sec);
                          setTextTimeRemaining(sec);
                          setShowDurationPicker(false);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs flex items-center justify-between text-left transition-colors ${
                          textDurationSec === sec ? "bg-primary text-primary-foreground font-bold" : "text-white/80 hover:bg-white/10"
                        }`}
                      >
                        <span>{sec} seconds</span>
                        {textDurationSec === sec && <Check className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="absolute top-4 right-4 z-50 flex items-center gap-2.5">
            <button 
              onClick={() => setIsShortsMuted(!isShortsMuted)}
              className="p-2.5 bg-black/60 hover:bg-black/90 text-white rounded-full backdrop-blur-md transition-all shadow-lg hover:scale-105"
              title={isShortsMuted ? "Unmute (M)" : "Mute (M)"}
            >
              {isShortsMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-green-400" />}
            </button>

            {/* Desktop Comments Toggle */}
            <button
              onClick={() => setIsDesktopCommentsOpen(prev => !prev)}
              className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold backdrop-blur-md transition-all shadow-md ${
                isDesktopCommentsOpen
                  ? "bg-primary/25 text-primary border border-primary/40 hover:bg-primary/35"
                  : "bg-black/60 text-white/70 border border-white/10 hover:bg-black/80"
              }`}
              title="Toggle Comments Panel (C)"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden lg:inline">Comments:</span>
              <span className="font-bold">{isDesktopCommentsOpen ? "ON" : "OFF"}</span>
            </button>

            {/* True Monitor Fullscreen Toggle Button */}
            <button 
              onClick={handleToggleFullscreen}
              className="p-2.5 bg-black/60 hover:bg-black/90 text-white rounded-full backdrop-blur-md transition-all shadow-lg hover:scale-105"
              title={isModalFullscreen ? "Exit Fullscreen (F)" : "Full Monitor View (F)"}
            >
              {isModalFullscreen ? <Minimize className="w-5 h-5 text-primary" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>

          {/* Up & Down Floating Navigation Chevrons on PC */}
          <div className="absolute right-4 lg:right-6 top-1/2 -translate-y-1/2 hidden md:flex flex-col items-center gap-3 z-40">
            <button 
              onClick={() => navigateShorts(-1)}
              disabled={currentShortsIndex === 0}
              className="p-3.5 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:scale-110 shadow-xl"
              title="Previous (Scroll Up / ↑)"
            >
              <ChevronUp className="w-6 h-6" />
            </button>
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/50 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-xs">
              Scroll
            </span>
            <button 
              onClick={() => navigateShorts(1)}
              disabled={currentShortsIndex === displayPosts.length - 1}
              className="p-3.5 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:scale-110 shadow-xl"
              title="Next (Scroll Down / ↓)"
            >
              <ChevronDown className="w-6 h-6" />
            </button>
          </div>

          {/* Main Reel Viewport Stage: Full-bleed on Mobile, Dynamic Aspect-Ratio Theater Stage on Desktop */}
          <div 
            className={`w-full h-full relative transition-all duration-300 flex items-center justify-center ${
              detectedAspectRatio === "landscape" || !viewingShortsPost.mediaUrl || isArchive(viewingShortsPost.mediaUrl)
                ? isDesktopCommentsOpen
                  ? "md:w-full md:max-w-5xl lg:max-w-6xl 2xl:max-w-7xl md:h-[88vh] md:max-h-[880px] md:flex-row md:items-stretch md:rounded-3xl overflow-hidden bg-black/95 md:border md:border-white/15 md:shadow-2xl"
                  : "md:w-full md:max-w-6xl lg:max-w-7xl 2xl:max-w-[1550px] md:h-[92vh] md:max-h-[920px] md:flex-row md:items-stretch md:rounded-3xl overflow-hidden bg-black/95 md:border md:border-white/15 md:shadow-2xl"
                : isDesktopCommentsOpen
                  ? "md:w-auto md:min-w-[400px] md:max-w-[460px] md:h-[92vh] md:max-h-[880px] md:rounded-3xl overflow-hidden bg-black md:shadow-2xl"
                  : "md:w-full md:max-w-4xl lg:max-w-5xl md:h-[94vh] md:max-h-[940px] md:rounded-3xl overflow-hidden bg-black md:shadow-2xl"
            }`}
          >
            {/* Story-style Progress Bar for Text Posts & Static Images */}
            {autoAdvance && (!viewingShortsPost.mediaUrl || !isVideo(viewingShortsPost.mediaUrl)) && (
              <div className="absolute top-0 inset-x-0 h-1 bg-white/20 z-40 overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all ease-linear"
                  style={{
                    width: `${Math.max(0, Math.min(100, ((textDurationSec - textTimeRemaining) / textDurationSec) * 100))}%`,
                    transitionDuration: "1000ms"
                  }}
                />
              </div>
            )}
            
            {/* Central Media Content Stage */}
            <div 
              className={`w-full h-full relative flex items-center justify-center cursor-pointer ${
                detectedAspectRatio === "landscape" || !viewingShortsPost.mediaUrl || isArchive(viewingShortsPost.mediaUrl)
                  ? "md:flex-1 bg-black overflow-hidden"
                  : ""
              }`}
              onClick={handleShortsTap}
              onMouseEnter={() => setIsTextPaused(true)}
              onMouseLeave={() => setIsTextPaused(false)}
            >
              {viewingShortsPost.mediaUrl && isVideo(viewingShortsPost.mediaUrl) ? (
                <ShortsVideoStage
                  key={viewingShortsPost.id}
                  src={viewingShortsPost.mediaUrl}
                  poster={viewingShortsPost.thumbnailUrl}
                  playing={shortsPlaying}
                  muted={isShortsMuted}
                  autoAdvance={autoAdvance}
                  onEnded={() => navigateShorts(1)}
                  onAspectRatioChange={(ratio) => setDetectedAspectRatio(ratio >= 1.15 ? "landscape" : "portrait")}
                  onTimeUpdate={(current, duration) => setVideoPlayback({ current, duration })}
                  videoRefCallback={(el) => { activeShortsVideoElRef.current = el; }}
                  className="w-full h-full object-contain mx-auto bg-black transition-opacity duration-300"
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
                  className="w-full h-full object-contain mx-auto shadow-xl" 
                />
              ) : (
                <div className="w-full h-full flex flex-col justify-between p-8 bg-gradient-to-b from-primary/20 via-background/80 to-black text-white">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden relative bg-muted ring-1 ring-white/20">
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
                    <p className="text-lg md:text-2xl font-medium leading-relaxed drop-shadow-md whitespace-pre-wrap">
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
                  <div className="p-5 rounded-full bg-black/70 text-white backdrop-blur-md shadow-2xl">
                    <Play className="w-10 h-10 fill-white" />
                  </div>
                </div>
              )}

              {/* Floating Re-open Comments Button on Desktop when comments are collapsed */}
              {!isDesktopCommentsOpen && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDesktopCommentsOpen(true);
                  }}
                  className="hidden md:flex items-center gap-2 absolute right-4 top-1/2 -translate-y-1/2 px-3.5 py-2.5 bg-black/80 hover:bg-black/95 text-white rounded-2xl backdrop-blur-xl border border-white/20 shadow-2xl hover:scale-105 transition-all z-40 group pointer-events-auto"
                  title="Show Comments Panel (C)"
                >
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold">Comments ({viewingShortsPost.repliesCount || 0})</span>
                  <ChevronLeft className="w-3.5 h-3.5 text-white/60 group-hover:-translate-x-0.5 transition-transform" />
                </button>
              )}

              {/* Blooming Double-Tap Particle Heart Burst */}
              <AnimatePresence>
                {showHeartAnimation && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
                    <motion.div
                      initial={{ scale: 0.2, opacity: 0, rotate: -15 }}
                      animate={{ scale: [0.2, 1.4, 1.1], opacity: [0, 1, 0], y: -40, rotate: 12 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.85, ease: "easeOut" }}
                    >
                      <Heart className="w-28 h-28 text-red-500 fill-red-500 drop-shadow-[0_0_25px_rgba(239,68,68,0.85)]" />
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Mobile / Portrait Bottom Caption & Details (hidden on desktop wide mode) */}
              <div className={`${detectedAspectRatio === "landscape" || !viewingShortsPost.mediaUrl ? "md:hidden" : ""} absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none`} />

              <div className={`${detectedAspectRatio === "landscape" || !viewingShortsPost.mediaUrl ? "md:hidden" : ""} absolute bottom-20 left-3 right-16 z-20 text-white pointer-events-auto`}>
                <div className="flex items-center gap-2 mb-1.5">
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
                    {viewingShortsPost.body.length > 80 && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setCaptionExpanded(!captionExpanded); }}
                        className="text-[11px] font-bold text-primary hover:underline mt-0.5"
                      >
                        {captionExpanded ? "less" : "more"}
                      </button>
                    )}
                  </div>
                )}

                {/* Audio Ticker with Live Equalizer Visualizer */}
                <div className="flex items-center gap-2 text-[11px] text-white/90 mt-1 bg-black/40 px-3 py-1 rounded-full w-fit border border-white/10 backdrop-blur-sm">
                  <div className="flex items-end gap-0.5 h-3 px-0.5 shrink-0">
                    <span className="w-0.5 h-full bg-primary rounded-full animate-[pulse_0.6s_ease-in-out_infinite]" />
                    <span className="w-0.5 h-2 bg-primary rounded-full animate-[pulse_0.8s_ease-in-out_infinite_0.2s]" />
                    <span className="w-0.5 h-3 bg-primary rounded-full animate-[pulse_0.5s_ease-in-out_infinite_0.4s]" />
                  </div>
                  <span className="truncate max-w-[170px]">
                    {viewingShortsPost.backgroundTrackUrl ? "Background Audio Stem" : `Original Audio - @${viewingShortsPost.author?.username}`}
                  </span>
                </div>
              </div>

              {/* Right Side Floating TikTok Action Rail (Mobile / Portrait mode) */}
              <div 
                className={`${detectedAspectRatio === "landscape" || !viewingShortsPost.mediaUrl ? "md:hidden" : ""} absolute right-2.5 bottom-20 flex flex-col items-center gap-3.5 z-30 pointer-events-auto`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Creator Avatar with Follow Button */}
                <div className="relative mb-1">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary bg-muted relative shadow-lg">
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
                    title="Follow Creator"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Like Button */}
                <button 
                  onClick={() => handleLike(viewingShortsPost.id)}
                  className="flex flex-col items-center gap-0.5 text-white hover:scale-110 transition-transform"
                >
                  <div className={`p-2 rounded-full backdrop-blur-md shadow-lg transition-colors ${viewingShortsPost.hasLiked ? 'bg-red-500/20 text-red-500' : 'bg-black/50 text-white'}`}>
                    <Heart className={`w-5 h-5 ${viewingShortsPost.hasLiked ? 'fill-red-500 text-red-500' : ''}`} />
                  </div>
                  <span className="text-[10px] font-bold drop-shadow-md">{viewingShortsPost.likesCount || 0}</span>
                </button>

                {/* Comments Button */}
                <button 
                  onClick={() => {
                    setIsShortsCommentsOpen(!isShortsCommentsOpen);
                    if (!loadedReplies[viewingShortsPost.id]) {
                      handleLoadReplies(viewingShortsPost.id);
                    }
                  }}
                  className="flex flex-col items-center gap-0.5 text-white hover:scale-110 transition-transform"
                >
                  <div className={`p-2 rounded-full backdrop-blur-md shadow-lg transition-colors ${isShortsCommentsOpen ? 'bg-primary text-primary-foreground' : 'bg-black/50 text-white'}`}>
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold drop-shadow-md">{viewingShortsPost.repliesCount || 0}</span>
                </button>

                {/* Bookmark Button */}
                <button 
                  onClick={() => handleBookmark(viewingShortsPost.id)}
                  className="flex flex-col items-center gap-0.5 text-white hover:scale-110 transition-transform"
                >
                  <div className={`p-2 rounded-full backdrop-blur-md shadow-lg transition-colors ${viewingShortsPost.hasBookmarked ? 'bg-yellow-500/20 text-yellow-500' : 'bg-black/50 text-white'}`}>
                    <Bookmark className={`w-5 h-5 ${viewingShortsPost.hasBookmarked ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                  </div>
                  <span className="text-[10px] font-bold drop-shadow-md">Save</span>
                </button>

                {/* Share Button */}
                <button 
                  onClick={() => handleShare(viewingShortsPost)}
                  className="flex flex-col items-center gap-0.5 text-white hover:scale-110 transition-transform"
                >
                  <div className="p-2 rounded-full bg-black/50 text-white backdrop-blur-md shadow-lg">
                    <Share className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold drop-shadow-md">{viewingShortsPost.shareCount || 0}</span>
                </button>
              </div>

              {/* Dedicated Mobile Bottom HUD Bar (TikTok / YouTube Shorts / Reels inspired) */}
              <div 
                className={`${detectedAspectRatio === "landscape" || !viewingShortsPost.mediaUrl ? "md:hidden" : ""} absolute inset-x-0 bottom-0 z-30 flex flex-col bg-gradient-to-t from-black via-black/90 to-transparent pt-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] px-3 pointer-events-auto`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Real-time Video Playback Scrubber Bar */}
                {viewingShortsPost.mediaUrl && isVideo(viewingShortsPost.mediaUrl) && videoPlayback.duration > 0 && (
                  <div 
                    className="w-full py-2 cursor-pointer group flex items-center"
                    onClick={handleScrubberSeek}
                    onTouchMove={handleScrubberSeek}
                  >
                    <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden relative group-hover:h-1.5 transition-all">
                      <div 
                        className="h-full bg-primary relative rounded-full"
                        style={{ width: `${Math.max(0, Math.min(100, (videoPlayback.current / videoPlayback.duration) * 100))}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* HUD Bottom Bar Controls Dock */}
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  {/* Stream Tabs Switcher */}
                  <div className="flex items-center bg-black/60 border border-white/15 rounded-full p-0.5 backdrop-blur-xl">
                    {(["for-you", "following", "clips"] as FeedTabType[]).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => {
                          setFeedTab(tab);
                          const filtered = tab === "clips" 
                            ? posts.filter((p: any) => p.mediaUrl && isVideo(p.mediaUrl))
                            : tab === "following"
                            ? posts.filter((p: any) => p.isFollowing)
                            : posts;
                          if (filtered.length > 0) {
                            setViewingShortsPost(filtered[0]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize transition-all ${
                          feedTab === tab 
                            ? "bg-primary text-primary-foreground shadow-sm" 
                            : "text-white/60 hover:text-white"
                        }`}
                      >
                        {tab === "for-you" ? "For You" : tab === "following" ? "Following" : "Clips"}
                      </button>
                    ))}
                  </div>

                  {/* Quick Add Comment Trigger */}
                  <button
                    onClick={() => {
                      setIsShortsCommentsOpen(true);
                      if (!loadedReplies[viewingShortsPost.id]) {
                        handleLoadReplies(viewingShortsPost.id);
                      }
                    }}
                    className="flex-1 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-white/70 text-xs backdrop-blur-xl transition-colors"
                  >
                    <Smile className="w-3.5 h-3.5 text-white/50 shrink-0" />
                    <span className="truncate text-[11px]">Add comment...</span>
                  </button>

                  {/* Messages Button */}
                  {onOpenMessages && (
                    <button
                      onClick={() => {
                        handleCloseShorts();
                        onOpenMessages();
                      }}
                      className="p-1.5 rounded-full bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary backdrop-blur-xl transition-all shadow-md shrink-0"
                      title="Direct Messages"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  )}

                  {/* Exit to Stream View Button */}
                  <button
                    onClick={handleCloseShorts}
                    className="p-1.5 rounded-full bg-black/60 hover:bg-black/90 border border-white/15 text-white/80 hover:text-white backdrop-blur-xl transition-all shadow-md shrink-0"
                    title="Exit Fullscreen"
                  >
                    <Compass className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Desktop Dedicated Social & Comments Dock (Rendered on md: and above when wide mode and comments open) */}
            {(detectedAspectRatio === "landscape" || !viewingShortsPost.mediaUrl || isArchive(viewingShortsPost.mediaUrl)) && isDesktopCommentsOpen && (
              <div 
                className="hidden md:flex md:w-[380px] lg:w-[420px] 2xl:w-[460px] flex-col border-l border-white/10 bg-card/85 backdrop-blur-2xl text-white select-text animate-in fade-in slide-in-from-right-4 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Author Info Header */}
                <div className="p-4 border-b border-border/40 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-primary/50 bg-muted relative shrink-0">
                      {viewingShortsPost.author?.image ? (
                        <Image src={viewingShortsPost.author.image} alt={viewingShortsPost.author.username} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-sm bg-primary/30">
                          {viewingShortsPost.author?.username?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm flex items-center gap-1">
                        @{viewingShortsPost.author?.username}
                        {viewingShortsPost.author?.isFounder && <Crown className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />}
                        {viewingShortsPost.author?.isVIP && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />}
                      </h4>
                      <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(viewingShortsPost.createdAt))} ago</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSubscribe(viewingShortsPost.author?.id)}
                      className="h-8 text-xs font-bold rounded-full border-primary/40 hover:bg-primary/20"
                    >
                      Follow
                    </Button>
                    <button
                      onClick={() => setIsDesktopCommentsOpen(false)}
                      className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                      title="Hide comments (C)"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Post Body Caption */}
                {viewingShortsPost.body && (
                  <div className="p-4 border-b border-border/30 max-h-36 overflow-y-auto text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {renderBody(viewingShortsPost.body)}
                  </div>
                )}

                {/* Interaction Action Buttons Bar */}
                <div className="px-4 py-2.5 border-b border-border/40 flex items-center justify-around bg-muted/10 text-xs">
                  <button 
                    onClick={() => handleLike(viewingShortsPost.id)}
                    className="flex items-center gap-1.5 text-white/80 hover:text-red-400 transition-colors"
                  >
                    <Heart className={`w-4 h-4 ${viewingShortsPost.hasLiked ? 'fill-red-500 text-red-500' : ''}`} />
                    <span className="font-semibold">{viewingShortsPost.likesCount || 0}</span>
                  </button>
                  <button 
                    onClick={() => handleBookmark(viewingShortsPost.id)}
                    className="flex items-center gap-1.5 text-white/80 hover:text-yellow-400 transition-colors"
                  >
                    <Bookmark className={`w-4 h-4 ${viewingShortsPost.hasBookmarked ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                    <span>Save</span>
                  </button>
                  <button 
                    onClick={() => handleShare(viewingShortsPost)}
                    className="flex items-center gap-1.5 text-white/80 hover:text-primary transition-colors"
                  >
                    <Share className="w-4 h-4" />
                    <span>{viewingShortsPost.shareCount || 0}</span>
                  </button>
                </div>

                {/* Desktop Comments Section Header */}
                <div className="px-4 py-2 bg-muted/20 border-b border-border/30 flex items-center justify-between text-xs text-muted-foreground font-semibold">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-primary" /> Comments ({viewingShortsPost.repliesCount || 0})
                  </span>
                </div>

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 shorts-comments-scroll">
                  {loadingReplies[viewingShortsPost.id] ? (
                    <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                  ) : !loadedReplies[viewingShortsPost.id] || loadedReplies[viewingShortsPost.id].length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground py-10">No comments yet. Start the discussion!</p>
                  ) : (
                    loadedReplies[viewingShortsPost.id].map((reply: any) => (
                      <div key={reply.id} className="p-2.5 bg-muted/30 rounded-xl border border-border/40 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-foreground/90">@{reply.author?.username}</span>
                          <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(reply.createdAt))} ago</span>
                        </div>
                        <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">{renderBody(reply.body)}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Comment Input Box */}
                <form onSubmit={(e) => handleReply(e, viewingShortsPost.id)} className="p-3 border-t border-border/50 bg-background/50 flex items-center gap-2">
                  <Input 
                    placeholder="Write a comment..." 
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    maxLength={1000}
                    className="h-9 text-xs rounded-full bg-muted/40"
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
          </div>

          {/* Slide-Over Comments Drawer for Mobile / Portrait Mode */}
          {isShortsCommentsOpen && (
            <div 
              className="fixed inset-x-0 bottom-0 md:inset-y-0 md:right-0 md:left-auto w-full md:w-96 bg-background/95 backdrop-blur-2xl border-t md:border-t-0 md:border-l border-border/60 z-50 flex flex-col h-[70vh] md:h-full shadow-2xl animate-in slide-in-from-bottom md:slide-in-from-right duration-300 select-text"
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

      {/* Left Column: Pinned Game Hubs & Channels (Desktop) */}
      <div className="w-56 xl:w-60 hidden lg:flex flex-col gap-3 sticky top-20 h-fit max-h-[calc(100vh-6rem)] overflow-y-auto shrink-0 no-scrollbar">
        <div className="bg-[#050b14]/40 border border-white/[0.08] rounded-lg p-3 shadow-xs space-y-1 backdrop-blur-xl">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 flex items-center justify-between">
            <span>Game Hubs</span>
            <Sparkles className="w-3 h-3 text-primary" />
          </div>
          <button
            type="button"
            onClick={() => { setFilter(null); setFeedTab("for-you"); }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              !filter && feedTab === "for-you"
                ? "bg-primary/20 text-primary border border-primary/30 font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border border-transparent"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>All Activity</span>
          </button>
          <button
            type="button"
            onClick={() => { setFilter("mmo"); setFeedTab("for-you"); }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              filter === "mmo"
                ? "bg-primary/20 text-primary border border-primary/30 font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border border-transparent"
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Saints MMO</span>
          </button>
          <button
            type="button"
            onClick={() => { setFilter("fivem"); setFeedTab("for-you"); }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              filter === "fivem"
                ? "bg-primary/20 text-primary border border-primary/30 font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border border-transparent"
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>FiveM Moments</span>
          </button>
          <button
            type="button"
            onClick={() => { setFilter("minecraft"); setFeedTab("for-you"); }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              filter === "minecraft"
                ? "bg-primary/20 text-primary border border-primary/30 font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border border-transparent"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Minecraft Modpacks</span>
          </button>
          <button
            type="button"
            onClick={() => { setFeedTab("clips"); setFilter(null); }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              feedTab === "clips"
                ? "bg-primary/20 text-primary border border-primary/30 font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border border-transparent"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>Clips & Reels</span>
          </button>
          <button
            type="button"
            onClick={() => { setFilter("hangout"); setFeedTab("for-you"); }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              filter === "hangout"
                ? "bg-primary/20 text-primary border border-primary/30 font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border border-transparent"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-violet-400" />
            <span>Community Hangout</span>
          </button>
        </div>
      </div>

      {/* Main Feed Column */}
      <div className="flex-1 w-full max-w-2xl 2xl:max-w-3xl min-w-0 space-y-3">
        
        {/* Stream Header & Navigation Tabs */}
        <div className="p-3 sm:p-3.5 border border-white/[0.08] rounded-lg sticky top-20 bg-[#050b14]/70 backdrop-blur-xl z-10 shadow-xs">
          
          {/* Mobile Top Navigation Tabs: Feed vs Messages */}
          {onOpenMessages && (
            <div className="lg:hidden flex items-center p-1 bg-muted/40 rounded-xl border border-border/40 mb-2.5 gap-1">
              <button
                className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground shadow-sm flex items-center justify-center gap-1.5 transition-all"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>The Feed</span>
              </button>
              <button
                onClick={onOpenMessages}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center gap-1.5 transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5 text-primary" />
                <span>Messages</span>
              </button>
            </div>
          )}

          {/* Top Bar: Title & Search Controls */}
          <div className="flex justify-between items-center mb-2.5 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-lg sm:text-2xl tracking-tight sg-text-gradient">
                {filter ? `#${filter}` : "The Feed"}
              </h2>
              {filter && (
                <Button variant="ghost" size="sm" className="h-6 text-[11px] rounded-full px-2" onClick={() => setFilter(null)}>
                  Clear
                </Button>
              )}
            </div>

            {/* Quick Search & Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-1 max-w-md justify-end">
              {/* Primary Create Post Button (PC & Mobile) */}
              {session?.user && (
                <Button
                  type="button"
                  onClick={() => {
                    setIsMobileComposerExpanded(true);
                    setTimeout(() => {
                      const ta = document.querySelector('textarea[placeholder*="What\'s happening"]') as HTMLTextAreaElement;
                      if (ta) {
                        ta.focus();
                        ta.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }, 50);
                  }}
                  size="sm"
                  className="h-8 px-3 rounded-full bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 shadow-sm hover:opacity-90 transition-all shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Post</span>
                </Button>
              )}

              {/* Desktop Search Bar */}
              <form onSubmit={handleSearch} className="hidden sm:flex flex-1 max-w-xs items-center gap-1.5">
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

              {/* Mobile Search Toggle Icon */}
              <button
                onClick={() => setIsMobileSearchExpanded(prev => !prev)}
                className={`sm:hidden p-2 rounded-full border transition-colors ${
                  isMobileSearchExpanded || searchQuery 
                    ? "bg-primary/20 text-primary border-primary/40" 
                    : "bg-muted/30 text-muted-foreground border-border/50"
                }`}
                title="Search"
              >
                <Search className="w-3.5 h-3.5" />
              </button>

              {/* Broaden Discovery Toggle */}
              <button
                onClick={handleBroadenToggle}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold transition-all border shrink-0 ${
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

          {/* Mobile Expanded Search Bar */}
          {isMobileSearchExpanded && (
            <form onSubmit={handleSearch} className="sm:hidden mb-2.5 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search feed..."
                  className="h-8 pl-8 pr-8 text-xs bg-muted/30 border-border/50 rounded-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
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
          )}

          {/* Stream Selector Navigation Tabs */}
          <div className="flex items-center gap-1.5 sm:gap-2 pt-1 border-t border-border/40 overflow-x-auto no-scrollbar">
            <button
              onClick={() => { setFeedTab("for-you"); setFilter(null); }}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all relative shrink-0 ${
                feedTab === "for-you" && !filter
                  ? "text-primary bg-primary/10 border border-primary/30 shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30 border border-transparent"
              }`}
            >
              For You
            </button>
            <button
              onClick={() => { setFeedTab("clips"); setFilter(null); }}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all relative shrink-0 flex items-center gap-1.5 ${
                feedTab === "clips"
                  ? "text-primary bg-primary/10 border border-primary/30 shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30 border border-transparent"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
              <span>Clips & Reels</span>
            </button>
            <button
              onClick={() => { setFeedTab("trending"); }}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all relative shrink-0 flex items-center gap-1.5 ${
                feedTab === "trending"
                  ? "text-primary bg-primary/10 border border-primary/30 shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30 border border-transparent"
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>Hot & Trending</span>
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

        {/* Collapsed Mobile Post Composer Trigger (Saves vertical space on mobile) */}
        {searchResults === null && !isMobileComposerExpanded && !body && !mediaUrl && (
          <div className="sm:hidden p-2.5 bg-[#050b14]/50 backdrop-blur-xl border border-white/[0.08] rounded-lg flex items-center gap-2.5 shadow-xs">
            <div className="w-8 h-8 rounded-md bg-muted overflow-hidden relative shrink-0 ring-1 ring-border/60">
              {session?.user?.image ? (
                <Image src={session.user.image} alt={session.user.name || "You"} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-muted-foreground bg-muted text-xs">
                  {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsMobileComposerExpanded(true)}
              className="flex-1 text-left px-3 py-1.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-xs text-muted-foreground hover:text-foreground transition-colors truncate cursor-pointer"
            >
              What&apos;s happening in Saints Gaming?
            </button>
            <button
              type="button"
              onClick={() => setIsMobileComposerExpanded(true)}
              className="p-1.5 rounded-md text-primary hover:bg-primary/10 transition-colors shrink-0 cursor-pointer"
              title="Create Post / Upload Media"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Integrated Full Post Composer (Always visible on desktop, expandable on mobile) */}
        {searchResults === null && (
          <Card 
            className={`bg-[#050b14]/40 backdrop-blur-xl shadow-xs border-white/[0.08] rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-primary/40 transition-all relative ${
              isDragging ? "ring-2 ring-primary border-primary bg-primary/5" : ""
            } ${!isMobileComposerExpanded && !body && !mediaUrl ? "hidden sm:block" : "block"}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Mobile Close / Collapse Header */}
            {isMobileComposerExpanded && !body && !mediaUrl && (
              <div className="sm:hidden flex items-center justify-between px-3.5 py-1.5 border-b border-white/[0.06] bg-white/[0.02] text-xs text-muted-foreground">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Create New Post
                </span>
                <button
                  type="button"
                  onClick={() => setIsMobileComposerExpanded(false)}
                  className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Collapse"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
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

                {/* Attached Media Preview with Zero Black Box & Thumbnail Generator */}
                {mediaUrl && !mainUploadState && (
                  <div className="mx-4 mb-3 space-y-2">
                    <div className="relative rounded-2xl overflow-hidden border border-border/50 bg-black/40 flex items-center justify-center max-h-[320px]">
                      <Button 
                        type="button" 
                        variant="destructive" 
                        size="icon" 
                        className="absolute top-2 right-2 w-7 h-7 rounded-full z-10 shadow-md"
                        onClick={() => {
                          setMediaUrl("");
                          setThumbnailUrl("");
                        }}
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
                        <video 
                          ref={previewVideoRef}
                          src={formatVideoSrc(mediaUrl)} 
                          poster={thumbnailUrl || undefined}
                          controls 
                          playsInline
                          preload="metadata"
                          className="max-h-[320px] w-auto max-w-full rounded-xl" 
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mediaUrl} alt="Upload preview" className="max-h-[320px] w-auto max-w-full object-contain rounded-xl" />
                      )}
                    </div>

                    {/* Video Cover / Thumbnail Selector */}
                    {isVideo(mediaUrl) && (
                      <div className="p-3 bg-muted/20 border border-border/50 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5">
                          {thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={thumbnailUrl} 
                              alt="Thumbnail cover" 
                              className="w-16 h-10 rounded-lg object-cover border border-primary/40 shadow-xs shrink-0" 
                            />
                          ) : (
                            <div className="w-16 h-10 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-[10px] text-muted-foreground shrink-0">
                              No Cover
                            </div>
                          )}
                          <div>
                            <span className="font-bold flex items-center gap-1 text-foreground">
                              <Sparkles className="w-3 h-3 text-primary" /> Video Poster / Cover
                            </span>
                            <p className="text-[11px] text-muted-foreground">
                              {thumbnailUrl ? "Default frame captured (instant preview)" : "No cover set"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleCaptureFrameAtCurrentTime}
                            disabled={isExtractingThumbnail}
                            className="px-2.5 py-1 bg-muted/50 hover:bg-muted text-foreground border border-border/60 rounded-lg font-medium transition-colors flex items-center gap-1 text-[11px]"
                            title="Scrub video to desired time and click to capture"
                          >
                            {isExtractingThumbnail ? <Loader2 className="w-3 h-3 animate-spin text-primary" /> : <Sparkles className="w-3 h-3 text-primary" />}
                            Capture Frame
                          </button>

                          <div>
                            <input
                              type="file"
                              id="custom-thumbnail-upload"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={handleCustomThumbnailUpload}
                              disabled={isExtractingThumbnail}
                            />
                            <label
                              htmlFor="custom-thumbnail-upload"
                              className="px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg font-medium cursor-pointer transition-colors inline-flex items-center gap-1 text-[11px]"
                            >
                              <ImageIcon className="w-3 h-3" />
                              Custom Cover
                            </label>
                          </div>

                          {thumbnailUrl && (
                            <button
                              type="button"
                              onClick={() => setThumbnailUrl("")}
                              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                              title="Clear Cover"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
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

                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className={`text-[11px] sm:text-xs font-mono ${body.length > 900 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                      {body.length} / 1000
                    </span>
                    {/* Mobile Collapse Button */}
                    <button
                      type="button"
                      onClick={() => setIsMobileComposerExpanded(false)}
                      className="sm:hidden text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded"
                    >
                      Cancel
                    </button>
                    <Button type="submit" disabled={(!body.trim() && !mediaUrl) || isPosting || isUploading || body.length > 1000} className="rounded-full px-5 sm:px-6 font-bold shadow-md h-8 sm:h-9 text-xs">
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
          <div className="space-y-3 pb-20">
            {/* Unified Stream Container with Hairline Dividers */}
            <div className="bg-[#050b14]/40 backdrop-blur-xl border border-white/[0.08] rounded-lg shadow-xs overflow-hidden divide-y divide-white/[0.06]">
              {displayPosts.map(post => renderPost(post))}
            </div>
            
            {/* Infinite Scroll Sentinel */}
            {searchResults === null && (
              <div ref={sentinelRef} className="py-6 flex flex-col items-center justify-center min-h-[60px] text-muted-foreground">
                {isFetchingMore && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    <span>Streaming more posts...</span>
                  </div>
                )}
                {!hasMore && displayPosts.length > 0 && (
                  <div className="text-center py-3">
                    <div className="w-8 h-0.5 bg-white/20 rounded-full mx-auto mb-2" />
                    <p className="text-[10px] text-muted-foreground/80 font-bold uppercase tracking-widest">
                      You&apos;re all caught up
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Desktop Community Hub Sidebar */}
      <div className="w-72 xl:w-80 hidden xl:flex flex-col gap-3 sticky top-20 h-fit max-h-[calc(100vh-6rem)] overflow-y-auto shrink-0 no-scrollbar">
        
        {/* Card 1: Trending Topics */}
        <div className="bg-[#050b14]/40 border border-white/[0.08] rounded-lg p-3 shadow-xs space-y-2.5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-xs flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>Trending Topics</span>
            </h3>
            <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Saints</span>
          </div>
          <div className="space-y-1">
            {trending.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 text-center">No trends yet.</p>
            ) : (
              trending.slice(0, 5).map((t, idx) => (
                <button 
                  key={t.name}
                  type="button"
                  onClick={() => {
                    setFilter(t.name);
                    setFeedTab("for-you");
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-md bg-white/[0.03] border border-white/[0.04] hover:border-primary/40 hover:bg-white/[0.06] transition-all text-left group cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-[9px] text-muted-foreground font-medium">#{idx + 1} Trending</div>
                    <div className="font-bold text-xs group-hover:text-primary transition-colors truncate">#{t.name}</div>
                  </div>
                  <div className="text-[10px] text-muted-foreground bg-white/[0.06] px-1.5 py-0.5 rounded font-mono font-medium shrink-0">
                    {t.usageCount}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Card 2: Saints Community Hub */}
        <div className="bg-gradient-to-br from-[#050b14]/60 via-[#050b14]/40 to-primary/10 border border-white/[0.08] rounded-lg p-3 shadow-xs space-y-2 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-primary/10 text-primary">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-foreground">Saints Gaming</h4>
              <p className="text-[9px] text-muted-foreground italic">&ldquo;Time To Play&rdquo;</p>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Hang out, share epic clips, and jump into community game realms together.
          </p>
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <Link
              href="/forum"
              className="px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-center border border-white/[0.06] hover:border-primary/40 transition-all"
            >
              Forum
            </Link>
            <Link
              href="/lobby"
              className="px-2.5 py-1 rounded-md bg-primary/15 hover:bg-primary/25 text-xs font-bold text-primary text-center border border-primary/30 transition-all flex items-center justify-center gap-1"
            >
              <span>MMO</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 3: Active Saints Creators */}
        {suggestedCreators && suggestedCreators.length > 0 && (
          <div className="bg-[#050b14]/40 border border-white/[0.08] rounded-lg p-3 shadow-xs space-y-2.5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-xs flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                <span>Active Saints</span>
              </h3>
              <span className="text-[10px] uppercase font-bold text-primary tracking-wider">Creators</span>
            </div>
            <div className="space-y-2">
              {suggestedCreators.map(creator => (
                <div key={creator.id} className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-background/30 border border-border/30 hover:border-border/60 transition-all">
                  <Link href={`/user/${creator.username}`} className="flex items-center gap-2.5 min-w-0 group/creator">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-muted relative shrink-0 border border-border/50">
                      {creator.image ? (
                        <Image src={creator.image} alt={creator.username} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white bg-primary/30">
                          {creator.username?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-foreground group-hover/creator:text-primary transition-colors truncate flex items-center gap-1">
                        @{creator.username}
                        {creator.isFounder && <Crown className="w-3 h-3 text-yellow-500 fill-yellow-500 shrink-0" />}
                        {creator.isVIP && <BadgeCheck className="w-3 h-3 text-blue-500 fill-blue-500 shrink-0" />}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {creator.postsCount} clip{creator.postsCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </Link>

                  <Button
                    size="sm"
                    variant={creator.isSubscribed ? "secondary" : "outline"}
                    onClick={() => handleSubscribe(creator.id)}
                    className={`h-7 px-3 text-[11px] font-bold rounded-full transition-all shrink-0 ${
                      creator.isSubscribed 
                        ? "bg-primary/15 text-primary border-primary/30" 
                        : "border-primary/40 hover:bg-primary hover:text-primary-foreground"
                    }`}
                  >
                    {creator.isSubscribed ? "Following" : "Follow"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Card 3: Saints Gaming Community Hub Widget */}
        <div className="bg-gradient-to-br from-card/70 via-card/50 to-primary/5 border border-primary/20 rounded-2xl p-4 shadow-sm space-y-3 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-foreground">Saints Gaming</h4>
              <p className="text-[10px] text-muted-foreground italic">&ldquo;Time To Play&rdquo;</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Hang out, share epic gameplay clips, chat with friends, and jump into community game realms together.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Link
              href="/forum"
              className="px-3 py-1.5 rounded-xl bg-background/60 hover:bg-muted text-xs font-semibold text-center border border-border/40 hover:border-primary/40 transition-all"
            >
              Forum
            </Link>
            <Link
              href="/lobby"
              className="px-3 py-1.5 rounded-xl bg-primary/15 hover:bg-primary/25 text-xs font-bold text-primary text-center border border-primary/30 transition-all flex items-center justify-center gap-1"
            >
              <span>MMO Lobby</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

      </div>

      {/* Mobile Floating Action Button (FAB) for Instant Post / Clip Creation */}
      {session?.user && (
        <button
          type="button"
          onClick={() => {
            setIsMobileComposerExpanded(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
            setTimeout(() => {
              const composerTextarea = document.querySelector('textarea[placeholder*="What\'s happening"]') as HTMLTextAreaElement;
              composerTextarea?.focus();
            }, 300);
          }}
          className="sm:hidden fixed bottom-14 right-4 z-40 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center border border-primary-foreground/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          title="Create New Post / Upload Media"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      )}

    </div>
  );
}
