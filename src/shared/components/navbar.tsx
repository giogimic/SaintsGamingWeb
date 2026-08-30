"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Home,
  MessageSquare,
  Monitor,
  Menu,
  X,
  Trophy,
  Layers,
  Sparkles,
  Gamepad2,
  Settings,
  LogOut,
  User as UserIcon,
  Flame,
  BookOpen,
  LifeBuoy,
  Shield,
  Search,
} from "lucide-react";
import { Button, buttonVariants } from "@/shared/ui/button";
import { SGMicro3DLogo } from "@/web/components/landing/sg-logo-3d-micro";
import { GlobalSearch } from "@/shared/components/global-search";
import { NotificationsMenu } from "@/shared/components/notifications-menu";
import { ThemeSwitcher } from "@/shared/components/theme-switcher";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/shared/ui/sheet";
import { signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";

const MOBILE_NAV_ITEMS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/lobby", label: "Play Now", icon: Gamepad2 },
  { href: "/hub", label: "The Nexus", icon: Layers },
  { href: "/wiki", label: "Wiki & Guides", icon: BookOpen },
  { href: "/support", label: "Support", icon: LifeBuoy },
  { href: "/forum", label: "Community Forum", icon: MessageSquare },
  { href: "/forum/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/streams", label: "Streams", icon: Monitor },
];

function getPageTitle(pathname: string | null): string {
  if (!pathname || pathname === "/" || pathname === "/home") return "Home";
  if (pathname.startsWith("/hub")) return "The Nexus";
  if (pathname.startsWith("/lobby")) return "Play Now";
  if (pathname.startsWith("/wiki")) return "Wiki";
  if (pathname.startsWith("/support")) return "Support";
  if (pathname.startsWith("/forum/leaderboard")) return "Leaderboard";
  if (pathname.startsWith("/forum")) return "Forum";
  if (pathname.startsWith("/streams")) return "Streams";
  if (pathname.startsWith("/modpacks")) return "Modpacks";
  if (pathname.startsWith("/profile")) return "Profile";
  if (pathname.startsWith("/admin")) return "Command Center";
  if (pathname.startsWith("/studio")) return "World Studio";
  if (pathname.startsWith("/ucp")) return "FiveM UCP";
  if (pathname.startsWith("/login")) return "Sign In";
  if (pathname.startsWith("/register")) return "Sign Up";

  const segment = pathname.split("/").filter(Boolean).pop() || "Saints";
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
}

