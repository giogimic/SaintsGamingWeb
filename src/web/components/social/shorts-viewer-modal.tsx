"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { 
  X, Sparkles, Volume2, VolumeX, ChevronUp, ChevronDown, 
  FileArchive, Download, Play, Heart, Crown, BadgeCheck, 
  Music, Plus, MessageSquare, Bookmark, Share, Send, Loader2 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import Hls from "hls.js";
import { prewarmAdjacentFeedMedia } from "@/web/lib/hls-prewarm";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { toast } from "sonner";
import { getPostReplies } from "@/app/actions/social";

interface ShortsViewerModalProps {
  post: any | null;
  posts: any[];
  onClose: () => void;
  onLike?: (postId: string) => void;
  onReply?: (postId: string, text: string) => Promise<void>;
  onBookmark?: (postId: string) => void;
  onShare?: (post: any) => void;
  onSubscribe?: (authorId: string) => void;
  onPostChange?: (post: any) => void;
}

const isArchive = (url: string) => /\.(zip|rar|7z|tar|bz2|gz)$/i.test(url);
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

export function ShortsViewerModal({
  post,
  posts,
  onClose,
  onLike,
  onReply,
  onBookmark,
  onShare,
  onSubscribe,
  onPostChange,
}: ShortsViewerModalProps) {
  const [mounted, setMounted] = useState(false);
  const [currentPost, setCurrentPost] = useState<any>(post);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [isPostingReply, setIsPostingReply] = useState(false);
  const [replies, setReplies] = useState<any[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);

  const [isHoldingFastForward, setIsHoldingFastForward] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const lastTap = useRef<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (post) {
      setCurrentPost(post);
    }
  }, [post]);

  // Initialize HLS adaptive stream or fallback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentPost?.mediaUrl || !isVideo(currentPost.mediaUrl)) return;

    const src = currentPost.mediaUrl;
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
  }, [currentPost?.mediaUrl]);

  // Sync 2x speed on hold
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = isHoldingFastForward ? 2.0 : 1.0;
    }
  }, [isHoldingFastForward]);

  // Load replies when comments drawer opens or post changes
  const loadReplies = useCallback(async (postId: string) => {
    setLoadingReplies(true);
    try {
      const data = await getPostReplies(postId);
      setReplies(data);
    } catch {
      toast.error("Failed to load comments");
    } finally {
      setLoadingReplies(false);
    }
  }, []);

  useEffect(() => {
    if (isCommentsOpen && currentPost?.id) {
      loadReplies(currentPost.id);
    }
  }, [isCommentsOpen, currentPost?.id, loadReplies]);

  // Navigate next/previous
  const navigateShorts = useCallback((direction: number) => {
    if (!currentPost || !posts.length) return;
    const currentIndex = posts.findIndex((p: any) => p.id === currentPost.id);
    if (currentIndex === -1) return;

    const nextIndex = currentIndex + direction;
    if (nextIndex >= 0 && nextIndex < posts.length) {
      const nextPost = posts[nextIndex];
      setCurrentPost(nextPost);
      setIsPlaying(true);
      setCaptionExpanded(false);
      if (onPostChange) {
        onPostChange(nextPost);
      }
    }
  }, [currentPost, posts, onPostChange]);

  // Lock body scroll
  useEffect(() => {
    if (currentPost) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [currentPost]);

  // Keyboard navigation & seeking
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentPost) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        navigateShorts(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        navigateShorts(-1);
      } else if (e.key === "ArrowLeft" || e.key === "j" || e.key === "J") {
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
        }
      } else if (e.key === "ArrowRight" || e.key === "l" || e.key === "L") {
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.currentTime = Math.min(videoRef.current.duration || 9999, videoRef.current.currentTime + 5);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        setIsCommentsOpen(false);
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        setIsMuted(prev => !prev);
      } else if (e.key === " " || e.key === "k" || e.key === "K") {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        if (videoRef.current && document.pictureInPictureEnabled) {
          if (document.pictureInPictureElement) {
            document.exitPictureInPicture().catch(() => {});
          } else {
            videoRef.current.requestPictureInPicture().catch(() => {});
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPost, navigateShorts, onClose]);

  // Handle pointer hold for 2x speed
  const handlePointerDown = () => {
    longPressTimerRef.current = setTimeout(() => {
      setIsHoldingFastForward(true);
    }, 350);
  };

  const handlePointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (isHoldingFastForward) {
      setIsHoldingFastForward(false);
    }
  };

  // Handle single and double tap
  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickXRatio = (e.clientX - rect.left) / rect.width;
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      if (clickXRatio < 0.25 && videoRef.current) {
        // Skip back 5s
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
      } else if (clickXRatio > 0.75 && videoRef.current) {
        // Skip forward 5s
        videoRef.current.currentTime = Math.min(videoRef.current.duration || 9999, videoRef.current.currentTime + 5);
      } else {
        // Double tap center -> Like
        setShowHeartAnimation(true);
        setTimeout(() => setShowHeartAnimation(false), 900);
        if (currentPost && !currentPost.hasLiked && onLike) {
          onLike(currentPost.id);
          setCurrentPost((prev: any) => ({
            ...prev,
            hasLiked: true,
            likesCount: (prev?.likesCount || 0) + 1,
          }));
        }
      }
    } else {
      // Single tap -> Play / Pause
      if (currentPost?.mediaUrl && isVideo(currentPost.mediaUrl) && !isHoldingFastForward) {
        setIsPlaying(prev => !prev);
      }
    }
    lastTap.current = now;
  };

  const handleLikeClick = () => {
    if (!currentPost || !onLike) return;
    onLike(currentPost.id);
    setCurrentPost((prev: any) => ({
      ...prev,
      hasLiked: !prev.hasLiked,
      likesCount: prev.hasLiked ? Math.max(0, (prev.likesCount || 1) - 1) : (prev.likesCount || 0) + 1,
    }));
  };

  const handleBookmarkClick = () => {
    if (!currentPost || !onBookmark) return;
    onBookmark(currentPost.id);
    setCurrentPost((prev: any) => ({
      ...prev,
      hasBookmarked: !prev.hasBookmarked,
    }));
  };

  const handleShareClick = () => {
    if (!currentPost) return;
    if (onShare) {
      onShare(currentPost);
    } else {
      const url = `${window.location.origin}/profile/inbox?post=${currentPost.id}`;
      navigator.clipboard.writeText(url);
      toast.success("Post link copied to clipboard!");
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBody.trim() || isPostingReply || !currentPost) return;

    setIsPostingReply(true);
    try {
      if (onReply) {
        await onReply(currentPost.id, replyBody.trim());
      }
      setReplyBody("");
      setCurrentPost((prev: any) => ({
        ...prev,
        repliesCount: (prev?.repliesCount || 0) + 1,
      }));
      await loadReplies(currentPost.id);
      toast.success("Comment posted!");
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setIsPostingReply(false);
    }
  };

  const currentIndex = currentPost ? posts.findIndex((p: any) => p.id === currentPost.id) : -1;

  // Adjacent video pre-warming
  useEffect(() => {
    if (!currentPost || currentIndex === -1) return;
    const adjacent = [
      posts[currentIndex + 1]?.mediaUrl,
      posts[currentIndex + 2]?.mediaUrl,
      posts[currentIndex - 1]?.mediaUrl,
    ];
    prewarmAdjacentFeedMedia(adjacent);
  }, [currentPost, currentIndex, posts]);

  if (!mounted || !currentPost) return null;

  return createPortal(
    <div 
      className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[999999] bg-black/95 backdrop-blur-2xl flex items-center justify-center select-none overflow-hidden m-0 p-0 animate-in fade-in duration-200"
      onTouchStart={(e) => {
        touchStartY.current = e.touches[0].clientY;
      }}
      onTouchEnd={(e) => {
        if (touchStartY.current === null) return;
        const deltaY = touchStartY.current - e.changedTouches[0].clientY;
        if (deltaY > 35) {
          navigateShorts(1); // Swiped UP -> Next
        } else if (deltaY < -35) {
          navigateShorts(-1); // Swiped DOWN -> Previous
        }
        touchStartY.current = null;
      }}
    >
      {/* Top Bar Controls */}
      <div className="absolute top-4 left-4 z-50 flex items-center gap-3">
        <button 
          onClick={() => { onClose(); setIsCommentsOpen(false); }}
          className="p-2.5 bg-black/70 hover:bg-black/95 border border-white/20 rounded-full text-white backdrop-blur-md transition-all shadow-lg hover:scale-105"
          title="Close (Esc)"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/70 border border-white/20 text-white backdrop-blur-md text-xs font-bold shadow-md">
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          <span>Saints Reel</span>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className="p-2.5 bg-black/70 hover:bg-black/95 border border-white/20 rounded-full text-white backdrop-blur-md transition-all shadow-lg hover:scale-105"
          title={isMuted ? "Unmute (M)" : "Mute (M)"}
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-green-400" />}
        </button>
      </div>

      {/* Up & Down Floating Navigation Chevrons on PC */}
      <div className="absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 hidden md:flex flex-col items-center gap-3 z-40">
        <button 
          onClick={() => navigateShorts(-1)}
          disabled={currentIndex <= 0}
          className="p-3.5 rounded-full bg-black/70 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:scale-110 shadow-xl"
          title="Previous (Scroll Up / ↑)"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
        <span className="text-[10px] font-mono uppercase tracking-widest text-white/50 bg-black/50 px-2 py-0.5 rounded-full">
          Scroll
        </span>
        <button 
          onClick={() => navigateShorts(1)}
          disabled={currentIndex >= posts.length - 1}
          className="p-3.5 rounded-full bg-black/70 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:scale-110 shadow-xl"
          title="Next (Scroll Down / ↓)"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
      </div>

      {/* Main Shorts Container Frame */}
      <div className="w-full max-w-[480px] md:max-w-3xl lg:max-w-4xl xl:max-w-5xl h-[94vh] md:h-[88vh] md:max-h-[920px] relative rounded-3xl overflow-hidden bg-black/90 border border-white/20 shadow-2xl flex items-center justify-center mx-3 sm:mx-6">
        
        {/* Ambient Blurred Glow */}
        {currentPost.mediaUrl && !isArchive(currentPost.mediaUrl) && (
          <div 
            className="absolute inset-0 bg-cover bg-center blur-3xl opacity-35 scale-125 pointer-events-none transition-opacity duration-500"
            style={{ backgroundImage: `url(${currentPost.mediaUrl})` }}
          />
        )}

        {/* Central Media / Content */}
        <div 
          className="w-full h-full relative flex items-center justify-center cursor-pointer select-none"
          onClick={handleTap}
          onMouseDown={handlePointerDown}
          onMouseUp={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchEnd={handlePointerUp}
        >
          {/* 2x Speed Hold Indicator */}
          {isHoldingFastForward && (
            <div className="absolute top-6 inset-x-0 flex justify-center z-40 pointer-events-none animate-in fade-in zoom-in duration-150">
              <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-black/80 text-primary border border-primary/40 backdrop-blur-md shadow-2xl text-xs font-bold font-mono">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>2x Speed</span>
              </div>
            </div>
          )}

          {currentPost.mediaUrl && isVideo(currentPost.mediaUrl) ? (
            <video
              ref={videoRef}
              key={currentPost.id}
              poster={currentPost.thumbnailUrl || undefined}
              autoPlay={isPlaying}
              loop
              playsInline
              muted={isMuted}
              className="max-h-[88vh] md:max-h-[84vh] w-auto max-w-full object-contain mx-auto bg-black rounded-2xl transition-opacity duration-300"
            />
          ) : currentPost.mediaUrl && isArchive(currentPost.mediaUrl) ? (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-card/60 backdrop-blur-md rounded-2xl border border-white/10 m-4">
              <FileArchive className="w-16 h-16 text-primary mb-3" />
              <h3 className="font-bold text-lg text-white mb-1">Archive Attachment</h3>
              <p className="text-xs text-muted-foreground break-all mb-4">{currentPost.mediaUrl.split('/').pop()}</p>
              <a 
                href={currentPost.mediaUrl} 
                download 
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-bold text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="w-4 h-4" /> Download File
              </a>
            </div>
          ) : currentPost.mediaUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              key={currentPost.id}
              src={currentPost.mediaUrl} 
              alt="Shorts media" 
              className="max-h-[88vh] md:max-h-[84vh] w-auto max-w-full object-contain mx-auto rounded-2xl" 
            />
          ) : (
            /* Text-only Post in Shorts View */
            <div className="w-full h-full flex flex-col justify-between p-8 bg-gradient-to-b from-primary/20 via-background/80 to-black text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden relative bg-muted border border-white/20">
                  {currentPost.author?.image ? (
                    <Image src={currentPost.author.image} alt={currentPost.author.username} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-lg">
                      {currentPost.author?.username?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-base flex items-center gap-1.5">
                    {currentPost.author?.username}
                    {currentPost.author?.isFounder && <Crown className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                    {currentPost.author?.isVIP && <BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-500" />}
                  </h4>
                  <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(currentPost.createdAt))} ago</p>
                </div>
              </div>

              <div className="my-auto py-6">
                <p className="text-lg md:text-xl font-medium leading-relaxed drop-shadow-md whitespace-pre-wrap">
                  {currentPost.body}
                </p>
              </div>

              <div className="text-xs text-primary/80 font-bold tracking-widest uppercase flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Saints Post Reel
              </div>
            </div>
          )}

          {/* Play/Pause Center Indicator */}
          {!isPlaying && currentPost.mediaUrl && isVideo(currentPost.mediaUrl) && (
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
                @{currentPost.author?.username}
                {currentPost.author?.isFounder && <Crown className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />}
                {currentPost.author?.isVIP && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />}
              </span>
              <span className="text-[11px] text-white/70">• {formatDistanceToNow(new Date(currentPost.createdAt))} ago</span>
            </div>

            {currentPost.body && (
              <div className="text-xs text-white/90 leading-snug drop-shadow-md mb-2">
                <p className={captionExpanded ? "" : "line-clamp-2"}>
                  {currentPost.body}
                </p>
                {currentPost.body.length > 90 && (
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
            <div className="flex items-center gap-2 text-[11px] text-white/80 mt-1 bg-black/40 px-2.5 py-1 rounded-full w-fit border border-white/10">
              <Music className="w-3 h-3 text-primary animate-spin" style={{ animationDuration: '4s' }} />
              <span className="truncate max-w-[180px]">
                {currentPost.backgroundTrackUrl ? "Background Audio Stem" : `Original Audio - @${currentPost.author?.username}`}
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
                {currentPost.author?.image ? (
                  <Image src={currentPost.author.image} alt={currentPost.author.username} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-white bg-primary/40">
                    {currentPost.author?.username?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {onSubscribe && (
                <button 
                  onClick={() => onSubscribe(currentPost.author?.id)}
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground rounded-full p-0.5 hover:scale-110 transition-transform shadow-md"
                  title="Subscribe"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Like Button */}
            <button 
              onClick={handleLikeClick}
              className="flex flex-col items-center gap-1 text-white hover:scale-110 transition-transform"
            >
              <div className={`p-2.5 rounded-full backdrop-blur-md border border-white/10 shadow-lg ${currentPost.hasLiked ? 'bg-red-500 text-white' : 'bg-black/50 text-white'}`}>
                <Heart className={`w-6 h-6 ${currentPost.hasLiked ? 'fill-current' : ''}`} />
              </div>
              <span className="text-[11px] font-bold drop-shadow-md">{currentPost.likesCount || 0}</span>
            </button>

            {/* Comments Button */}
            <button 
              onClick={() => setIsCommentsOpen(!isCommentsOpen)}
              className="flex flex-col items-center gap-1 text-white hover:scale-110 transition-transform"
            >
              <div className={`p-2.5 rounded-full backdrop-blur-md border border-white/10 shadow-lg ${isCommentsOpen ? 'bg-primary text-primary-foreground' : 'bg-black/50 text-white'}`}>
                <MessageSquare className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold drop-shadow-md">{currentPost.repliesCount || 0}</span>
            </button>

            {/* Bookmark Button */}
            <button 
              onClick={handleBookmarkClick}
              className="flex flex-col items-center gap-1 text-white hover:scale-110 transition-transform"
            >
              <div className={`p-2.5 rounded-full backdrop-blur-md border border-white/10 shadow-lg ${currentPost.hasBookmarked ? 'bg-yellow-500/20 text-yellow-500' : 'bg-black/50 text-white'}`}>
                <Bookmark className={`w-6 h-6 ${currentPost.hasBookmarked ? 'fill-yellow-500 text-yellow-500' : ''}`} />
              </div>
              <span className="text-[11px] font-bold drop-shadow-md">Save</span>
            </button>

            {/* Share Button */}
            <button 
              onClick={handleShareClick}
              className="flex flex-col items-center gap-1 text-white hover:scale-110 transition-transform"
            >
              <div className="p-2.5 rounded-full bg-black/50 text-white backdrop-blur-md border border-white/10 shadow-lg">
                <Share className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold drop-shadow-md">{currentPost.shareCount || 0}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Slide-Over Comments Drawer */}
      {isCommentsOpen && (
        <div 
          className="fixed inset-x-0 bottom-0 md:inset-y-0 md:right-0 md:left-auto w-full md:w-96 bg-background/95 backdrop-blur-2xl border-t md:border-t-0 md:border-l border-border/60 z-50 flex flex-col h-[70vh] md:h-full shadow-2xl animate-in slide-in-from-bottom md:slide-in-from-right duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 border-b border-border/50 flex items-center justify-between">
            <h3 className="font-bold text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" /> Comments ({currentPost.repliesCount || 0})
            </h3>
            <button 
              onClick={() => setIsCommentsOpen(false)}
              className="p-1.5 rounded-full hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loadingReplies ? (
              <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : replies.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-10">No comments yet. Be the first to start the conversation!</p>
            ) : (
              replies.map((reply: any) => (
                <div key={reply.id} className="p-3 bg-muted/20 rounded-xl border border-border/40 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs">{reply.author?.username}</span>
                    <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(reply.createdAt))} ago</span>
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">{reply.body}</p>
                </div>
              ))
            )}
          </div>

          {/* Comment Input */}
          <form onSubmit={handleCommentSubmit} className="p-3 border-t border-border/50 bg-muted/10 flex items-center gap-2">
            <Input 
              placeholder="Add a comment..." 
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              maxLength={1000}
              className="h-9 text-xs rounded-full bg-muted/30"
            />
            <Button 
              type="submit" 
              size="sm" 
              disabled={!replyBody.trim() || isPostingReply}
              className="h-9 rounded-full px-4 text-xs font-bold shrink-0 shadow-sm"
            >
              {isPostingReply ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </Button>
          </form>
        </div>
      )}
    </div>,
    document.body
  );
}
