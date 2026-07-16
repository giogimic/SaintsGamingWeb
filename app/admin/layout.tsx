import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PERMISSION_LEVELS } from "@/lib/permissions";
import Link from "next/link";
import { Shield, Home, Users, MessageSquare, Newspaper, Package, Monitor, Settings, Award, Server } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true, isWriter: true }
  });

  if (!dbUser || (dbUser.permissionLevel < PERMISSION_LEVELS.MODERATOR && !dbUser.isWriter)) {
    redirect("/not-found");
  }

  const ADMIN_NAV = [
    { href: "/admin", label: "Dashboard", icon: Shield, isVisible: dbUser.permissionLevel >= PERMISSION_LEVELS.MODERATOR },
    { href: "/admin/tickets", label: "Tickets", icon: Shield, isVisible: dbUser.permissionLevel >= PERMISSION_LEVELS.MODERATOR },
    { href: "/admin/streams", label: "Streams", icon: Monitor, isVisible: dbUser.permissionLevel >= PERMISSION_LEVELS.MODERATOR },
    { href: "/admin/forum", label: "Forum", icon: MessageSquare, isVisible: dbUser.permissionLevel >= PERMISSION_LEVELS.HEAD_MODERATOR },
    { href: "/admin/users", label: "Users", icon: Users, isVisible: dbUser.permissionLevel >= PERMISSION_LEVELS.ADMIN },
    { href: "/admin/roles", label: "Roles", icon: Shield, isVisible: dbUser.permissionLevel >= PERMISSION_LEVELS.DEVELOPER },
    { href: "/admin/characters", label: "Characters", icon: Users, isVisible: dbUser.permissionLevel >= PERMISSION_LEVELS.ADMIN },
    { href: "/admin/news", label: "News", icon: Newspaper, isVisible: dbUser.permissionLevel >= PERMISSION_LEVELS.ADMIN || dbUser.isWriter },
    { href: "/admin/tiers", label: "Level Tiers", icon: Award, isVisible: dbUser.permissionLevel >= PERMISSION_LEVELS.ADMIN },
    { href: "/admin/modpacks", label: "Modpacks", icon: Package, isVisible: dbUser.permissionLevel >= PERMISSION_LEVELS.ADMIN },
    { href: "/admin/rss", label: "RSS Feeds", icon: Newspaper, isVisible: dbUser.permissionLevel >= PERMISSION_LEVELS.COMMUNITY_MANAGER },
    { href: "/admin/server-manager", label: "FiveM txAdmin", icon: Server, isVisible: dbUser.permissionLevel >= PERMISSION_LEVELS.FIVEM_DEVELOPER },
    { href: "/admin/game-servers", label: "Game Servers", icon: Server, isVisible: dbUser.permissionLevel >= PERMISSION_LEVELS.ADMIN },
    { href: "/admin/settings", label: "Settings", icon: Settings, isVisible: dbUser.permissionLevel >= PERMISSION_LEVELS.DEVELOPER },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border/40 bg-card/50 flex flex-col hidden md:flex">
        <div className="p-6">
          <Link href="/home" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
            <Home className="h-5 w-5" />
            <span className="font-semibold">Back to Site</span>
          </Link>
        </div>
        <div className="px-4 pb-4 border-b border-border/40">
          <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Shield className="h-5 w-5 text-red-400" />
            Admin Panel
          </h2>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {ADMIN_NAV.filter(item => item.isVisible).map((item) => (
            <Link key={item.href} href={item.href} className={buttonVariants({ variant: "ghost", className: "w-full justify-start gap-3" })}>
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
          {dbUser.permissionLevel >= PERMISSION_LEVELS.DEVELOPER && (
            <div className="pt-4 mt-4 border-t border-border/40">
              <Link href="/dev" className={buttonVariants({ variant: "ghost", className: "w-full justify-start gap-3 text-green-500 hover:text-green-400 hover:bg-green-500/10" })}>
                <Monitor className="h-4 w-4" />
                Dev Console
              </Link>
            </div>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-background/95">
        <header className="h-16 border-b border-border/40 flex items-center px-6 md:hidden">
          <Link href="/home" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Home className="mr-2 h-4 w-4" />
            Back to Site
          </Link>
          <span className="ml-auto font-bold flex items-center gap-2">
            <Shield className="h-4 w-4 text-red-400" /> Admin
          </span>
        </header>
        <div className="flex-1 p-6 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
