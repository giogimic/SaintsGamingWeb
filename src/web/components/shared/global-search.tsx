"use client";

import * as React from "react";
import { useRouter } from "serapht/navigation";
import {
  Search,
  MessageSquare,
  Newspaper,
  Package,
  User,
  Sparkles,
  Map as MapIcon,
  Video,
  Trophy,
  LifeBuoy,
  Clock,
  X,
  ChevronRight,
  Loader2,
  Flame,
  Gamepad2,
  Radio,
} from "lucide-react";
import { Badge } from "@/web/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/web/components/ui/avatar";

type SearchCategory = "all" | "threads" | "news" | "feed" | "maps" | "modpacks" | "users";

type SearchResults = {
  query?: string;
  totalCount?: number;
  threads: Array<{
    id: string;
    title: string;
    slug: string;
    snippet?: string;
    isPinned?: boolean;
    createdAt: string;
    viewCount: number;
    replyCount: number;
    author?: { username: string; displayName: string | null; image: string | null };
    subcategory?: { name: string; slug: string };
  }>;
  articles: Array<{
    id: string;
    title: string;
    slug: string;
    excerpt?: string | null;
    coverImage?: string | null;
    publishedAt: string;
    category?: string | null;
  }>;
  posts: Array<{
    id: string;
    body: string;
    mediaUrl: string | null;
    thumbnailUrl: string | null;
    createdAt: string;
    viewCount: number;
    author?: { username: string; displayName: string | null; image: string | null };
    _count?: { reactions: number; replies: number };
  }>;
  maps: Array<{
    id: string;
    name: string;
    description: string | null;
    biome: string | null;
    recommendedLevel: number | null;
  }>;
  modpacks: Array<{
    id: string;
    name: string;
    slug: string;
    game: string;
    logoImage?: string | null;
    version: string | null;
  }>;
  users: Array<{
    id: string;
    username: string;
    displayName: string | null;
    image: string | null;
    role?: { name: string; color: string } | null;
  }>;
};

const QUICK_ACTIONS = [
  {
    title: "The Lobby",
    description: "Hop into the 2.5D live multiplayer world",
    href: "/lobby",
    icon: Gamepad2,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  },

  {
    title: "The Feed",
    description: "Community gameplay clips, reels & discussions",
    href: "/feed",
    icon: Video,
    color: "text-pink-400 bg-pink-500/10 border-pink-500/30",
  },
  {
    title: "Forum Discussions",
    description: "Guides, suggestions, general chat & support",
    href: "/forum",
    icon: MessageSquare,
    color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  },
  {
    title: "News & Patch Notes",
    description: "Latest development blogs & game updates",
    href: "/news",
    icon: Newspaper,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  },
  {
    title: "Realm Highscores",
    description: "Top players, skill masters & battle rankings",
    href: "/highscores",
    icon: Trophy,
    color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  },
  {
    title: "Help & Player Support",
    description: "Account assistance, tickets & FAQ knowledgebase",
    href: "/support",
    icon: LifeBuoy,
    color: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  },
  {
    title: "Live Streams",
    description: "Watch live community broadcasts & streams",
    href: "/streams",
    icon: Radio,
    color: "text-rose-400 bg-rose-500/10 border-rose-500/30",
  },
];

