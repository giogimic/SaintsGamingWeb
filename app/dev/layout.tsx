import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PERMISSION_LEVELS } from "@/lib/permissions";
import Link from "next/link";
import { Terminal, Database, Activity, Home, Server, Code, RefreshCw, Cpu } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default async function DevLayout({ children }: { children: React.ReactNode }) {
 const session = await auth();

 if (!session?.user) {
 redirect("/login");
 }

 const dbUser = await prisma.user.findUnique({
 where: { id: session.user.id },
 select: { permissionLevel: true }
 });

 if (!dbUser || dbUser.permissionLevel < PERMISSION_LEVELS.DEVELOPER) {
 redirect("/not-found");
 }

 const DEV_NAV = [
    { href: "/dev", label: "Dev Home", icon: Terminal },
    { href: "/dev/database", label: "DB Health", icon: Database },
    { href: "/dev/metrics", label: "Metrics", icon: Activity },
    { href: "/dev/sandbox", label: "API Sandbox", icon: Code },
    { href: "/dev/system", label: "System State", icon: Cpu },

    { href: "/dev/tasks", label: "Background Tasks", icon: RefreshCw },
    { href: "/admin", label: "Admin Panel", icon: Server },
  ];

 return (
 <div className="flex min-h-screen">
 {/* Sidebar */}
 <aside className="w-64 border-r border-border/40 bg-card/50 flex flex-col hidden md:flex">
 <div className="p-6">
 <Link href="/home" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
 <Home className="h-5 w-5" />
 <span className="font-semibold">Exit Dev Mode</span>
 </Link>
 </div>
 <div className="px-4 pb-4 border-b border-border/40">
 <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
 <Terminal className="h-5 w-5 text-primary" />
 Dev Console
 </h2>
 </div>
 <nav className="flex-1 p-4 space-y-1">
 {DEV_NAV.map((item) => (
 <Link 
 key={item.href} 
 href={item.href} 
 className={buttonVariants({ variant: "ghost", className: "w-full justify-start gap-3" })}
 >
 <item.icon className="h-4 w-4" />
 {item.label}
 </Link>
 ))}
 </nav>
 </aside>

 {/* Main Content */}
 <main className="flex-1 flex flex-col bg-background/95">
 <header className="h-16 border-b border-border/40 flex items-center px-6 md:hidden">
 <Link href="/home" className={buttonVariants({ variant: "outline", size: "sm" })}>
 Exit
 </Link>
 <span className="ml-auto font-bold flex items-center gap-2">
 <Terminal className="h-4 w-4 text-primary" /> root
 </span>
 </header>
 <div className="flex-1 p-6 overflow-auto">
 {children}
 </div>
 </main>
 </div>
 );
}
