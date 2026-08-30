"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, 
  Sparkles, Heart, Loader2 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FeedVideoPlayerProps {
  id: string;
  src: string;
  activePlayingId: string | null;
  setActivePlayingId: React.Dispatch<React.SetStateAction<string | null>>;
  onOpenReel: () => void;
  onRecordView?: () => void;
  onLike?: () => void;
  hasLiked?: boolean;
  isSharedMuted?: boolean;
  setIsSharedMuted?: (muted: boolean) => void;
  className?: string;
}

// Utility to format video source with the #t=0.001 media fragment
// This forces modern browser decoders to fetch and paint frame 0 immediately instead of displaying a black box
function formatVideoSrc(url: string): string {
  if (!url) return "";
  if (url.includes("#t=")) return url;
  const hashIndex = url.indexOf("#");
  if (hashIndex !== -1) {
    return `${url.substring(0, hashIndex)}#t=0.001`;
  }
  return `${url}#t=0.001`;
}

function formatVideoTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function FeedVideoPlayer({
  id,
  src,
  activePlayingId,
  setActivePlayingId,
  onOpenReel,
  onRecordView,
  onLike,
  hasLiked = false,
  isSharedMuted,
  setIsSharedMuted,
  className = "",
}: FeedVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrubBarRef = useRef<HTMLDivElement | null>(null);

  // States
  const [isLoaded, setIsLoaded] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<string>("16/9"); // Default fluid ratio
  const [isPortrait, setIsPortrait] = useState(false);
  const [localMuted, setLocalMuted] = useState(true);
  const [showCenterIcon, setShowCenterIcon] = useState<"play" | "pause" | null>(null);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [hasRecordedView, setHasRecordedView] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isCurrentlyActive = activePlayingId === id;
  const muted = isSharedMuted !== undefined ? isSharedMuted : localMuted;
  const formattedSrc = formatVideoSrc(src);
  const lastTapRef = useRef<number>(0);
  const centerIconTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync muted state with video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
  }, [muted]);

  // Handle Metadata Loaded
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isFinite(video.duration) && video.duration > 0) {
      setDurationSec(video.duration);
    }

    if (video.videoWidth && video.videoHeight) {
      const ratio = video.videoWidth / video.videoHeight;
      if (ratio < 0.8) {
        // Portrait / 9:16 vertical
        setAspectRatio("9/16");
        setIsPortrait(true);
      } else if (ratio >= 0.8 && ratio <= 1.25) {
        // Square-ish / 4:5
        setAspectRatio("4/5");
        setIsPortrait(false);
      } else {
        // Landscape / 16:9
        setAspectRatio("16/9");
        setIsPortrait(false);
      }
    }

    setIsLoaded(true);
    setIsBuffering(false);
  };

  const handleLoadedData = () => {
    setIsLoaded(true);
    setIsBuffering(false);
  };

  const handleWaiting = () => {
    setIsBuffering(true);
  };

  const handlePlaying = () => {
    setIsBuffering(false);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !isFinite(video.duration) || video.duration <= 0) return;
    setCurrentTimeSec(video.currentTime);
    setProgressPercent((video.currentTime / video.duration) * 100);

    // Record view after 2.5s of playback
    if (video.currentTime >= 2.5 && !hasRecordedView && onRecordView) {
      setHasRecordedView(true);
      onRecordView();
    }
  };

  // Sync playback with active video coordinator
  useEffect(() => {
    const video = videoRef.current;
    if (!video || hasError) return;

    if (isCurrentlyActive) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay blocked by browser policy until user gesture
        });
      }
    } else {
      video.pause();
    }
  }, [isCurrentlyActive, hasError]);

  // Viewport Intersection Observer: Auto-play when 50% in center viewport
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            setActivePlayingId(id);
          } else if (!entry.isIntersecting || entry.intersectionRatio < 0.25) {
            setActivePlayingId((current) => (current === id ? null : current));
            if (videoRef.current) {
              videoRef.current.pause();
            }
          }
        });
      },
      { threshold: [0.25, 0.5, 0.75], rootMargin: "0px 0px -50px 0px" }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [id, setActivePlayingId]);

  // Toggle Mute
  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMuted = !muted;
    if (setIsSharedMuted) {
      setIsSharedMuted(newMuted);
    } else {
      setLocalMuted(newMuted);
    }
    if (videoRef.current) {
      videoRef.current.muted = newMuted;
    }
  };

  // Scrub bar seeking
  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const bar = scrubBarRef.current;
    const video = videoRef.current;
    if (!bar || !video || !isFinite(video.duration) || video.duration <= 0) return;

    const rect = bar.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const fraction = clickX / rect.width;
    const targetTime = fraction * video.duration;

    video.currentTime = targetTime;
    setCurrentTimeSec(targetTime);
    setProgressPercent(fraction * 100);
  };

  // Click / Tap Handling (Single click = play/pause, Double click = like)
  const handleContainerClick = (e: React.MouseEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_THRESHOLD = 280;

    if (now - lastTapRef.current < DOUBLE_TAP_THRESHOLD) {
      // Double Tap -> Like Animation
      if (onLike && !hasLiked) {
        onLike();
      }
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 900);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      setTimeout(() => {
        if (lastTapRef.current === now) {
          // Single Tap -> Play / Pause
          if (isCurrentlyActive) {
            setActivePlayingId(null);
            showCenterFeedback("pause");
          } else {
            setActivePlayingId(id);
            showCenterFeedback("play");
          }
        }
      }, DOUBLE_TAP_THRESHOLD);
    }
  };

  const showCenterFeedback = (type: "play" | "pause") => {
    setShowCenterIcon(type);
    if (centerIconTimeoutRef.current) clearTimeout(centerIconTimeoutRef.current);
    centerIconTimeoutRef.current = setTimeout(() => {
      setShowCenterIcon(null);
    }, 600);
  };

  if (hasError) {
    return (
      <div 
        className="relative rounded-2xl overflow-hidden bg-muted/20 border border-border/50 p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onOpenReel}
      >
        <div className="p-3 rounded-full bg-primary/10 text-primary mb-2">
          <Play className="w-6 h-6 fill-current" />
        </div>
        <span className="text-sm font-semibold text-foreground">Play Video</span>
        <span className="text-xs text-muted-foreground mt-0.5">Click to watch in Saints Reel</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleContainerClick}
      className={`relative rounded-2xl overflow-hidden bg-black/80 group cursor-pointer border border-border/40 select-none shadow-md ${className}`}
      style={{
        maxHeight: isPortrait ? "540px" : "480px",
      }}
    >
      {/* Ambient Blurred Glowing Backdrop */}
      <div 
        className="absolute inset-0 bg-cover bg-center blur-2xl opacity-25 scale-110 pointer-events-none transition-opacity duration-700"
        style={{
          backgroundImage: `url(${src})`,
          backgroundSize: "cover",
        }}
      />

      {/* Shimmer Skeleton Placeholder while first frame is buffering */}
      <div 
        className={`absolute inset-0 bg-gradient-to-r from-muted/20 via-muted/40 to-muted/20 bg-[length:200%_100%] animate-[shimmer_2s_infinite] flex items-center justify-center transition-opacity duration-500 pointer-events-none z-0 ${
          isLoaded ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="flex flex-col items-center gap-2 text-white/60">
          <div className="p-4 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
          <span className="text-xs font-mono font-medium tracking-wide">Loading Clip...</span>
        </div>
      </div>

      {/* Main Video Element */}
      <div className="w-full h-full flex items-center justify-center relative z-10">
        <video
          ref={videoRef}
          src={formattedSrc}
          playsInline
          loop
          muted={muted}
          preload="metadata"
          onLoadedMetadata={handleLoadedMetadata}
          onLoadedData={handleLoadedData}
          onWaiting={handleWaiting}
          onPlaying={handlePlaying}
          onTimeUpdate={handleTimeUpdate}
          onError={() => setHasError(true)}
          className={`w-auto max-w-full object-contain transition-opacity duration-300 ${
            isPortrait ? "max-h-[540px]" : "max-h-[480px]"
          } ${isLoaded ? "opacity-100" : "opacity-0"}`}
        />
      </div>

      {/* Subtle Top Gradient Shadow */}
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      {/* Center Animated Feedback (Play / Pause / Double-Tap Heart) */}
      <AnimatePresence>
        {showCenterIcon && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.3, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
          >
            <div className="p-4 rounded-full bg-black/70 text-white backdrop-blur-md border border-white/20 shadow-2xl">
              {showCenterIcon === "play" ? (
                <Play className="w-8 h-8 fill-white" />
              ) : (
                <Pause className="w-8 h-8 fill-white" />
              )}
            </div>
          </motion.div>
        )}

        {showHeartBurst && (
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: [0.3, 1.4, 1], opacity: [0, 1, 0] }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
          >
            <Heart className="w-24 h-24 text-red-500 fill-red-500 drop-shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Left Badge: Reel Mode indicator */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white/90 text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <Sparkles className="w-3 h-3 text-primary animate-pulse" />
        <span>Saints Clip</span>
      </div>

      {/* Bottom Gradient Shadow for Controls */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none z-20" />

      {/* Interactive Bottom Scrub Progress Bar */}
      <div 
        ref={scrubBarRef}
        onClick={handleScrub}
        className="absolute bottom-0 inset-x-0 h-1.5 hover:h-2.5 bg-white/20 cursor-pointer z-30 transition-all duration-150 group/bar"
      >
        <div 
          className="h-full bg-primary relative transition-all duration-100 ease-linear shadow-[0_0_8px_rgba(var(--primary),0.8)]"
          style={{ width: `${progressPercent}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white opacity-0 group-hover/bar:opacity-100 transition-opacity shadow-sm" />
        </div>
      </div>

      {/* Controls Overlay Bar */}
      <div className={`absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-auto z-20 transition-opacity duration-200 ${
        isHovered || !isCurrentlyActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      }`}>
        {/* Play/Pause Button & Duration */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isCurrentlyActive) {
                setActivePlayingId(null);
                showCenterFeedback("pause");
              } else {
                setActivePlayingId(id);
                showCenterFeedback("play");
              }
            }}
            className="p-2 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/10 hover:scale-105 transition-all shadow-md"
            title={isCurrentlyActive ? "Pause" : "Play"}
          >
            {isCurrentlyActive ? (
              <Pause className="w-3.5 h-3.5 fill-white" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-white" />
            )}
          </button>

          {durationSec > 0 && (
            <span className="text-[11px] font-mono font-medium text-white/90 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-md border border-white/10 shadow-xs">
              {formatVideoTime(currentTimeSec)} / {formatVideoTime(durationSec)}
            </span>
          )}
        </div>

        {/* Mute Toggle & Fullscreen Reel Launcher */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleMute}
            className="p-2 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/10 hover:scale-105 transition-all shadow-md"
            title={muted ? "Unmute (M)" : "Mute (M)"}
          >
            {muted ? (
              <VolumeX className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-green-400" />
            )}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenReel();
            }}
            className="p-2 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/10 hover:scale-105 transition-all shadow-md group/reel"
            title="Open in Fullscreen Reel Mode"
          >
            <Maximize2 className="w-3.5 h-3.5 text-white group-hover/reel:text-primary transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
}
