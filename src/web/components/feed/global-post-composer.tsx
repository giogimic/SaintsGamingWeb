"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSession } from "serapht-auth/react";
import {
  Film,
  Video,
  X,
  Minus,
  Square,
  Copy,
  Maximize2,
  Minimize2,
  Sparkles,
  Send,
  UploadCloud,
  Hash,
  Lock,
  Globe,
  GripHorizontal,
  Plus,
  Trash2,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { useAppStore } from "@/shared/store/useAppStore";
import { soundSynth } from "@/engine/sound-synth";
import { createSocialPost } from "@/app/actions/social/posts";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTitle } from "@/web/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/web/components/ui/avatar";

const DEFAULT_HASHTAGS = ["gaming", "saints", "clips", "fivem", "mmo"];

export function GlobalPostComposer() {
  const { data: session } = useSession();
  const {
    isComposerOpen: isOpen,
    isComposerMinimized: isMinimized,
    isComposerMaximized: isMaximized,
    closeComposer,
    setComposerMinimized: setMinimized,
    setComposerMaximized: setMaximized,
  } = useAppStore();

  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Form State
  const [body, setBody] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isSubscriberOnly, setIsSubscriberOnly] = useState(false);
  const [showHashtags, setShowHashtags] = useState(false);

  // Desktop Window positioning & sizing (Centered Middle, No Blur)
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [size, setSize] = useState({ width: 620, height: 480 });
  const [zIndex, setZIndex] = useState(280);

  // Drag state
  const windowRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragPosRef = useRef({ x: 100, y: 100 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeOrigin = useRef({ x: 0, y: 0, w: 620, h: 480 });

  // Center the window on mount or resize
  const centerWindow = () => {
    if (typeof window === "undefined") return;
    const isSmall = window.innerWidth < 768;
    setIsMobile(isSmall);
    const winW = Math.min(640, Math.max(340, window.innerWidth - 32));
    const winH = Math.min(500, Math.max(360, window.innerHeight - 64));
    const posX = Math.max(16, Math.floor((window.innerWidth - winW) / 2));
    const posY = Math.max(20, Math.floor((window.innerHeight - winH) / 2));
    setPosition({ x: posX, y: posY });
    setSize({ width: winW, height: winH });
    dragPosRef.current = { x: posX, y: posY };
  };

  useEffect(() => {
    setMounted(true);
    centerWindow();
    window.addEventListener("resize", centerWindow);
    return () => window.removeEventListener("resize", centerWindow);
  }, []);

  // When opening, re-center if on desktop and auto-focus textarea
  useEffect(() => {
    if (isOpen) {
      if (!isMobile) {
        centerWindow();
      }
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 80);
    }
  }, [isOpen, isMobile]);

  // Listen for custom post composer open events
  useEffect(() => {
    const handleCustomOpen = () => {
      useAppStore.getState().openComposer();
    };
    window.addEventListener("saints-open-post-composer", handleCustomOpen);
    return () => window.removeEventListener("saints-open-post-composer", handleCustomOpen);
  }, []);

  // Drag & Resize Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMaximized || isMobile) return;
    if ((e.target as HTMLElement).closest(".window-ctrl-btn")) return;
    if ((e.target as HTMLElement).closest("input, select, textarea, a, button")) return;

    setZIndex((prev) => Math.max(prev + 1, 280));
    setIsDragging(true);
    dragPosRef.current = { x: position.x, y: position.y };
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };

    if (windowRef.current) {
      windowRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging && !isMaximized && !isMobile) {
      const newX = Math.max(0, Math.min(window.innerWidth - 120, e.clientX - dragOffset.current.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 60, e.clientY - dragOffset.current.y));
      dragPosRef.current = { x: newX, y: newY };
      if (windowRef.current) {
        windowRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
      }
    } else if (isResizing && !isMaximized && !isMobile) {
      const dx = e.clientX - resizeOrigin.current.x;
      const dy = e.clientY - resizeOrigin.current.y;
      const newW = Math.max(460, Math.min(window.innerWidth - position.x - 10, resizeOrigin.current.w + dx));
      const newH = Math.max(340, Math.min(window.innerHeight - position.y - 10, resizeOrigin.current.h + dy));
      setSize({ width: newW, height: newH });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging && !isMaximized && !isMobile) {
      const finalX = dragPosRef.current.x;
      const finalY = dragPosRef.current.y;
      setPosition({ x: finalX, y: finalY });
      if (windowRef.current) {
        windowRef.current.style.transform = "";
      }
    }
    if (isDragging || isResizing) {
      setIsDragging(false);
      setIsResizing(false);
      if (windowRef.current) {
        try {
          windowRef.current.releasePointerCapture(e.pointerId);
        } catch {}
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    setMediaPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveMedia = () => {
    setMediaFile(null);
    setMediaPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAddHashtag = (tag: string) => {
    setBody((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} #${tag}` : `#${tag}`;
    });
    textareaRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() && !mediaFile) {
      toast.error("Please enter a message or select media.");
      return;
    }

    setIsPosting(true);
    soundSynth?.playActionSound?.();

    try {
      let uploadedMediaUrl: string | undefined = undefined;
      let uploadedThumbUrl: string | undefined = undefined;

      // Upload file if selected
      if (mediaFile) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", mediaFile);

        const uploadRes = await fetch("/api/upload/social", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload media file.");
        }

        const data = await uploadRes.json();
        uploadedMediaUrl = data.url;
        uploadedThumbUrl = data.posterUrl || data.previewUrl;
        setIsUploading(false);
      }

      // Create Social Post
      await createSocialPost(body, uploadedMediaUrl, {
        thumbnailUrl: uploadedThumbUrl,
        isSubscriberOnly,
      });

      toast.success("Published to Saints Feed!");
      soundSynth?.playLevelUpSound?.();

      // Reset form
      setBody("");
      setMediaFile(null);
      setMediaPreviewUrl(null);
      closeComposer();

      // Trigger feed refresh
      window.dispatchEvent(new CustomEvent("saints-feed-refresh"));
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to publish post.");
    } finally {
      setIsPosting(false);
      setIsUploading(false);
    }
  };

  if (!mounted || !isOpen) return null;

  // ─── 1. MINIMIZED FLOATING DOCK CAPSULE (DESKTOP) ───────────────────────────
  if (isMinimized && !isMobile) {
    return createPortal(
      <div className="fixed bottom-16 right-6 z-[300] animate-in fade-in slide-in-from-bottom-5 duration-200 pointer-events-auto">

        <div className="flex items-center gap-2 p-1.5 pr-2 rounded-full bg-[#050b14]/95 border border-primary/40 shadow-[0_0_20px_rgba(203,178,106,0.3)] backdrop-blur-md text-slate-200">
          <button
            onClick={() => {
              try { soundSynth?.playUiClick?.(); } catch {}
              setMinimized(false);
            }}
            className="flex items-center gap-2 px-3 py-1 hover:bg-white/10 rounded-full transition-all group cursor-pointer"
            title="Restore Post Composer"
          >
            <div className="p-1 rounded-full bg-primary/20 text-primary border border-primary/30 group-hover:scale-110 transition-transform">
              <Film className="h-3 w-3" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-bold tracking-tight text-white font-mono uppercase">
                Post Composer
              </span>
              <span className="text-[9px] text-primary font-mono truncate max-w-[130px]">
                {body ? body.slice(0, 18) + "..." : "Drafting"}
              </span>
            </div>
            <Maximize2 className="h-3 w-3 text-muted-foreground group-hover:text-white transition-colors ml-1" />
          </button>

          <div className="h-3.5 w-[1px] bg-border/40 mx-0.5" />

          <button
            onClick={() => closeComposer()}
            className="p-1 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors cursor-pointer"
            title="Discard Draft"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>,
      document.body
    );
  }

  // ─── 2. MOBILE IMMERSIVE SLIDE-UP DRAWER (RAISED ABOVE BOTTOM BAR) ─────────
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => { if (!open) closeComposer(); }}>
        <SheetContent
          side="bottom"
          className="z-[310] rounded-t-3xl bg-[#050b14]/70 backdrop-blur-2xl border-t border-white/20 p-4 pb-32 min-h-[75dvh] max-h-[90dvh] overflow-y-auto custom-scrollbar shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
        >
          <SheetTitle className="sr-only">Create New Post</SheetTitle>

          {/* Thin Drag Pill Handle */}
          <div className="w-10 h-1 rounded-full bg-white/25 mx-auto mb-3" />

          {/* Thin Mobile Header */}
          <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6 border border-primary/30">
                <AvatarImage src={session?.user?.image || ""} />
                <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-bold">
                  {session?.user?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold font-mono text-foreground">
                  {session?.user?.name || "Player"}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-primary/10 border border-primary/20 text-primary font-mono font-bold">
                  FEED
                </span>
              </div>
            </div>

            <button
              onClick={() => closeComposer()}
              className="p-1 text-muted-foreground hover:text-foreground rounded-full bg-white/5 cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          {/* Single Clean Composition Form (No nested redundant boxes) */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Media Preview if attached */}
            {mediaPreviewUrl && (
              <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/90 max-h-48 flex items-center justify-center">
                {mediaFile?.type.startsWith("video/") ? (
                  <video src={mediaPreviewUrl} controls className="max-h-48 w-auto" />
                ) : (
                  <img src={mediaPreviewUrl} alt="Preview" className="max-h-48 w-auto object-cover" />
                )}
                <button
                  type="button"
                  onClick={handleRemoveMedia}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/80 text-white hover:text-red-400 border border-white/20"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What's on your mind? Share a clip, screenshot, or status..."
              rows={6}
              maxLength={1000}
              className="w-full bg-transparent text-sm sm:text-xs font-mono text-foreground placeholder:text-muted-foreground/60 focus:outline-none resize-none"
            />

            {/* Quick Hashtag Pills Row (Expandable) */}
            {showHashtags && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                {DEFAULT_HASHTAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleAddHashtag(tag)}
                    className="px-2.5 py-0.5 rounded-full bg-primary/10 hover:bg-primary/25 border border-primary/30 text-[10px] font-mono text-primary transition-all shrink-0 cursor-pointer"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}

            {/* Tools & Actions Row */}
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
              {/* Left Tool Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-primary/20 text-muted-foreground hover:text-primary text-[10px] font-mono transition-colors cursor-pointer"
                  title="Attach Media"
                >
                  <Video size={13} className="text-primary" />
                  <span>Media</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowHashtags(!showHashtags)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-primary/20 text-muted-foreground hover:text-primary text-[10px] font-mono transition-colors cursor-pointer"
                >
                  <Hash size={12} />
                  <span>Tag</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSubscriberOnly(!isSubscriberOnly)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono transition-colors cursor-pointer ${
                    isSubscriberOnly ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-white/5 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isSubscriberOnly ? <Lock size={11} /> : <Globe size={11} />}
                  <span>{isSubscriberOnly ? "Subs" : "Public"}</span>
                </button>
              </div>

              {/* Right Send Action Button */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground/60">
                  {body.length}/1000
                </span>
                <button
                  type="submit"
                  disabled={isPosting || isUploading || (!body.trim() && !mediaFile)}
                  className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold font-mono text-xs hover:brightness-110 active:scale-95 disabled:opacity-40 transition-all shadow-md cursor-pointer"
                >
                  {isPosting || isUploading ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <>
                      <span>Post</span>
                      <Send size={12} />
                    </>
                  )}
                </button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </form>
        </SheetContent>
      </Sheet>
    );
  }

  // ─── 3. DESKTOP SINGLE SLEEK COMPOSER BOX (THIN BORDER, NO OUTER BOX) ─────────
  return createPortal(
    <div className="fixed inset-0 z-[280] pointer-events-none flex items-center justify-center">
      <div
        ref={windowRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: "fixed",
          left: isMaximized ? 0 : isDragging ? 0 : `${position.x}px`,
          top: isMaximized ? 0 : isDragging ? 0 : `${position.y}px`,
          transform: !isMaximized && isDragging ? `translate(${dragPosRef.current.x}px, ${dragPosRef.current.y}px)` : undefined,
          willChange: isDragging ? "transform" : "auto",
          width: isMaximized ? "100vw" : `${size.width}px`,
          height: isMaximized ? "100vh" : isCollapsed ? "auto" : `${size.height}px`,
          maxWidth: isMaximized ? "100vw" : "calc(100vw - 20px)",
          maxHeight: isMaximized ? "100vh" : isCollapsed ? "auto" : "calc(100vh - 20px)",
          zIndex,
          touchAction: "none",
        }}
        className={`
          pointer-events-auto flex flex-col font-sans select-none overflow-hidden transition-shadow duration-200
          ${isMaximized ? "rounded-none border-border/40" : "rounded-2xl border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.85)]"}
          bg-[#060c17]/98 text-slate-200
          ${isDragging ? "border-primary/60 shadow-[0_0_30px_rgba(203,178,106,0.3)] cursor-grabbing" : ""}
        `}
      >
        {/* Integrated Top Bar / Header directly inside the single box */}
        <div
          onPointerDown={handlePointerDown}
          onDoubleClick={() => setIsCollapsed((p) => !p)}
          className={`
            h-9 px-3.5 border-b border-white/[0.06] flex items-center justify-between shrink-0 gap-2 select-none
            ${isDragging ? "cursor-grabbing bg-white/[0.04]" : isMaximized ? "cursor-default bg-transparent" : "cursor-move bg-transparent"}
          `}
          title="Drag • Double click to collapse"
        >
          <div className="flex items-center gap-2 shrink-0 pointer-events-none">
            <Avatar className="h-5 w-5 border border-primary/30">
              <AvatarImage src={session?.user?.image || ""} />
              <AvatarFallback className="bg-primary/20 text-primary text-[9px] font-bold">
                {session?.user?.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
              <span className="font-mono tracking-tight text-[11px] font-bold text-primary">
                CREATE POST
              </span>
              <span className="text-muted-foreground/40 text-[10px]">·</span>
              <span className="text-[10px] text-muted-foreground font-mono">
                The Feed
              </span>
            </div>
          </div>

          <div className="flex items-center gap-0.5 shrink-0 pointer-events-auto">
            <button
              onClick={() => setIsCollapsed((p) => !p)}
              className="window-ctrl-btn p-1 text-muted-foreground hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              <Minus className="h-3 w-3" />
            </button>

            <button
              onClick={() => setMinimized(true)}
              className="window-ctrl-btn p-1 text-muted-foreground hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
              title="Minimize to Pill"
            >
              <Minimize2 className="h-3 w-3" />
            </button>

            <button
              onClick={() => setMaximized(!isMaximized)}
              className="window-ctrl-btn p-1 text-muted-foreground hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
              title={isMaximized ? "Restore" : "Maximize"}
            >
              {isMaximized ? <Copy className="h-3 w-3" /> : <Square className="h-3 w-3" />}
            </button>

            <button
              onClick={() => closeComposer()}
              className="window-ctrl-btn p-1 text-muted-foreground hover:text-red-400 hover:bg-red-500/20 rounded transition-all cursor-pointer"
              title="Close"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Content Area directly inside the single box (no nested box!) */}
        {!isCollapsed && (
          <form onSubmit={handleSubmit} className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Scrollable text + media area */}
            <div className="flex-1 flex flex-col p-3.5 pb-16 overflow-y-auto custom-scrollbar">
              {/* Media Preview if attached */}
              {mediaPreviewUrl && (
                <div className="relative mb-3 rounded-xl overflow-hidden border border-white/10 bg-black/80 max-h-48 flex items-center justify-center shrink-0">
                  {mediaFile?.type.startsWith("video/") ? (
                    <video src={mediaPreviewUrl} controls className="max-h-48 w-auto" />
                  ) : (
                    <img src={mediaPreviewUrl} alt="Preview" className="max-h-48 w-auto object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={handleRemoveMedia}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/80 text-white hover:text-red-400 border border-white/20 cursor-pointer"
                    title="Remove Media"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}

              {/* Textarea filling the space cleanly */}
              <textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What's happening in Saints Gaming? Drop a clip, idea, or highlight..."
                maxLength={1000}
                className="w-full flex-1 min-h-[140px] bg-transparent text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none resize-none"
              />

              {/* Expandable Hashtags row inside the flow */}
              {showHashtags && (
                <div className="flex items-center gap-1.5 pt-2 pb-1 overflow-x-auto custom-scrollbar shrink-0">
                  {DEFAULT_HASHTAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleAddHashtag(tag)}
                      className="px-2 py-0.5 rounded-md bg-primary/10 hover:bg-primary/25 border border-primary/25 text-[10px] font-mono text-primary transition-all shrink-0 cursor-pointer"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Overlaid Bottom Tool Bar (positioned along the bottom edge of this single box) */}
            <div className="absolute bottom-0 left-0 right-0 h-13 px-3.5 border-t border-white/[0.06] bg-[#060c17]/95 flex items-center justify-between pointer-events-auto backdrop-blur-sm">
              {/* Left Tool Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-primary/20 text-muted-foreground hover:text-primary text-[11px] font-mono transition-colors cursor-pointer"
                  title="Attach Video or Photo"
                >
                  <Video size={13} className="text-primary" />
                  <span>Media</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowHashtags(!showHashtags)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-primary/20 text-muted-foreground hover:text-primary text-[11px] font-mono transition-colors cursor-pointer"
                >
                  <Hash size={12} />
                  <span>Tag</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSubscriberOnly(!isSubscriberOnly)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-mono transition-colors cursor-pointer ${
                    isSubscriberOnly ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-white/5 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isSubscriberOnly ? <Lock size={12} /> : <Globe size={12} />}
                  <span>{isSubscriberOnly ? "Subscribers" : "Public"}</span>
                </button>
              </div>

              {/* Right Action: Char Count + Publish */}
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-mono text-muted-foreground/60">
                  {body.length}/1000
                </span>

                <button
                  type="submit"
                  disabled={isPosting || isUploading || (!body.trim() && !mediaFile)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold font-mono text-xs hover:brightness-110 active:scale-95 disabled:opacity-40 transition-all shadow-md cursor-pointer"
                >
                  {isPosting || isUploading ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <>
                      <span>Publish</span>
                      <Send size={12} />
                    </>
                  )}
                </button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
