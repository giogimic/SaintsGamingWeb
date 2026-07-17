"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { SGVoxelSvgLogo } from "@/components/landing/sg-logo-voxel-svg";
import { GlobalSearch } from "@/components/shared/global-search";
import { NotificationsMenu } from "@/components/shared/notifications-menu";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import type { Session } from "next-auth";
import { signOut } from "next-auth/react";
import { User as UserIcon, LogOut, Settings, Gamepad2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const NAV_ITEMS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/modpacks", label: "Modpacks", icon: Package },
  { href: "/servers", label: "Servers", icon: Server },
  { href: "/forum", label: "Forum", icon: MessageSquare },
  { href: "/streams", label: "Streams", icon: Monitor },
];

export function Navbar({ session, dbPermissionLevel, discordLink, showUcpLink = false }: { session: Session | null, dbPermissionLevel?: number, discordLink?: string, showUcpLink?: boolean }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const user = session?.user;
  // Use DB level if provided, otherwise fallback to session
  const permissionLevel = dbPermissionLevel ?? ((user?.permissionLevel as number) || 0);
  const isAdmin = permissionLevel >= 200; // MOD or above

  return (
    <div className="sticky top-0 z-50 w-full pointer-events-none">
      <header className="pointer-events-auto w-full bg-card/60 backdrop-blur-2xl border-b border-border/50 shadow-sm transition-all duration-300">
        <div className="flex h-14 sm:h-16 items-center justify-between px-4 xl:px-8">
          {/* Logo / Brand */}
          <Link
            href="/home"
            className="flex items-center gap-3 group"
          >
            {/* New Voxel SVG Logo */}
            <div className="transition-transform group-hover:scale-110">
              <SGVoxelSvgLogo size={32} animate={false} />
            </div>
            <span className="font-bold text-lg sg-text-gradient hidden sm:inline tracking-tight">
              Saints Gaming
            </span>
          </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname?.startsWith(href + "/");
            return (
              <Link key={href} href={href} prefetch={true}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className={`gap-2 transition-all duration-200 ${
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:scale-105"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Right side — Auth + Mobile menu */}
        <div className="flex items-center gap-2">
          {/* Auth controls */}
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
                <Link href="/register" className={buttonVariants({ size: "sm", className: "bg-primary text-primary-foreground hover:bg-primary/90" })}>
                  Sign up
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <NotificationsMenu />
                <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" className="relative h-8 w-8 rounded-full" />}>
                  <Avatar className="h-8 w-8">
                      <AvatarImage src={user.image || ""} alt={user.name || "Avatar"} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {user.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.username || user.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem render={<Link href="/profile" className="cursor-pointer" />}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  {showUcpLink && (
                    <DropdownMenuItem render={<Link href="/ucp" className="cursor-pointer" />}>
                      <Gamepad2 className="mr-2 h-4 w-4" />
                      FiveM UCP
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem render={<Link href="/admin" className="cursor-pointer" />}>
                      <Settings className="mr-2 h-4 w-4" />
                      Admin Dashboard
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-400/10" onClick={() => signOut({ callbackUrl: '/' })}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            )}
          </div>

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger className="lg:hidden" render={<Button variant="ghost" size="icon" />}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[350px] bg-card/95 backdrop-blur-xl border-l-border/50">
              <div className="flex flex-col h-full">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                
                {/* User Profile Section or Brand */}
                <div className="flex items-center gap-3 pb-6 border-b border-border/50 mt-4">
                  {user ? (
                    <>
                      <Avatar className="h-10 w-10 border border-primary/20">
                        <AvatarImage src={user.image || ""} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {user.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col overflow-hidden">
                        <span className="font-semibold text-sm truncate">{user.username || user.name}</span>
                        <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-3">
                      <SGVoxelSvgLogo size={32} animate={false} />
                      <span className="font-bold text-lg sg-text-gradient tracking-tight">Saints Gaming</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 py-6 flex flex-col gap-1 overflow-y-auto scrollbar-hide">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Navigation</span>
                  {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                    const isActive = pathname === href || pathname?.startsWith(href + "/");
                    return (
                      <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}>
                        <Icon className="h-4 w-4" />
                        {label}
                      </Link>
                    );
                  })}
                  
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-6 mb-2 px-2">Community</span>
                  <a href={discordLink || "https://discord.saintsgaming.net"} target="_blank" rel="noopener noreferrer" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-[#5865F2]/10 hover:text-[#5865F2] transition-colors">
                    <MessageSquare className="h-4 w-4" />
                    Discord
                  </a>

                  {user && (
                    <>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-6 mb-2 px-2">Account</span>
                      <Link href="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
                        <UserIcon className="h-4 w-4" /> Profile
                      </Link>
                      {showUcpLink && (
                        <Link href="/ucp" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
                          <Gamepad2 className="h-4 w-4" /> FiveM UCP
                        </Link>
                      )}
                      {isAdmin && (
                        <Link href="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
                          <Settings className="h-4 w-4" /> Admin
                        </Link>
                      )}
                    </>
                  )}
                </div>

                <div className="pt-6 border-t border-border/50 mt-auto">
                  {!user ? (
                    <div className="grid grid-cols-2 gap-3">
                      <Link href="/login" onClick={() => setMobileOpen(false)} className={buttonVariants({ variant: "outline", className: "w-full" })}>Log in</Link>
                      <Link href="/register" onClick={() => setMobileOpen(false)} className={buttonVariants({ className: "w-full" })}>Sign up</Link>
                    </div>
                  ) : (
                    <button className="flex w-full items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-red-500/90 hover:bg-red-500/10 hover:text-red-500 font-medium transition-colors" onClick={() => { setMobileOpen(false); signOut({ callbackUrl: '/' }); }}>
                      <LogOut className="h-4 w-4" />
                      Log out
                    </button>
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

export function Footer({ className, discordLink = "https://discord.saintsgaming.net", siteVersion = "1.2.3", showUcpLink = false }: { className?: string, discordLink?: string, siteVersion?: string, showUcpLink?: boolean }) {
  const socialLinks = [
    {
      href: "https://youtube.com/@SaintsGaming",
      label: "YouTube",
      icon: Video,
    },
    {
      href: discordLink || "https://discord.saintsgaming.net",
      label: "Discord",
      icon: MessageSquare,
    },
  ];

  return (
    <footer className={`bg-card/30 border-t border-border/40 mt-auto ${className || ""}`}>
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Column */}
          <div className="col-span-1 md:col-span-2 flex flex-col gap-4">
            <Link href="/home" className="flex items-center gap-3">
              <SGVoxelSvgLogo size={32} animate={false} />
              <span className="font-bold text-xl sg-text-gradient tracking-tight">Saints Gaming</span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-sm mt-2 leading-relaxed">
              A chill gaming community since 2007. No elitism, no toxicity. Just gamers being gamers. Come build with us.
            </p>
            <div className="flex items-center gap-4 mt-2">
              {socialLinks.map(({ href, label, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-primary/20 hover:text-primary transition-all"
                  aria-label={label}
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Links Column 1 */}
          <div className="flex flex-col gap-4">
            <h4 className="font-semibold text-foreground">Community</h4>
            <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/home" className="hover:text-primary transition-colors">Home</Link>
              <Link href="/forum" className="hover:text-primary transition-colors">Forum</Link>
              <Link href="/modpacks" className="hover:text-primary transition-colors">Modpacks</Link>
              <Link href="/servers" className="hover:text-primary transition-colors">Game Servers</Link>
            </nav>
          </div>

          {/* Links Column 2 */}
          <div className="flex flex-col gap-4">
            <h4 className="font-semibold text-foreground">Resources</h4>
            <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/news" className="hover:text-primary transition-colors">News & Updates</Link>
              <Link href="/streams" className="hover:text-primary transition-colors">Streams</Link>
              {showUcpLink && (
                <Link href="/ucp" className="hover:text-primary transition-colors">FiveM UCP</Link>
              )}
              <Link href="/support" className="hover:text-primary transition-colors">Support</Link>
            </nav>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm text-center sm:text-left">
            © {new Date().getFullYear()} Saints Gaming. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground/60 border border-border/30 rounded-full px-3 py-1 bg-muted/20">
            <span className="font-semibold">{siteVersion || process.env.NEXT_PUBLIC_SITE_VERSION || "1.2.1"}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
