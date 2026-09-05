"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Play, Pause, Volume2, VolumeX, Volume1, Maximize2, 
  Sparkles, Heart, Loader2, FastForward, RotateCcw, RotateCw,
  PictureInPicture, Gauge, Eye, EyeOff
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";
import Hls from "hls.js";
import { captureVideoFrame, getCachedVideoPoster } from "@/web/lib/video-thumbnail";
import { useAppStore } from "@/shared/store/useAppStore";

interface FeedVideoPlayerProps {
  id: string;
  src: string;
  poster?: string | null;
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

const PLAYBACK_RATES = [1.0, 1.25, 1.5, 2.0];

export function FeedVideoPlayer({
  id,
  src,
  poster,
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

  // Core Playback States
  const [isLoaded, setIsLoaded] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<string>("16/9");
  const [isPortrait, setIsPortrait] = useState(false);

  // Volume & Speed States
  const [localMuted, setLocalMuted] = useState(true);
  const [volume, setVolume] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("saints_feed_volume");
      return saved !== null ? parseFloat(saved) : 0.8;
    }
    return 0.8;
  });
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isHoldingFastForward, setIsHoldingFastForward] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // Interactive Animations & Scrub Tooltip
  const [showCenterIcon, setShowCenterIcon] = useState<"play" | "pause" | null>(null);
  const [skipFeedback, setSkipFeedback] = useState<"-5s" | "+5s" | null>(null);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [hasRecordedView, setHasRecordedView] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [scrubHoverTime, setScrubHoverTime] = useState<number | null>(null);
  const [scrubHoverLeft, setScrubHoverLeft] = useState<number>(0);
  const [extractedPoster, setExtractedPoster] = useState<string | null>(() => {
    return poster || getCachedVideoPoster(src) || null;
  });
  const [posterError, setPosterError] = useState(false);

  const isBarsHidden = useAppStore((s) => s.isBarsHidden);
  const isCurrentlyActive = activePlayingId === id;
  const muted = isSharedMuted !== undefined ? isSharedMuted : localMuted;
  const formattedSrc = formatVideoSrc(src);
  const rawPoster = poster || extractedPoster;
  const displayPoster = (!posterError && rawPoster) ? rawPoster : null;
  const lastTapRef = useRef<number>(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const centerIconTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);


  const hlsRef = useRef<Hls | null>(null);

  // Initialize HLS adaptive stream or fallback to native MP4 / Safari HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    const isHls = src.includes(".m3u8");

    // Clean up previous HLS instance if any
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        startLevel: 0, // Start on lowest rendition (360p) for instant <100ms time-to-first-frame
        capLevelToPlayerSize: true, // Don't download 1080p if rendered small in feed
        autoStartLoad: true,
        maxBufferLength: 10,
        maxMaxBufferLength: 20,
        enableWorker: true,
        lowLatencyMode: true,
      });

      hls.loadSource(src);
      hls.attachMedia(video);
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoaded(true);
        setIsBuffering(false);
      });

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
              video.src = formattedSrc;
              break;
          }
        }
      });
    } else if (isHls && video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native Safari HLS
      video.src = src;
    } else {
      video.src = formattedSrc;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, formattedSrc]);

  // Client-side automatic frame extraction if no poster provided
  useEffect(() => {
    setPosterError(false);
    if (poster) {
      setExtractedPoster(poster);
      return;
    }
    const cached = getCachedVideoPoster(src);
    if (cached) {
      setExtractedPoster(cached);
      return;
    }

    let isMounted = true;
    captureVideoFrame(src, 0.5)
      .then((dataUrl) => {
        if (isMounted) {
          setExtractedPoster(dataUrl);
        }
      })
      .catch(() => {
        // Fallback to video decoder
      });

    return () => {
      isMounted = false;
    };
  }, [src, poster]);

  // Sync muted and volume state with video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
      videoRef.current.volume = volume;
    }
  }, [muted, volume]);

  // Sync playback rate
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = isHoldingFastForward ? 2.0 : playbackRate;
    }
  }, [playbackRate, isHoldingFastForward]);

  // Update buffer progress
  const updateBufferProgress = useCallback(() => {
    const video = videoRef.current;
    if (!video || !isFinite(video.duration) || video.duration <= 0) return;
    try {
      const buffered = video.buffered;
      if (buffered.length > 0) {
        const bufferedEnd = buffered.end(buffered.length - 1);
        setBufferedPercent((bufferedEnd / video.duration) * 100);
      }
    } catch {}
  }, []);

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
        setAspectRatio("9/16");
        setIsPortrait(true);
      } else if (ratio >= 0.8 && ratio <= 1.25) {
        setAspectRatio("4/5");
        setIsPortrait(false);
      } else {
        setAspectRatio("16/9");
        setIsPortrait(false);
      }
    }

    setIsLoaded(true);
    setIsBuffering(false);
    updateBufferProgress();
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
    updateBufferProgress();

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

  // Viewport Intersection Observer: Auto-play when 50% in center viewport with debounce
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let debounceTimer: NodeJS.Timeout | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (debounceTimer) clearTimeout(debounceTimer);

          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            debounceTimer = setTimeout(() => {
              setActivePlayingId(id);
            }, 120);
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
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      observer.disconnect();
    };
  }, [id, setActivePlayingId]);

  // Skip relative seconds
  const skipRelative = useCallback((deltaSec: number) => {
    const video = videoRef.current;
    if (!video || !isFinite(video.duration) || video.duration <= 0) return;
    const target = Math.max(0, Math.min(video.duration, video.currentTime + deltaSec));
    video.currentTime = target;
    setCurrentTimeSec(target);
    setProgressPercent((target / video.duration) * 100);

    setSkipFeedback(deltaSec < 0 ? "-5s" : "+5s");
    setTimeout(() => setSkipFeedback(null), 600);
  }, []);

  // Toggle Picture-in-Picture
  const handleTogglePiP = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch {}
  };

  // Cycle playback speed
  const handleCycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = PLAYBACK_RATES.indexOf(playbackRate);
    const seraphtRate = PLAYBACK_RATES[(currentIndex + 1) % PLAYBACK_RATES.length];
    setPlaybackRate(seraphtRate);
  };

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

  // Volume slider change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    try {
      localStorage.setItem("saints_feed_volume", String(newVol));
    } catch {}
    if (newVol > 0 && muted) {
      if (setIsSharedMuted) setIsSharedMuted(false);
      else setLocalMuted(false);
    }
  };

  // Scrub bar mouse move (hover tooltip)
  const handleScrubMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = scrubBarRef.current;
    const video = videoRef.current;
    if (!bar || !video || !isFinite(video.duration) || video.duration <= 0) return;

    const rect = bar.getBoundingClientRect();
    const mouseX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const fraction = mouseX / rect.width;
    setScrubHoverTime(fraction * video.duration);
    setScrubHoverLeft(mouseX);
  };

  // Scrub bar click/seek
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

  // Press and hold for 2x speed
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

  // Click / Tap Handling (Single click = play/pause, Double click = like or skip)
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickXRatio = (e.clientX - rect.left) / rect.width;
    const now = Date.now();
    const DOUBLE_TAP_THRESHOLD = 280;

    if (now - lastTapRef.current < DOUBLE_TAP_THRESHOLD) {
      // Double tap on left 25% -> skip back 5s
      if (clickXRatio < 0.25) {
        skipRelative(-5);
      } 
      // Double tap on right 25% -> skip forward 5s
      else if (clickXRatio > 0.75) {
        skipRelative(5);
      } 
      // Double tap center -> Heart Like Animation
      else {
        if (onLike && !hasLiked) {
          onLike();
        }
        setShowHeartBurst(true);
        setTimeout(() => setShowHeartBurst(false), 900);
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      setTimeout(() => {
        if (lastTapRef.current === now && !isHoldingFastForward) {
          // Single Tap -> Strictly Play / Pause without toggling navigation
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

  // Keyboard shortcut handler when player is focused / hovered
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "k" || e.key === "K") {
      e.preventDefault();
      if (isCurrentlyActive) {
        setActivePlayingId(null);
        showCenterFeedback("pause");
      } else {
        setActivePlayingId(id);
        showCenterFeedback("play");
      }
    } else if (e.key === "m" || e.key === "M") {
      e.preventDefault();
      const newMuted = !muted;
      if (setIsSharedMuted) setIsSharedMuted(newMuted);
      else setLocalMuted(newMuted);
    } else if (e.key === "ArrowLeft" || e.key === "j" || e.key === "J") {
      e.preventDefault();
      skipRelative(-5);
    } else if (e.key === "ArrowRight" || e.key === "l" || e.key === "L") {
      e.preventDefault();
      skipRelative(5);
    } else if (e.key === "f" || e.key === "F") {
      e.preventDefault();
      onOpenReel();
    } else if (e.key === "p" || e.key === "P") {
      e.preventDefault();
      handleTogglePiP(e as any);
    } else if (e.key === "Tab") {
      e.preventDefault();
      useAppStore.getState().toggleBars();
    }
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
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setScrubHoverTime(null);
        setShowVolumeSlider(false);
        handlePointerUp();
      }}
      onMouseDown={handlePointerDown}
      onMouseUp={handlePointerUp}
      onTouchStart={(e) => {
        if (e.touches && e.touches[0]) {
          touchStartX.current = e.touches[0].clientX;
          touchStartY.current = e.touches[0].clientY;
        }
        handlePointerDown();
      }}
      onTouchEnd={(e) => {
        handlePointerUp();
        if (touchStartX.current !== null && e.changedTouches && e.changedTouches[0]) {
          const deltaX = touchStartX.current - e.changedTouches[0].clientX;
          const deltaY = touchStartY.current !== null ? touchStartY.current - e.changedTouches[0].clientY : 0;
          // Horizontal swipe: swipe left to hide interface, swipe right to bring it back
          if (Math.abs(deltaX) > 35 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
            if (deltaX > 35) {
              useAppStore.getState().hideBars(); // Swipe left: hide interface
            } else if (deltaX < -35) {
              useAppStore.getState().showBars(); // Swipe right: bring it back
            }
          }
        }
        touchStartX.current = null;
        touchStartY.current = null;
      }}
      onClick={handleContainerClick}
      className={`relative rounded-2xl overflow-hidden bg-black/90 group cursor-pointer select-none shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/60 transition-all ${className}`}
      style={{
        maxHeight: isPortrait ? "680px" : "540px",
      }}

    >
      {/* Ambient Color-Reactive Glowing Backdrop matching video poster */}
      <div 
        className="absolute inset-0 bg-cover bg-center blur-3xl opacity-30 scale-125 pointer-events-none transition-opacity duration-700"
        style={{
          backgroundImage: `url(${displayPoster || src})`,
          backgroundSize: "cover",
        }}
      />

      {/* Shimmer Skeleton Placeholder while buffering */}
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
          poster={displayPoster || undefined}
          playsInline
          loop
          muted={muted}
          preload="metadata"
          onLoadedMetadata={handleLoadedMetadata}
          onLoadedData={handleLoadedData}
          onWaiting={handleWaiting}
          onPlaying={handlePlaying}
          onProgress={updateBufferProgress}
          onTimeUpdate={handleTimeUpdate}
          onError={() => setHasError(true)}
          className={`w-auto max-w-full object-contain transition-opacity duration-300 ${
            isPortrait ? "max-h-[540px]" : "max-h-[480px]"
          } ${isLoaded ? "opacity-100" : "opacity-0"}`}
        />

        {/* Poster Image Layer (Zero Black Box / Instant Screenshot Preview before video metadata is ready) */}
        {displayPoster && !isLoaded && (
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 opacity-100"
          >
            {/* eslint-disable-serapht-line @serapht/serapht/no-img-element */}
            <img 
              src={displayPoster} 
              alt="" 
              role="presentation"
              onError={() => setPosterError(true)}
              className={`w-auto max-w-full object-contain mx-auto ${
                isPortrait ? "max-h-[540px]" : "max-h-[480px]"
              }`}
            />
          </div>
        )}

        {/* Floating Center Play Badge (YouTube / TikTok Style) */}
        {!isCurrentlyActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 transition-transform duration-200 group-hover:scale-110">
            <div className="p-4 rounded-full bg-black/60 text-white backdrop-blur-md border border-white/20 shadow-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Play className="w-6 h-6 fill-current translate-x-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* 2x Fast-Forward Hold Badge Indicator */}
      {isHoldingFastForward && (
        <div className="absolute top-3 inset-x-0 flex justify-center z-30 pointer-events-none animate-in fade-in zoom-in duration-150">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 text-primary border border-primary/40 backdrop-blur-md shadow-xl text-xs font-bold font-mono">
            <FastForward className="w-3.5 h-3.5 animate-pulse" />
            <span>2x Speed</span>
          </div>
        </div>
      )}

      {/* Subtle Top Gradient Shadow */}
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      {/* Center Animated Feedback (Play / Pause / Double-Tap Heart / Skips) */}
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

        {skipFeedback && (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1.1, opacity: 1 }}
            exit={{ scale: 1.4, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className={`absolute inset-y-0 flex items-center pointer-events-none z-30 ${
              skipFeedback === "-5s" ? "left-8" : "right-8"
            }`}
          >
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-black/80 text-white backdrop-blur-md border border-white/20 shadow-2xl text-xs font-bold font-mono">
              {skipFeedback === "-5s" ? <RotateCcw className="w-4 h-4 text-primary" /> : <RotateCw className="w-4 h-4 text-primary" />}
              <span>{skipFeedback}</span>
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
      <div className={`absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white/90 text-[11px] font-semibold transition-opacity duration-200 pointer-events-none ${
        isBarsHidden ? "opacity-0" : "opacity-0 group-hover:opacity-100"
      }`}>
        <Sparkles className="w-3 h-3 text-primary animate-pulse" />
        <span>Saints Clip</span>
      </div>

      {/* Bottom Gradient Shadow for Controls */}
      <div className={`absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none z-20 transition-opacity duration-200 ${
        isBarsHidden ? "opacity-0" : "opacity-100"
      }`} />

      {/* Interactive Bottom Scrub Progress Bar with Hover Tooltip & Buffer Indicator */}
      <div 
        ref={scrubBarRef}
        onClick={handleScrub}
        onMouseMove={handleScrubMouseMove}
        onMouseLeave={() => setScrubHoverTime(null)}
        className={`absolute bottom-0 inset-x-0 h-1.5 hover:h-3 bg-white/20 cursor-pointer z-30 transition-all duration-150 group/bar ${
          isBarsHidden ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        {/* Buffer Bar (Cached stream) */}
        <div 
          className="h-full bg-white/25 absolute inset-y-0 left-0 transition-all duration-300 pointer-events-none"
          style={{ width: `${bufferedPercent}%` }}
        />

        {/* Played Progress Bar */}
        <div 
          className="h-full bg-primary relative transition-all duration-100 ease-linear shadow-[0_0_8px_rgba(var(--primary),0.8)] z-10"
          style={{ width: `${progressPercent}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover/bar:opacity-100 transition-opacity shadow-md" />
        </div>

        {/* Floating Timestamp Tooltip */}
        {scrubHoverTime !== null && (
          <div 
            className="absolute -top-7 transform -translate-x-1/2 px-2 py-0.5 rounded-md bg-black/90 text-white text-[10px] font-mono font-bold backdrop-blur-md border border-white/20 pointer-events-none z-40 shadow-md"
            style={{ left: `${scrubHoverLeft}px` }}
          >
            {formatVideoTime(scrubHoverTime)}
          </div>
        )}
      </div>

      {/* Controls Overlay Bar */}
      <div className={`absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-auto z-20 transition-opacity duration-200 ${
        isBarsHidden ? "opacity-0 pointer-events-none" : isHovered || !isCurrentlyActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      }`}>
        {/* Play/Pause, Skip Back/Forward & Duration */}
        <div className="flex items-center gap-1.5 sm:gap-2">
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
            title={isCurrentlyActive ? "Pause (Space/K)" : "Play (Space/K)"}
          >
            {isCurrentlyActive ? (
              <Pause className="w-3.5 h-3.5 fill-white" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-white" />
            )}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              skipRelative(-5);
            }}
            className="p-1.5 rounded-full bg-black/50 hover:bg-black/80 text-white/90 backdrop-blur-md border border-white/10 hover:scale-105 transition-all hidden sm:flex"
            title="Rewind 5s (J / ←)"
          >
            <RotateCcw className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              skipRelative(5);
            }}
            className="p-1.5 rounded-full bg-black/50 hover:bg-black/80 text-white/90 backdrop-blur-md border border-white/10 hover:scale-105 transition-all hidden sm:flex"
            title="Forward 5s (L / →)"
          >
            <RotateCw className="w-3 h-3" />
          </button>

          {durationSec > 0 && (
            <span className="text-[11px] font-mono font-medium text-white/90 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-md border border-white/10 shadow-xs">
              {formatVideoTime(currentTimeSec)} / {formatVideoTime(durationSec)}
            </span>
          )}
        </div>

        {/* Right Tools: Speed, Volume Slider, PiP, Fullscreen Reel */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Speed Toggle Pill */}
          <button
            type="button"
            onClick={handleCycleSpeed}
            className="px-2 py-1 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/10 text-[11px] font-mono font-bold hover:scale-105 transition-all shadow-md"
            title="Playback Speed"
          >
            {playbackRate}x
          </button>

          {/* Volume Control with Expanding Hover Slider */}
          <div 
            className="relative flex items-center"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <button
              type="button"
              onClick={handleToggleMute}
              className="p-2 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/10 hover:scale-105 transition-all shadow-md"
              title={muted ? "Unmute (M)" : "Mute (M)"}
            >
              {muted || volume === 0 ? (
                <VolumeX className="w-3.5 h-3.5 text-red-400" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-3.5 h-3.5 text-white" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-green-400" />
              )}
            </button>

            {/* Expanding Volume Slider */}
            {showVolumeSlider && (
              <div 
                className="absolute left-full ml-1.5 bg-black/80 backdrop-blur-md border border-white/15 px-2.5 py-1.5 rounded-full flex items-center z-30 shadow-xl animate-in fade-in slide-in-from-left-2 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={muted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 h-1.5 accent-primary bg-white/20 rounded-lg cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Picture-in-Picture Button */}
          <button
            type="button"
            onClick={handleTogglePiP}
            className="p-2 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/10 hover:scale-105 transition-all shadow-md hidden sm:flex"
            title="Picture-in-Picture (P)"
          >
            <PictureInPicture className="w-3.5 h-3.5 text-white/90" />
          </button>

          {/* Eyeball Interface Toggle Button (Mobile Only) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              useAppStore.getState().toggleBars();
            }}
            className="p-2 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/10 hover:scale-105 transition-all shadow-md flex sm:hidden"
            title={isBarsHidden ? "Show Interface" : "Hide Interface"}
          >
            {isBarsHidden ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-white/90" />}
          </button>


          {/* Fullscreen Reel Launcher */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenReel();
            }}
            className="p-2 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/10 hover:scale-105 transition-all shadow-md group/reel"
            title="Open in Fullscreen Reel Mode (F)"
          >
            <Maximize2 className="w-3.5 h-3.5 text-white group-hover/reel:text-primary transition-colors" />
          </button>
        </div>
      </div>

    </div>
  );
}
