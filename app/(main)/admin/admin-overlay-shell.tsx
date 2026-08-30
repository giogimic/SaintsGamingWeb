"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { 
  Shield, X, Menu, Search, Star, Clock, ChevronRight,
  Sparkles, ExternalLink, ArrowLeft, Minus, Square, Maximize2,
  Minimize2, Copy, PanelLeftClose, PanelLeft, Eye, EyeOff,
  Radio, Database, GripHorizontal, Move, ArrowUpRight
} from "lucide-react";
import { buttonVariants } from "@/shared/ui/button";
import { 
  getCategorizedAdminModules, 
  getActiveAdminModule, 
  getAdminModuleById, 
  searchAdminModules,
  ADMIN_CATEGORIES,
  type AdminModule 
} from "@/web/lib/admin-modules";
import { getRoleName, getRoleColor } from "@/web/lib/permissions";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { soundSynth } from "@/engine/sound-synth";

const STORAGE_KEY_FAVORITES = "sg_admin_favorites";
const STORAGE_KEY_RECENTS = "sg_admin_recents";
const STORAGE_KEY_LAST_NON_ADMIN = "sg_last_non_admin_route";
const STORAGE_KEY_WINDOW_STATE = "sg_admin_window_state_v1";

export type BackdropMode = "dim" | "frost" | "transparent";

