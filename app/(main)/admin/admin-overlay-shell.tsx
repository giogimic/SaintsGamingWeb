"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { 
  Shield, X, Menu, Search, Star, Clock, ChevronRight,
  Sparkles, ExternalLink, ArrowLeft
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

const STORAGE_KEY_FAVORITES = "sg_admin_favorites";
const STORAGE_KEY_RECENTS = "sg_admin_recents";
const STORAGE_KEY_LAST_NON_ADMIN = "sg_last_non_admin_route";

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

  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Track non-admin previous route for smart close behavior
  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";

    try {
      const savedFavs = localStorage.getItem(STORAGE_KEY_FAVORITES);
      if (savedFavs) setFavorites(JSON.parse(savedFavs));

      const savedRecents = localStorage.getItem(STORAGE_KEY_RECENTS);
      if (savedRecents) setRecents(JSON.parse(savedRecents));
    } catch {
      // Ignore localStorage errors
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

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

  const toggleFavorite = useCallback((moduleId: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
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

  const handleClose = () => {
    // Check if a specific "from" param was provided
    const fromParam = searchParams.get("from");
    if (fromParam && fromParam.startsWith("/")) {
      router.push(fromParam);
      return;
    }

    // Check stored last non-admin location
    try {
      const lastRoute = sessionStorage.getItem(STORAGE_KEY_LAST_NON_ADMIN);
      if (lastRoute && lastRoute.startsWith("/") && !lastRoute.startsWith("/admin")) {
        router.push(lastRoute);
        return;
      }
    } catch {
      // ignore
    }

    // Fallback to router.back or home
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/home");
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

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden p-3 sm:p-4 space-y-6">
      {/* Quick Filter Input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Filter modules..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-8 pl-8 pr-3 text-xs bg-background/60 border border-border/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60 transition-all"
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
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-2">
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
                      className: `w-full justify-start gap-3 pr-8 ${
                        isActive ? "bg-primary/20 text-primary font-semibold hover:bg-primary/30" : ""
                      }`,
                    })}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                  <button
                    onClick={(e) => toggleFavorite(item.id, e)}
                    className="absolute right-2 p-1 text-muted-foreground/40 hover:text-amber-400 transition-colors"
                    title={isFav ? "Remove from Favorites" : "Pin to Favorites"}
                  >
                    <Star className={`h-3.5 w-3.5 ${isFav ? "fill-amber-400 text-amber-400" : ""}`} />
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
              <h3 className="text-xs font-bold text-amber-400/90 uppercase tracking-wider mb-2 px-2 flex items-center gap-1.5">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> Favorites
              </h3>
              <div className="space-y-1">
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
                          className: `w-full justify-start gap-3 pr-8 ${
                            isActive ? "bg-primary/20 text-primary font-semibold hover:bg-primary/30" : ""
                          }`,
                        })}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                      <button
                        onClick={(e) => toggleFavorite(item.id, e)}
                        className="absolute right-2 p-1 text-amber-400 hover:opacity-75 transition-opacity"
                        title="Unpin Favorite"
                      >
                        <Star className="h-3.5 w-3.5 fill-amber-400" />
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
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                {category.label}
              </h3>
              <div className="space-y-1">
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
                          className: `w-full justify-start gap-3 pr-8 ${
                            isActive ? "bg-primary/20 text-primary font-semibold hover:bg-primary/30" : ""
                          }`,
                        })}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
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
            <div className="pt-4 border-t border-border/30">
              <h3 className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-2 px-2 flex items-center gap-1.5">
                <Clock className="h-3 w-3" /> Recent Views
              </h3>
              <div className="space-y-1">
                {recentModules.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={`recent-${item.id}`}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-md transition-colors"
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
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

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex sm:items-center justify-center bg-black/80 backdrop-blur-md sm:p-4 md:p-6 lg:p-8 animate-in fade-in duration-200">
      <div className="w-full h-full max-w-[1700px] bg-background/95 sm:bg-card/90 sg-glass sm:border border-border/50 sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl relative">
        
        {/* Operating Shell Header */}
        <header className="h-14 sm:h-16 border-b border-border/50 flex items-center justify-between px-3 sm:px-6 bg-muted/30 shrink-0 gap-3">
          
          {/* Left: Branding & Mobile Toggle */}
          <div className="flex items-center gap-3 min-w-0">
            <button 
              className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground" 
              onClick={() => setMobileOpen(true)}
              aria-label="Open Navigation Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 font-bold text-base sm:text-lg text-foreground truncate">
              <div className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
              </div>
              <span className="hidden xs:inline tracking-tight">Admin Control Center</span>
            </div>
            {/* Live System Indicator */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE</span>
            </div>
          </div>

          {/* Center / Right: Operator Badge & Action Controls */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            
            {/* Operator Identity Badge */}
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-background/60 border border-border/40">
              <Avatar className="h-6 w-6 border border-primary/20">
                <AvatarImage src={user?.image || ""} alt={user?.username || "Admin"} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                  {user?.username?.charAt(0).toUpperCase() || "A"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold leading-tight truncate max-w-[120px]">
                  {user?.username || user?.name || "Operator"}
                </span>
                <span className={`text-[10px] font-mono font-semibold ${roleColor} leading-tight`}>
                  {roleName}
                </span>
              </div>
            </div>

            {/* Close Button with contextual return */}
            <button 
              onClick={handleClose}
              className="px-3 py-1.5 text-muted-foreground hover:text-red-400 transition-colors bg-muted/50 hover:bg-red-500/10 border border-border/40 hover:border-red-500/30 rounded-lg flex items-center gap-2 text-xs sm:text-sm font-medium"
              title="Return to site"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Exit Control Center</span>
            </button>
          </div>
        </header>

        {/* Breadcrumb Context Bar */}
        <div className="h-10 border-b border-border/40 bg-card/40 px-4 sm:px-6 flex items-center justify-between text-xs text-muted-foreground shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1.5 truncate">
            <Link href="/admin" className="hover:text-foreground transition-colors font-medium flex items-center gap-1">
              <Shield className="h-3.5 w-3.5 text-primary" /> Admin
            </Link>
            {activeCategory && (
              <>
                <ChevronRight className="h-3.5 w-3.5 opacity-50 shrink-0" />
                <span className="font-medium text-muted-foreground">{activeCategory.label}</span>
              </>
            )}
            {activeModule && (
              <>
                <ChevronRight className="h-3.5 w-3.5 opacity-50 shrink-0" />
                <span className="font-bold text-foreground truncate">{activeModule.label}</span>
              </>
            )}
          </div>

          {activeModule && (
            <div className="flex items-center gap-2 pl-4 shrink-0">
              <button
                onClick={() => toggleFavorite(activeModule.id)}
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border border-border/50 hover:bg-muted transition-colors"
              >
                <Star className={`h-3 w-3 ${favorites.includes(activeModule.id) ? "fill-amber-400 text-amber-400" : ""}`} />
                <span>{favorites.includes(activeModule.id) ? "Favorited" : "Favorite"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Operating Area */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* Desktop Sidebar */}
          <aside className="w-64 lg:w-72 border-r border-border/40 bg-card/30 hidden md:block shrink-0">
            <SidebarContent />
          </aside>

          {/* Mobile Sidebar Overlay */}
          {mobileOpen && (
            <div className="absolute inset-0 z-50 flex md:hidden">
              <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
              <aside className="w-[280px] sm:w-[320px] h-full bg-card border-r border-border/50 relative shadow-2xl animate-in slide-in-from-left">
                <div className="h-14 border-b border-border/50 flex items-center justify-between px-4">
                  <span className="font-bold text-sm">Control Navigation</span>
                  <button onClick={() => setMobileOpen(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
                </div>
                <div className="h-[calc(100%-3.5rem)]">
                  <SidebarContent />
                </div>
              </aside>
            </div>
          )}

          {/* Main Workspace Area */}
          <main className="flex-1 overflow-auto bg-background/50 relative">
            <div className="p-4 sm:p-6 lg:p-8 min-h-full">
              {children}
            </div>
          </main>
        </div>

      </div>
    </div>,
    document.body
  );
}
