"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRealtimeStore } from "@/web/hooks/useRealtimeStore";
import { useMessenger } from "@/web/components/messenger/messenger-provider";
import { useGameStore } from "@/web/components/the-lobby/store";
import { soundSynth } from "@/engine/sound-synth";
import { getUserStatusStats, UserStatusStats } from "@/app/actions/user";

const StudioBottomToolbar = dynamic(
  () => import("@/web/components/the-lobby/editor/StudioBottomToolbar").then((m) => m.StudioBottomToolbar),
  { ssr: false }
);
import { useImmersiveStore } from "@/web/hooks/useImmersiveStore";
import {
  Activity,
  Terminal,
  ShieldAlert,
  MessageCircle,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Coins,
  Heart,
  Cpu,
  RefreshCw,
  Trash2,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  X,
  AlertTriangle,
  Radio,
  Gamepad2,
  Sparkles,
  Zap,
  Globe,
  CheckCircle2,
  Trophy,
  Layers,
  BookOpen,
  LifeBuoy,
  Flame,
  MessageSquare,
  Plus
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { SGMicro3DLogo } from "@/web/components/landing/sg-logo-3d-micro";
import { ActionTooltip } from "@/shared/ui/action-tooltip";

// Grouped by usage: Play & Social Media on the Left, Nexus & Support on the Right
const BOTTOM_NAV_LEFT_PAGES = [
  { href: "/lobby", label: "Play", icon: Gamepad2, tooltip: "Saints MMO Game" },
  { href: "/feed", label: "Feed", icon: Flame, tooltip: "Video & Clip Feed" },
  { href: "/streams", label: "Streams", icon: Radio, tooltip: "Live Streams & Media" },
  { href: "/forum", label: "Forums", icon: MessageSquare, tooltip: "Community Discussions" },
];

const BOTTOM_NAV_RIGHT_PAGES = [
  { href: "/hub", label: "Nexus", icon: Layers, tooltip: "Operations & Downloads Hub" },
  { href: "/wiki", label: "Wiki", icon: BookOpen, tooltip: "Knowledge Base & Guides" },
  { href: "/support", label: "Support", icon: LifeBuoy, tooltip: "Help & Support Desk" },
];

interface ClientErrorLog {
  id: string;
  type: "error" | "warn" | "unhandled";
  message: string;
  stack?: string;
  timestamp: string;
}

export function GlobalBottomBar({
  dbPermissionLevel,
  siteVersion = "v2.1.563",
}: {
  dbPermissionLevel?: number;
  siteVersion?: string;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isStudioRoute = pathname?.startsWith("/studio");
  if (isStudioRoute) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[250] pointer-events-none">
        <StudioBottomToolbar />
      </div>
    );
  }
  const isGameRoute = pathname?.startsWith("/lobby");

  // Realtime & Messenger Store
  const mmoPlayerCount = useRealtimeStore((s) => s.mmoPlayerCount);
  const { isOpen: isMessengerOpen, setIsOpen: setIsMessengerOpen } = useMessenger();

  // User Status Stats (Coins, Level, AP Score)
  const [userStats, setUserStats] = useState<UserStatusStats | null>(null);

  useEffect(() => {
    if (session?.user) {
      getUserStatusStats().then(setUserStats).catch(console.error);
    } else {
      setUserStats(null);
    }
  }, [session?.user]);

  // Permissions
  const user = session?.user;
  const permissionLevel = dbPermissionLevel ?? ((user?.permissionLevel as number) || 0);
  const isDevOrAdmin = permissionLevel >= 400;
  const isMod = permissionLevel >= 200;

  // Game Store (Safe subscriptions)
  const gameMode = useGameStore((s) => s.gameMode);
  const player = useGameStore((s) => s.player);
  const activeMapId = useGameStore((s) => s.currentMapId);

  // Audio & Fullscreen state
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Dev & Mod Drawer state
  const [devConsoleOpen, setDevConsoleOpen] = useState(false);
  const [modDrawerOpen, setModDrawerOpen] = useState(false);
  const [activeDevTab, setActiveDevTab] = useState<"logs" | "react" | "perf">("logs");
  const [errorLogs, setErrorLogs] = useState<ClientErrorLog[]>([]);

  // FPS Counter
  const [fps, setFps] = useState<number>(60);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Global Error Interceptor for Dev Console
  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      const newLog: ClientErrorLog = {
        id: Math.random().toString(36).substring(2, 9),
        type: "error",
        message: event.message || "Unknown client error",
        stack: event.error?.stack,
        timestamp: new Date().toLocaleTimeString(),
      };
      setErrorLogs((prev) => [newLog, ...prev].slice(0, 50));
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const newLog: ClientErrorLog = {
        id: Math.random().toString(36).substring(2, 9),
        type: "unhandled",
        message: typeof reason === "string" ? reason : reason?.message || "Unhandled Promise Rejection",
        stack: reason?.stack,
        timestamp: new Date().toLocaleTimeString(),
      };
      setErrorLogs((prev) => [newLog, ...prev].slice(0, 50));
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  // Smooth FPS Measuring Loop
  useEffect(() => {
    let animId: number;
    const calcFps = () => {
      frameCountRef.current++;
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      if (delta >= 1000) {
        const nextFps = Math.round((frameCountRef.current * 1000) / delta);
        setFps((prev) => (prev !== nextFps ? nextFps : prev));
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
      animId = requestAnimationFrame(calcFps);
    };
    animId = requestAnimationFrame(calcFps);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Audio Toggle
  const toggleAudio = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next) {
        soundSynth?.setMasterVolume?.(0);
      } else {
        soundSynth?.setMasterVolume?.(1);
        soundSynth?.playSelectSound?.();
      }
      return next;
    });
  };

  // Fullscreen Toggle
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // ignore
    }
  };

  // Resolve dynamic route context pill
  const getRouteLabel = () => {
    if (!pathname) return "Saints";
    if (pathname.startsWith("/lobby")) return `Saints MMO · ${gameMode}`;
    if (pathname.startsWith("/studio")) return `World Studio · ${activeMapId || "Editor"}`;
    if (pathname.startsWith("/hub") || pathname.startsWith("/news") || pathname.startsWith("/modpacks") || pathname.startsWith("/servers")) {
      return "The Nexus · Operations Hub";
    }
    if (pathname.startsWith("/forum")) return "Community Forums · Discussions";
    if (pathname.startsWith("/streams")) return "Live Streams · Media";
    if (pathname.startsWith("/feed")) return "Saints Feed · Highlights";
    if (pathname.startsWith("/wiki")) return "Saints Wiki · Guides";
    if (pathname.startsWith("/support")) return "Support Desk · Help";
    if (pathname.startsWith("/profile") || pathname.startsWith("/user")) return "Player Profile";
    if (pathname.startsWith("/admin")) return "Command & Control Center";
    return "Saints · Online";
  };

  const isBarsHidden = useImmersiveStore((s) => s.isBarsHidden);

  const handleGlobalPost = () => {
    if (typeof window === "undefined") return;
    if (pathname?.startsWith("/profile/inbox") || pathname?.startsWith("/feed")) {
      window.dispatchEvent(new CustomEvent("saints-open-post-composer"));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.location.href = "/profile/inbox?post=1";
    }
  };

  // If fullscreen in game mode, suppress bottom bar to allow pure immersive gameplay
  if (isFullscreen && isGameRoute) {
    return null;
  }

  const username = userStats?.username || user?.username || user?.name || "Player";
  const userCoins = userStats?.coins ?? 500;
  const userLevel = userStats?.level ?? 1;
  const userAchievements = userStats?.achievementCount ?? 0;

  return (
    <>
      {/* ── PERSISTENT GLOBAL BOTTOM BAR ──────────────────────────────── */}
      <footer className={`fixed bottom-0 left-0 right-0 z-[250] h-12 sm:h-8 bg-[#050b14]/75 backdrop-blur-xl border-t border-white/[0.08] shadow-2xl px-3 sm:px-6 flex items-center justify-between text-xs font-mono select-none pointer-events-auto transition-all duration-300 ${
        isBarsHidden ? "opacity-0 translate-y-full pointer-events-none" : "opacity-100 translate-y-0"
      }`}>
          
          {/* LEFT SECTION: Connected User & Account Stats / Online Orb */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            {/* Green Status Orb */}
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>

            {user ? (
              <div className="flex items-center gap-2 sm:gap-2.5 truncate">
                {/* Account Name & Level */}
                <span className="font-bold text-foreground truncate max-w-[80px] sm:max-w-[120px] text-[11px]" title={`Account: ${username}`}>
                  {username}
                </span>
                <ActionTooltip label="Account Level">
                  <span className="px-1.5 py-0.2 rounded bg-primary/10 border border-primary/25 text-primary font-bold text-[10px] cursor-help">
                    {isGameRoute && player?.name ? `ACCT LVL ${userLevel}` : `LVL ${userLevel}`}
                  </span>
                </ActionTooltip>

                {/* Character Name & Level in Game Mode */}
                {isGameRoute && player?.name && (
                  <>
                    <span className="text-muted-foreground/40 hidden sm:inline">|</span>
                    <ActionTooltip label={`Active Hero: ${player.name} (Level ${player.level || 1})`}>
                      <div className="hidden sm:flex items-center gap-1.5 text-amber-400 font-bold text-[11px] cursor-help">
                        <Gamepad2 className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-amber-400 shrink-0" />
                        <span className="text-amber-300 truncate max-w-[110px]">{player.name}</span>
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-[10px]">
                          LVL {player.level || 1}
                        </span>
                      </div>
                    </ActionTooltip>
                  </>
                )}

                {/* Coins */}
                <ActionTooltip label="Saints Coins">
                  <div className="hidden md:flex items-center gap-1 text-amber-400 font-bold text-[11px] cursor-help">
                    <Coins className="w-3 h-3" />
                    <span>{userCoins.toLocaleString()}</span>
                  </div>
                </ActionTooltip>

                {/* Achievements */}
                <ActionTooltip label="Achievement Points">
                  <div className="hidden lg:flex items-center gap-1 text-yellow-400 font-bold text-[11px] cursor-help">
                    <Trophy className="w-3 h-3" />
                    <span>{userAchievements} AP</span>
                  </div>
                </ActionTooltip>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-emerald-400 font-bold">
                  {mmoPlayerCount > 0 ? `${mmoPlayerCount} Online` : "Connected"}
                </span>
              </div>
            )}
          </div>

          {/* CENTER SECTION: Links + Logo + Post Button */}
          <div className="flex items-center justify-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Left Group (Play, Feed, Streams, Forums) */}
            <div className="flex items-center gap-0.5 sm:gap-1">
              {BOTTOM_NAV_LEFT_PAGES.map(({ href, label, icon: Icon, tooltip }) => {
                const isActive = pathname === href || (href !== "/home" && pathname?.startsWith(href));
                return (
                  <ActionTooltip key={href} label={tooltip}>
                    <Link
                      href={href}
                      prefetch={true}
                      className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2 py-1.5 sm:py-0.5 rounded-md text-[11px] font-sans font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-primary/20 text-primary border border-primary/40 shadow-[0_0_8px_rgba(203,178,106,0.25)] font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent"
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 sm:w-3 sm:h-3 ${isActive ? "text-primary" : "opacity-70"}`} />
                      <span className="hidden sm:inline">{label}</span>
                    </Link>
                  </ActionTooltip>
                );
              })}
            </div>

            {/* Global Post Button */}
            <ActionTooltip label="Create Post / Upload Clip">
              <button
                type="button"
                onClick={handleGlobalPost}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-0.5 rounded-full bg-primary text-primary-foreground font-bold text-[11px] hover:opacity-90 active:scale-95 shadow-[0_0_12px_rgba(203,178,106,0.3)] transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Post</span>
              </button>
            </ActionTooltip>

            {/* Logo and Saints Brand Name */}
            <div className="mx-1 flex items-center justify-center gap-1.5">
              <div className="hover:scale-110 transition-transform cursor-pointer" title="Saints">
                <Link href="/home" className="flex items-center gap-1.5">
                  <SGMicro3DLogo size={28} />
                  <span className="hidden xl:inline-block font-black text-foreground text-xs sm:text-[13px] tracking-wide">
                    Saints
                  </span>
                </Link>
              </div>
            </div>

            {/* Right Group (Nexus, Wiki, Support) */}
            <div className="flex items-center gap-0.5 sm:gap-1">
              {BOTTOM_NAV_RIGHT_PAGES.map(({ href, label, icon: Icon, tooltip }) => {
                const isActive = pathname === href || (href !== "/home" && pathname?.startsWith(href));
                return (
                  <ActionTooltip key={href} label={tooltip}>
                    <Link
                      href={href}
                      prefetch={true}
                      className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2 py-1.5 sm:py-0.5 rounded-md text-[11px] font-sans font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-primary/20 text-primary border border-primary/40 shadow-[0_0_8px_rgba(203,178,106,0.25)] font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent"
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 sm:w-3 sm:h-3 ${isActive ? "text-primary" : "opacity-70"}`} />
                      <span className="hidden sm:inline">{label}</span>
                    </Link>
                  </ActionTooltip>
                );
              })}
            </div>
          </div>

          {/* RIGHT SECTION: Controls, Roles & Social Drawer */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 flex-1 min-w-0">
            {/* Moderator Drawer Trigger */}
            {isMod && !isDevOrAdmin && (
              <ActionTooltip label="Moderator Tools">
                <button
                  onClick={() => {
                    setModDrawerOpen((prev) => !prev);
                    setDevConsoleOpen(false);
                  }}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                    modDrawerOpen
                      ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                      : "border-amber-500/30 text-amber-400/80 hover:text-amber-300 hover:border-amber-400 bg-black/40"
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mod</span>
                </button>
              </ActionTooltip>
            )}

            {/* Dev Console Trigger (Devs & Admins) */}
            {isDevOrAdmin && (
              <ActionTooltip label="Dev Console">
                <button
                  onClick={() => {
                    setDevConsoleOpen((prev) => !prev);
                    setModDrawerOpen(false);
                  }}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                    devConsoleOpen
                      ? "bg-primary/20 border-primary text-primary shadow-[0_0_10px_rgba(0,245,212,0.3)]"
                      : "border-primary/30 text-primary/80 hover:text-primary hover:border-primary/60 bg-black/40"
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Console</span>
                  {errorLogs.length > 0 && (
                    <span className="px-1 py-0.2 rounded-full bg-rose-500/80 text-white text-[9px] font-bold">
                      {errorLogs.length}
                    </span>
                  )}
                </button>
              </ActionTooltip>
            )}

            {/* Social Messenger Drawer Trigger */}
            {session?.user && (
              <ActionTooltip label="Social Messenger">
                <button
                  onClick={() => setIsMessengerOpen(!isMessengerOpen)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                    isMessengerOpen
                      ? "bg-primary text-primary-foreground border-primary shadow-[0_0_12px_rgba(0,245,212,0.4)]"
                      : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Social</span>
                </button>
              </ActionTooltip>
            )}

            {/* Version badge */}
            <span className="text-[10px] text-muted-foreground/60 hidden xl:inline ml-1 font-mono">
              {siteVersion}
            </span>
          </div>
        </footer>

      {/* ── DEVELOPER POP-OUT CONSOLE DRAWER ───────────────────────────── */}
      {devConsoleOpen && isDevOrAdmin && (
        <div className="fixed bottom-11 right-2 sm:right-6 w-full max-w-xl bg-card/95 backdrop-blur-2xl border border-primary/40 rounded-t-xl shadow-2xl z-50 flex flex-col max-h-[70vh] font-mono text-xs overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-black/40">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-primary" />
              <span className="font-bold text-foreground">Saints Dev Console</span>
              <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/30 text-primary text-[10px] uppercase font-bold">
                Admin Mode
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={() => setDevConsoleOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Drawer Navigation Tabs */}
          <div className="flex border-b border-border/40 bg-muted/20 px-2 pt-1 gap-1">
            <button
              onClick={() => setActiveDevTab("logs")}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-t-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeDevTab === "logs"
                  ? "bg-card text-primary border-t border-x border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Errors & Logs ({errorLogs.length})</span>
            </button>

            <button
              onClick={() => setActiveDevTab("react")}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-t-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeDevTab === "react"
                  ? "bg-card text-primary border-t border-x border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>React & State</span>
            </button>

            <button
              onClick={() => setActiveDevTab("perf")}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-t-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeDevTab === "perf"
                  ? "bg-card text-primary border-t border-x border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Performance</span>
            </button>
          </div>

          {/* Drawer Content */}
          <div className="p-4 overflow-y-auto max-h-[50vh] space-y-3">
            {/* TAB 1: LOGS */}
            {activeDevTab === "logs" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground text-[11px]">Live Client Error Stream</span>
                  {errorLogs.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setErrorLogs([])}
                      className="h-6 text-[10px] gap-1 text-rose-400 hover:text-rose-300"
                    >
                      <Trash2 className="w-3 h-3" /> Clear Logs
                    </Button>
                  )}
                </div>

                {errorLogs.length === 0 ? (
                  <div className="py-8 text-center bg-black/30 rounded-lg border border-border/40 text-muted-foreground text-[11px]">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1 opacity-70" />
                    No client errors captured. React runtime healthy!
                  </div>
                ) : (
                  errorLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded bg-black/60 border border-rose-500/30 text-rose-300 text-[11px] space-y-1 font-mono"
                    >
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="text-rose-400 font-bold uppercase">{log.type}</span>
                        <span>{log.timestamp}</span>
                      </div>
                      <p className="font-semibold text-rose-200">{log.message}</p>
                      {log.stack && (
                        <pre className="text-[9px] text-rose-400/70 overflow-x-auto whitespace-pre-wrap max-h-24 bg-black/40 p-1.5 rounded">
                          {log.stack}
                        </pre>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 2: REACT & STATE */}
            {activeDevTab === "react" && (
              <div className="space-y-3">
                <div className="bg-black/40 p-3 rounded-lg border border-border/40 space-y-2">
                  <h4 className="font-bold text-primary text-[11px]">Routing & Session Info</h4>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-muted-foreground">Current Route:</span>{" "}
                      <span className="text-foreground">{pathname}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">User Permission:</span>{" "}
                      <span className="text-emerald-400 font-bold">Level {permissionLevel}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Auth State:</span>{" "}
                      <span className="text-foreground">{session?.user ? "Authenticated" : "Anonymous"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Game Route:</span>{" "}
                      <span className="text-foreground">{isGameRoute ? "Yes (Lobby Active)" : "No (Web Page)"}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-black/40 p-3 rounded-lg border border-border/40 space-y-2">
                  <h4 className="font-bold text-cyan-400 text-[11px]">Quick Dev Teleport</h4>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 gap-1"
                      onClick={() => (window.location.href = "/admin")}
                    >
                      <ExternalLink className="w-3 h-3" /> /admin
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 gap-1"
                      onClick={() => (window.location.href = "/studio")}
                    >
                      <ExternalLink className="w-3 h-3" /> /studio
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 gap-1"
                      onClick={() => (window.location.href = "/lobby")}
                    >
                      <ExternalLink className="w-3 h-3" /> /lobby
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 gap-1"
                      onClick={() => (window.location.href = "/hub")}
                    >
                      <ExternalLink className="w-3 h-3" /> /hub
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: PERFORMANCE */}
            {activeDevTab === "perf" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black/40 p-3 rounded-lg border border-border/40">
                    <span className="text-muted-foreground text-[10px]">Render FPS</span>
                    <p className="text-2xl font-black text-emerald-400 mt-1">{fps}</p>
                  </div>
                  <div className="bg-black/40 p-3 rounded-lg border border-border/40">
                    <span className="text-muted-foreground text-[10px]">MMO Roster Count</span>
                    <p className="text-2xl font-black text-cyan-400 mt-1">{mmoPlayerCount}</p>
                  </div>
                </div>

                <div className="bg-black/40 p-3 rounded-lg border border-border/40 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Screen Size:</span>
                    <span>{typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Device Pixel Ratio:</span>
                    <span>{typeof window !== "undefined" ? window.devicePixelRatio : 1}x</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODERATOR POP-OUT DRAWER ────────────────────────────────────── */}
      {modDrawerOpen && isMod && (
        <div className="fixed bottom-11 right-2 sm:right-6 w-full max-w-md bg-card/95 backdrop-blur-2xl border border-amber-500/40 rounded-t-xl shadow-2xl z-50 flex flex-col max-h-[60vh] font-mono text-xs overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-black/40">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-foreground">Saints Moderation Drawer</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={() => setModDrawerOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="p-4 space-y-3 overflow-y-auto">
            <div className="bg-black/40 p-3 rounded-lg border border-border/40 space-y-1">
              <span className="text-[10px] text-muted-foreground">Real-time Presence</span>
              <p className="text-sm font-bold text-amber-300">
                {mmoPlayerCount} Active Saints across all shards
              </p>
            </div>

            <div className="space-y-2">
              <Button
                size="sm"
                className="w-full justify-start text-xs font-bold gap-2"
                onClick={() => (window.location.href = "/admin/users")}
              >
                <ExternalLink className="w-3.5 h-3.5" /> Inspect User Directory
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start text-xs font-bold gap-2"
                onClick={() => (window.location.href = "/admin/audit")}
              >
                <ExternalLink className="w-3.5 h-3.5" /> View Audit Logs
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
