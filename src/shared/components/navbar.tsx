"use client";

import Link from "next/link";
import dynamic from "next/dynamic";


import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Gamepad2,
  Settings,
  LogOut,
  Shield,
  Sparkles,
  Plus,
  Minus,
  Square,
  Copy,
  X,
  Paintbrush,
} from "lucide-react";
import { canEnterStudio } from "@/shared/game/studioPermissions";
import { Button, buttonVariants } from "@/shared/ui/button";
import { SGMicro3DLogo } from "@/web/components/landing/sg-logo-3d-micro";
import { GlobalSearch } from "@/shared/components/global-search";
import { NotificationsMenu } from "@/shared/components/notifications-menu";
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
import { usePostComposerStore } from "@/web/hooks/usePostComposerStore";
import { soundSynth } from "@/engine/sound-synth";

export function Navbar({
  session,
  dbPermissionLevel,
  discordLink,
  showUcpLink = false,
  siteVersion = "v2.1.709",
  gameTitle = "The Lobby",
}: {
  session: any | null;
  dbPermissionLevel?: number;
  discordLink?: string;
  showUcpLink?: boolean;
  siteVersion?: string;
  gameTitle?: string;
}) {
  const pathname = usePathname();
  const isBarsHidden = useImmersiveStore((s) => s.isBarsHidden);
  const openSettings = useUserSettingsStore((s) => s.openSettings);
  const openComposer = usePostComposerStore((s) => s.openComposer);

  const [isElectron, setIsElectron] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).electronAPI) {
      setIsElectron(true);
      (window as any).electronAPI.onMaximizeChange?.((max: boolean) => setIsMaximized(max));
    }
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
  const canDevStudio = isElectron && canEnterStudio(permissionLevel);

  return (
    <div className="fixed top-0 z-[250] w-full pointer-events-none">
      <header
        style={{ WebkitAppRegion: isElectron ? "drag" : undefined } as any}
        className={`pointer-events-auto w-full bg-[#050b14]/75 backdrop-blur-xl border-b border-white/[0.08] shadow-md transition-all duration-300 ${
          isBarsHidden ? "opacity-0 -translate-y-full pointer-events-none" : "opacity-100 translate-y-0"
        }`}
      >
        <div className="flex h-13 sm:h-11 items-center justify-between px-4 sm:px-6 relative">

          {/* Left: Search */}
          <div className="flex items-center gap-1 sm:gap-2 flex-1 [app-region:no-drag]" style={{ WebkitAppRegion: "no-drag" as any }}>
            <GlobalSearch />
          </div>

          {/* Center: Saints Gaming Logo & Tagline */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center [app-region:no-drag]" style={{ WebkitAppRegion: "no-drag" as any }}>
            <Link href="/home" className="flex items-center gap-2 group select-none">
              <div className="transition-transform group-hover:scale-110 shrink-0 hidden sm:block">
                <SGMicro3DLogo size={34} />
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-black text-sm sm:text-base md:text-lg sg-text-gradient tracking-tight whitespace-nowrap">
                  Saints Gaming
                </span>
                <span className="text-zinc-500/50 font-light text-[10px] sm:text-xs select-none">|</span>
                <span className="font-bold text-[10px] sm:text-[10.5px] md:text-[11px] sg-gunmetal-gradient tracking-widest uppercase font-mono whitespace-nowrap">
                  Time To Play
                </span>
              </div>
            </Link>
          </div>


          {/* Right: Studio (Dev only in Electron), Notifications, User dropdown, Window Controls */}
          <div className="flex items-center gap-1 sm:gap-2 flex-1 justify-end [app-region:no-drag]" style={{ WebkitAppRegion: "no-drag" as any }}>

            {/* Studio Launch Button (Only visible in Electron executable to Developers/Admins) */}
            {canDevStudio && (
              <Link
                href="/studio"
                className={buttonVariants({
                  variant: "ghost",
                  size: "sm",
                  className:
                    "h-7 px-2.5 text-[11px] rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-colors flex items-center gap-1.5 font-bold shadow-sm",
                })}
                title="Open World Studio (Developer Mode)"
              >
                <Paintbrush className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Studio</span>
              </Link>
            )}

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
                  <DropdownMenuContent className="w-64" align="end">
                    {/* User header: name/email left, gear right */}
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="font-normal py-2.5 px-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-col min-w-0">
                            <p className="text-sm font-semibold leading-none truncate">
                              {user.username || user.name}
                            </p>
                            <p className="text-xs leading-none text-muted-foreground mt-0.5 truncate">
                              {user.email}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                soundSynth?.playSelectSound?.();
                                openComposer();
                              }}
                              className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-primary transition-colors cursor-pointer shrink-0"
                              title="Create Post / Share Clip"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openSettings("account")}
                              className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-primary transition-colors cursor-pointer shrink-0"
                              title="Open Settings"
                            >
                              <Settings className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </DropdownMenuLabel>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />

                    {/* Game Title → /lobby */}
                    <DropdownMenuItem
                      className="cursor-pointer font-medium"
                      onClick={() => { window.location.href = "/lobby"; }}
                    >
                      <Gamepad2 className="mr-2 h-4 w-4 text-primary" />
                      {gameTitle}
                    </DropdownMenuItem>

                    {/* World Studio (Dev only in Electron) */}
                    {canDevStudio && (
                      <DropdownMenuItem
                        className="cursor-pointer font-medium text-amber-300 focus:text-amber-300 focus:bg-amber-500/10"
                        onClick={() => { window.location.href = "/studio"; }}
                      >
                        <Paintbrush className="mr-2 h-4 w-4 text-amber-400" />
                        World Studio
                      </DropdownMenuItem>
                    )}

                    {/* FiveM UCP (site setting gated) */}
                    {showUcpLink && (
                      <DropdownMenuItem render={<Link href="/ucp" className="cursor-pointer" />}>
                        <Shield className="mr-2 h-4 w-4 text-muted-foreground" />
                        FiveM UCP
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

                    {/* Native Desktop Exit (Active in Electron) */}
                    {isElectron && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="cursor-pointer text-muted-foreground hover:text-red-400 focus:text-red-400 focus:bg-red-500/10"
                          onClick={() => (window as any).electronAPI?.close?.()}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Exit Saints Gaming
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Native Window Controls (Active in Electron) */}
            {isElectron && (
              <div className="flex items-center ml-1 sm:ml-2 border-l border-white/10 pl-1 sm:pl-2 gap-0.5">
                <button
                  type="button"
                  onClick={() => (window as any).electronAPI?.minimize?.()}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Minimize Window"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => (window as any).electronAPI?.toggleMaximize?.()}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title={isMaximized ? "Restore Window" : "Maximize Window"}
                >
                  {isMaximized ? <Copy className="w-3 h-3 rotate-180" /> : <Square className="w-3 h-3" />}
                </button>
                <button
                  type="button"
                  onClick={() => (window as any).electronAPI?.close?.()}
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"
                  title="Close Saints Gaming"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </div>
  );
}



