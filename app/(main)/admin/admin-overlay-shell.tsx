"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { 
  Shield, X, Search, Star, ChevronRight,
  Minus, Square, Maximize2, Minimize2, Copy,
  Radio, Database, GripHorizontal, ArrowUpRight
} from "lucide-react";
import { 
  getCategorizedAdminModules, 
  getActiveAdminModule, 
  getAdminModuleById, 
  searchAdminModules,
  ADMIN_CATEGORIES,
  type AdminModule,
  type AdminCategoryId
} from "@/web/lib/admin-modules";
import { getRoleName, getRoleColor } from "@/web/lib/permissions";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { soundSynth } from "@/engine/sound-synth";

const STORAGE_KEY_FAVORITES = "sg_admin_favorites";
const STORAGE_KEY_RECENTS = "sg_admin_recents";
const STORAGE_KEY_LAST_NON_ADMIN = "sg_last_non_admin_route";
const STORAGE_KEY_WINDOW_STATE = "sg_admin_window_state_v2";

export interface AdminWindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
  isMinimized: boolean;
  isCollapsed: boolean;
}

export interface AdminShellUser {
  id?: string;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  image?: string | null;
}

export function AdminOverlayShell({ 
  children, 
  permissionLevel, 
  isWriter,
  user
}: { 
  children: React.ReactNode;
  permissionLevel: number;
  isWriter: boolean;
  user?: AdminShellUser;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recents, setRecents] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  // Active Category Tab selection (auto-synced with route or user clicked)
  const [selectedCategory, setSelectedCategory] = useState<AdminCategoryId | "favorites">("overview");

  // Window State (Floating OS Window over the page)
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [position, setPosition] = useState({ x: 40, y: 30 });
  const [size, setSize] = useState({ width: 1240, height: 760 });
  const [zIndex, setZIndex] = useState(100);

  // Dragging & Resizing Refs for 60fps GPU-composited transforms
  const windowRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragPosRef = useRef({ x: 40, y: 30 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeOrigin = useRef({ x: 0, y: 0, w: 1240, h: 760, edge: "se" });

  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Active page route visible behind the floating Admin OS window
  const [underlyingUrl, setUnderlyingUrl] = useState<string>("/");

  useEffect(() => {
    try {
      const fromParam = searchParams.get("from");
      if (fromParam && fromParam.startsWith("/") && !fromParam.startsWith("/admin")) {
        setUnderlyingUrl(fromParam);
        return;
      }
      const saved = sessionStorage.getItem(STORAGE_KEY_LAST_NON_ADMIN);
      if (saved && saved.startsWith("/") && !saved.startsWith("/admin")) {
        setUnderlyingUrl(saved);
        return;
      }
    } catch {
      // ignore
    }
  }, [searchParams]);

  // Load favorites, recents, and window state on mount
  useEffect(() => {
    setMounted(true);

    try {
      const savedFavs = localStorage.getItem(STORAGE_KEY_FAVORITES);
      if (savedFavs) setFavorites(JSON.parse(savedFavs));

      const savedRecents = localStorage.getItem(STORAGE_KEY_RECENTS);
      if (savedRecents) setRecents(JSON.parse(savedRecents));

      const savedWindowState = localStorage.getItem(STORAGE_KEY_WINDOW_STATE);
      if (savedWindowState) {
        const state: AdminWindowState = JSON.parse(savedWindowState);
        if (typeof state.x === "number" && typeof state.y === "number") {
          const clampedX = Math.max(10, Math.min(window.innerWidth - 300, state.x));
          const clampedY = Math.max(10, Math.min(window.innerHeight - 150, state.y));
          setPosition({ x: clampedX, y: clampedY });
          dragPosRef.current = { x: clampedX, y: clampedY };
        }
        if (typeof state.width === "number" && typeof state.height === "number") {
          const clampedW = Math.max(540, Math.min(window.innerWidth - 20, state.width));
          const clampedH = Math.max(400, Math.min(window.innerHeight - 20, state.height));
          setSize({ width: clampedW, height: clampedH });
        }
        if (typeof state.isMaximized === "boolean") {
          setIsMaximized(window.innerWidth < 860 ? true : state.isMaximized);
        }
        if (typeof state.isCollapsed === "boolean") setIsCollapsed(state.isCollapsed);
      } else {
        if (typeof window !== "undefined") {
          if (window.innerWidth < 860) {
            setIsMaximized(true);
          } else {
            const initialW = Math.min(1360, Math.max(840, window.innerWidth - 100));
            const initialH = Math.min(840, Math.max(540, window.innerHeight - 80));
            const initialX = Math.max(20, Math.floor((window.innerWidth - initialW) / 2));
            const initialY = Math.max(20, Math.floor((window.innerHeight - initialH) / 2));
            setPosition({ x: initialX, y: initialY });
            setSize({ width: initialW, height: initialH });
            dragPosRef.current = { x: initialX, y: initialY };
          }
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Save window state on changes
  const persistWindowState = useCallback((overrides?: Partial<AdminWindowState>) => {
    try {
      const state: AdminWindowState = {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
        isMaximized,
        isMinimized,
        isCollapsed,
        ...overrides,
      };
      localStorage.setItem(STORAGE_KEY_WINDOW_STATE, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [position, size, isMaximized, isMinimized, isCollapsed]);

  // Resolve active module & category for navigation
  const activeModule = useMemo(() => getActiveAdminModule(pathname), [pathname]);

  // Update selected category tab when pathname changes
  useEffect(() => {
    if (activeModule) {
      setSelectedCategory(activeModule.category);
    }
  }, [activeModule]);

  // Update recents when pathname changes
  useEffect(() => {
    if (activeModule) {
      setRecents((prev) => {
        const filtered = prev.filter((id) => id !== activeModule.id);
        const updated = [activeModule.id, ...filtered].slice(0, 6);
        try {
          localStorage.setItem(STORAGE_KEY_RECENTS, JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });
    }
  }, [activeModule]);

  // Handle window resizing from screen viewport changes
  useEffect(() => {
    const handleViewportResize = () => {
      if (window.innerWidth < 860) {
        setIsMaximized(true);
      } else {
        setPosition((prev) => ({
          x: Math.max(10, Math.min(window.innerWidth - 300, prev.x)),
          y: Math.max(10, Math.min(window.innerHeight - 150, prev.y)),
        }));
        setSize((prev) => ({
          width: Math.min(window.innerWidth - 20, Math.max(540, prev.width)),
          height: Math.min(window.innerHeight - 20, Math.max(400, prev.height)),
        }));
      }
    };
    window.addEventListener("resize", handleViewportResize);
    return () => window.removeEventListener("resize", handleViewportResize);
  }, []);

  // Global Keyboard shortcuts (/ or Ctrl+K to search, Escape to close search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "/" && (e.target as HTMLElement).tagName !== "INPUT" && (e.target as HTMLElement).tagName !== "TEXTAREA") ||
          ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
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
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchQuery, searchFocused]);

  // Click away from search to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleFavorite = useCallback((moduleId: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    try { soundSynth?.playUiClick?.(); } catch {}
    setFavorites((prev) => {
      const exists = prev.includes(moduleId);
      const next = exists ? prev.filter((id) => id !== moduleId) : [...prev, moduleId];
      try {
        localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const bringToTop = useCallback(() => {
    setZIndex((prev) => Math.max(prev + 1, 100));
  }, []);

  const handleClose = () => {
    try { soundSynth?.playUiClick?.(); } catch {}
    const fromParam = searchParams.get("from");
    if (fromParam && fromParam.startsWith("/")) {
      router.push(fromParam);
      return;
    }

    try {
      const lastRoute = sessionStorage.getItem(STORAGE_KEY_LAST_NON_ADMIN);
      if (lastRoute && lastRoute.startsWith("/") && !lastRoute.startsWith("/admin")) {
        router.push(lastRoute);
        return;
      }
    } catch {
      // ignore
    }

    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/home");
    }
  };

  const toggleMaximize = () => {
    try { soundSynth?.playUiClick?.(); } catch {}
    setIsMaximized((prev) => {
      const next = !prev;
      persistWindowState({ isMaximized: next });
      return next;
    });
  };

  const toggleMinimize = () => {
    try { soundSynth?.playUiClick?.(); } catch {}
    setIsMinimized((prev) => {
      const next = !prev;
      persistWindowState({ isMinimized: next });
      return next;
    });
  };

  const toggleCollapse = () => {
    try { soundSynth?.playUiClick?.(); } catch {}
    setIsCollapsed((prev) => {
      const next = !prev;
      persistWindowState({ isCollapsed: next });
      return next;
    });
  };

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMaximized) return;
    if ((e.target as HTMLElement).closest(".window-control-btn")) return;
    if ((e.target as HTMLElement).closest("input, select, textarea, a, button")) return;

    bringToTop();
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

  const handleResizeDown = (e: React.PointerEvent<HTMLDivElement>, edge = "se") => {
    if (isMaximized) return;
    e.stopPropagation();
    bringToTop();
    setIsResizing(true);
    resizeOrigin.current = {
      x: e.clientX,
      y: e.clientY,
      w: size.width,
      h: size.height,
      edge,
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
      
      const newW = resizeOrigin.current.edge.includes("e")
        ? Math.max(540, Math.min(window.innerWidth - position.x - 10, resizeOrigin.current.w + dx))
        : size.width;
      const newH = resizeOrigin.current.edge.includes("s")
        ? Math.max(400, Math.min(window.innerHeight - position.y - 10, resizeOrigin.current.h + dy))
        : size.height;

      setSize({ width: newW, height: newH });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging && !isMaximized) {
      const finalX = dragPosRef.current.x;
      const finalY = dragPosRef.current.y;
      setPosition({ x: finalX, y: finalY });
      persistWindowState({ x: finalX, y: finalY });
      if (windowRef.current) {
        windowRef.current.style.transform = "";
      }
    }
    if (isResizing && !isMaximized) {
      persistWindowState({ width: size.width, height: size.height });
    }
    if (isDragging || isResizing) {
      setIsDragging(false);
      setIsResizing(false);
      if (windowRef.current) {
        try {
          windowRef.current.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }
    }
  };

  // Filter categorized modules
  const categorizedModules = useMemo(
    () => getCategorizedAdminModules(permissionLevel, isWriter),
    [permissionLevel, isWriter]
  );

  // Search filtered modules
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return searchAdminModules(searchQuery, permissionLevel, isWriter);
  }, [searchQuery, permissionLevel, isWriter]);

  // Resolve favorites and recents modules
  const favoriteModules = useMemo(() => {
    return favorites
      .map((id) => getAdminModuleById(id))
      .filter((m): m is AdminModule => Boolean(m && (isWriter && m.allowWriter ? true : permissionLevel >= m.permission)));
  }, [favorites, permissionLevel, isWriter]);

  // Resolve active category module list
  const currentCategoryModules = useMemo(() => {
    if (selectedCategory === "favorites") {
      return favoriteModules;
    }
    const catGroup = categorizedModules.find((c) => c.category.id === selectedCategory);
    return catGroup ? catGroup.modules : [];
  }, [selectedCategory, categorizedModules, favoriteModules]);

  const roleName = isWriter && permissionLevel < 200 ? "Official Writer" : getRoleName(permissionLevel);
  const roleColor = getRoleColor(permissionLevel);

  if (!mounted) return null;

  // ─── 1. MINIMIZED FLOATING DOCK CAPSULE ─────────────────────────────────────
  if (isMinimized) {
    return createPortal(
      <>
        {/* Underlying active page behind minimized admin dock */}
        <div className="fixed inset-0 z-[40] pointer-events-auto bg-background overflow-hidden">
          <iframe
            src={underlyingUrl}
            title="Active Website Page"
            className="w-full h-full border-none select-auto"
          />
        </div>

        <div 
          className="fixed bottom-6 right-6 z-[100] animate-in fade-in slide-in-from-bottom-5 duration-200"
          style={{ touchAction: "none" }}
        >
          <div className="flex items-center gap-2 p-1.5 pr-2 rounded-full bg-[#050b14]/95 border border-[#cbb26a]/60 shadow-[0_0_25px_rgba(203,178,106,0.35)] backdrop-blur-xl text-slate-200">
            <button
              onClick={() => {
                try { soundSynth?.playUiClick?.(); } catch {}
                setIsMinimized(false);
                persistWindowState({ isMinimized: false });
              }}
              className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/10 rounded-full transition-all group cursor-pointer"
              title="Restore Admin Control Center"
            >
              <div className="p-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 group-hover:scale-110 transition-transform">
                <Shield className="h-3.5 w-3.5" />
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold tracking-tight text-white font-mono uppercase">
                    Admin OS
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <span className="text-[9px] text-[#cbb26a] font-mono truncate max-w-[140px]">
                  {activeModule?.label || "Command Center"}
                </span>
              </div>
              <Maximize2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-white transition-colors ml-1" />
            </button>

            <div className="h-4 w-[1px] bg-border/40 mx-0.5" />

            <button
              onClick={handleClose}
              className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors"
              title="Exit Admin Panel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </>,
      document.body
    );
  }

  // ─── 2. FLOATING / MAXIMIZED STUDIO WINDOW SHELL (OVER ACTIVE WEBSITE PAGE) ───
  return createPortal(
    <>
      {/* Underlying active page behind floating admin OS window */}
      <div className="fixed inset-0 z-[40] pointer-events-auto bg-background overflow-hidden">
        <iframe
          src={underlyingUrl}
          title="Active Website Page"
          className="w-full h-full border-none select-auto"
        />
      </div>

      <div 
        className={`fixed inset-0 z-[100] pointer-events-none bg-black/25 ${
          isMaximized ? "p-0" : "p-2 sm:p-4"
        }`}
      >
      <div
        ref={windowRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onMouseDown={bringToTop}
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
          ${isMaximized ? "rounded-none border-border/40" : "rounded-xl border shadow-2xl"}
          bg-[#050b14]/98 text-slate-200 border-[#806f47]/50 shadow-[0_25px_70px_rgba(0,0,0,0.9)]
          ${isDragging ? "border-[#cbb26a] shadow-[0_0_35px_rgba(203,178,106,0.35)] cursor-grabbing" : ""}
        `}
      >
        {/* Top Metallic Studio Frame Accent */}
        <div className="h-[2px] w-full bg-gradient-to-r from-[#806f47]/20 via-[#cbb26a]/90 to-[#806f47]/20 shrink-0" />

        {/* ─── 1. TOP HEADER / DRAG HANDLE WITH SEARCH & WINDOW CONTROLS ──────── */}
        <header
          onPointerDown={handlePointerDown}
          onDoubleClick={toggleCollapse}
          className={`
            h-12 border-b border-[#806f47]/30 flex items-center justify-between px-3 sm:px-4 shrink-0 gap-3 select-none
            ${isDragging ? "cursor-grabbing bg-[#162238]/95" : isMaximized ? "cursor-default bg-[#0b1320]" : "cursor-move bg-gradient-to-r from-[#162238] via-[#0b1320] to-[#162238]"}
          `}
          title="Drag to move window • Double-click to collapse/expand"
        >
          {/* Left: Grip Handle + Branding */}
          <div className="flex items-center gap-2.5 shrink-0 pointer-events-none">
            {!isMaximized && (
              <div className="text-[#806f47]/60 flex items-center shrink-0">
                <GripHorizontal className="h-3.5 w-3.5" />
              </div>
            )}
            
            {/* Shield Icon + Admin OS Title */}
            <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-foreground">
              <div className="p-1 rounded bg-red-500/15 border border-red-500/30 text-red-400 shrink-0">
                <Shield className="h-3.5 w-3.5" />
              </div>
              <span className="font-mono tracking-tight font-black uppercase text-[#cbb26a] hidden xs:inline">
                Admin OS
              </span>
            </div>

            {/* Live Indicator */}
            <div className="hidden md:flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE</span>
            </div>
          </div>

          {/* Center: Repositioned Search Bar with Instant Dropdown Palette */}
          <div 
            ref={searchContainerRef}
            className="flex-1 max-w-xs sm:max-w-sm md:max-w-md relative pointer-events-auto"
          >
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search modules ( / or Ctrl+K )..."
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchFocused(true);
                }}
                className="w-full h-8 pl-8 pr-16 text-xs bg-background/80 border border-[#806f47]/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#cbb26a] focus:border-[#cbb26a] placeholder:text-muted-foreground/60 transition-all font-mono text-white shadow-inner"
              />
              <div className="absolute right-2 flex items-center gap-1">
                {searchQuery ? (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      searchInputRef.current?.focus();
                    }}
                    className="p-0.5 text-muted-foreground hover:text-white rounded"
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-block text-[9px] font-mono text-muted-foreground/70 bg-white/5 border border-border/40 px-1 py-0.2 rounded">
                    /
                  </kbd>
                )}
              </div>
            </div>

            {/* Live Search Results Dropdown Palette */}
            {searchFocused && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-[#050b14]/98 border border-[#cbb26a]/50 rounded-xl shadow-[0_15px_45px_rgba(0,0,0,0.9)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="p-2 border-b border-[#806f47]/30 bg-[#0b1320] flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-[#cbb26a] uppercase">
                    Matching Modules ({searchResults?.length || 0})
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground">ESC to close</span>
                </div>
                <div className="max-h-[300px] overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
                  {!searchResults || searchResults.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground italic">
                      No admin modules match &quot;{searchQuery}&quot;
                    </div>
                  ) : (
                    searchResults.map((item) => {
                      const Icon = item.icon;
                      const isFav = favorites.includes(item.id);
                      const cat = ADMIN_CATEGORIES[item.category];
                      return (
                        <div
                          key={item.id}
                          className="group flex items-center justify-between p-2 rounded-lg hover:bg-[#cbb26a]/15 hover:border-[#cbb26a]/40 border border-transparent transition-all cursor-pointer"
                          onClick={() => {
                            try { soundSynth?.playUiClick?.(); } catch {}
                            setSearchFocused(false);
                            setSearchQuery("");
                            router.push(item.href);
                          }}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-1.5 rounded-md bg-[#162238] border border-[#806f47]/40 text-[#cbb26a] shrink-0">
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-white group-hover:text-[#cbb26a] transition-colors truncate">
                                  {item.label}
                                </span>
                                {cat && (
                                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/5 text-muted-foreground border border-border/40">
                                    {cat.shortLabel}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <button
                              onClick={(e) => toggleFavorite(item.id, e)}
                              className="p-1 text-muted-foreground hover:text-amber-400"
                              title={isFav ? "Unpin Favorite" : "Pin Favorite"}
                            >
                              <Star className={`h-3 w-3 ${isFav ? "fill-amber-400 text-amber-400" : ""}`} />
                            </button>
                            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-white transition-colors" />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: Operator Badge & Window Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 pointer-events-auto">
            {/* Operator Identity Tag */}
            <div className="hidden lg:flex items-center gap-2 px-2 py-1 rounded-lg bg-background/50 border border-border/40">
              <Avatar className="h-5 w-5 border border-primary/30">
                <AvatarImage src={user?.image || ""} alt={user?.username || "Admin"} />
                <AvatarFallback className="bg-[#cbb26a]/20 text-[#cbb26a] text-[10px] font-bold">
                  {user?.username?.charAt(0).toUpperCase() || "A"}
                </AvatarFallback>
              </Avatar>
              <span className="text-[11px] font-bold text-white truncate max-w-[90px] font-mono">
                {user?.username || user?.name || "Operator"}
              </span>
              <span className={`text-[9px] font-mono font-semibold ${roleColor} uppercase`}>
                {roleName}
              </span>
            </div>

            {/* Active Page Indicator */}
            {underlyingUrl && (
              <span
                className="hidden xl:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-lg bg-background/50 border border-border/40 text-muted-foreground"
                title={`Active page visible behind admin window: ${underlyingUrl}`}
              >
                <span className="text-[#cbb26a] font-semibold">Over:</span> {underlyingUrl}
              </span>
            )}

            {/* Collapse Body Button */}
            <button
              onClick={(e) => { e.stopPropagation(); toggleCollapse(); }}
              className="window-control-btn p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
              title={isCollapsed ? "Expand Window Body" : "Collapse to Titlebar"}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>

            {/* Minimize to Dock Capsule */}
            <button
              onClick={(e) => { e.stopPropagation(); toggleMinimize(); }}
              className="window-control-btn p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
              title="Minimize to Dock Pill"
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </button>

            {/* Maximize / Restore Toggle */}
            <button
              onClick={(e) => { e.stopPropagation(); toggleMaximize(); }}
              className="window-control-btn p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
              title={isMaximized ? "Restore Floating Window" : "Maximize Window"}
            >
              {isMaximized ? <Copy className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
            </button>

            {/* Close / Return Button */}
            <button
              onClick={(e) => { e.stopPropagation(); handleClose(); }}
              className="window-control-btn p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/20 border border-transparent hover:border-red-500/30 rounded transition-all"
              title="Exit Admin Control Center"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        {/* ─── 2. TOP CATEGORY TABS (LEVEL 1) ─────────────────────────────────── */}
        {!isCollapsed && (
          <div className="bg-[#070e1a]/95 border-b border-[#806f47]/30 px-2 sm:px-4 py-1.5 flex items-center justify-between gap-1 overflow-x-auto custom-scrollbar shrink-0 select-none">
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-max">
              
              {/* Optional Pinned Favorites Tab */}
              {favoriteModules.length > 0 && (
                <button
                  onClick={() => {
                    try { soundSynth?.playUiClick?.(); } catch {}
                    setSelectedCategory("favorites");
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-all ${
                    selectedCategory === "favorites"
                      ? "bg-amber-400/20 text-amber-400 border border-amber-400/50 shadow-[0_0_12px_rgba(251,191,36,0.25)]"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                  }`}
                  title="Pinned Favorite Modules"
                >
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span>Favorites</span>
                  <span className="text-[9px] px-1 py-0.2 rounded-full bg-amber-400/20 text-amber-300">
                    {favoriteModules.length}
                  </span>
                </button>
              )}

              {/* Category Tabs */}
              {categorizedModules.map(({ category, modules }) => {
                const CategoryIcon = category.icon;
                const isSelected = selectedCategory === category.id;
                const isCurrentRouteCat = activeModule?.category === category.id;

                return (
                  <button
                    key={category.id}
                    onClick={() => {
                      try { soundSynth?.playUiClick?.(); } catch {}
                      setSelectedCategory(category.id);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-all relative ${
                      isSelected
                        ? "bg-[#cbb26a]/20 text-[#cbb26a] border border-[#cbb26a]/50 font-bold shadow-[0_0_15px_rgba(203,178,106,0.2)]"
                        : "text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <CategoryIcon className="h-3.5 w-3.5 shrink-0" />
                    <span>{category.shortLabel}</span>
                    <span className={`text-[9px] px-1 py-0.2 rounded-full font-mono ${
                      isSelected ? "bg-[#cbb26a]/30 text-[#cbb26a]" : "bg-white/5 text-muted-foreground"
                    }`}>
                      {modules.length}
                    </span>
                    {/* Small pulse dot if this category contains the active route */}
                    {isCurrentRouteCat && !isSelected && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#cbb26a] animate-pulse ml-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right: Breadcrumb active module label */}
            <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground pl-3 shrink-0">
              <span className="text-slate-500">Active:</span>
              <span className="text-white font-bold">{activeModule?.label || "Overview"}</span>
            </div>
          </div>
        )}

        {/* ─── 3. MODULE SUB-NAVIGATION BAR (LEVEL 2 CHIPS) ───────────────────── */}
        {!isCollapsed && (
          <div className="bg-[#050b14]/80 border-b border-[#806f47]/20 px-2 sm:px-4 py-1.5 flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0 select-none">
            {currentCategoryModules.length === 0 ? (
              <span className="text-xs text-muted-foreground/60 italic px-2">No modules available</span>
            ) : (
              currentCategoryModules.map((item) => {
                const Icon = item.icon;
                const isActive = item.exact ? pathname === item.href : (pathname === item.href || pathname.startsWith(item.href + "/"));
                const isFav = favorites.includes(item.id);

                return (
                  <div key={item.id} className="relative flex items-center group shrink-0">
                    <Link
                      href={item.href}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-all pr-6 ${
                        isActive
                          ? "bg-[#cbb26a]/20 text-[#cbb26a] border border-[#cbb26a]/50 font-bold shadow-sm"
                          : "text-slate-300 hover:text-white hover:bg-white/5 border border-border/30"
                      }`}
                    >
                      <Icon className="h-3 w-3 shrink-0" />
                      <span className="truncate max-w-[150px] sm:max-w-[200px]">{item.label}</span>
                      {item.badge && (
                        <span className="text-[8px] uppercase px-1 py-0.2 rounded bg-[#cbb26a]/15 text-[#cbb26a] border border-[#cbb26a]/30">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                    <button
                      onClick={(e) => toggleFavorite(item.id, e)}
                      className={`absolute right-1 p-1 transition-opacity ${
                        isFav ? "text-amber-400 opacity-100" : "text-muted-foreground/30 opacity-0 group-hover:opacity-100 hover:text-amber-400"
                      }`}
                      title={isFav ? "Remove Favorite" : "Pin Favorite"}
                    >
                      <Star className={`h-2.5 w-2.5 ${isFav ? "fill-amber-400 text-amber-400" : ""}`} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ─── 4. FULL-WIDTH WORKSPACE CANVAS (NO SIDEBAR) ────────────────────── */}
        {!isCollapsed && (
          <main className="flex-1 flex flex-col overflow-hidden bg-background/30 relative">
            <div className="flex-1 overflow-auto p-3 sm:p-5 lg:p-6 custom-scrollbar relative">
              {children}
            </div>

            {/* Studio Window Status Footer */}
            <footer className="h-7 border-t border-[#806f47]/20 bg-[#050b14]/95 px-3 flex items-center justify-between text-[10px] text-muted-foreground font-mono shrink-0 select-none">
              <div className="flex items-center gap-3 truncate">
                <span className="flex items-center gap-1 text-[#cbb26a]">
                  <Shield className="h-2.5 w-2.5" />
                  <span>{activeModule?.id || "dashboard"}</span>
                </span>
                <span className="hidden sm:inline text-muted-foreground/50">•</span>
                <span className="hidden sm:flex items-center gap-1">
                  <Database className="h-2.5 w-2.5 text-emerald-400" /> DB Nominal
                </span>
                <span className="hidden md:inline text-muted-foreground/50">•</span>
                <span className="hidden md:flex items-center gap-1">
                  <Radio className="h-2.5 w-2.5 text-emerald-400" /> Realtime Bus Active
                </span>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {!isMaximized && (
                  <span className="hidden sm:inline text-slate-500">
                    {size.width}×{size.height} @ ({position.x},{position.y})
                  </span>
                )}
                <span className="text-[#cbb26a]/90 font-bold uppercase">
                  {roleName}
                </span>
              </div>
            </footer>
          </main>
        )}

        {/* ─── 5. CORNER & EDGE RESIZERS (WHEN NOT MAXIMIZED / NOT COLLAPSED) ─── */}
        {!isMaximized && !isCollapsed && (
          <>
            {/* Bottom-Right Corner Grip Resizer */}
            <div
              className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize flex items-center justify-center group z-30 pointer-events-auto"
              onPointerDown={(e) => handleResizeDown(e, "se")}
              title="Resize window"
            >
              <span className="absolute bottom-1 right-1 h-2 w-2 border-b-2 border-r-2 border-[#cbb26a]/60 group-hover:border-[#cbb26a] transition-colors" />
            </div>

            {/* Right Edge Resizer */}
            <div
              className="absolute top-12 bottom-4 right-0 w-1 cursor-e-resize hover:bg-[#cbb26a]/30 transition-colors z-20 pointer-events-auto"
              onPointerDown={(e) => handleResizeDown(e, "e")}
              title="Resize width"
            />

            {/* Bottom Edge Resizer */}
            <div
              className="absolute bottom-0 left-0 right-4 h-1 cursor-s-resize hover:bg-[#cbb26a]/30 transition-colors z-20 pointer-events-auto"
              onPointerDown={(e) => handleResizeDown(e, "s")}
              title="Resize height"
            />
          </>
        )}
      </div>
    </div>
    </>,
    document.body
  );
}
