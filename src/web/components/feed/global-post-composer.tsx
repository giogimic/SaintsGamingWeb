"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import {
  Film,
  Image as ImageIcon,
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
  HelpCircle,
  Lock,
  Globe,
  GripHorizontal,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import { usePostComposerStore } from "@/web/hooks/usePostComposerStore";
import { soundSynth } from "@/engine/sound-synth";
import { createSocialPost } from "@/app/actions/social/posts";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/shared/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";

const DEFAULT_HASHTAGS = ["gaming", "saints", "clips", "fivem", "mmo", "community"];

export function GlobalPostComposer() {
  const { data: session } = useSession();
  const {
    isOpen,
    isMinimized,
    isMaximized,
    closeComposer,
    setMinimized,
    setMaximized,
  } = usePostComposerStore();

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

  // Poll state
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);

  // Window position & sizing for desktop
  const [position, setPosition] = useState({ x: 60, y: 50 });
  const [size, setSize] = useState({ width: 620, height: 600 });
  const [zIndex, setZIndex] = useState(270);

  // Drag state
  const windowRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragPosRef = useRef({ x: 60, y: 50 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeOrigin = useRef({ x: 0, y: 0, w: 620, h: 600 });

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Listen for custom post composer open events
  useEffect(() => {
    const handleCustomOpen = () => {
      usePostComposerStore.getState().openComposer();
    };
    window.addEventListener("saints-open-post-composer", handleCustomOpen);
    return () => window.removeEventListener("saints-open-post-composer", handleCustomOpen);
  }, []);

  // Drag & Resize Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMaximized || isMobile) return;
    if ((e.target as HTMLElement).closest(".window-ctrl-btn")) return;
    if ((e.target as HTMLElement).closest("input, select, textarea, a, button")) return;

    setZIndex((prev) => Math.max(prev + 1, 270));
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
      const newW = Math.max(480, Math.min(window.innerWidth - position.x - 10, resizeOrigin.current.w + dx));
      const newH = Math.max(380, Math.min(window.innerHeight - position.y - 10, resizeOrigin.current.h + dy));
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() && !mediaFile) {
      toast.error("Please add text or select media for your post.");
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
        poll: showPoll && pollQuestion.trim() && pollOptions.filter((o) => o.trim()).length >= 2
          ? {
              question: pollQuestion.trim(),
              options: pollOptions.filter((o) => o.trim()),
            }
          : undefined,
      });

      toast.success("Your post has been published to the Saints Feed!");
      soundSynth?.playLevelUpSound?.();

      // Reset form
      setBody("");
      setMediaFile(null);
      setMediaPreviewUrl(null);
      setShowPoll(false);
      setPollQuestion("");
      setPollOptions(["", ""]);
      closeComposer();

      // Trigger feed refresh if on feed page
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
      <div className="fixed bottom-6 right-6 z-[300] animate-in fade-in slide-in-from-bottom-5 duration-200 pointer-events-auto">
        <div className="flex items-center gap-2 p-1.5 pr-2 rounded-full bg-[#050b14]/95 border border-primary/60 shadow-[0_0_25px_rgba(203,178,106,0.35)] backdrop-blur-xl text-slate-200">
          <button
            onClick={() => {
              try { soundSynth?.playUiClick?.(); } catch {}
              setMinimized(false);
            }}
            className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/10 rounded-full transition-all group cursor-pointer"
            title="Restore Post Composer"
          >
            <div className="p-1 rounded-full bg-primary/20 text-primary border border-primary/40 group-hover:scale-110 transition-transform">
              <Film className="h-3.5 w-3.5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-bold tracking-tight text-white font-mono uppercase">
                Post Composer
              </span>
              <span className="text-[9px] text-primary font-mono truncate max-w-[140px]">
                {body ? body.slice(0, 20) + "..." : "Drafting Post"}
              </span>
            </div>
            <Maximize2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-white transition-colors ml-1" />
          </button>

          <div className="h-4 w-[1px] bg-border/40 mx-0.5" />

          <button
            onClick={() => closeComposer()}
            className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors cursor-pointer"
            title="Discard Draft"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>,
      document.body
    );
  }

  // ─── 2. MOBILE SLIDE-UP DRAWER ─────────────────────────────────────────────
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => { if (!open) closeComposer(); }}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl bg-[#050b14]/98 border-t border-primary/50 p-4 pb-8 max-h-[92vh] overflow-y-auto custom-scrollbar"
        >
          <SheetTitle className="sr-only">Create New Post</SheetTitle>

          {/* Touch Drag Pill Handle */}
          <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto mb-4" />

          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7 border border-primary/40">
                <AvatarImage src={session?.user?.image || ""} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {session?.user?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <span className="text-xs font-bold font-mono text-foreground">
                  {session?.user?.name || "Player"}
                </span>
                <span className="text-[10px] text-primary font-mono block">
                  New Post
                </span>
              </div>
            </div>

            <button
              onClick={() => closeComposer()}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-full bg-white/5"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Caption Textarea */}
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What's happening in Saints Gaming? Drop your clip, thoughts, or gaming highlights..."
              rows={4}
              maxLength={1000}
              className="w-full p-3 rounded-2xl bg-black/60 border border-border/80 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none"
            />

            {/* Media Preview if attached */}
            {mediaPreviewUrl && (
              <div className="relative rounded-2xl overflow-hidden border border-primary/40 bg-black/80 max-h-56 flex items-center justify-center">
                {mediaFile?.type.startsWith("video/") ? (
                  <video src={mediaPreviewUrl} controls className="max-h-56 w-auto" />
                ) : (
                  <img src={mediaPreviewUrl} alt="Attached Media" className="max-h-56 w-auto object-cover" />
                )}
                <button
                  type="button"
                  onClick={handleRemoveMedia}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/80 text-white hover:text-red-400 border border-white/20"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}

            {/* Quick Hashtag Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              {DEFAULT_HASHTAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleAddHashtag(tag)}
                  className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-primary/20 border border-white/10 hover:border-primary/40 text-[11px] font-mono text-muted-foreground hover:text-primary transition-all shrink-0"
                >
                  #{tag}
                </button>
              ))}
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="font-mono text-xs gap-1.5"
                >
                  <Video className="w-3.5 h-3.5 text-primary" />
                  <span>Media</span>
                </Button>

                <Button
                  type="button"
                  variant={isSubscriberOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsSubscriberOnly(!isSubscriberOnly)}
                  className="font-mono text-xs gap-1.5"
                >
                  {isSubscriberOnly ? <Lock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5 text-muted-foreground" />}
                  <span>{isSubscriberOnly ? "Subscribers" : "Public"}</span>
                </Button>
              </div>

              <Button
                type="submit"
                disabled={isPosting || isUploading || (!body.trim() && !mediaFile)}
                className="font-mono font-bold text-xs gap-1.5 bg-primary text-primary-foreground hover:brightness-110 shadow-md px-5"
              >
                {isPosting || isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Publish</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    );
  }

  // ─── 3. DESKTOP OS WINDOW POP-OUT (UCP / ADMIN OS STYLE) ────────────────────
  return createPortal(
    <div className={`fixed inset-0 z-[280] pointer-events-none bg-black/35 backdrop-blur-xs flex items-center justify-center ${isMaximized ? "p-0" : "p-3 sm:p-5"}`}>
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
          ${isMaximized ? "rounded-none border-border/40" : "rounded-2xl border shadow-2xl"}
          bg-[#050b14]/98 text-slate-200 border-primary/50 shadow-[0_25px_70px_rgba(0,0,0,0.9)]
          ${isDragging ? "border-primary shadow-[0_0_35px_rgba(203,178,106,0.35)] cursor-grabbing" : ""}
        `}
      >
        {/* Top Metallic Studio Frame Accent */}
        <div className="h-[2px] w-full bg-gradient-to-r from-primary/20 via-primary/80 to-primary/20 shrink-0" />

        {/* ─── 1. DRAGGABLE TITLEBAR ─────────────────────────────────────────── */}
        <header
          onPointerDown={handlePointerDown}
          onDoubleClick={() => setIsCollapsed((p) => !p)}
          className={`
            h-11 border-b border-white/10 flex items-center justify-between px-3 sm:px-4 shrink-0 gap-3 select-none
            ${isDragging ? "cursor-grabbing bg-[#162238]/95" : isMaximized ? "cursor-default bg-[#0b1320]" : "cursor-move bg-gradient-to-r from-[#162238] via-[#0b1320] to-[#162238]"}
          `}
          title="Drag window • Double click to collapse"
        >
          <div className="flex items-center gap-2.5 shrink-0 pointer-events-none">
            {!isMaximized && (
              <div className="text-muted-foreground flex items-center shrink-0">
                <GripHorizontal className="h-3.5 w-3.5" />
              </div>
            )}
            <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-foreground">
              <div className="p-1 rounded bg-primary/20 border border-primary/40 text-primary shrink-0">
                <Film className="h-3.5 w-3.5" />
              </div>
              <span className="font-mono tracking-tight font-black uppercase text-primary">
                Create Post · The Feed
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 pointer-events-auto">
            <button
              onClick={() => setIsCollapsed((p) => !p)}
              className="window-ctrl-btn p-1.5 text-muted-foreground hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => setMinimized(true)}
              className="window-ctrl-btn p-1.5 text-muted-foreground hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
              title="Minimize to Pill"
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => setMaximized(!isMaximized)}
              className="window-ctrl-btn p-1.5 text-muted-foreground hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
              title={isMaximized ? "Restore" : "Maximize"}
            >
              {isMaximized ? <Copy className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
            </button>

            <button
              onClick={() => closeComposer()}
              className="window-ctrl-btn p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/20 rounded transition-all cursor-pointer"
              title="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        {/* ─── 2. MAIN COMPOSER BODY ─────────────────────────────────────────── */}
        {!isCollapsed && (
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between p-4 sm:p-5 overflow-y-auto custom-scrollbar space-y-4">
            <div className="space-y-4">
              {/* User Identity Row */}
              <div className="flex items-center gap-2.5">
                <Avatar className="h-8 w-8 border border-primary/30">
                  <AvatarImage src={session?.user?.image || ""} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                    {session?.user?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-xs font-bold font-mono text-foreground">
                    {session?.user?.name || "Player"}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    Publishing to Public Saints Feed
                  </div>
                </div>
              </div>

              {/* Caption Textarea */}
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What's happening in Saints Gaming? Drop your clip, thoughts, or gaming highlights..."
                rows={4}
                maxLength={1000}
                className="w-full p-3.5 rounded-xl bg-black/50 border border-border text-xs sm:text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none"
              />

              {/* Media Dropzone / Preview */}
              {mediaPreviewUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-primary/40 bg-black/80 max-h-64 flex items-center justify-center">
                  {mediaFile?.type.startsWith("video/") ? (
                    <video src={mediaPreviewUrl} controls className="max-h-64 w-auto" />
                  ) : (
                    <img src={mediaPreviewUrl} alt="Attached Media" className="max-h-64 w-auto object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={handleRemoveMedia}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 text-white hover:text-red-400 border border-white/20"
                    title="Remove Media"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-border/80 hover:border-primary/60 rounded-xl p-4 text-center cursor-pointer bg-card/20 hover:bg-card/40 transition-all flex flex-col items-center justify-center gap-1.5"
                >
                  <UploadCloud className="w-6 h-6 text-primary" />
                  <p className="text-xs font-mono text-foreground font-bold">Attach Video or Image</p>
                  <p className="text-[10px] font-mono text-muted-foreground">MP4, WebM, MOV, PNG, JPG (up to 100MB)</p>
                </div>
              )}

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Hashtag Suggestion Chips */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-muted-foreground flex items-center gap-1">
                  <Hash size={11} /> Suggested Topics:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {DEFAULT_HASHTAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleAddHashtag(tag)}
                      className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-primary/20 border border-white/10 hover:border-primary/40 text-[10px] font-mono text-muted-foreground hover:text-primary transition-all cursor-pointer"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={isSubscriberOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsSubscriberOnly(!isSubscriberOnly)}
                  className="font-mono text-xs gap-1.5"
                >
                  {isSubscriberOnly ? <Lock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5 text-muted-foreground" />}
                  <span>{isSubscriberOnly ? "Subscribers" : "Public"}</span>
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => closeComposer()}
                  className="font-mono text-xs"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={isPosting || isUploading || (!body.trim() && !mediaFile)}
                  className="font-mono font-bold text-xs gap-1.5 bg-primary text-primary-foreground hover:brightness-110 shadow-md px-5"
                >
                  {isPosting || isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Publish Post</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
