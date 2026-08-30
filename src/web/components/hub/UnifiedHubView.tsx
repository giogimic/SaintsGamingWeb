"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  Users,
  Activity,
  Wrench,
  Sparkles,
  Layers,
  Globe,
  Radio,
  LayoutGrid,
  Grid3X3,
  List,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

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
  const router = useRouter();

  const tabParam = searchParams.get("tab") as "news" | "modpacks" | "servers" | null;
  const [activeTab, setActiveTab] = useState<"news" | "modpacks" | "servers">(tabParam || initialTab);
  const [newsLayout, setNewsLayout] = useState<"3" | "6" | "list">("3");

  // Live Server State
  const [servers, setServers] = useState<GameServerItem[]>(initialServers);
  const [loadingServers, setLoadingServers] = useState(initialServers.length === 0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (tabParam && (tabParam === "news" || tabParam === "modpacks" || tabParam === "servers")) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    if (activeTab === "servers") {
      fetch("/api/servers/status")
        .then((res) => res.json())
        .then((data) => {
          if (data.servers) setServers(data.servers);
          setLoadingServers(false);
        })
        .catch((err) => {
          console.error("Error fetching servers:", err);
          setLoadingServers(false);
        });
    }
  }, [activeTab]);

  const handleTabChange = (tab: "news" | "modpacks" | "servers") => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
  };

  const handleCopy = (ip: string, port: number, id: string) => {
    navigator.clipboard.writeText(`${ip}:${port}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl sg-page-enter">
      {/* Main 2-Column Layout (Side Tabs + Tab Content) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side Tab Navigation */}
        <aside className="lg:col-span-3 space-y-3 sticky top-16">
          <div className="mb-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight sg-text-gradient">
              The Nexus
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Community Hub & Dedicated Network
            </p>
          </div>

          <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-xl p-3 shadow-lg flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible">
            <button
              onClick={() => handleTabChange("news")}
              className={`flex-1 lg:w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-bold transition-all duration-200 cursor-pointer ${
                activeTab === "news"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 translate-x-0 lg:translate-x-1"
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
              className={`flex-1 lg:w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-bold transition-all duration-200 cursor-pointer ${
                activeTab === "modpacks"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 translate-x-0 lg:translate-x-1"
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
              className={`flex-1 lg:w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-bold transition-all duration-200 cursor-pointer ${
                activeTab === "servers"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 translate-x-0 lg:translate-x-1"
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

          {/* Quick Action / MMO Launch Link */}
          <div className="hidden lg:block bg-card/20 backdrop-blur-md border border-border/30 rounded-xl p-4 text-xs space-y-2.5 text-muted-foreground">
            <div className="flex items-center gap-1.5 text-foreground font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Saints MMO World</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Explore open 2.5D regions, capture creatures, and battle with players live in the browser.
            </p>
            <Link href="/lobby" className="block pt-1">
              <Button size="sm" className="w-full gap-1.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 font-bold text-xs">
                <Globe className="w-3.5 h-3.5" />
                Enter MMO Realm
              </Button>
            </Link>
          </div>
        </aside>

        {/* Right Content Area */}
        <main className="lg:col-span-9 min-h-[500px]">
          {/* TAB 1: NEWS */}
          {activeTab === "news" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Community News</h2>
                  <p className="text-xs text-muted-foreground">Recent dispatches, patch notes, and updates from the Saints Gaming network</p>
                </div>

                {/* Layout Switcher (Row of 3, 6, or List) */}
                <div className="flex items-center gap-1 bg-card/60 border border-border/60 p-1 rounded-lg self-start sm:self-auto shadow-sm">
                  <button
                    onClick={() => setNewsLayout("3")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium transition-all cursor-pointer ${
                      newsLayout === "3"
                        ? "bg-primary text-primary-foreground font-bold shadow"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                    title="Row of 3 (Grid)"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>3 Col</span>
                  </button>

                  <button
                    onClick={() => setNewsLayout("6")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium transition-all cursor-pointer ${
                      newsLayout === "6"
                        ? "bg-primary text-primary-foreground font-bold shadow"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                    title="Row of 6 (Compact Grid)"
                  >
                    <Grid3X3 className="w-3.5 h-3.5" />
                    <span>6 Col</span>
                  </button>

                  <button
                    onClick={() => setNewsLayout("list")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium transition-all cursor-pointer ${
                      newsLayout === "list"
                        ? "bg-primary text-primary-foreground font-bold shadow"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                    title="List View"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>List</span>
                  </button>
                </div>
              </div>

              {articles.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground bg-card/30 rounded-xl border border-border/50">
                  <Newspaper className="h-12 w-12 mx-auto mb-3 opacity-30 text-primary" />
                  <h3 className="text-lg font-medium text-foreground">No News Articles Found</h3>
                  <p className="text-xs text-muted-foreground mt-1">Check back soon for the latest dispatches.</p>
                </div>
              ) : newsLayout === "list" ? (
                /* ─── LIST VIEW ─── */
                <div className="flex flex-col gap-3.5">
                  {articles.map((article) => (
                    <Link key={article.id} href={`/news/${article.slug}`} className="group block">
                      <Card className="bg-card/40 hover:bg-card/60 transition-all duration-200 border-border/50 overflow-hidden sg-glass hover:shadow-lg hover:border-primary/40 p-4">
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                          {article.coverImage ? (
                            <div className="relative w-full sm:w-44 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-muted/20 border border-border/40">
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
                            <div className="w-full sm:w-44 h-28 flex-shrink-0 rounded-lg bg-gradient-to-br from-primary/15 via-purple-500/10 to-background flex items-center justify-center border border-border/40">
                              <span className="text-xs font-bold opacity-40 sg-text-gradient font-mono">SAINTS NEWS</span>
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 font-mono">
                              <Calendar className="h-3 w-3 text-primary" />
                              <span>
                                {article.publishedAt
                                  ? format(new Date(article.publishedAt), "MMM d, yyyy")
                                  : "Draft"}
                              </span>
                              <span>·</span>
                              <span className="text-muted-foreground/80">{article.author.username}</span>
                            </div>
                            <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                              {article.title}
                            </h3>
                            <p className="text-muted-foreground text-xs line-clamp-2 mt-1">
                              {article.excerpt || article.body.substring(0, 160) + "..."}
                            </p>
                          </div>

                          <div className="hidden sm:flex items-center text-xs text-primary font-bold group-hover:translate-x-1 transition-transform flex-shrink-0">
                            Read <ArrowRight className="h-3.5 w-3.5 ml-1" />
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : newsLayout === "6" ? (
                /* ─── 6-COLUMN COMPACT GRID ─── */
                <div className="grid gap-3.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                  {articles.map((article) => (
                    <Link key={article.id} href={`/news/${article.slug}`} className="group h-full block">
                      <Card className="h-full bg-card/40 hover:bg-card/60 transition-all duration-200 border-border/50 overflow-hidden flex flex-col sg-glass hover:shadow-lg hover:border-primary/40">
                        {article.coverImage ? (
                          <div className="relative h-24 w-full overflow-hidden bg-muted/20">
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
                          <div className="h-24 w-full bg-gradient-to-br from-primary/10 via-purple-500/10 to-background flex items-center justify-center border-b border-border/40">
                            <span className="text-[10px] font-bold opacity-30 sg-text-gradient font-mono">SAINTS</span>
                          </div>
                        )}

                        <CardContent className="p-2.5 flex-1 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] text-muted-foreground/70 font-mono block mb-1">
                              {article.publishedAt
                                ? format(new Date(article.publishedAt), "MMM d")
                                : "Draft"}
                            </span>
                            <h3 className="text-xs font-bold group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                              {article.title}
                            </h3>
                          </div>
                          <span className="text-[10px] text-primary font-bold mt-2 flex items-center">
                            Read <ArrowRight className="h-2.5 w-2.5 ml-0.5" />
                          </span>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                /* ─── 3-COLUMN GRID (DEFAULT) ─── */
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {articles.map((article) => (
                    <Link key={article.id} href={`/news/${article.slug}`} className="group h-full">
                      <Card className="h-full bg-card/40 hover:bg-card/60 transition-all duration-300 border-border/50 overflow-hidden flex flex-col sg-glass hover:shadow-xl hover:border-primary/40 group">
                        {article.coverImage ? (
                          <div className="relative h-44 w-full overflow-hidden bg-muted/20">
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
                          <div className="h-44 w-full bg-gradient-to-br from-primary/10 via-purple-500/10 to-background flex items-center justify-center border-b border-border/40">
                            <span className="text-2xl font-black opacity-25 sg-text-gradient">SAINTS NEWS</span>
                          </div>
                        )}

                        <CardContent className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                              <Calendar className="h-3 w-3 text-primary" />
                              <span>
                                {article.publishedAt
                                  ? format(new Date(article.publishedAt), "MMM d, yyyy")
                                  : "Draft"}
                              </span>
                            </div>
                            <h3 className="text-base font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                              {article.title}
                            </h3>
                            <p className="text-muted-foreground text-xs line-clamp-3 mb-4">
                              {article.excerpt || article.body.substring(0, 140) + "..."}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-border/40 text-xs">
                            <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                              <User className="h-3.5 w-3.5 text-primary" />
                              <span>{article.author.username}</span>
                            </div>
                            <span className="text-primary font-bold flex items-center group-hover:translate-x-1 transition-transform">
                              Read Article <ArrowRight className="h-3.5 w-3.5 ml-1" />
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

          {/* TAB 2: MODPACKS */}
          {activeTab === "modpacks" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Community Modpacks</h2>
                  <p className="text-xs text-muted-foreground">Official mod packs for our community servers, built by the community</p>
                </div>
              </div>

              {modpacks.length === 0 ? (
                <div className="text-center py-16 bg-card/30 rounded-xl border border-border/50">
                  <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-foreground">No Modpacks Available</h3>
                  <p className="text-xs text-muted-foreground mt-1">Check back later for new releases.</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {modpacks.map((pack) => (
                    <Card key={pack.id} className="bg-card/40 hover:bg-card/60 transition-all duration-300 border-border/50 overflow-hidden flex flex-col sg-glass group hover:border-primary/40 hover:shadow-xl">
                      <div className="h-44 relative bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center overflow-hidden">
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
                          <Package className="h-14 w-14 text-primary/40" />
                        )}
                        <Badge className="absolute top-3 right-3 bg-background/85 backdrop-blur-md text-foreground border-border/50 text-xs font-mono font-bold">
                          v{pack.version || "1.0"}
                        </Badge>
                      </div>

                      <CardHeader className="p-5 pb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold text-primary uppercase tracking-wider font-mono">
                            {pack.game}
                          </span>
                        </div>
                        <CardTitle className="text-xl font-bold">{pack.name}</CardTitle>
                        <CardDescription className="line-clamp-2 text-xs sm:text-sm mt-1">
                          {pack.description}
                        </CardDescription>
                      </CardHeader>

                      <CardFooter className="flex gap-2 p-5 pt-3 mt-auto border-t border-border/40">
                        {pack.downloadUrl ? (
                          <Button className="flex-1 text-xs font-bold" asChild>
                            <a href={pack.downloadUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                            </a>
                          </Button>
                        ) : (
                          <Button className="flex-1 text-xs" disabled>
                            Unavailable
                          </Button>
                        )}
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/modpacks/${pack.slug}`}>
                            <span className="text-xs">Details</span>
                            <ChevronRight className="h-3.5 w-3.5 ml-1" />
                          </Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SERVERS */}
          {activeTab === "servers" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Dedicated Game Servers</h2>
                  <p className="text-xs text-muted-foreground">Live player counts and direct connection endpoints</p>
                </div>
              </div>

              {loadingServers ? (
                <div className="flex justify-center items-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
                </div>
              ) : servers.length === 0 ? (
                <div className="text-center py-16 bg-card/30 rounded-xl border border-border/50">
                  <Server className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-foreground">No Active Servers</h3>
                  <p className="text-xs text-muted-foreground mt-1">Servers will appear here once registered.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {servers.map((server) => (
                    <div
                      key={server.id}
                      className="sg-3d-card rounded-xl p-5 flex flex-col relative overflow-hidden bg-card/40 border border-border/50 backdrop-blur-xl shadow-lg hover:border-primary/40 transition-all duration-300"
                    >
                      <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-foreground">{server.name}</h3>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 font-mono">
                            <Server className="w-3.5 h-3.5 text-primary" /> {server.game}
                          </p>
                        </div>

                        {/* Status Indicator */}
                        <div className="flex items-center gap-1.5 bg-background/60 px-2.5 py-1 rounded-full border border-border/50 font-mono text-[11px]">
                          {server.status === "online" ? (
                            <>
                              <span className="relative flex h-2 w-2">
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

                      {/* Stats */}
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

                      {/* Connection info */}
                      <div className="mt-auto space-y-2">
                        <div className="mockup-code text-xs w-full bg-black/60 border border-border/40 py-2.5 px-3 rounded-lg font-mono">
                          <pre data-prefix="$" className="text-muted-foreground">
                            <code className="text-emerald-300">connect {server.ip}:{server.port}</code>
                          </pre>
                        </div>
                        <Button
                          className="w-full text-xs font-bold font-mono"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleCopy(server.ip, server.port, server.id)}
                          disabled={server.status === "maintenance"}
                        >
                          <Copy className="w-3.5 h-3.5 mr-1.5" />
                          {copiedId === server.id ? "Copied to Clipboard!" : "Copy IP Address"}
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
    </div>
  );
}
