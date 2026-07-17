"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Shield, Home, Users, MessageSquare, Newspaper, Package, Monitor, Settings, Award, Server,
  Database, Activity, Code, Cpu, RefreshCw, X, Menu
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PERMISSION_LEVELS } from "@/lib/permissions";

export function AdminOverlayShell({ 
  children, 
  permissionLevel, 
  isWriter 
}: { 
  children: React.ReactNode;
  permissionLevel: number;
  isWriter: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleClose = () => {
    router.push("/home");
  };

  const CATEGORIES = [
    {
      name: "Community",
      items: [
        { href: "/admin/forum", label: "Forum", icon: MessageSquare, isVisible: permissionLevel >= PERMISSION_LEVELS.HEAD_MODERATOR },
        { href: "/admin/news", label: "News", icon: Newspaper, isVisible: permissionLevel >= PERMISSION_LEVELS.ADMIN || isWriter },
        { href: "/admin/streams", label: "Streams", icon: Monitor, isVisible: permissionLevel >= PERMISSION_LEVELS.MODERATOR },
        { href: "/admin/tiers", label: "Level Tiers", icon: Award, isVisible: permissionLevel >= PERMISSION_LEVELS.ADMIN },
      ]
    },
    {
      name: "Game Servers",
      items: [
        { href: "/admin/game-servers", label: "Game Servers", icon: Server, isVisible: permissionLevel >= PERMISSION_LEVELS.ADMIN },
        { href: "/admin/modpacks", label: "Modpacks", icon: Package, isVisible: permissionLevel >= PERMISSION_LEVELS.ADMIN },
        { href: "/admin/characters", label: "Characters", icon: Users, isVisible: permissionLevel >= PERMISSION_LEVELS.ADMIN },
        { href: "/admin/server-manager", label: "FiveM txAdmin", icon: Server, isVisible: permissionLevel >= PERMISSION_LEVELS.FIVEM_DEVELOPER },
      ]
    },
    {
      name: "System Control",
      items: [
        { href: "/admin", label: "Dashboard", icon: Shield, isVisible: permissionLevel >= PERMISSION_LEVELS.MODERATOR, exact: true },
        { href: "/admin/users", label: "Users", icon: Users, isVisible: permissionLevel >= PERMISSION_LEVELS.ADMIN },
        { href: "/admin/roles", label: "Roles", icon: Shield, isVisible: permissionLevel >= PERMISSION_LEVELS.DEVELOPER },
        { href: "/admin/tickets", label: "Tickets", icon: Shield, isVisible: permissionLevel >= PERMISSION_LEVELS.MODERATOR },
        { href: "/admin/rss", label: "RSS Feeds", icon: Newspaper, isVisible: permissionLevel >= PERMISSION_LEVELS.COMMUNITY_MANAGER },
        { href: "/admin/settings", label: "Settings", icon: Settings, isVisible: permissionLevel >= PERMISSION_LEVELS.DEVELOPER },
      ]
    },
    {
      name: "Developer Tools",
      items: [
        { href: "/admin/dev", label: "Console Home", icon: Monitor, isVisible: permissionLevel >= PERMISSION_LEVELS.DEVELOPER, exact: true },
        { href: "/admin/dev/system", label: "System State", icon: Cpu, isVisible: permissionLevel >= PERMISSION_LEVELS.DEVELOPER },
        { href: "/admin/dev/database", label: "DB Health", icon: Database, isVisible: permissionLevel >= PERMISSION_LEVELS.DEVELOPER },
        { href: "/admin/dev/metrics", label: "Metrics", icon: Activity, isVisible: permissionLevel >= PERMISSION_LEVELS.DEVELOPER },
        { href: "/admin/dev/tasks", label: "Tasks", icon: RefreshCw, isVisible: permissionLevel >= PERMISSION_LEVELS.DEVELOPER },
        { href: "/admin/dev/sandbox", label: "API Sandbox", icon: Code, isVisible: permissionLevel >= PERMISSION_LEVELS.DEVELOPER },
      ]
    }
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden p-4 space-y-6">
      {CATEGORIES.map((cat, idx) => {
        const visibleItems = cat.items.filter(item => item.isVisible);
        if (visibleItems.length === 0) return null;
        return (
          <div key={idx}>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-2">{cat.name}</h3>
            <div className="space-y-1">
              {visibleItems.map(item => {
                const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={buttonVariants({ 
                      variant: isActive ? "secondary" : "ghost", 
                      className: `w-full justify-start gap-3 ${isActive ? 'bg-primary/20 text-primary hover:bg-primary/30' : ''}` 
                    })}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex sm:items-center justify-center bg-black/80 backdrop-blur-md sm:p-4 md:p-8 animate-in fade-in duration-200">
      <div className="w-full h-full sm:max-w-[1400px] bg-background/95 sm:bg-card/90 sg-glass sm:border border-border/50 sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl relative">
        
        {/* Header */}
        <div className="h-14 border-b border-border/50 flex items-center justify-between px-4 bg-muted/30 shrink-0">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 font-bold text-lg text-foreground">
              <Shield className="h-5 w-5 text-red-500" />
              Command Center
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 text-muted-foreground hover:text-red-400 transition-colors bg-muted/50 hover:bg-red-500/10 rounded-lg flex items-center gap-2 text-sm font-medium"
          >
            <X className="h-4 w-4" /> <span className="hidden sm:inline">Close</span>
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden relative">
          {/* Desktop Sidebar */}
          <aside className="w-64 border-r border-border/40 bg-card/30 hidden md:block shrink-0">
            <SidebarContent />
          </aside>

          {/* Mobile Sidebar Overlay */}
          {mobileOpen && (
            <div className="absolute inset-0 z-50 flex md:hidden">
              <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
              <aside className="w-[280px] h-full bg-card border-r border-border/50 relative shadow-2xl animate-in slide-in-from-left">
                <div className="h-14 border-b border-border/50 flex items-center justify-between px-4">
                  <span className="font-bold">Navigation</span>
                  <button onClick={() => setMobileOpen(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
                </div>
                <div className="h-[calc(100%-3.5rem)]">
                  <SidebarContent />
                </div>
              </aside>
            </div>
          )}

          {/* Main Content Area */}
          <main className="flex-1 overflow-auto bg-background/50 relative">
            <div className="p-4 sm:p-6 lg:p-8 min-h-full">
              {children}
            </div>
          </main>
        </div>

      </div>
    </div>
  );
}