export function Navbar({
  session,
  dbPermissionLevel,
  discordLink,
  showUcpLink = false,
  siteVersion = "v2.1.536",
}: {
  session: any | null;
  dbPermissionLevel?: number;
  discordLink?: string;
  showUcpLink?: boolean;
  siteVersion?: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (pathname && !pathname.startsWith("/admin")) {
      try {
        sessionStorage.setItem("sg_last_non_admin_route", pathname);
      } catch {
        // ignore
      }
    }
  }, [pathname]);

  const user = session?.user;
  const permissionLevel = dbPermissionLevel ?? ((user?.permissionLevel as number) || 0);
  const isWriter = Boolean(user?.isWriter);
  const isOperator = permissionLevel >= 200 || isWriter;
  const canAccessStudio = permissionLevel >= 300;

  const isGameRoute = pathname?.startsWith("/lobby") || pathname?.startsWith("/studio");

  // In fullscreen game mode, auto-hide the top bar
  if (isFullscreen && isGameRoute) {
    return null;
  }

  // ── GAME-MODE TOP BAR ───────────────────────────────────────────────
  if (isGameRoute) {
    return (
      <div className="sticky top-0 z-50 w-full pointer-events-none">
        <header className="pointer-events-auto w-full bg-card/85 backdrop-blur-2xl border-b border-border/50 shadow-md transition-all duration-300">
          <div className="flex h-11 sm:h-12 items-center justify-between px-3 sm:px-6">
            {/* Left Brand */}
            <div className="flex items-center gap-3">
              <Link href="/home" className="flex items-center gap-2 group">
                <div className="transition-transform group-hover:scale-105">
                  <SGMicro3DLogo size={24} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs sm:text-sm sg-text-gradient tracking-tight">
                    Saints MMO
                  </span>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9px] font-mono font-bold uppercase">
                    Live Shard
                  </span>
                </div>
              </Link>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2">
              <ThemeSwitcher />

              {user ? (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-2 px-2 py-0.5 rounded-lg border border-border/50 bg-background/50 text-xs font-mono">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="text-foreground font-bold truncate max-w-[120px]">
                      {user.username || user.name || "Operative"}
                    </span>
                  </div>

                  <Link href="/home">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 sm:h-8 gap-1.5 text-xs border-border/50 text-muted-foreground hover:text-foreground"
                      title="Return to Website"
                    >
                      <LogOut className="w-3 h-3" />
                      <span className="hidden sm:inline">Exit to Web</span>
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm", className: "h-7 sm:h-8 text-xs" })}>
                    Log in
                  </Link>
                  <Link href="/home">
                    <Button variant="outline" size="sm" className="h-7 sm:h-8 gap-1.5 text-xs">
                      <LogOut className="w-3 h-3" />
                      <span className="hidden sm:inline">Exit</span>
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>
      </div>
    );
  }

  // ── STANDARD WEBSITE TOP BAR ─────────────────────────────────────────
  const pageTitle = getPageTitle(pathname);

  return (
    <div className="sticky top-0 z-50 w-full pointer-events-none">
      <header className="pointer-events-auto w-full bg-card/85 backdrop-blur-2xl border-b border-border/50 shadow-md transition-all duration-300">
        <div className="flex h-11 sm:h-12 items-center justify-between px-3 sm:px-6">
          {/* Left Brand */}
          <Link href="/home" className="flex items-center gap-2 group mr-2">
            <div className="transition-transform group-hover:scale-110">
              <SGMicro3DLogo size={26} />
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="font-bold text-sm sm:text-base sg-text-gradient tracking-tight">
                Saints Gaming
              </span>
              <span className="text-muted-foreground/30 text-sm font-light">|</span>
              <span className="text-[10px] text-muted-foreground/80 tracking-widest uppercase font-bold mt-0.5">
                Time To Play
              </span>
            </div>
          </Link>

          {/* Center Navigation */}
          <div className="hidden lg:flex items-center gap-1 flex-1 justify-center">
            <Link
              href="/home"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                pathname === "/home" || pathname === "/"
                  ? "bg-primary/10 text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Home className="h-3.5 w-3.5" />
              <span>Home</span>
            </Link>

            <Link
              href="/hub"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                pathname?.startsWith("/hub")
                  ? "bg-primary/10 text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>The Nexus</span>
            </Link>

            <Link
              href="/lobby"
              prefetch={true}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold transition-all ${
                pathname?.startsWith("/lobby")
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                  : "text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10 border border-transparent"
              }`}
            >
              <Gamepad2 className="h-3.5 w-3.5" />
              <span>Play Now</span>
            </Link>

            <Link
              href="/forum"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                pathname?.startsWith("/forum")
                  ? "bg-primary/10 text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Forum</span>
            </Link>

            <Link
              href="/wiki"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                pathname?.startsWith("/wiki")
                  ? "bg-primary/10 text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Wiki</span>
            </Link>

            <Link
              href="/support"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                pathname?.startsWith("/support")
                  ? "bg-primary/10 text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <LifeBuoy className="h-3.5 w-3.5" />
              <span>Support</span>
            </Link>
          </div>

          {/* Right Navigation: Search, User Profile */}
          <div className="flex items-center gap-1 sm:gap-2">

            {/* Global Search */}
            <div className="hidden xl:block w-36 lg:w-44">
              <GlobalSearch />
            </div>

            <ThemeSwitcher />

            {/* Auth / Avatar Dropdown */}
            {!user ? (
              <div className="flex items-center p-1 bg-black/40 rounded-xl shadow-inner border border-white/5">
                <Link
                  href="/login"
                  className={buttonVariants({ variant: "ghost", size: "sm", className: "h-7 px-3 text-[11px] rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors" })}
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className={buttonVariants({
                    size: "sm",
                    className: "h-7 px-3 text-[11px] rounded-lg bg-primary/20 text-primary hover:bg-primary/30 shadow-none hidden sm:inline-flex border border-primary/20",
                  })}
                >
                  Sign up
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <NotificationsMenu />
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="ghost" className="relative h-7 w-7 sm:h-8 sm:w-8 rounded-full p-0" />}
                  >
                    <Avatar className="h-7 w-7 sm:h-8 sm:w-8 border border-primary/30">
                      <AvatarImage src={user.image || ""} alt={user.name || "Avatar"} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">
                        {user.username?.charAt(0).toUpperCase() ||
                          user.email?.charAt(0).toUpperCase() ||
                          "U"}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {user.username || user.name}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                        </div>
                      </DropdownMenuLabel>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem render={<Link href="/profile" className="cursor-pointer" />}>
                      <UserIcon className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      render={
                        <Link href="/profile/inbox" className="cursor-pointer text-primary font-medium" />
                      }
                    >
                      <Flame className="mr-2 h-4 w-4 text-primary" />
                      The Feed
                    </DropdownMenuItem>
                    {showUcpLink && (
                      <DropdownMenuItem render={<Link href="/ucp" className="cursor-pointer" />}>
                        <Gamepad2 className="mr-2 h-4 w-4" />
                        FiveM UCP
                      </DropdownMenuItem>
                    )}
                    {canAccessStudio && (
                      <DropdownMenuItem
                        render={
                          <Link href="/studio" className="cursor-pointer text-purple-400 font-medium" />
                        }
                      >
                        <Sparkles className="mr-2 h-4 w-4 text-purple-400" />
                        2.5D World Studio
                      </DropdownMenuItem>
                    )}
                    {isOperator && (
                      <DropdownMenuItem
                        render={
                          <Link href="/admin" className="cursor-pointer text-primary font-medium" />
                        }
                      >
                        <Settings className="mr-2 h-4 w-4 text-primary" />
                        Admin Command Center
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-400/10"
                      onClick={() => signOut({ callbackUrl: "/" })}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Mobile menu sheet */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger className="lg:hidden" render={<Button variant="ghost" size="icon" className="h-8 w-8 p-0" />}>
                {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[300px] sm:w-[350px] bg-card/95 backdrop-blur-xl border-l-border/50"
              >
                <div className="flex flex-col h-full">
                  <SheetTitle className="sr-only">Menu</SheetTitle>

                  <div className="flex items-center gap-3 pb-4 border-b border-border/50 mt-2">
                    {user ? (
                      <>
                        <Avatar className="h-9 w-9 border border-primary/20">
                          <AvatarImage src={user.image || ""} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {user.username?.charAt(0).toUpperCase() ||
                              user.email?.charAt(0).toUpperCase() ||
                              "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col overflow-hidden">
                          <span className="font-semibold text-sm truncate">
                            {user.username || user.name}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <SGMicro3DLogo size={28} />
                        <span className="font-bold text-base sg-text-gradient tracking-tight">
                          Saints Gaming
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 py-4 flex flex-col gap-1 overflow-y-auto scrollbar-hide">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-2">
                      Navigation
                    </span>
                    {MOBILE_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                      const isActive =
                        pathname === href || (href !== "/home" && pathname?.startsWith(href));
                      const isLobby = href === "/lobby";
                      const displayLabel = isLobby && !user ? "Enter Game" : label;
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all duration-200 ${
                            isLobby
                              ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 shadow-sm"
                              : isActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {displayLabel}
                        </Link>
                      );
                    })}
                  </div>

                  <div className="pt-4 border-t border-border/50 flex flex-col gap-2">
                    <ThemeSwitcher />
                    {!user ? (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <Link
                          href="/login"
                          onClick={() => setMobileOpen(false)}
                          className={buttonVariants({ variant: "outline", size: "sm", className: "w-full text-xs" })}
                        >
                          Log in
                        </Link>
                        <Link
                          href="/register"
                          onClick={() => setMobileOpen(false)}
                          className={buttonVariants({ size: "sm", className: "w-full text-xs" })}
                        >
                          Sign up
                        </Link>
                      </div>
                    ) : (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full mt-1 text-xs"
                        onClick={() => signOut({ callbackUrl: "/" })}
                      >
                        <LogOut className="mr-2 h-3.5 w-3.5" />
                        Log out
                      </Button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </div>
  );
}

export function Footer({
  className = "",
  discordLink = "https://discord.saintsgaming.net",
  siteVersion = "v2.1.536",
  showUcpLink = false,
}: {
  className?: string;
  discordLink?: string;
  siteVersion?: string;
  showUcpLink?: boolean;
}) {
  const pathname = usePathname();
  if (pathname?.startsWith("/lobby") || pathname?.startsWith("/studio")) {
    return null;
  }

  return (
    <footer className={`bg-card/40 backdrop-blur-md border-t border-border/50 py-12 px-4 xl:px-8 transition-colors ${className}`}>
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-4 md:col-span-2">
          <div className="flex items-center gap-3">
            <SGMicro3DLogo size={32} />
            <span className="font-bold text-xl sg-text-gradient">Saints Gaming</span>
          </div>
          <p className="text-muted-foreground text-sm max-w-sm">
            Next-generation gaming community platform featuring immersive 2.5D multiplayer MMO worlds, FiveM roleplay ecosystems, and creator tools.
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-sm tracking-wider uppercase text-foreground">Explore</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/hub" className="hover:text-primary transition-colors">
                The Nexus (News & Servers)
              </Link>
            </li>
            <li>
              <Link href="/forum" className="hover:text-primary transition-colors">
                Community Forum
              </Link>
            </li>
            <li>
              <Link href="/streams" className="hover:text-primary transition-colors">
                Live Streams
              </Link>
            </li>
            <li>
              <Link href="/wiki" className="hover:text-primary transition-colors">
                Community Wiki
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-sm tracking-wider uppercase text-foreground">Connect</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <a href={discordLink} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">
                Discord Server
              </a>
            </li>
            <li>
              <Link href="/support" className="hover:text-primary transition-colors">
                Support & Contact
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-4">
        <p>© {new Date().getFullYear()} Saints Gaming Network. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <span className="font-mono text-primary/80">{siteVersion}</span>
        </div>
      </div>
    </footer>
  );
}