const RECENT_SEARCHES_KEY = "sg_recent_searches";

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<SearchCategory>("all");
  const [results, setResults] = React.useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const mobileInputRef = React.useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {
      // Ignore local storage errors
    }
  }, []);

  const saveRecentSearch = React.useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed || trimmed.length < 2) return;
    try {
      setRecentSearches((prev) => {
        const filtered = prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
        const updated = [trimmed, ...filtered].slice(0, 8);
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
        return updated;
      });
    } catch {
      // Ignore local storage errors
    }
  }, []);

  const clearRecentSearches = React.useCallback(() => {
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
      setRecentSearches([]);
    } catch {
      // Ignore local storage errors
    }
  }, []);

  const removeRecentSearch = React.useCallback((term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setRecentSearches((prev) => {
        const updated = prev.filter((s) => s !== term);
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
        return updated;
      });
    } catch {
      // Ignore local storage errors
    }
  }, []);

  // Click outside to close
  React.useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Global hotkeys: Ctrl+K, ⌘K, or '/' to open search, ESC to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
        inputRef.current?.blur();
        mobileInputRef.current?.blur();
        return;
      }

      if (
        (e.key === "k" && (e.metaKey || e.ctrlKey)) ||
        (e.key === "/" &&
          !open &&
          !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName) &&
          !(e.target as HTMLElement)?.isContentEditable)
      ) {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 50);
      }
    };

    const handleOpenCustom = () => {
      setOpen(true);
      setTimeout(() => {
        if (window.innerWidth < 768) {
          mobileInputRef.current?.focus();
        } else {
          inputRef.current?.focus();
        }
      }, 50);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("sg:open-search", handleOpenCustom);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("sg:open-search", handleOpenCustom);
    };
  }, [open]);

  // Focus input when dropdown opens
  React.useEffect(() => {
    if (open) {
      setTimeout(() => {
        if (window.innerWidth < 768) {
          mobileInputRef.current?.focus();
        } else {
          inputRef.current?.focus();
        }
      }, 50);
    }
  }, [open]);

  // Debounced API Search with In-Flight Abort Controller Cancellation
  React.useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query.trim() });
        if (category !== "all") params.append("type", category);
        const res = await fetch(`/api/search?${params.toString()}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.error("Search failed", err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, category]);

  const handleNavigate = React.useCallback(
    (href: string, saveQuery = true) => {
      if (saveQuery && query.trim()) {
        saveRecentSearch(query.trim());
      }
      setOpen(false);
      router.push(href);
    },
    [query, router, saveRecentSearch]
  );

  const totalResultsCount =
    (results?.threads?.length || 0) +
    (results?.articles?.length || 0) +
    (results?.posts?.length || 0) +
    (results?.maps?.length || 0) +
    (results?.modpacks?.length || 0) +
    (results?.users?.length || 0);

  const isSearching = query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative">
      {/* ─── DESKTOP/TABLET ACTIVE SEARCH BAR ─── */}
      <div
        className={`hidden md:flex items-center gap-2 h-8 px-2.5 rounded-full transition-all duration-200 ${
          open
            ? "w-64 lg:w-80 xl:w-96 bg-[#060c18] border border-primary/60 shadow-[0_0_15px_rgba(245,158,11,0.25)] ring-2 ring-primary/20"
            : "w-36 lg:w-48 xl:w-56 bg-slate-950/60 hover:bg-slate-900/80 border border-white/10 hover:border-primary/40 shadow-inner"
        }`}
      >
        <Search
          className={`h-3.5 w-3.5 shrink-0 transition-colors ${
            open ? "text-primary animate-pulse" : "text-primary/80 group-hover:text-amber-300"
          }`}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          placeholder={open ? "Search Saints Gaming..." : "Search Saints..."}
          className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-500 outline-none font-medium truncate"
        />

        {isLoading && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />}

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="p-0.5 rounded text-slate-400 hover:text-white transition cursor-pointer shrink-0"
            title="Clear query"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {open && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              inputRef.current?.blur();
            }}
            className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-white/5 border border-white/10 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
          >
            ESC
          </button>
        )}
      </div>

      {/* ─── MOBILE SEARCH TRIGGER ICON ─── */}
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
        }}
        className={`flex md:hidden h-8 w-8 rounded-full items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95 ${
          open
            ? "text-white bg-primary border border-primary/80 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
            : "text-primary hover:text-white bg-slate-900/60 hover:bg-white/10 border border-white/10 hover:border-primary/40"
        }`}
        title="Search Saints Gaming (⌘K)"
        aria-label="Search"
      >
        {open ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
      </button>

      {/* ─── DIMMED BACKDROP (BELOW NAVBAR) ─── */}
      {open && (
        <div
          className="fixed inset-0 top-[52px] sm:top-[44px] bg-black/50 backdrop-blur-[2px] z-[260] transition-opacity animate-in fade-in duration-150"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ─── ANCHORED SEARCH DROPDOWN WINDOW ─── */}
      {open && (
        <div className="fixed sm:absolute top-[56px] sm:top-full left-3 sm:left-0 right-3 sm:right-auto mt-2 sm:w-[540px] md:w-[620px] lg:w-[680px] z-[270] bg-[#060c18]/98 border border-primary/40 rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,0.95)] backdrop-blur-2xl overflow-hidden flex flex-col max-h-[75vh] origin-top-left animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-150">
          {/* Mobile-Only Search Input Header */}

          <div className="flex md:hidden items-center px-3.5 py-3 border-b border-white/10 gap-2.5 bg-slate-950/60">
            <Search className="w-4 h-4 text-primary shrink-0 animate-pulse" />
            <input
              ref={mobileInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search forums, news, feed, maps, modpacks, players..."
              className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none font-medium"
            />
            {isLoading && <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />}
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  mobileInputRef.current?.focus();
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                title="Clear query"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-2 py-1 rounded-md text-[10px] font-mono text-slate-400 bg-white/5 border border-white/10 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              ESC
            </button>
          </div>

          {/* Category Filter Chips Bar */}
          {isSearching && (
            <div className="flex items-center gap-1 px-3.5 py-2 bg-black/40 border-b border-white/5 overflow-x-auto custom-scrollbar text-xs">
              {(
                [
                  { id: "all", label: "All Results", count: totalResultsCount },
                  { id: "threads", label: "Threads", count: results?.threads?.length || 0 },
                  { id: "news", label: "News", count: results?.articles?.length || 0 },
                  { id: "feed", label: "Feed / Clips", count: results?.posts?.length || 0 },
                  { id: "maps", label: "World Maps", count: results?.maps?.length || 0 },
                  { id: "modpacks", label: "Modpacks", count: results?.modpacks?.length || 0 },
                  { id: "users", label: "Players", count: results?.users?.length || 0 },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                    category === cat.id
                      ? "bg-primary text-white shadow-sm font-bold"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span>{cat.label}</span>
                  {cat.count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        category === cat.id ? "bg-white/20 text-white" : "bg-white/10 text-slate-300"
                      }`}
                    >
                      {cat.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Body Results Container */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
            {/* STATE 1: Empty Query - Show Quick Nav Links & Recent Searches */}
            {!isSearching && (
              <div className="space-y-4 py-1">
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        Recent Searches
                      </span>
                      <button
                        type="button"
                        onClick={clearRecentSearches}
                        className="text-[11px] text-slate-500 hover:text-rose-400 transition cursor-pointer lowercase"
                      >
                        clear history
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 px-2">
                      {recentSearches.map((term) => (
                        <div
                          key={term}
                          onClick={() => {
                            setQuery(term);
                          }}
                          className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/5 hover:border-primary/30 text-xs text-slate-200 cursor-pointer transition"
                        >
                          <Search className="w-3 h-3 text-slate-400 group-hover:text-primary" />
                          <span>{term}</span>
                          <button
                            type="button"
                            onClick={(e) => removeRecentSearch(term, e)}
                            className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition ml-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Action Navigation Links */}
                <div className="space-y-2">
                  <div className="px-2 text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    Quick Navigation
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-1">
                    {QUICK_ACTIONS.map((action) => {
                      const Icon = action.icon;
                      return (
                        <div
                          key={action.href}
                          onClick={() => handleNavigate(action.href, false)}
                          className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/40 hover:bg-white/5 border border-white/5 hover:border-primary/30 transition-all cursor-pointer group"
                        >
                          <div
                            className={`p-2 rounded-xl border ${action.color} shrink-0 group-hover:scale-105 transition-transform`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-100 group-hover:text-primary transition-colors flex items-center justify-between">
                              <span>{action.title}</span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-primary group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100" />
                            </div>
                            <p className="text-[11px] text-slate-400 truncate">{action.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STATE 2: Actively Searching */}
            {isSearching && (
              <>
                {/* Empty Results State */}
                {!isLoading && results && totalResultsCount === 0 && (
                  <div className="py-10 px-4 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/10 text-slate-400 mx-auto flex items-center justify-center shadow-lg">
                      <Search className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        No results found for &ldquo;{query}&rdquo;
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Try searching for different keywords, checking spelling, or browsing our forum
                        categories directly.
                      </p>
                    </div>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => handleNavigate(`/forum`)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 transition cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Browse Forums
                      </button>
                    </div>
                  </div>
                )}

                {/* 1. Forum Threads Section */}
                {results?.threads && results.threads.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="px-2 text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Forum Threads ({results.threads.length})
                    </div>
                    <div className="space-y-1">
                      {results.threads.map((thread) => (
                        <div
                          key={`thread-${thread.id}`}
                          onClick={() => handleNavigate(`/forum/thread/${thread.slug}`)}
                          className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-950/50 hover:bg-purple-950/20 border border-white/5 hover:border-purple-500/40 transition cursor-pointer group"
                        >
                          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 shrink-0 mt-0.5">
                            <MessageSquare className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                                {thread.title}
                              </span>
                              {thread.subcategory && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950/60 text-purple-300 border border-purple-500/20 font-medium">
                                  {thread.subcategory.name}
                                </span>
                              )}
                            </div>
                            {thread.snippet && (
                              <p className="text-[11px] text-slate-400 line-clamp-1">{thread.snippet}</p>
                            )}
                            <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                              <span>
                                by {thread.author?.displayName || thread.author?.username || "Unknown"}
                              </span>
                              <span>•</span>
                              <span>{thread.replyCount} replies</span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all mt-1" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. News Articles Section */}
                {results?.articles && results.articles.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="px-2 text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Newspaper className="w-3.5 h-3.5" />
                      News & Announcements ({results.articles.length})
                    </div>
                    <div className="space-y-1">
                      {results.articles.map((article) => (
                        <div
                          key={`article-${article.id}`}
                          onClick={() => handleNavigate(`/news/${article.slug}`)}
                          className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-950/50 hover:bg-emerald-950/20 border border-white/5 hover:border-emerald-500/40 transition cursor-pointer group"
                        >
                          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0 mt-0.5">
                            <Newspaper className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                                {article.title}
                              </span>
                            </div>
                            {article.excerpt && (
                              <p className="text-[11px] text-slate-400 line-clamp-1">{article.excerpt}</p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all mt-1" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Social Feed Posts & Clips */}
                {results?.posts && results.posts.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="px-2 text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5" />
                      Feed Posts & Clips ({results.posts.length})
                    </div>
                    <div className="space-y-1">
                      {results.posts.map((post) => (
                        <div
                          key={`post-${post.id}`}
                          onClick={() => handleNavigate(`/feed`)}
                          className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-950/50 hover:bg-pink-950/20 border border-white/5 hover:border-pink-500/40 transition cursor-pointer group"
                        >
                          <div className="p-2 rounded-lg bg-pink-500/10 border border-pink-500/30 text-pink-400 shrink-0 mt-0.5">
                            <Video className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="text-xs font-bold text-white group-hover:text-pink-300 transition-colors line-clamp-1">
                              {post.body || "Video Clip"}
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                              <span>by @{post.author?.username || "anonymous"}</span>
                              {post._count && (
                                <>
                                  <span>•</span>
                                  <span>{post._count.reactions} reactions</span>
                                </>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-pink-400 group-hover:translate-x-0.5 transition-all mt-1" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. World Maps & MMO Regions */}
                {results?.maps && results.maps.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="px-2 text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <MapIcon className="w-3.5 h-3.5" />
                      World Maps & Regions ({results.maps.length})
                    </div>
                    <div className="space-y-1">
                      {results.maps.map((m) => (
                        <div
                          key={`map-${m.id}`}
                          onClick={() => handleNavigate(`/studio`)}
                          className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-950/50 hover:bg-amber-950/20 border border-white/5 hover:border-amber-500/40 transition cursor-pointer group"
                        >
                          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0 mt-0.5">
                            <MapIcon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                                {m.name || m.id}
                              </span>
                              {m.biome && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-500/20 font-medium capitalize">
                                  {m.biome}
                                </span>
                              )}
                            </div>
                            {m.description && (
                              <p className="text-[11px] text-slate-400 line-clamp-1">{m.description}</p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all mt-1" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Modpacks & Servers */}
                {results?.modpacks && results.modpacks.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="px-2 text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5" />
                      Modpacks & Servers ({results.modpacks.length})
                    </div>
                    <div className="space-y-1">
                      {results.modpacks.map((modpack) => (
                        <div
                          key={`modpack-${modpack.id}`}
                          onClick={() => handleNavigate(`/modpacks/${modpack.slug}`)}
                          className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-950/50 hover:bg-cyan-950/20 border border-white/5 hover:border-cyan-500/40 transition cursor-pointer group"
                        >
                          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0 mt-0.5">
                            <Package className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                                {modpack.name}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[9px] bg-slate-900 border-cyan-500/30 text-cyan-300 px-1.5 py-0"
                              >
                                {modpack.game}
                              </Badge>
                            </div>
                            {modpack.version && (
                              <p className="text-[10px] text-slate-400 font-mono">
                                Version {modpack.version}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all mt-1" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. Community Players */}
                {results?.users && results.users.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="px-2 text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      Community Players ({results.users.length})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {results.users.map((u) => (
                        <div
                          key={`user-${u.id}`}
                          onClick={() => handleNavigate(`/profile/${u.username}`)}
                          className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/50 hover:bg-blue-950/20 border border-white/5 hover:border-blue-500/40 transition cursor-pointer group"
                        >
                          <Avatar className="w-8 h-8 border border-blue-500/30">
                            <AvatarImage src={u.image || ""} />
                            <AvatarFallback className="bg-blue-950 text-blue-300 text-xs font-bold">
                              {u.username.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors truncate">
                              {u.displayName || u.username}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">@{u.username}</div>
                          </div>
                          {u.role && (
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1.5 py-0 border-white/10 ${
                                u.role.color || "text-slate-400"
                              }`}
                            >
                              {u.role.name}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Dropdown Footer Navigation Shortcuts */}
          <div className="flex items-center justify-between px-3.5 py-2 bg-black/60 border-t border-white/5 text-[10px] font-mono text-slate-400 select-none">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Saints Search
            </span>
            <div className="flex items-center gap-3">
              <span>
                <kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10">ESC</kbd> close
              </span>
              <span>
                <kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10">↵</kbd> select
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

