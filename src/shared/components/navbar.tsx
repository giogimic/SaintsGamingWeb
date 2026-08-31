"use client";

import Link from "next/link";
import dynamic from "next/dynamic";

const StudioMenuBar = dynamic(
  () => import("@/web/components/the-lobby/editor/StudioMenuBar").then((m) => m.StudioMenuBar),
  { ssr: false }
);
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
  LifeBuoy,
  Shield,
  Search,
  Paintbrush,
  Film,
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

import { useImmersiveStore } from "@/web/hooks/useImmersiveStore";
import { useUserSettingsStore } from "@/web/hooks/useUserSettingsStore";

const MOBILE_NAV_ITEMS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/lobby", label: "Play Now", icon: Gamepad2 },
  { href: "/hub", label: "The Nexus", icon: Layers },
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
  siteVersion = "v2.1.575",
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
  const isBarsHidden = useImmersiveStore((s) => s.isBarsHidden);
  const openSettings = useUserSettingsStore((s) => s.openSettings);

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
    useImmersiveStore.getState().showBars();
  }, [pathname]);

  const user = session?.user;
  const permissionLevel = dbPermissionLevel ?? (user as any)?.permissionLevel ?? 0;
  const isOperator = permissionLevel >= 200 || (user as any)?.isWriter;
  const canAccessStudio = permissionLevel >= 200 || process.env.NODE_ENV === "development";

  const isStudioRoute = pathname?.startsWith("/studio");
  if (isStudioRoute) {
    return (
      <div className="fixed top-0 z-[250] w-full pointer-events-none">
        <StudioMenuBar />
      </div>
    );
  }

  const isGameRoute = pathname?.startsWith("/lobby");

  return (
    <div className="fixed top-0 z-[250] w-full pointer-events-none">
      <header className={`pointer-events-auto w-full bg-[#050b14]/75 backdrop-blur-xl border-b border-white/[0.08] shadow-md transition-all duration-300 ${
        isBarsHidden ? "opacity-0 -translate-y-full pointer-events-none" : "opacity-100 translate-y-0"
      }`}>
        <div className="flex h-13 sm:h-11 items-center justify-between px-4 sm:px-6">
          <Link href="/home" className="flex items-center gap-2.5 group mr-2">
            <div className="transition-transform group-hover:scale-110 shrink-0 hidden sm:block">
              <SGMicro3DLogo size={36} />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-black text-base sm:text-xl sg-text-gradient tracking-tight">
                Saints Gaming
              </span>
              <span className="text-muted-foreground/30 text-sm font-light hidden sm:inline">|</span>
              <span className="text-[10px] text-muted-foreground/80 tracking-widest uppercase font-bold mt-0.5 hidden sm:inline">
                Time To Play
              </span>
            </div>
          </Link>

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

          <div className="flex items-center gap-1 sm:gap-2">
            <GlobalSearch />

            <Button
              variant="ghost"
              size="icon"
              onClick={() => openSettings("appearance")}
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5 cursor-pointer"
              title="User Settings & Theme"
            >
              <Settings className="h-4 w-4 text-primary" />
              <span className="sr-only">Settings & Theme</span>
            </Button>

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
                  <DropdownMenuContent className="w-60" align="end">
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
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => openSettings("account")}
                    >
                      <UserIcon className="mr-2 h-4 w-4 text-primary" />
                      Account & Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => openSettings("posts")}
                    >
                      <Film className="mr-2 h-4 w-4 text-primary" />
                      Post Management
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => openSettings("appearance")}
                    >
                      <Paintbrush className="mr-2 h-4 w-4 text-amber-400" />
                      Theme & Display
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
                        <Shield className="mr-2 h-4 w-4 text-primary" />
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
                        <SGMicro3DLogo size={36} />
                        <span className="font-black text-lg sg-text-gradient tracking-tight">
                          Saints Gaming
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 py-4 flex flex-col gap-1 overflow-y-auto scrollbar-hide">
                    <button
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        window.dispatchEvent(new CustomEvent("sg:open-search"));
                      }}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all duration-200 cursor-pointer mb-1 border border-white/5 bg-black/20"
                    >
                      <Search className="h-4 w-4 text-primary" />
                      <span>Search Saints Gaming...</span>
                      <kbd className="ml-auto font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground">⌘K</kbd>
                    </button>

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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMobileOpen(false);
                        openSettings("appearance");
                      }}
                      className="w-full text-xs font-mono font-bold justify-start gap-2 border-border/60 bg-card/60 cursor-pointer"
                    >
                      <Paintbrush className="h-3.5 w-3.5 text-primary" />
                      Theme & Display Preferences
                    </Button>

                    {user && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setMobileOpen(false);
                          openSettings("posts");
                        }}
                        className="w-full text-xs font-mono font-bold justify-start gap-2 border-border/60 bg-card/60 cursor-pointer"
                      >
                        <Film className="h-3.5 w-3.5 text-primary" />
                        Post Management
                      </Button>
                    )}

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
                        className="w-full mt-1 text-xs cursor-pointer"
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
