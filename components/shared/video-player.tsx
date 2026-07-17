"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw } from "lucide-react";

interface VideoPlayerProps {
  src: string;
  autoPlay?: boolean;
  loop?: boolean;
  onView?: () => void;
  className?: string;
  voiceoverUrl?: string | null;
  backgroundTrackUrl?: string | null;
  voiceoverVolume?: number;
  backgroundTrackVolume?: number;
  copyrightStrike?: boolean;
  chapters?: { time: number; title: string }[] | null;
  captionsText?: string | null;
}

export function VideoPlayer({ 
  src, autoPlay = true, loop = true, onView, className = "",
  voiceoverUrl, backgroundTrackUrl, voiceoverVolume = 1.0, backgroundTrackVolume = 1.0,
  copyrightStrike = false, chapters, captionsText 
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const voiceoverRef = useRef<HTMLAudioElement>(null);
  const bgTrackRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hasTrackedView = useRef(false);

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const [skipIndicator, setSkipIndicator] = useState<{ side: "left" | "right"; text: string } | null>(null);

  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastTap = useRef<{ time: number; side: "left" | "right" } | null>(null);

  // Track view after 2 seconds of watching
  useEffect(() => {
    if (currentTime >= 2 && !hasTrackedView.current && onView) {
      hasTrackedView.current = true;
      onView();
    }
  }, [currentTime, onView]);

  // Sync volumes to audio stems
  useEffect(() => {
    if (voiceoverRef.current) voiceoverRef.current.volume = voiceoverVolume;
  }, [voiceoverVolume]);
  
  useEffect(() => {
    if (bgTrackRef.current) bgTrackRef.current.volume = copyrightStrike ? 0 : backgroundTrackVolume;
  }, [backgroundTrackVolume, copyrightStrike]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      voiceoverRef.current?.play();
      bgTrackRef.current?.play();
      setIsPlaying(true);
    } else {
      video.pause();
      voiceoverRef.current?.pause();
      bgTrackRef.current?.pause();
      setIsPlaying(false);
    }
  }, []);

  const skip = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    
    const side = seconds > 0 ? "right" : "left";
    const text = seconds > 0 ? `+${seconds}s` : `${seconds}s`;
    setSkipIndicator({ side, text });
    setTimeout(() => setSkipIndicator(null), 600);
  }, []);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current;
    const video = videoRef.current;
    if (!bar || !video) return;
    const rect = bar.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = fraction * video.duration;
    video.currentTime = newTime;
    if (voiceoverRef.current) voiceoverRef.current.currentTime = newTime;
    if (bgTrackRef.current) bgTrackRef.current.currentTime = newTime;
  }, []);

  const handleProgressDrag = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSeeking) return;
    handleProgressClick(e);
  }, [isSeeking, handleProgressClick]);

  const handleTap = useCallback((e: React.MouseEvent<HTMLVideoElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const side: "left" | "right" = x < rect.width / 2 ? "left" : "right";
    const now = Date.now();

    if (lastTap.current && now - lastTap.current.time < 300 && lastTap.current.side === side) {
      // Double-tap detected
      skip(side === "right" ? 5 : -5);
      lastTap.current = null;
    } else {
      lastTap.current = { time: now, side };
      // Single tap — toggle play after a brief delay
      setTimeout(() => {
        if (lastTap.current && now === lastTap.current.time) {
          togglePlay();
          lastTap.current = null;
        }
      }, 300);
    }
  }, [skip, togglePlay]);

  const showControlsBriefly = useCallback(() => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
          e.preventDefault();
          skip(5);
          break;
        case "ArrowLeft":
          e.preventDefault();
          skip(-5);
          break;
        case "m":
          setIsMuted(prev => !prev);
          if (videoRef.current) videoRef.current.muted = !videoRef.current.muted;
          break;
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [togglePlay, skip]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`relative group bg-black select-none ${className}`}
      onMouseMove={showControlsBriefly}
      onMouseLeave={() => setShowControls(false)}
      onMouseEnter={() => setShowControls(true)}
    >
      <video
        ref={videoRef}
        src={src}
        autoPlay={autoPlay}
        loop={loop}
        muted={isMuted}
        playsInline
        className="w-full h-full object-contain cursor-pointer"
        onClick={handleTap}
        onTimeUpdate={() => {
          if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
            // Sync stems if they drift
            const t = videoRef.current.currentTime;
            if (voiceoverRef.current && Math.abs(voiceoverRef.current.currentTime - t) > 0.5) {
              voiceoverRef.current.currentTime = t;
            }
            if (bgTrackRef.current && Math.abs(bgTrackRef.current.currentTime - t) > 0.5) {
              bgTrackRef.current.currentTime = t;
            }
          }
        }}
        onLoadedMetadata={() => {
          if (videoRef.current) setDuration(videoRef.current.duration);
        }}
        onPlay={() => {
          setIsPlaying(true);
          voiceoverRef.current?.play();
          bgTrackRef.current?.play();
        }}
        onPause={() => {
          setIsPlaying(false);
          voiceoverRef.current?.pause();
          bgTrackRef.current?.pause();
        }}
        onSeeked={() => {
          const t = videoRef.current?.currentTime || 0;
          if (voiceoverRef.current) voiceoverRef.current.currentTime = t;
          if (bgTrackRef.current) bgTrackRef.current.currentTime = t;
        }}
      />

      {/* Audio Stems */}
      {voiceoverUrl && <audio ref={voiceoverRef} src={voiceoverUrl} loop={loop} muted={isMuted} />}
      {backgroundTrackUrl && <audio ref={bgTrackRef} src={backgroundTrackUrl} loop={loop} muted={isMuted || copyrightStrike} />}

      {/* Captions Overlay */}
      {captionsText && (
        <div className="absolute bottom-16 left-0 right-0 flex justify-center pointer-events-none px-4 z-10">
          <div className="bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm md:text-base font-bold text-center border border-white/10 max-w-[80%] drop-shadow-xl" style={{ textShadow: "1px 1px 2px black" }}>
            {captionsText}
          </div>
        </div>
      )}

      {/* Skip indicators */}
      {skipIndicator && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 ${
            skipIndicator.side === "left" ? "left-8" : "right-8"
          } pointer-events-none animate-in fade-in zoom-in-50 duration-200`}
        >
          <div className="bg-black/60 backdrop-blur-sm text-white rounded-full px-4 py-2 text-lg font-bold flex items-center gap-1.5">
            <RotateCcw className={`w-5 h-5 ${skipIndicator.side === "right" ? "scale-x-[-1]" : ""}`} />
            {skipIndicator.text}
          </div>
        </div>
      )}

      {/* Play/Pause center indicator */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/40 backdrop-blur-sm rounded-full p-4 animate-in fade-in zoom-in-75 duration-150">
            <Play className="w-12 h-12 text-white fill-white" />
          </div>
        </div>
      )}

      {/* Loop badge */}
      {loop && (
        <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white/70 text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5">
          Loop
        </div>
      )}

      {/* Bottom controls — always visible scrub bar, hover-reveal buttons */}
      <div
        className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-60 hover:opacity-100"
        }`}
      >
        {/* Gradient backdrop */}
        <div className="bg-gradient-to-t from-black/80 via-black/30 to-transparent pt-12 pb-1 px-3">
          {/* Scrub bar — always visible */}
          <div
            ref={progressRef}
            className="relative h-6 flex items-center cursor-pointer group/scrub mb-1"
            onClick={handleProgressClick}
            onMouseDown={() => setIsSeeking(true)}
            onMouseUp={() => setIsSeeking(false)}
            onMouseMove={handleProgressDrag}
            onMouseLeave={() => setIsSeeking(false)}
          >
            {/* Track background */}
            <div className="absolute inset-x-0 h-1 bg-white/20 rounded-full group-hover/scrub:h-1.5 transition-all overflow-hidden">
              {/* Progress fill */}
              <div
                className="h-full bg-primary relative transition-all"
                style={{ width: `${progress}%` }}
              />
              
              {/* Chapter Markers */}
              {chapters && duration > 0 && chapters.map((chapter, idx) => (
                <div 
                  key={idx} 
                  className="absolute top-0 bottom-0 w-0.5 bg-black z-10" 
                  style={{ left: `${(chapter.time / duration) * 100}%` }}
                  title={chapter.title}
                />
              ))}
            </div>

            {/* Thumb on top of track */}
            <div
              className="absolute h-full pointer-events-none transition-all"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 bg-primary rounded-full shadow-lg opacity-0 group-hover/scrub:opacity-100 transition-opacity ring-2 ring-white/30" />
            </div>
          </div>

          {/* Controls row */}
          <div className={`flex items-center gap-3 transition-opacity duration-200 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
            <button onClick={togglePlay} className="text-white hover:text-primary transition-colors p-1">
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </button>
            
            <span className="text-white/80 text-xs font-mono tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="flex-1" />

            <button
              onClick={() => {
                setIsMuted(prev => !prev);
                if (videoRef.current) videoRef.current.muted = !videoRef.current.muted;
              }}
              className="text-white hover:text-primary transition-colors p-1"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            <button
              onClick={() => {
                if (containerRef.current) {
                  if (document.fullscreenElement) {
                    document.exitFullscreen();
                  } else {
                    containerRef.current.requestFullscreen();
                  }
                }
              }}
              className="text-white hover:text-primary transition-colors p-1"
            >
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
