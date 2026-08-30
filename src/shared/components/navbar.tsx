"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Home,
  Newspaper,
  Package,
  MessageSquare,
  Monitor,
  Menu,
  X,
  Video,
  Server,
  Trophy,
  Layers,
  Sparkles,
  Gamepad2,
  Settings,
  LogOut,
  User as UserIcon,
  Flame,
  Globe,
  Radio,
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

const NAV_ITEMS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/hub", label: "The Nexus", icon: Layers },
  { href: "/forum", label: "Forum", icon: MessageSquare },
  { href: "/forum/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/streams", label: "Streams", icon: Monitor },
  { href: "/lobby", label: "Play Now", icon: Gamepad2 },
];

export function Navbar({
  session,
  dbPermissionLevel,
  discordLink,
  showUcpLink = false,
  siteVersion = "v2.1.530",
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
        <header className="pointer-events-auto w-full bg-card/75 backdrop-blur-2xl border-b border-border/50 shadow-md transition-all duration-300">
          <div className="flex h-12 sm:h-14 items-center justify-between px-3 sm:px-6">
            {/* Left Brand */}
            <div className="flex items-center gap-3">
              <Link href="/home" className="flex items-center gap-2.5 group">
                <div className="transition-transform group-hover:scale-105">
                  <SGMicro3DLogo size={28} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm sm:text-base sg-text-gradient tracking-tight">
                    Saints MMO
                  </span>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold uppercase">
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
                  <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg border border-border/50 bg-background/50 text-xs font-mono">
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
                      className="h-8 gap-1.5 text-xs border-border/50 text-muted-foreground hover:text-foreground"
                      title="Return to Website"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Exit to Web</span>
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm", className: "h-8 text-xs" })}>
                    Log in
                  </Link>
                  <Link href="/home">
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                      <LogOut className="w-3.5 h-3.5" />
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
  return (
    <div className="sticky top-0 z-50 w-full pointer-events-none">
      <header className="pointer-events-auto w-full bg-card/60 backdrop-blur-2xl border-b border-border/50 shadow-sm transition-all duration-300">
        <div className="flex h-14 sm:h-16 items-center justify-between px-4 xl:px-8">
          {/* Logo / Brand */}
          <Link href="/home" className="flex items-center gap-3 group">
            <div className="transition-transform group-hover:scale-105">
              <SGMicro3DLogo size={36} />
            </div>
            <span className="font-bold text-lg sg-text-gradient hidden sm:inline tracking-tight">
              Saints Gaming
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || (href !== "/home" && pathname?.startsWith(href));
              const isLobby = href === "/lobby";
              const displayLabel = isLobby && !user ? "Enter Game" : label;
              return (
                <Link key={href} href={href} prefetch={true}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className={`gap-2 transition-all duration-200 ${
                      isLobby
                        ? "bg-gradient-to-r from-amber-500/20 to-emerald-500/20 text-amber-300 border border-amber-500/40 hover:from-amber-500 hover:to-emerald-500 hover:text-slate-950 font-bold shadow-sm hover:scale-105"
                        : isActive
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:scale-105"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {displayLabel}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Right side — Auth + Search + Notifications */}
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-4">
              <div className="w-48 lg:w-64">
                <GlobalSearch />
              </div>
              <ThemeSwitcher />
              {!user ? (
                <>
                  <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    className={buttonVariants({
                      size: "sm",
                      className: "bg-primary text-primary-foreground hover:bg-primary/90",
                    })}
                  >
                    Sign up
                  </Link>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <NotificationsMenu />
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="ghost" className="relative h-8 w-8 rounded-full" />}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.image || ""} alt={user.name || "Avatar"} />
                        <AvatarFallback className="bg-primary/20 text-primary">
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
            </div>

            {/* Mobile menu sheet */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger className="lg:hidden" render={<Button variant="ghost" size="icon" />}>
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[300px] sm:w-[350px] bg-card/95 backdrop-blur-xl border-l-border/50"
              >
                <div className="flex flex-col h-full">
                  <SheetTitle className="sr-only">Menu</SheetTitle>

                  <div className="flex items-center gap-3 pb-6 border-b border-border/50 mt-4">
                    {user ? (
                      <>
                        <Avatar className="h-10 w-10 border border-primary/20">
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
                      <div className="flex items-center gap-3">
                        <SGMicro3DLogo size={36} />
                        <span className="font-bold text-lg sg-text-gradient tracking-tight">
                          Saints Gaming
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 py-6 flex flex-col gap-1 overflow-y-auto scrollbar-hide">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                      Navigation
                    </span>
                    {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                      const isActive =
                        pathname === href || (href !== "/home" && pathname?.startsWith(href));
                      const isLobby = href === "/lobby";
                      const displayLabel = isLobby && !user ? "Enter Game" : label;
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
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

                  <div className="pt-6 border-t border-border/50 flex flex-col gap-2">
                    <ThemeSwitcher />
                    {!user ? (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <Link
                          href="/login"
                          onClick={() => setMobileOpen(false)}
                          className={buttonVariants({ variant: "outline", className: "w-full" })}
                        >
                          Log in
                        </Link>
                        <Link
                          href="/register"
                          onClick={() => setMobileOpen(false)}
                          className={buttonVariants({ className: "w-full" })}
                        >
                          Sign up
                        </Link>
                      </div>
                    ) : (
                      <Button
                        variant="destructive"
                        className="w-full mt-2"
                        onClick={() => signOut({ callbackUrl: "/" })}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
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
  siteVersion = "v2.1.530",
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