export interface AdminWindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
  isMinimized: boolean;
  isCollapsed: boolean;
  backdropMode: BackdropMode;
  sidebarCollapsed: boolean;
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recents, setRecents] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  // Window State
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [backdropMode, setBackdropMode] = useState<BackdropMode>("dim");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [position, setPosition] = useState({ x: 40, y: 30 });
  const [size, setSize] = useState({ width: 1240, height: 760 });
  const [zIndex, setZIndex] = useState(100);

  // Dragging & Resizing Refs for GPU-composited transforms (0 React re-renders during drag/resize)
  const windowRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragPosRef = useRef({ x: 40, y: 30 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeOrigin = useRef({ x: 0, y: 0, w: 1240, h: 760, edge: "se" });

  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

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
          // Clamp inside viewport
          const clampedX = Math.max(10, Math.min(window.innerWidth - 300, state.x));
          const clampedY = Math.max(10, Math.min(window.innerHeight - 150, state.y));
          setPosition({ x: clampedX, y: clampedY });
          dragPosRef.current = { x: clampedX, y: clampedY };
        }
        if (typeof state.width === "number" && typeof state.height === "number") {
          const clampedW = Math.max(500, Math.min(window.innerWidth - 20, state.width));
          const clampedH = Math.max(380, Math.min(window.innerHeight - 20, state.height));
          setSize({ width: clampedW, height: clampedH });
        }
        if (typeof state.isMaximized === "boolean") {
          // On mobile screens, force maximized default
          setIsMaximized(window.innerWidth < 768 ? true : state.isMaximized);
        }
        if (typeof state.isCollapsed === "boolean") setIsCollapsed(state.isCollapsed);
        if (state.backdropMode) setBackdropMode(state.backdropMode);
        if (typeof state.sidebarCollapsed === "boolean") setSidebarCollapsed(state.sidebarCollapsed);
      } else {
        // Initial setup for first-time visitors
        if (typeof window !== "undefined") {
          if (window.innerWidth < 768) {
            setIsMaximized(true);
          } else {
            const initialW = Math.min(1360, Math.max(800, window.innerWidth - 120));
            const initialH = Math.min(840, Math.max(520, window.innerHeight - 80));
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
        backdropMode,
        sidebarCollapsed,
        ...overrides,
      };
      localStorage.setItem(STORAGE_KEY_WINDOW_STATE, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [position, size, isMaximized, isMinimized, isCollapsed, backdropMode, sidebarCollapsed]);

  // Update recents when pathname changes
  useEffect(() => {
    const active = getActiveAdminModule(pathname);
    if (active) {
      setRecents((prev) => {
        const filtered = prev.filter((id) => id !== active.id);
        const updated = [active.id, ...filtered].slice(0, 5);
        try {
          localStorage.setItem(STORAGE_KEY_RECENTS, JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });
    }
  }, [pathname]);

  // Handle window resizing from screen viewport changes
  useEffect(() => {
    const handleViewportResize = () => {
      if (window.innerWidth < 768) {
        setIsMaximized(true);
      } else {
        setPosition((prev) => ({
          x: Math.max(10, Math.min(window.innerWidth - 300, prev.x)),
          y: Math.max(10, Math.min(window.innerHeight - 150, prev.y)),
        }));
        setSize((prev) => ({
          width: Math.min(window.innerWidth - 20, Math.max(500, prev.width)),
          height: Math.min(window.innerHeight - 20, Math.max(380, prev.height)),
        }));
      }
    };
    window.addEventListener("resize", handleViewportResize);
    return () => window.removeEventListener("resize", handleViewportResize);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
        // If search query is present, clear it first
        if (searchQuery) {
          setSearchQuery("");
          return;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchQuery]);

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

  const cycleBackdropMode = () => {
    try { soundSynth?.playUiClick?.(); } catch {}
    setBackdropMode((prev) => {
      const next: BackdropMode = prev === "dim" ? "frost" : prev === "frost" ? "transparent" : "dim";
      persistWindowState({ backdropMode: next });
      return next;
    });
  };

  const toggleSidebar = () => {
    try { soundSynth?.playUiClick?.(); } catch {}
    setSidebarCollapsed((prev) => {
      const next = !prev;
      persistWindowState({ sidebarCollapsed: next });
      return next;
    });
  };

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMaximized) return;
    if ((e.target as HTMLElement).closest(".window-control-btn")) return;
    if ((e.target as HTMLElement).closest("input, select, textarea, a")) return;

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
        ? Math.max(500, Math.min(window.innerWidth - position.x - 10, resizeOrigin.current.w + dx))
        : size.width;
      const newH = resizeOrigin.current.edge.includes("s")
        ? Math.max(380, Math.min(window.innerHeight - position.y - 10, resizeOrigin.current.h + dy))
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

  // Resolve active module & category for breadcrumbs
  const activeModule = useMemo(() => getActiveAdminModule(pathname), [pathname]);
  const activeCategory = activeModule ? ADMIN_CATEGORIES[activeModule.category] : null;

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

  const recentModules = useMemo(() => {
    return recents
      .map((id) => getAdminModuleById(id))
      .filter((m): m is AdminModule => Boolean(m && (isWriter && m.allowWriter ? true : permissionLevel >= m.permission)));
  }, [recents, permissionLevel, isWriter]);

  const roleName = isWriter && permissionLevel < 200 ? "Official Writer" : getRoleName(permissionLevel);
  const roleColor = getRoleColor(permissionLevel);

  const SidebarContent = ({ isRail = false }: { isRail?: boolean }) => {
    if (isRail) {
      return (
        <div className="flex flex-col h-full items-center py-3 space-y-3 select-none">
          <button
            onClick={toggleSidebar}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg transition-colors"
            title="Expand Sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
          
          <div className="w-8 h-[1px] bg-border/40 my-1" />

          {/* Quick Icons */}
          <div className="flex-1 overflow-y-auto w-full flex flex-col items-center space-y-2 px-1 custom-scrollbar">
            {categorizedModules.flatMap((cat) => cat.modules).map((mod) => {
              const Icon = mod.icon;
              const isActive = mod.exact ? pathname === mod.href : (pathname === mod.href || pathname.startsWith(mod.href + "/"));
              return (
                <Link
                  key={`rail-${mod.id}`}
                  href={mod.href}
                  className={`p-2.5 rounded-lg transition-all flex items-center justify-center relative group ${
                    isActive ? "bg-[#cbb26a]/20 text-[#cbb26a] border border-[#cbb26a]/40 shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                  title={mod.label}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {/* Tooltip on hover */}
                  <span className="absolute left-full ml-2 px-2 py-1 bg-[#050b14] border border-[#806f47]/40 text-xs text-white rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl font-mono">
                    {mod.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden p-3 sm:p-4 space-y-5 custom-scrollbar">
        {/* Quick Filter Input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter modules (/) ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-xs bg-background/60 border border-border/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#cbb26a] placeholder:text-muted-foreground/60 transition-all font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-2 text-[10px] text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        {/* Search Results Mode */}
        {searchResults ? (
          <div className="space-y-1">
            <h3 className="text-[10px] font-bold text-[#cbb26a] uppercase tracking-wider mb-2 px-2 font-mono">
              Search Results ({searchResults.length})
            </h3>
            {searchResults.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-4 italic">No matching admin modules found.</p>
            ) : (
              searchResults.map((item) => {
                const Icon = item.icon;
                const isActive = item.exact ? pathname === item.href : (pathname === item.href || pathname.startsWith(item.href + "/"));
                const isFav = favorites.includes(item.id);
                return (
                  <div key={item.id} className="group relative flex items-center">
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={buttonVariants({
                        variant: isActive ? "secondary" : "ghost",
                        className: `w-full justify-start gap-2.5 pr-8 text-xs ${
                          isActive ? "bg-[#cbb26a]/15 text-[#cbb26a] font-semibold border border-[#cbb26a]/30" : ""
                        }`,
                      })}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                    <button
                      onClick={(e) => toggleFavorite(item.id, e)}
                      className="absolute right-2 p-1 text-muted-foreground/40 hover:text-amber-400 transition-colors"
                      title={isFav ? "Remove from Favorites" : "Pin to Favorites"}
                    >
                      <Star className={`h-3 w-3 ${isFav ? "fill-amber-400 text-amber-400" : ""}`} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <>
            {/* Pinned Favorites */}
            {favoriteModules.length > 0 && (
              <div>
                <h3 className="text-[10px] font-bold text-amber-400/90 uppercase tracking-wider mb-1.5 px-2 flex items-center gap-1.5 font-mono">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> Pinned Favorites
                </h3>
                <div className="space-y-0.5">
                  {favoriteModules.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.exact ? pathname === item.href : (pathname === item.href || pathname.startsWith(item.href + "/"));
                    return (
                      <div key={`fav-${item.id}`} className="group relative flex items-center">
                        <Link
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={buttonVariants({
                            variant: isActive ? "secondary" : "ghost",
                            className: `w-full justify-start gap-2.5 pr-8 text-xs ${
                              isActive ? "bg-[#cbb26a]/15 text-[#cbb26a] font-semibold border border-[#cbb26a]/30" : ""
                            }`,
                          })}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                        <button
                          onClick={(e) => toggleFavorite(item.id, e)}
                          className="absolute right-2 p-1 text-amber-400 hover:opacity-75 transition-opacity"
                          title="Unpin Favorite"
                        >
                          <Star className="h-3 w-3 fill-amber-400" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Categorized Hierarchy */}
            {categorizedModules.map(({ category, modules }) => (
              <div key={category.id}>
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 px-2 font-mono">
                  {category.label}
                </h3>
                <div className="space-y-0.5">
                  {modules.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.exact ? pathname === item.href : (pathname === item.href || pathname.startsWith(item.href + "/"));
                    const isFav = favorites.includes(item.id);
                    return (
                      <div key={item.id} className="group relative flex items-center">
                        <Link
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={buttonVariants({
                            variant: isActive ? "secondary" : "ghost",
                            className: `w-full justify-start gap-2.5 pr-8 text-xs ${
                              isActive ? "bg-[#cbb26a]/15 text-[#cbb26a] font-semibold border border-[#cbb26a]/30" : ""
                            }`,
                          })}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{item.label}</span>
                          {item.badge && (
                            <span className="ml-auto text-[9px] uppercase font-mono px-1 py-0.5 rounded bg-[#cbb26a]/10 text-[#cbb26a] border border-[#cbb26a]/30">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                        <button
                          onClick={(e) => toggleFavorite(item.id, e)}
                          className={`absolute right-2 p-1 transition-opacity ${
                            isFav ? "text-amber-400 opacity-100" : "text-muted-foreground/30 opacity-0 group-hover:opacity-100 hover:text-amber-400"
                          }`}
                          title={isFav ? "Remove Favorite" : "Add Favorite"}
                        >
                          <Star className={`h-3 w-3 ${isFav ? "fill-amber-400 text-amber-400" : ""}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Recent Items Footer */}
            {recentModules.length > 0 && (
              <div className="pt-3 border-t border-border/30">
                <h3 className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-1.5 px-2 flex items-center gap-1.5 font-mono">
                  <Clock className="h-3 w-3" /> Recent Views
                </h3>
                <div className="space-y-0.5">
                  {recentModules.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={`recent-${item.id}`}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-md transition-colors"
                      >
                        <Icon className="h-3 w-3 shrink-0 opacity-70" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  if (!mounted) return null;

  // ─── 1. MINIMIZED FLOATING DOCK CAPSULE ─────────────────────────────────────
  if (isMinimized) {
    return createPortal(
      <div 
        className="fixed bottom-6 right-6 z-[100] animate-in fade-in slide-in-from-bottom-5 duration-200"
        style={{ touchAction: "none" }}
      >
        <div className="flex items-center gap-2 p-1.5 pr-2 rounded-full bg-[#050b14]/95 border border-[#cbb26a]/60 shadow-[0_0_25px_rgba(203,178,106,0.25)] sg-glass backdrop-blur-xl text-slate-200">
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
      </div>,
      document.body
    );
  }

  // ─── 2. FLOATING / MAXIMIZED STUDIO WINDOW SHELL ─────────────────────────────
  return createPortal(
    <div 
      className={`fixed inset-0 z-[100] transition-colors duration-300 pointer-events-none ${
        backdropMode === "dim"
          ? "bg-black/75 backdrop-blur-sm"
          : backdropMode === "frost"
          ? "bg-black/35 backdrop-blur-[2px]"
          : "bg-transparent"
      } ${isMaximized ? "p-0 sm:p-2 md:p-3" : ""}`}
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
          ${isMaximized ? "rounded-none sm:rounded-xl border-border/40" : "rounded-xl border shadow-2xl"}
          sg-glass bg-[#050b14]/95 text-slate-200 border-[#806f47]/40 shadow-[0_15px_50px_rgba(0,0,0,0.85)]
          ${isDragging ? "border-[#cbb26a] shadow-[0_0_35px_rgba(203,178,106,0.3)] cursor-grabbing" : ""}
        `}
      >
        {/* Top Metallic Studio Frame Accent */}
        <div className="h-[2px] w-full bg-gradient-to-r from-[#806f47]/20 via-[#cbb26a]/80 to-[#806f47]/20 shrink-0" />

        {/* ─── STUDIO WINDOW HEADER / DRAG HANDLE ─────────────────────────────── */}
        <header
          onPointerDown={handlePointerDown}
          onDoubleClick={toggleCollapse}
          className={`
            h-11 sm:h-12 border-b border-[#806f47]/30 flex items-center justify-between px-2.5 sm:px-4 shrink-0 gap-2 select-none
            ${isDragging ? "cursor-grabbing bg-[#162238]/90" : isMaximized ? "cursor-default bg-[#0b1320]" : "cursor-move bg-gradient-to-r from-[#162238] via-[#0b1320] to-[#162238]"}
          `}
          title="Drag to move window • Double-click to collapse/expand"
        >
          {/* Left: Grip Handle + Branding + Breadcrumb */}
          <div className="flex items-center gap-2 min-w-0 pointer-events-none">
            {!isMaximized && (
              <div className="text-[#806f47]/60 flex items-center shrink-0">
                <GripHorizontal className="h-3.5 w-3.5" />
              </div>
            )}
            
            {/* Mobile menu trigger */}
            <button 
              className="md:hidden p-1 -ml-1 text-muted-foreground hover:text-foreground pointer-events-auto window-control-btn" 
              onClick={(e) => { e.stopPropagation(); setMobileOpen(true); }}
              aria-label="Open Navigation Menu"
            >
              <Menu className="h-4 w-4" />
            </button>

            {/* Shield Icon + Admin OS Title */}
            <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-foreground truncate">
              <div className="p-1 rounded bg-red-500/15 border border-red-500/30 text-red-400 shrink-0">
                <Shield className="h-3.5 w-3.5" />
              </div>
              <span className="font-mono tracking-tight font-black uppercase text-[#cbb26a] hidden xs:inline">
                Admin OS
              </span>
            </div>

            {/* Breadcrumb Module Tag */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground pl-2 border-l border-border/40 overflow-hidden">
              {activeCategory && (
                <>
                  <span className="text-[11px] font-mono text-muted-foreground/80">{activeCategory.label}</span>
                  <ChevronRight className="h-3 w-3 opacity-40 shrink-0" />
                </>
              )}
              <span className="text-xs font-bold text-white truncate font-mono">
                {activeModule?.label || "Command Center"}
              </span>
            </div>

            {/* Live Indicator */}
            <div className="hidden lg:flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE</span>
            </div>
          </div>

          {/* Center/Right: Operator Badge & Window Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 pointer-events-auto">
            {/* Operator Identity Tag */}
            <div className="hidden md:flex items-center gap-2 px-2 py-1 rounded-lg bg-background/50 border border-border/40">
              <Avatar className="h-5 w-5 border border-primary/30">
                <AvatarImage src={user?.image || ""} alt={user?.username || "Admin"} />
                <AvatarFallback className="bg-[#cbb26a]/20 text-[#cbb26a] text-[10px] font-bold">
                  {user?.username?.charAt(0).toUpperCase() || "A"}
                </AvatarFallback>
              </Avatar>
              <span className="text-[11px] font-bold text-white truncate max-w-[100px] font-mono">
                {user?.username || user?.name || "Operator"}
              </span>
              <span className={`text-[9px] font-mono font-semibold ${roleColor} uppercase`}>
                {roleName}
              </span>
            </div>

            {/* Sidebar Toggle (Desktop) */}
            <button
              onClick={(e) => { e.stopPropagation(); toggleSidebar(); }}
              className="window-control-btn hidden md:flex p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar to Rail"}
            >
              {sidebarCollapsed ? <PanelLeft className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
            </button>

            {/* Backdrop Mode Toggle */}
            <button
              onClick={(e) => { e.stopPropagation(); cycleBackdropMode(); }}
              className={`window-control-btn hidden sm:flex p-1.5 rounded transition-colors ${
                backdropMode === "transparent"
                  ? "text-[#cbb26a] bg-[#cbb26a]/15 border border-[#cbb26a]/30"
                  : "text-slate-400 hover:text-white hover:bg-white/10"
              }`}
              title={`Backdrop: ${backdropMode.toUpperCase()} (Click to toggle Dim / Frost / Transparent)`}
            >
              {backdropMode === "transparent" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>

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

        {/* ─── WINDOW BODY (IF NOT COLLAPSED) ─────────────────────────────────── */}
        {!isCollapsed && (
          <div className="flex-1 flex overflow-hidden relative">
            
            {/* Desktop Module Sidebar */}
            <aside 
              className={`
                border-r border-[#806f47]/20 bg-[#070e1a]/70 shrink-0 transition-all duration-200 hidden md:block
                ${sidebarCollapsed ? "w-14" : "w-60 lg:w-68"}
              `}
            >
              <SidebarContent isRail={sidebarCollapsed} />
            </aside>

            {/* Mobile Sidebar Overlay */}
            {mobileOpen && (
              <div className="absolute inset-0 z-50 flex md:hidden">
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
                <aside className="w-[280px] sm:w-[320px] h-full bg-[#050b14] border-r border-[#806f47]/40 relative shadow-2xl animate-in slide-in-from-left">
                  <div className="h-12 border-b border-[#806f47]/30 flex items-center justify-between px-4 bg-[#0b1320]">
                    <span className="font-bold text-xs font-mono text-[#cbb26a] uppercase">Admin Modules</span>
                    <button onClick={() => setMobileOpen(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
                  </div>
                  <div className="h-[calc(100%-3rem)]">
                    <SidebarContent />
                  </div>
                </aside>
              </div>
            )}

            {/* Main Content Workspace */}
            <main className="flex-1 flex flex-col overflow-hidden bg-background/40 relative">
              <div className="flex-1 overflow-auto p-3 sm:p-5 lg:p-6 custom-scrollbar relative">
                {children}
              </div>

              {/* Studio Window Status Footer */}
              <footer className="h-7 border-t border-[#806f47]/20 bg-[#050b14]/90 px-3 flex items-center justify-between text-[10px] text-muted-foreground font-mono shrink-0 select-none">
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
                  <span className="text-[#cbb26a]/80 font-bold uppercase">
                    {roleName}
                  </span>
                </div>
              </footer>
            </main>
          </div>
        )}

        {/* ─── CORNER & EDGE RESIZERS (WHEN NOT MAXIMIZED / NOT COLLAPSED) ────── */}
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
    </div>,
    document.body
  );
}
