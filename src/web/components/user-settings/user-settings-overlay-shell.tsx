"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  User,
  Settings,
  Paintbrush,
  Film,
  Shield,
  Gamepad2,
  Lock,
  X,
  Minus,
  Square,
  Copy,
  Maximize2,
  Minimize2,
  Search,
  Check,
  Sparkles,
  Sun,
  Moon,
  Palmtree,
  Volume2,
  VolumeX,
  Trash2,
  ExternalLink,
  Eye,
  Heart,
  MessageSquare,
  Layers,
  Save,
  AlertCircle,
  CheckCircle2,
  GripHorizontal,
  ArrowUpRight,
  Palette,
  ChevronDown,
  RefreshCw,
  Trophy,
  Play,
  RotateCcw,
} from "lucide-react";
import { useUserSettingsStore, type UserSettingsTab } from "@/web/hooks/useUserSettingsStore";
import { soundSynth } from "@/engine/sound-synth";
import {
  getUserSettingsData,
  updateUserSettingsProfile,
  changeUserSettingsPassword,
  getUserManagedPosts,
  deleteUserSocialPost,
} from "@/app/actions/user-settings";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";

const USER_SETTINGS_CATEGORIES: { id: UserSettingsTab; label: string; icon: any; description: string }[] = [
  {
    id: "account",
    label: "Account & Profile",
    icon: User,
    description: "Manage your display name, avatar, bio, and showcase media",
  },
  {
    id: "posts",
    label: "Post Management",
    icon: Film,
    description: "Manage your published reels, video posts, analytics, and delete content",
  },
  {
    id: "gaming",
    label: "Gaming & MMO",
    icon: Gamepad2,
    description: "Configure sound synthesis, audio volume, HUD presets and touch controls",
  },
  {
    id: "security",
    label: "Security & Sessions",
    icon: Lock,
    description: "Update account password, session security, and privacy preferences",
  },
];

type TopMenuId = "appearance" | "profile" | "view" | "tools" | null;

