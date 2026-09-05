"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import {
  Newspaper,
  Package,
  Server,
  Calendar,
  User,
  ArrowRight,
  Download,
  ChevronRight,
  Copy,
  Check,
  Users,
  Activity,
  Wrench,
  Sparkles,
  Globe,
  Gamepad2,
  LayoutGrid,
  Grid3X3,
  List,
  Search,
  X,
  RotateCw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/web/components/ui/card";
import { Badge } from "@/web/components/ui/badge";
import { Button } from "@/web/components/ui/button";

interface NewsArticleItem {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  body: string;
  coverImage?: string | null;
  publishedAt: Date | string | null;
  author: {
    username: string;
  };
}

interface ModpackItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  game: string;
  version?: string | null;
  logoImage?: string | null;
  downloadUrl?: string | null;
}

interface GameServerItem {
  id: string;
  name: string;
  game: string;
  ip: string;
  port: number;
  isActive: boolean;
  status: "online" | "offline" | "maintenance";
  players: number;
  maxPlayers: number;
  ping: number;
}

interface UnifiedHubViewProps {
  initialTab?: "news" | "modpacks" | "servers";
  articles?: NewsArticleItem[];
  modpacks?: ModpackItem[];
  initialServers?: GameServerItem[];
}

function sanitizeSvg(svg: string) {
  if (!svg) return "";
  let clean = svg.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  clean = clean.replace(/\bon\w+\s*=\s*(['"])(?:(?!\1).)*\1/gi, "");
  clean = clean.replace(/\bon\w+\s*=\s*[^>\s]+/gi, "");
  clean = clean.replace(/href\s*=\s*(['"])javascript:.*?\1/gi, "");
  return clean;
}

export function UnifiedHubView({
  initialTab = "news",
  articles = [],
  modpacks = [],
  initialServers = [],
}: UnifiedHubViewProps) {
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab") as "news" | "modpacks" | "servers" | null;
  const [activeTab, setActiveTab] = useState<"news" | "modpacks" | "servers">(tabParam || initialTab);
  const [newsLayout, setNewsLayout] = useState<"3" | "6" | "list">("3");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>("all");

  // Live Server State
  const [servers, setServers] = useState<GameServerItem[]>(initialServers);
  const [loadingServers, setLoadingServers] = useState(initialServers.length === 0);
  const [isRefreshingServers, setIsRefreshingServers] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (tabParam && (tabParam === "news" || tabParam === "modpacks" || tabParam === "servers")) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const fetchServers = () => {
    setIsRefreshingServers(true);
    fetch("/api/servers/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.servers) setServers(data.servers);
        setLoadingServers(false);
        setIsRefreshingServers(false);
      })
      .catch((err) => {
        console.error("Error fetching servers:", err);
        setLoadingServers(false);
        setIsRefreshingServers(false);
      });
  };

  useEffect(() => {
    if (activeTab === "servers") {
      fetchServers();
    }
  }, [activeTab]);

  const handleTabChange = (tab: "news" | "modpacks" | "servers") => {
    setActiveTab(tab);
    setSearchQuery("");
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
  };

  const handleCopy = (ip: string, port: number, id: string) => {
    navigator.clipboard.writeText(`${ip}:${port}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered Articles
  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    const q = searchQuery.toLowerCase();
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.excerpt && a.excerpt.toLowerCase().includes(q)) ||
        a.author.username.toLowerCase().includes(q) ||
        a.body.toLowerCase().includes(q)
    );
  }, [articles, searchQuery]);

  // Unique Games for Modpack Filtering
  const availableGames = useMemo(() => {
    const games = Array.from(new Set(modpacks.map((m) => m.game.trim()).filter(Boolean)));
    return ["all", ...games];
  }, [modpacks]);

  // Filtered Modpacks
  const filteredModpacks = useMemo(() => {
    return modpacks.filter((m) => {
      const matchesGame = selectedGameFilter === "all" || m.game.toLowerCase() === selectedGameFilter.toLowerCase();
      const matchesQuery =
        !searchQuery.trim() ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.game.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesGame && matchesQuery;
    });
  }, [modpacks, selectedGameFilter, searchQuery]);

  // Filtered Servers
  const filteredServers = useMemo(() => {
    if (!searchQuery.trim()) return servers;
    const q = searchQuery.toLowerCase();
    return servers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.game.toLowerCase().includes(q) ||
        s.ip.toLowerCase().includes(q) ||
        s.status.toLowerCase().includes(q)
    );
  }, [servers, searchQuery]);

  // Server Stats
  const totalPlayersCount = useMemo(() => servers.reduce((acc, s) => acc + (s.players || 0), 0), [servers]);

  return (
    <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-6 max-w-7xl sg-page-enter">
      {/* ─── MOBILE & DESKTOP HERO HEADER ─── */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border/40">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight sg-text-gradient">
                The Seraphus
              </h1>
              <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-mono uppercase px-2 py-0.5">
                Hub
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Saints Gaming Community Hub, Game Modpacks & Dedicated 24/7 Servers
            </p>
          </div>

          {/* Quick Stats Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <div className="flex items-center gap-1.5 bg-card/60 border border-border/50 px-2.5 py-1 rounded-full text-[11px] font-mono text-muted-foreground whitespace-nowrap backdrop-blur-md">
              <Newspaper className="w-3 h-3 text-primary" />
              <span className="text-foreground font-bold">{articles.length}</span> News
            </div>
            <div className="flex items-center gap-1.5 bg-card/60 border border-border/50 px-2.5 py-1 rounded-full text-[11px] font-mono text-muted-foreground whitespace-nowrap backdrop-blur-md">
              <Package className="w-3 h-3 text-amber-400" />
              <span className="text-foreground font-bold">{modpacks.length}</span> Modpacks
            </div>
            <div className="flex items-center gap-1.5 bg-card/60 border border-border/50 px-2.5 py-1 rounded-full text-[11px] font-mono text-muted-foreground whitespace-nowrap backdrop-blur-md">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-foreground font-bold">{totalPlayersCount}</span> Online
            </div>
          </div>
        </div>
      </div>

      {/* ─── MOBILE STICKY SEGMENTED TAB CONTROLLER (< lg) ─── */}
      <div className="block lg:hidden sticky top-14 sm:top-16 z-30 mb-4 -mx-1 px-1 py-1.5 bg-[#050b14]/80 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center gap-1.5 p-1 bg-card/60 border border-border/50 rounded-xl shadow-lg">
          <button
            type="button"
            onClick={() => handleTabChange("news")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === "news"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-[1.02]"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>News</span>
            {articles.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                activeTab === "news" ? "bg-black/25 text-white" : "bg-muted/80 text-muted-foreground"
              }`}>
                {articles.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("modpacks")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === "modpacks"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-[1.02]"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Modpacks</span>
            {modpacks.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                activeTab === "modpacks" ? "bg-black/25 text-white" : "bg-muted/80 text-muted-foreground"
              }`}>
                {modpacks.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("servers")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === "servers"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-[1.02]"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Servers</span>
            <span className="flex h-2 w-2 relative ml-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </button>
        </div>
      </div>

      {/* ─── MAIN 2-COLUMN LAYOUT (DESKTOP SIDEBAR + CONTENT) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Desktop Left Side Tab Navigation */}
        <aside className="hidden lg:block lg:col-span-3 space-y-4 sticky top-20">
          <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-xl p-3 shadow-lg flex flex-col gap-2">
            <button
              onClick={() => handleTabChange("news")}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-bold transition-all duration-200 cursor-pointer ${
                activeTab === "news"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 translate-x-1"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <Newspaper className="w-4 h-4" />
                <span>Community News</span>
              </div>
              {articles.length > 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  activeTab === "news" ? "bg-black/20 text-white" : "bg-muted text-muted-foreground"
                }`}>
                  {articles.length}
                </span>
              )}
            </button>

            <button
              onClick={() => handleTabChange("modpacks")}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-bold transition-all duration-200 cursor-pointer ${
                activeTab === "modpacks"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 translate-x-1"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4" />
                <span>Modpacks</span>
              </div>
              {modpacks.length > 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  activeTab === "modpacks" ? "bg-black/20 text-white" : "bg-muted text-muted-foreground"
                }`}>
                  {modpacks.length}
                </span>
              )}
            </button>

            <button
              onClick={() => handleTabChange("servers")}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-bold transition-all duration-200 cursor-pointer ${
                activeTab === "servers"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 translate-x-1"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <Server className="w-4 h-4" />
                <span>Game Servers</span>
              </div>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </button>
          </div>

          {/* Quick Action / The Lobby Launch Link */}
          <div className="bg-card/30 backdrop-blur-md border border-border/40 rounded-xl p-4 text-xs space-y-2.5 text-muted-foreground">
            <div className="flex items-center gap-1.5 text-foreground font-semibold">
              <Gamepad2 className="w-3.5 h-3.5 text-primary" />
              <span>The Lobby</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Explore 2.5D regions, capture creatures, and hang out with the community live in the browser.
            </p>
            <Link href="/lobby" className="block pt-1">
              <Button size="sm" className="w-full gap-1.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 font-bold text-xs">
                <Gamepad2 className="w-3.5 h-3.5" />
                The Lobby
              </Button>
            </Link>
          </div>
        </aside>

        {/* Right Content Area */}
        <main className="lg:col-span-9 min-h-[500px]">
          {/* ══════════════════════════════════════════════
              TAB 1: COMMUNITY NEWS
             ══════════════════════════════════════════════ */}
          {activeTab === "news" && (
            <div className="space-y-4 sm:space-y-6">
              {/* Header & Controls Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/30 backdrop-blur-md border border-border/40 p-3 sm:p-4 rounded-xl">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                    <Newspaper className="w-5 h-5 text-primary" />
                    Community News
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Latest announcements, updates, and events from Saints Gaming
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {/* Search Input */}
                  <div className="relative flex-1 sm:w-48 sm:flex-none">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search news..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-background/60 border border-border/50 pl-8 pr-7 py-1.5 rounded-lg text-xs font-mono focus:outline-none focus:border-primary/60 text-foreground placeholder:text-muted-foreground/60"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Layout Switcher */}
                  <div className="flex items-center gap-1 bg-background/50 border border-border/60 p-0.5 rounded-lg shadow-sm">
                    <button
                      type="button"
                      onClick={() => setNewsLayout("3")}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono font-medium transition-all cursor-pointer ${
                        newsLayout === "3"
                          ? "bg-primary text-primary-foreground font-bold shadow"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      }`}
                      title="Cards View"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Cards</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewsLayout("6")}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono font-medium transition-all cursor-pointer ${
                        newsLayout === "6"
                          ? "bg-primary text-primary-foreground font-bold shadow"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      }`}
                      title="Compact Grid"
                    >
                      <Grid3X3 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Compact</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewsLayout("list")}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono font-medium transition-all cursor-pointer ${
                        newsLayout === "list"
                          ? "bg-primary text-primary-foreground font-bold shadow"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      }`}
                      title="List View"
                    >
                      <List className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">List</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Articles Rendering */}
              {filteredArticles.length === 0 ? (
                <div className="py-12 sm:py-16 text-center text-muted-foreground bg-card/30 rounded-xl border border-border/50 px-4">
                  <Newspaper className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 opacity-30 text-primary" />
                  <h3 className="text-base sm:text-lg font-medium text-foreground">No News Articles Found</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {searchQuery ? `No articles matching "${searchQuery}".` : "Check back soon for the latest dispatches."}
                  </p>
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchQuery("")}
                      className="mt-3 text-xs text-primary cursor-pointer"
                    >
                      Clear Search
                    </Button>
                  )}
                </div>
              ) : newsLayout === "list" ? (
                /* ─── LIST VIEW (MOBILE OPTIMIZED SIDE-BY-SIDE) ─── */
                <div className="flex flex-col gap-3">
                  {filteredArticles.map((article) => (
                    <Link key={article.id} href={`/news/${article.slug}`} className="group block">
                      <Card className="bg-card/40 hover:bg-card/60 transition-all duration-200 border-border/50 overflow-hidden sg-glass hover:shadow-lg hover:border-primary/40 p-3 sm:p-4">
                        <div className="flex flex-row gap-3 sm:gap-4 items-center">
                          {/* Side Thumbnail */}
                          {article.coverImage ? (
                            <div className="relative w-20 h-20 sm:w-36 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-muted/20 border border-border/40">
                              {article.coverImage.trim().startsWith("<svg") ? (
                                <div
                                  className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:object-cover transition-transform duration-300 group-hover:scale-105"
                                  dangerouslySetInnerHTML={{ __html: sanitizeSvg(article.coverImage) }}
                                />
                              ) : (
                                <Image
                                  src={article.coverImage}
                                  alt={article.title}
                                  fill
                                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                              )}
                            </div>
                          ) : (
                            <div className="w-20 h-20 sm:w-36 sm:h-24 flex-shrink-0 rounded-lg bg-gradient-to-br from-primary/15 via-purple-500/10 to-background flex items-center justify-center border border-border/40">
                              <span className="text-[10px] sm:text-xs font-bold opacity-40 sg-text-gradient font-mono">NEWS</span>
                            </div>
                          )}

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground mb-1 font-mono">
                              <Calendar className="h-3 w-3 text-primary shrink-0" />
                              <span>
                                {article.publishedAt
                                  ? format(new Date(article.publishedAt), "MMM d, yyyy")
                                  : "Draft"}
                              </span>
                              <span>·</span>
                              <span className="truncate">{article.author.username}</span>
                            </div>
                            <h3 className="text-xs sm:text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1 sm:line-clamp-2">
                              {article.title}
                            </h3>
                            <p className="text-muted-foreground text-[11px] sm:text-xs line-clamp-1 sm:line-clamp-2 mt-0.5 sm:mt-1">
                              {article.excerpt || article.body.substring(0, 140) + "..."}
                            </p>
                          </div>

                          <div className="hidden sm:flex items-center text-xs text-primary font-bold group-hover:translate-x-1 transition-transform flex-shrink-0 pr-1">
                            Read <ArrowRight className="h-3.5 w-3.5 ml-1" />
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : newsLayout === "6" ? (
                /* ─── COMPACT GRID VIEW ─── */
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                  {filteredArticles.map((article) => (
                    <Link key={article.id} href={`/news/${article.slug}`} className="group h-full block">
                      <Card className="h-full bg-card/40 hover:bg-card/60 transition-all duration-200 border-border/50 overflow-hidden flex flex-col sg-glass hover:shadow-lg hover:border-primary/40">
                        {article.coverImage ? (
                          <div className="relative h-20 sm:h-24 w-full overflow-hidden bg-muted/20">
                            {article.coverImage.trim().startsWith("<svg") ? (
                              <div
                                className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:object-cover transition-transform duration-300 group-hover:scale-105"
                                dangerouslySetInnerHTML={{ __html: sanitizeSvg(article.coverImage) }}
                              />
                            ) : (
                              <Image
                                src={article.coverImage}
                                alt={article.title}
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            )}
                          </div>
                        ) : (
                          <div className="h-20 sm:h-24 w-full bg-gradient-to-br from-primary/10 via-purple-500/10 to-background flex items-center justify-center border-b border-border/40">
                            <span className="text-[10px] font-bold opacity-30 sg-text-gradient font-mono">SAINTS</span>
                          </div>
                        )}

                        <CardContent className="p-2 sm:p-2.5 flex-1 flex flex-col justify-between">
                          <div>
                            <span className="text-[9px] sm:text-[10px] text-muted-foreground/70 font-mono block mb-0.5">
                              {article.publishedAt
                                ? format(new Date(article.publishedAt), "MMM d")
                                : "Draft"}
                            </span>
                            <h3 className="text-[11px] sm:text-xs font-bold group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                              {article.title}
                            </h3>
                          </div>
                          <span className="text-[10px] text-primary font-bold mt-1.5 flex items-center">
                            Read <ArrowRight className="h-2.5 w-2.5 ml-0.5" />
                          </span>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                /* ─── 3-COLUMN / DEFAULT GRID VIEW ─── */
                <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {filteredArticles.map((article) => (
                    <Link key={article.id} href={`/news/${article.slug}`} className="group h-full block">
                      <Card className="h-full bg-card/40 hover:bg-card/60 transition-all duration-300 border-border/50 overflow-hidden flex flex-col sg-glass hover:shadow-xl hover:border-primary/40">
                        {article.coverImage ? (
                          <div className="relative h-36 sm:h-44 w-full overflow-hidden bg-muted/20">
                            {article.coverImage.trim().startsWith("<svg") ? (
                              <div
                                className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:object-cover transition-transform duration-500 group-hover:scale-105"
                                dangerouslySetInnerHTML={{ __html: sanitizeSvg(article.coverImage) }}
                              />
                            ) : (
                              <Image
                                src={article.coverImage}
                                alt={article.title}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            )}
                          </div>
                        ) : (
                          <div className="h-36 sm:h-44 w-full bg-gradient-to-br from-primary/10 via-purple-500/10 to-background flex items-center justify-center border-b border-border/40">
                            <span className="text-xl sm:text-2xl font-black opacity-25 sg-text-gradient">SAINTS NEWS</span>
                          </div>
                        )}

                        <CardContent className="p-3.5 sm:p-5 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-2 text-[11px] sm:text-xs text-muted-foreground mb-1.5 sm:mb-2 font-mono">
                              <Calendar className="h-3 w-3 text-primary" />
                              <span>
                                {article.publishedAt
                                  ? format(new Date(article.publishedAt), "MMM d, yyyy")
                                  : "Draft"}
                              </span>
                            </div>
                            <h3 className="text-sm sm:text-base font-bold mb-1.5 sm:mb-2 group-hover:text-primary transition-colors line-clamp-2">
                              {article.title}
                            </h3>
                            <p className="text-muted-foreground text-xs line-clamp-2 sm:line-clamp-3 mb-3 sm:mb-4">
                              {article.excerpt || article.body.substring(0, 140) + "..."}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-2.5 sm:pt-3 border-t border-border/40 text-xs">
                            <div className="flex items-center gap-1.5 text-muted-foreground font-medium truncate pr-2">
                              <User className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="truncate">{article.author.username}</span>
                            </div>
                            <span className="text-primary font-bold flex items-center group-hover:translate-x-1 transition-transform shrink-0">
                              Read <ArrowRight className="h-3.5 w-3.5 ml-1" />
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════
              TAB 2: COMMUNITY MODPACKS
             ══════════════════════════════════════════════ */}
          {activeTab === "modpacks" && (
            <div className="space-y-4 sm:space-y-6">
              {/* Header & Filter Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/30 backdrop-blur-md border border-border/40 p-3 sm:p-4 rounded-xl">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                    <Package className="w-5 h-5 text-amber-400" />
                    Community Modpacks
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Official mod packages designed for our community servers
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {/* Search Input */}
                  <div className="relative flex-1 sm:w-48 sm:flex-none">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search modpacks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-background/60 border border-border/50 pl-8 pr-7 py-1.5 rounded-lg text-xs font-mono focus:outline-none focus:border-primary/60 text-foreground placeholder:text-muted-foreground/60"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Game Filter Pills */}
              {availableGames.length > 2 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {availableGames.map((game) => (
                    <button
                      key={game}
                      type="button"
                      onClick={() => setSelectedGameFilter(game)}
                      className={`px-3 py-1 rounded-full text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
                        selectedGameFilter === game
                          ? "bg-primary text-primary-foreground shadow"
                          : "bg-card/50 text-muted-foreground hover:text-foreground border border-border/40"
                      }`}
                    >
                      {game === "all" ? "All Games" : game}
                    </button>
                  ))}
                </div>
              )}

              {/* Modpack Cards */}
              {filteredModpacks.length === 0 ? (
                <div className="text-center py-12 sm:py-16 bg-card/30 rounded-xl border border-border/50 px-4">
                  <Package className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <h3 className="text-base sm:text-lg font-medium text-foreground">No Modpacks Found</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {searchQuery ? `No modpacks matching "${searchQuery}".` : "Check back later for new releases."}
                  </p>
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchQuery("")}
                      className="mt-3 text-xs text-primary cursor-pointer"
                    >
                      Clear Search
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
                  {filteredModpacks.map((pack) => (
                    <Card key={pack.id} className="bg-card/40 hover:bg-card/60 transition-all duration-300 border-border/50 overflow-hidden flex flex-col sg-glass group hover:border-primary/40 hover:shadow-xl">
                      <div className="h-36 sm:h-44 relative bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center overflow-hidden">
                        {pack.logoImage ? (
                          pack.logoImage.trim().startsWith("<svg") ? (
                            <div
                              className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                              dangerouslySetInnerHTML={{ __html: sanitizeSvg(pack.logoImage) }}
                            />
                          ) : (
                            <Image
                              src={pack.logoImage}
                              alt={pack.name}
                              fill
                              className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                            />
                          )
                        ) : (
                          <Package className="h-12 w-12 sm:h-14 sm:w-14 text-primary/40" />
                        )}
                        <Badge className="absolute top-2.5 right-2.5 bg-background/85 backdrop-blur-md text-foreground border-border/50 text-[11px] font-mono font-bold">
                          v{pack.version || "1.0"}
                        </Badge>
                      </div>

                      <CardHeader className="p-4 sm:p-5 pb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] sm:text-[11px] font-bold text-primary uppercase tracking-wider font-mono">
                            {pack.game}
                          </span>
                        </div>
                        <CardTitle className="text-lg sm:text-xl font-bold">{pack.name}</CardTitle>
                        <CardDescription className="line-clamp-2 text-xs sm:text-sm mt-1">
                          {pack.description}
                        </CardDescription>
                      </CardHeader>

                      <CardFooter className="flex gap-2 p-4 sm:p-5 pt-3 mt-auto border-t border-border/40">
                        {pack.downloadUrl ? (
                          <Button className="flex-1 text-xs font-bold gap-1.5 h-9" asChild>
                            <a href={pack.downloadUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="h-3.5 w-3.5" /> Download
                            </a>
                          </Button>
                        ) : (
                          <Button className="flex-1 text-xs h-9" disabled>
                            Unavailable
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="h-9 px-3" asChild>
                          <Link href={`/modpacks/${pack.slug}`}>
                            <span className="text-xs">Details</span>
                            <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                          </Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════
              TAB 3: DEDICATED GAME SERVERS
             ══════════════════════════════════════════════ */}
          {activeTab === "servers" && (
            <div className="space-y-4 sm:space-y-6">
              {/* Header & Status Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/30 backdrop-blur-md border border-border/40 p-3 sm:p-4 rounded-xl">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                    <Server className="w-5 h-5 text-emerald-400" />
                    Dedicated Game Servers
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Live player counts and direct connection endpoints
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchServers}
                    disabled={isRefreshingServers}
                    className="text-xs font-mono gap-1.5 h-8 bg-background/50 cursor-pointer"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isRefreshingServers ? "animate-spin text-primary" : ""}`} />
                    <span>Refresh</span>
                  </Button>
                </div>
              </div>

              {loadingServers ? (
                <div className="flex flex-col justify-center items-center py-16 sm:py-20 gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-primary" />
                  <p className="text-xs font-mono text-muted-foreground">Pinging game servers...</p>
                </div>
              ) : filteredServers.length === 0 ? (
                <div className="text-center py-12 sm:py-16 bg-card/30 rounded-xl border border-border/50 px-4">
                  <Server className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <h3 className="text-base sm:text-lg font-medium text-foreground">No Active Servers</h3>
                  <p className="text-xs text-muted-foreground mt-1">Servers will appear here once registered.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {filteredServers.map((server) => (
                    <div
                      key={server.id}
                      className="rounded-xl p-4 sm:p-5 flex flex-col relative overflow-hidden bg-card/40 border border-border/50 backdrop-blur-xl shadow-lg hover:border-primary/40 transition-all duration-300"
                    >
                      <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                      {/* Card Header */}
                      <div className="flex justify-between items-start mb-3 sm:mb-4 gap-2">
                        <div>
                          <h3 className="text-base sm:text-lg font-bold text-foreground">{server.name}</h3>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 font-mono">
                            <Server className="w-3.5 h-3.5 text-primary shrink-0" /> {server.game}
                          </p>
                        </div>

                        {/* Status Indicator */}
                        <div className="flex items-center gap-1.5 bg-background/60 px-2.5 py-1 rounded-full border border-border/50 font-mono text-[11px] shrink-0">
                          {server.status === "online" ? (
                            <>
                              <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                              </span>
                              <span className="font-semibold text-emerald-400">Online</span>
                            </>
                          ) : server.status === "maintenance" ? (
                            <>
                              <Wrench className="w-3 h-3 text-amber-400" />
                              <span className="font-semibold text-amber-400">Maintenance</span>
                            </>
                          ) : (
                            <>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                              <span className="font-semibold text-rose-400">Offline</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-3 mb-4 bg-background/40 p-3 rounded-lg border border-border/40 font-mono text-xs">
                        <div className="flex flex-col">
                          <span className="text-muted-foreground flex items-center gap-1 mb-1">
                            <Users className="w-3 h-3 text-primary" /> Players
                          </span>
                          <span className="font-bold text-foreground text-sm">
                            {server.players} <span className="text-muted-foreground text-xs">/ {server.maxPlayers}</span>
                          </span>
                          <div className="w-full bg-background/80 rounded-full h-1.5 mt-2 overflow-hidden">
                            <div
                              className="bg-primary h-1.5 rounded-full transition-all duration-1000"
                              style={{ width: `${Math.min(100, (server.players / (server.maxPlayers || 1)) * 100)}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex flex-col items-end justify-center">
                          <span className="text-muted-foreground flex items-center gap-1 mb-1">
                            <Activity className="w-3 h-3 text-emerald-400" /> Ping
                          </span>
                          <span className="font-bold text-emerald-400 text-sm">{server.ping || 18}ms</span>
                        </div>
                      </div>

                      {/* Connection Block & Copy Action */}
                      <div className="mt-auto space-y-2">
                        <div className="text-xs w-full bg-black/60 border border-border/40 py-2 px-3 rounded-lg font-mono flex items-center justify-between gap-2 overflow-hidden">
                          <span className="text-muted-foreground shrink-0">$</span>
                          <code className="text-emerald-300 truncate select-all flex-1 text-[11px] sm:text-xs">
                            connect {server.ip}:{server.port}
                          </code>
                        </div>

                        <Button
                          className="w-full text-xs font-bold font-mono gap-1.5 h-9 cursor-pointer"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleCopy(server.ip, server.port, server.id)}
                          disabled={server.status === "maintenance"}
                        >
                          {copiedId === server.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied to Clipboard!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Server IP</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ─── AMBIENT THE LOBBY PROMO BANNER ON MOBILE (< lg) ─── */}
      <div className="block lg:hidden mt-6 bg-card/30 backdrop-blur-md border border-border/40 rounded-xl p-4 text-xs space-y-2 text-muted-foreground">
        <div className="flex items-center gap-1.5 text-foreground font-semibold">
          <Gamepad2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold">The Lobby</span>
        </div>
        <p className="text-xs leading-relaxed">
          Step into our live 2.5D multiplayer world right from your browser.
        </p>
        <Link href="/lobby" className="block pt-1">
          <Button size="sm" className="w-full gap-1.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 font-bold text-xs h-9">
            <Gamepad2 className="w-3.5 h-3.5" />
            The Lobby
          </Button>
        </Link>
      </div>
    </div>
  );
}