export function UserSettingsOverlayShell() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const {
    isOpen,
    activeTab,
    isMinimized,
    isMaximized,
    closeSettings,
    setActiveTab,
    setMinimized,
    setMaximized,
  } = useUserSettingsStore();

  const [mounted, setMounted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeTopMenu, setActiveTopMenu] = useState<TopMenuId>(null);
  const topMenuRef = useRef<HTMLDivElement>(null);

  // Position & size state for floating window
  const [position, setPosition] = useState({ x: 50, y: 40 });
  const [size, setSize] = useState({ width: 1080, height: 680 });
  const [zIndex, setZIndex] = useState(260);

  // Drag & Resize state
  const windowRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragPosRef = useRef({ x: 50, y: 40 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeOrigin = useRef({ x: 0, y: 0, w: 1080, h: 680 });

  // Account form state
  const [userData, setUserData] = useState<any>(null);
  const [nameInput, setNameInput] = useState("");
  const [imageInput, setImageInput] = useState("");
  const [youtubeVideoInput, setYoutubeVideoInput] = useState("");
  const [youtubeMusicInput, setYoutubeMusicInput] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Post management state
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  const permissionLevel = userData?.permissionLevel ?? (session?.user as any)?.permissionLevel ?? 0;
  const isOperator = permissionLevel >= 200 || Boolean((session?.user as any)?.isWriter);
  
  // Gaming state
  const [soundVolume, setSoundVolume] = useState(80);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const isSmall = window.innerWidth < 860;
      setMaximized(isSmall);
      const initW = Math.min(1120, Math.max(760, window.innerWidth - 80));
      const initH = Math.min(740, Math.max(520, window.innerHeight - 80));
      const initX = Math.max(20, Math.floor((window.innerWidth - initW) / 2));
      const initY = Math.max(20, Math.floor((window.innerHeight - initH) / 2));
      setPosition({ x: initX, y: initY });
      setSize({ width: initW, height: initH });
      dragPosRef.current = { x: initX, y: initY };
    }
  }, [setMaximized]);

  // Top menu click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (topMenuRef.current && !topMenuRef.current.contains(e.target as Node)) {
        setActiveTopMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // When requested to open appearance, open the toolbar menu and default to account
  useEffect(() => {
    if (activeTab === "appearance") {
      setActiveTopMenu("appearance");
      setActiveTab("account");
    }
  }, [activeTab, setActiveTab]);

  const loadUserData = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const data = await getUserSettingsData();
      if (data) {
        setUserData(data);
        setNameInput(data.displayName || data.username || "");
        setImageInput(data.image || "");
        setYoutubeVideoInput(data.youtubeVideoUrl || "");
        setYoutubeMusicInput(data.youtubeMusicUrl || "");
      }
    } catch (e) {
      console.error(e);
    }
  }, [session?.user?.id]);

  const resetWindowCenter = useCallback(() => {
    if (typeof window !== "undefined") {
      const initW = Math.min(1080, Math.max(760, window.innerWidth - 80));
      const initH = Math.min(680, Math.max(520, window.innerHeight - 80));
      const initX = Math.max(20, Math.floor((window.innerWidth - initW) / 2));
      const initY = Math.max(20, Math.floor((window.innerHeight - initH) / 2));
      setPosition({ x: initX, y: initY });
      setSize({ width: initW, height: initH });
      setIsCollapsed(false);
      setMaximized(false);
      toast.success("Window reset to center");
    }
  }, [setMaximized]);

  // Load user data & posts when opened
  useEffect(() => {
    if (isOpen && session?.user?.id) {
      loadUserData();
      loadPosts();
    }
  }, [isOpen, session?.user?.id, loadUserData]);

  const loadPosts = async () => {
    setLoadingPosts(true);
    try {
      const res = await getUserManagedPosts(1, 30);
      setUserPosts(res.posts);
      setTotalPosts(res.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPosts(false);
    }
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (
        (e.key === "/" && (e.target as HTMLElement).tagName !== "INPUT" && (e.target as HTMLElement).tagName !== "TEXTAREA") ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchFocused(true);
        return;
      }
      if (e.key === "Escape") {
        if (searchQuery || searchFocused) {
          setSearchQuery("");
          setSearchFocused(false);
          searchInputRef.current?.blur();
        } else {
          closeSettings();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, searchQuery, searchFocused, closeSettings]);

  // Drag & Resize Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMaximized) return;
    if ((e.target as HTMLElement).closest(".window-ctrl-btn")) return;
    if ((e.target as HTMLElement).closest("input, select, textarea, a, button")) return;

    setZIndex((prev) => Math.max(prev + 1, 260));
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
    if (isDragging && !isMaximized) {
      const newX = Math.max(0, Math.min(window.innerWidth - 120, e.clientX - dragOffset.current.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 60, e.clientY - dragOffset.current.y));
      dragPosRef.current = { x: newX, y: newY };
      if (windowRef.current) {
        windowRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
      }
    } else if (isResizing && !isMaximized) {
      const dx = e.clientX - resizeOrigin.current.x;
      const dy = e.clientY - resizeOrigin.current.y;
      const newW = Math.max(540, Math.min(window.innerWidth - position.x - 10, resizeOrigin.current.w + dx));
      const newH = Math.max(400, Math.min(window.innerHeight - position.y - 10, resizeOrigin.current.h + dy));
      setSize({ width: newW, height: newH });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging && !isMaximized) {
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      soundSynth?.playActionSound?.();
      const res = await updateUserSettingsProfile({
        displayName: nameInput,
        image: imageInput,
        youtubeVideoUrl: youtubeVideoInput,
        youtubeMusicUrl: youtubeMusicInput,
      });
      if (res.success) {
        toast.success("Profile settings saved successfully!");
      } else {
        toast.error(res.error || "Failed to update profile.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    setIsSavingPassword(true);
    try {
      soundSynth?.playActionSound?.();
      const res = await changeUserSettingsPassword({
        currentPassword,
        newPassword,
      });
      if (res.success) {
        toast.success("Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(res.error || "Failed to update password.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to change password.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post? This action cannot be undone.")) return;
    try {
      soundSynth?.playSelectSound?.();
      const res = await deleteUserSocialPost(postId);
      if (res.success) {
        toast.success("Post removed successfully.");
        setUserPosts((prev) => prev.filter((p) => p.id !== postId));
        setTotalPosts((prev) => Math.max(0, prev - 1));
      } else {
        toast.error(res.error || "Failed to delete post.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete post.");
    }
  };

  if (!mounted || !isOpen) return null;

  // ─── 1. MINIMIZED FLOATING DOCK CAPSULE ─────────────────────────────────────
  if (isMinimized) {
    return createPortal(
      <div className="fixed bottom-6 right-6 z-[300] animate-in fade-in slide-in-from-bottom-5 duration-200 pointer-events-auto">
        <div className="flex items-center gap-2 p-1.5 pr-2 rounded-full bg-[#050b14]/95 border border-primary/60 shadow-[0_0_25px_rgba(203,178,106,0.35)] backdrop-blur-xl text-slate-200">
          <button
            onClick={() => {
              try { soundSynth?.playUiClick?.(); } catch {}
              setMinimized(false);
            }}
            className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/10 rounded-full transition-all group cursor-pointer"
            title="Restore User Settings"
          >
            <div className="p-1 rounded-full bg-primary/20 text-primary border border-primary/40 group-hover:scale-110 transition-transform">
              <Settings className="h-3.5 w-3.5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-bold tracking-tight text-white font-mono uppercase">
                User Settings
              </span>
              <span className="text-[9px] text-primary font-mono truncate max-w-[140px]">
                {USER_SETTINGS_CATEGORIES.find((c) => c.id === activeTab)?.label}
              </span>
            </div>
            <Maximize2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-white transition-colors ml-1" />
          </button>

          <div className="h-4 w-[1px] bg-border/40 mx-0.5" />

          <button
            onClick={() => closeSettings()}
            className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors cursor-pointer"
            title="Close Settings"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>,
      document.body
    );
  }

  // ─── 2. FLOATING / MAXIMIZED USER SETTINGS OS WINDOW ───────────────────────
  return createPortal(
    <div className={`fixed inset-0 z-[280] pointer-events-none bg-black/40 backdrop-blur-xs flex items-center justify-center ${isMaximized ? "p-0" : "p-2 sm:p-4"}`}>
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
          maxWidth: isMaximized ? "100vw" : "calc(100vw - 10px)",
          maxHeight: isMaximized ? "100vh" : isCollapsed ? "auto" : "calc(100vh - 10px)",
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
        {/* Top Metallic Frame Accent */}
        <div className="h-[2px] w-full bg-gradient-to-r from-primary/20 via-primary/80 to-primary/20 shrink-0" />

        {/* ─── 1. TOP TITLEBAR / DRAG HANDLE ─────────────────────────────────── */}
        <header
          onPointerDown={handlePointerDown}
          onDoubleClick={() => setIsCollapsed((p) => !p)}
          className={`
            h-12 border-b border-white/10 flex items-center justify-between px-3 sm:px-4 shrink-0 gap-3 select-none
            ${isDragging ? "cursor-grabbing bg-[#162238]/95" : isMaximized ? "cursor-default bg-[#0b1320]" : "cursor-move bg-gradient-to-r from-[#162238] via-[#0b1320] to-[#162238]"}
          `}
          title="Drag to move • Double-click to collapse"
        >
          {/* Left: Branding & Tag */}
          <div className="flex items-center gap-2.5 shrink-0 pointer-events-none">
            {!isMaximized && (
              <div className="text-muted-foreground flex items-center shrink-0">
                <GripHorizontal className="h-3.5 w-3.5" />
              </div>
            )}
            <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-foreground">
              <div className="p-1 rounded bg-primary/20 border border-primary/40 text-primary shrink-0">
                <Settings className="h-3.5 w-3.5" />
              </div>
              <span className="font-mono tracking-tight font-black uppercase text-primary">
                User Settings
              </span>
            </div>
          </div>

          {/* Center: Search Filter */}
          <div className="flex-1 max-w-xs sm:max-w-sm relative pointer-events-auto flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search settings ( / or Ctrl+K )..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs bg-background/80 border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/60 transition-all font-mono text-white"
              />
            </div>
            {isOperator && (
              <button
                type="button"
                onClick={() => {
                  closeSettings();
                  window.location.href = "/admin";
                }}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold font-mono hover:bg-amber-500/25 transition-all cursor-pointer shadow-sm shrink-0"
                title="Open Admin Command Center"
              >
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Command Center</span>
              </button>
            )}
          </div>

          {/* Right: Window Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 pointer-events-auto">
            <button
              onClick={() => setIsCollapsed((p) => !p)}
              className="window-ctrl-btn p-1.5 text-muted-foreground hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
              title={isCollapsed ? "Expand Window" : "Collapse"}
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
              onClick={() => closeSettings()}
              className="window-ctrl-btn p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/20 rounded transition-all cursor-pointer"
              title="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        {/* ─── 2. WINDOW DIRECTORY MENU BAR / TOOLBAR ──────────────────────── */}
        {!isCollapsed && (
          <div 
            ref={topMenuRef}
            className="h-8 border-b border-white/10 bg-[#09111e]/95 flex items-center justify-between px-2 sm:px-3 shrink-0 text-xs font-mono select-none relative z-30"
          >
            {/* Left: OS Menu Dropdowns */}
            <div className="flex items-center gap-0.5 sm:gap-1">
              {/* 1. Appearance Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    try { soundSynth?.playUiClick?.(); } catch {}
                    setActiveTopMenu(activeTopMenu === "appearance" ? null : "appearance");
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    activeTopMenu === "appearance" 
                      ? "bg-primary/20 text-primary border border-primary/40 font-bold" 
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  <Paintbrush className="w-3.5 h-3.5 text-primary" />
                  <span>Appearance</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${activeTopMenu === "appearance" ? "rotate-180 text-primary" : "text-muted-foreground"}`} />
                </button>

                {activeTopMenu === "appearance" && (
                  <div className="absolute left-0 top-full mt-1.5 w-64 bg-[#0a1322]/98 backdrop-blur-xl border border-primary/30 rounded-xl shadow-2xl p-2 z-50 text-xs space-y-2 animate-in fade-in-0 zoom-in-95 duration-100">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary border-b border-white/10 flex items-center justify-between">
                      <span>Theme & Visual Style</span>
                      <Sparkles className="w-3 h-3 text-primary" />
                    </div>

                    <div className="space-y-1">
                      {[
                        { id: "dark", label: "Midnight Dark", sub: "Deep Glass", icon: Moon, accent: "text-blue-400" },
                        { id: "light", label: "Sunset Light", sub: "Warm Amber Glow", icon: Sun, accent: "text-amber-500" },
                        { id: "vice", label: "Miami Vice", sub: "Neon Pink & Cyan", icon: Palmtree, accent: "text-pink-400" },
                      ].map((t) => {
                        const Icon = t.icon;
                        const isCurrent = theme === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              try { soundSynth?.playUiClick?.(); } catch {}
                              setTheme(t.id);
                              setActiveTopMenu(null);
                              toast.success(`Activated ${t.label} theme`);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                              isCurrent ? "bg-primary/20 text-primary font-bold border border-primary/40" : "hover:bg-white/5 text-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className={`w-3.5 h-3.5 ${t.accent}`} />
                              <div>
                                <div className="text-[11px] font-bold leading-none">{t.label}</div>
                                <div className="text-[9px] text-muted-foreground mt-0.5">{t.sub}</div>
                              </div>
                            </div>
                            {isCurrent && <Check className="w-3.5 h-3.5 text-primary" />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-1.5 border-t border-white/10">
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Sound Synthesizer
                      </div>
                      <div className="flex items-center justify-between px-2 py-1.5">
                        <span className="text-[11px] text-slate-300">Sound Effects</span>
                        <button
                          type="button"
                          onClick={() => {
                            const next = !soundEnabled;
                            setSoundEnabled(next);
                            if (next) soundSynth?.playActionSound?.();
                            toast.success(next ? "Sound effects enabled" : "Sound effects muted");
                          }}
                          className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                            soundEnabled ? "bg-primary/20 text-primary border border-primary/40" : "bg-muted/40 text-muted-foreground"
                          }`}
                        >
                          {soundEnabled ? "Enabled" : "Muted"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Profile Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    try { soundSynth?.playUiClick?.(); } catch {}
                    setActiveTopMenu(activeTopMenu === "profile" ? null : "profile");
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    activeTopMenu === "profile" 
                      ? "bg-primary/20 text-primary border border-primary/40 font-bold" 
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  <span>Profile</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${activeTopMenu === "profile" ? "rotate-180 text-primary" : "text-muted-foreground"}`} />
                </button>

                {activeTopMenu === "profile" && (
                  <div className="absolute left-0 top-full mt-1.5 w-56 bg-[#0a1322]/98 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-2 z-50 text-xs space-y-1 animate-in fade-in-0 zoom-in-95 duration-100">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-white/10">
                      User Destinations
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTopMenu(null);
                        const uname = userData?.username || session?.user?.name;
                        if (uname) window.open(`/user/${uname}`, "_blank");
                        else toast.error("Profile not found");
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-white/5 text-slate-300 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-[11px]">View Public Profile</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTopMenu(null);
                        window.location.href = "/profile/inbox";
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-white/5 text-slate-300 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-pink-400" />
                      <span className="text-[11px]">Inbox & Dashboard</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTopMenu(null);
                        window.location.href = "/ucp";
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-white/5 text-slate-300 transition-colors cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[11px]">User Control Panel (UCP)</span>
                    </button>

                    {isOperator && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTopMenu(null);
                          closeSettings();
                          window.location.href = "/admin";
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold transition-colors cursor-pointer border border-amber-500/20"
                      >
                        <Shield className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[11px]">Admin Command Center</span>
                      </button>
                    )}

                    <div className="pt-1 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTopMenu(null);
                          const uname = userData?.username || session?.user?.name;
                          if (uname) {
                            const url = `${window.location.origin}/user/${uname}`;
                            navigator.clipboard.writeText(url);
                            toast.success("Profile link copied to clipboard!");
                          }
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-white/5 text-slate-300 transition-colors cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[11px]">Copy Profile URL</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTopMenu(null);
                          loadUserData();
                          toast.success("Profile data refreshed");
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-white/5 text-slate-300 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[11px]">Refresh User Data</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. View / Navigate Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    try { soundSynth?.playUiClick?.(); } catch {}
                    setActiveTopMenu(activeTopMenu === "view" ? null : "view");
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    activeTopMenu === "view" 
                      ? "bg-primary/20 text-primary border border-primary/40 font-bold" 
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  <span>View</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${activeTopMenu === "view" ? "rotate-180 text-primary" : "text-muted-foreground"}`} />
                </button>

                {activeTopMenu === "view" && (
                  <div className="absolute left-0 top-full mt-1.5 w-56 bg-[#0a1322]/98 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-2 z-50 text-xs space-y-1 animate-in fade-in-0 zoom-in-95 duration-100">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-white/10">
                      Jump To Section
                    </div>

                    {USER_SETTINGS_CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = activeTab === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            try { soundSynth?.playUiClick?.(); } catch {}
                            setActiveTab(cat.id);
                            setActiveTopMenu(null);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                            isSelected ? "bg-primary/20 text-primary font-bold" : "hover:bg-white/5 text-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="w-3.5 h-3.5 text-primary" />
                            <span className="text-[11px]">{cat.label}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 4. Tools & Actions Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    try { soundSynth?.playUiClick?.(); } catch {}
                    setActiveTopMenu(activeTopMenu === "tools" ? null : "tools");
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    activeTopMenu === "tools" 
                      ? "bg-primary/20 text-primary border border-primary/40 font-bold" 
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tools</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${activeTopMenu === "tools" ? "rotate-180 text-primary" : "text-muted-foreground"}`} />
                </button>

                {activeTopMenu === "tools" && (
                  <div className="absolute left-0 top-full mt-1.5 w-60 bg-[#0a1322]/98 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-2 z-50 text-xs space-y-1 animate-in fade-in-0 zoom-in-95 duration-100">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-white/10">
                      Quick Shortcuts & Window
                    </div>

                    {isOperator && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTopMenu(null);
                          closeSettings();
                          window.location.href = "/admin";
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold transition-colors cursor-pointer border border-amber-500/20"
                      >
                        <Shield className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[11px]">Admin Command Center</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTopMenu(null);
                        closeSettings();
                        window.dispatchEvent(new CustomEvent("saints-open-post-composer"));
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-white/5 text-slate-300 transition-colors cursor-pointer"
                    >
                      <Film className="w-3.5 h-3.5 text-pink-400" />
                      <span className="text-[11px]">Compose Post / Reel</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTopMenu(null);
                        window.location.href = "/achievements";
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-white/5 text-slate-300 transition-colors cursor-pointer"
                    >
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[11px]">Badges & Achievements</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTopMenu(null);
                        window.location.href = "/lobby";
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-white/5 text-slate-300 transition-colors cursor-pointer"
                    >
                      <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[11px]">Enter The Lobby MMO</span>
                    </button>

                    <div className="pt-1 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTopMenu(null);
                          resetWindowCenter();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-white/5 text-slate-300 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-[11px]">Reset Window Position</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Quick Toolbar Action Buttons */}
            <div className="flex items-center gap-1.5 text-muted-foreground">
              {/* Quick Theme Cycle Button */}
              <button
                type="button"
                onClick={() => {
                  try { soundSynth?.playUiClick?.(); } catch {}
                  const next = theme === "dark" ? "light" : theme === "light" ? "vice" : "dark";
                  setTheme(next);
                  toast.success(`Switched to ${next === "dark" ? "Midnight Dark" : next === "light" ? "Sunset Light" : "Miami Vice"}`);
                }}
                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-[11px]"
                title={`Theme: ${theme || "dark"} (Click to cycle)`}
              >
                {theme === "light" ? (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                ) : theme === "vice" ? (
                  <Palmtree className="w-3.5 h-3.5 text-pink-400" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-blue-400" />
                )}
                <span className="hidden sm:inline font-mono uppercase text-[10px] tracking-tight">{theme || "dark"}</span>
              </button>

              {/* Quick Audio Mute Toggle */}
              <button
                type="button"
                onClick={() => {
                  const next = !soundEnabled;
                  setSoundEnabled(next);
                  if (next) soundSynth?.playActionSound?.();
                  toast.success(next ? "Sound effects enabled" : "Sound effects muted");
                }}
                className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                title={soundEnabled ? "Mute Sound Effects" : "Enable Sound Effects"}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-primary" /> : <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>
            </div>
          </div>
        )}

        {/* ─── 3. CATEGORY TABS (LEVEL 1) ────────────────────────────────────── */}
        {!isCollapsed && (
          <div className="bg-[#070e1a]/95 border-b border-white/10 px-2 sm:px-4 py-1.5 flex items-center justify-between gap-1 overflow-x-auto custom-scrollbar shrink-0 select-none">
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-max">
              {USER_SETTINGS_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = activeTab === cat.id;

                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      try { soundSynth?.playUiClick?.(); } catch {}
                      setActiveTab(cat.id);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary/20 text-primary border border-primary/50 shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── 4. MAIN CONTENT BODY ────────────────────────────────────────── */}
        {!isCollapsed && (
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-6">
            {/* ── TAB 1: ACCOUNT & PROFILE ───────────────────────────────────── */}
            {(activeTab === "account" || activeTab === "appearance") && (
              <form onSubmit={handleSaveProfile} className="space-y-6 max-w-3xl">
                <div>
                  <h3 className="text-base sm:text-lg font-bold font-mono text-foreground flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    <span>Account Profile & Showcase Details</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Update your public gamer identity, avatar, and media embeds.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-muted-foreground mb-1.5">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Your Display Name"
                      className="w-full h-9 px-3 text-xs bg-black/50 border border-border rounded-xl font-mono text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-muted-foreground mb-1.5">
                      Avatar URL
                    </label>
                    <input
                      type="url"
                      value={imageInput}
                      onChange={(e) => setImageInput(e.target.value)}
                      placeholder="https://example.com/avatar.png"
                      className="w-full h-9 px-3 text-xs bg-black/50 border border-border rounded-xl font-mono text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-muted-foreground mb-1.5">
                      YouTube Video Showcase URL
                    </label>
                    <input
                      type="url"
                      value={youtubeVideoInput}
                      onChange={(e) => setYoutubeVideoInput(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full h-9 px-3 text-xs bg-black/50 border border-border rounded-xl font-mono text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-muted-foreground mb-1.5">
                      Profile Music Background URL
                    </label>
                    <input
                      type="url"
                      value={youtubeMusicInput}
                      onChange={(e) => setYoutubeMusicInput(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full h-9 px-3 text-xs bg-black/50 border border-border rounded-xl font-mono text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSavingProfile}
                    className="font-mono font-bold text-xs"
                  >
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    {isSavingProfile ? "Saving Profile..." : "Save Profile"}
                  </Button>
                </div>
              </form>
            )}

            {/* ── TAB 3: POST & FEED MANAGEMENT ──────────────────────────────── */}
            {activeTab === "posts" && (
              <div className="space-y-6 max-w-4xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold font-mono text-foreground flex items-center gap-2">
                      <Film className="w-4 h-4 text-primary" />
                      <span>Post & Reel Management</span>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      View, review engagement, and delete your published content ({totalPosts} total).
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadPosts}
                    disabled={loadingPosts}
                    className="font-mono text-xs"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${loadingPosts ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>

                {loadingPosts ? (
                  <div className="py-12 text-center text-xs font-mono text-muted-foreground animate-pulse">
                    Loading your published posts...
                  </div>
                ) : userPosts.length === 0 ? (
                  <div className="py-12 text-center bg-card/30 rounded-2xl border border-dashed border-border p-6">
                    <Film className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-bold text-foreground font-mono">No Posts Found</p>
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      You have not published any reels or feed updates yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userPosts.map((post) => (
                      <div
                        key={post.id}
                        className="p-3.5 rounded-xl border border-border/60 bg-card/40 hover:bg-card/70 transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {post.mediaUrl ? (
                            <div className="w-12 h-12 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden relative">
                              <Film className="w-5 h-5 text-primary" />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                              <MessageSquare className="w-5 h-5 text-primary" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-mono text-foreground line-clamp-1">
                              {post.body || "Media Upload"}
                            </p>
                            <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3 text-cyan-400" />
                                {post.viewCount} Views
                              </span>
                              <span className="flex items-center gap-1">
                                <Heart className="w-3 h-3 text-rose-400" />
                                {post.likeCount} Likes
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageSquare className="w-3 h-3 text-amber-400" />
                                {post.replyCount} Replies
                              </span>
                              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeletePost(post.id)}
                            className="font-mono text-xs h-8 px-2.5"
                            title="Delete Post"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 4: GAMING & MMO PREFERENCES ────────────────────────────── */}
            {activeTab === "gaming" && (
              <div className="space-y-6 max-w-3xl">
                <div>
                  <h3 className="text-base sm:text-lg font-bold font-mono text-foreground flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4 text-primary" />
                    <span>MMO Sound & Controls</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Adjust in-game sound synthesis effects, audio volume, and HUD scaling.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border/60 bg-card/40 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs font-mono text-foreground">Sound FX & Audio Synth</div>
                      <div className="text-[11px] font-mono text-muted-foreground">Play UI clicks, level up cues, and battle sound effects</div>
                    </div>
                    <Button
                      variant={soundEnabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setSoundEnabled(!soundEnabled);
                        soundSynth?.playActionSound?.();
                      }}
                      className="font-mono text-xs"
                    >
                      {soundEnabled ? <Volume2 className="w-3.5 h-3.5 mr-1" /> : <VolumeX className="w-3.5 h-3.5 mr-1" />}
                      {soundEnabled ? "Enabled" : "Muted"}
                    </Button>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs font-mono text-foreground">Test Sound Engine</div>
                      <div className="text-[11px] font-mono text-muted-foreground">Verify WebAudio synthesizer output</div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => soundSynth?.playLevelUpSound?.()}
                      className="font-mono text-xs"
                    >
                      <Play className="w-3.5 h-3.5 mr-1" />
                      Play Level Up Sound
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 5: SECURITY & SESSIONS ─────────────────────────────────── */}
            {activeTab === "security" && (
              <form onSubmit={handleSavePassword} className="space-y-6 max-w-3xl">
                <div>
                  <h3 className="text-base sm:text-lg font-bold font-mono text-foreground flex items-center gap-2">
                    <Lock className="w-4 h-4 text-primary" />
                    <span>Security & Password Management</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Update your account credentials to keep your profile secure.
                  </p>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-mono text-muted-foreground mb-1.5">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-9 px-3 text-xs bg-black/50 border border-border rounded-xl font-mono text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-muted-foreground mb-1.5">
                      New Password (Min 8 Characters)
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-9 px-3 text-xs bg-black/50 border border-border rounded-xl font-mono text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-muted-foreground mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-9 px-3 text-xs bg-black/50 border border-border rounded-xl font-mono text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSavingPassword || !newPassword}
                    className="font-mono font-bold text-xs"
                  >
                    <Lock className="w-3.5 h-3.5 mr-1.5" />
                    {isSavingPassword ? "Updating Password..." : "Update Password"}
                  </Button>
                </div>
              </form>
            )}
          </main>
        )}
      </div>
    </div>,
    document.body
  );
}
