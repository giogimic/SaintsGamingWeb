import { prisma } from "@/lib/prisma";
import { Users, Activity, Terminal, Globe, Lock, Shield, Server, FileJson, Link as LinkIcon, MessageSquare } from "lucide-react";
import Link from "next/link";
import { DevActions } from "./dev-actions";

export default async function DevDashboard() {
 const [userCount, threadCount, charCount] = await Promise.all([
 prisma.user.count(),
 prisma.thread.count(),
 prisma.character.count(),
 ]);

 const APP_ROUTES = [
 {
 category: "Public Pages",
 icon: <Globe className="h-4 w-4 text-foreground" />,
 routes: [
 { path: "/", desc: "Landing Page" },
 { path: "/home", desc: "Main Community Feed" },
 { path: "/gaming-news", desc: "Aggregated RSS Hub" },
 { path: "/modpacks", desc: "Modpack Directory" },
 { path: "/streams", desc: "Live Streams Index" },
 { path: "/forum", desc: "Community Forums" },
 ]
 },
 {
 category: "Authenticated Pages",
 icon: <Lock className="h-4 w-4 text-foreground" />,
 routes: [
 { path: "/profile", desc: "User Profile Management" },
 { path: "/support", desc: "Ticketing System" },
 { path: "/forum/new", desc: "Create Thread" },
 ]
 },
 {
 category: "Admin Portal",
 icon: <Shield className="h-4 w-4 text-foreground" />,
 routes: [
 { path: "/admin", desc: "Admin Dashboard" },
 { path: "/admin/users", desc: "User Management" },
 { path: "/admin/news", desc: "News & Articles CMS" },
 { path: "/admin/rss", desc: "RSS Feed Configuration" },
 { path: "/admin/modpacks", desc: "Modpack Manager" },
 { path: "/admin/streams", desc: "Stream Authorization" },
 ]
 },
 {
 category: "Developer Console",
 icon: <Terminal className="h-4 w-4 text-foreground" />,
 routes: [
 { path: "/dev", desc: "System Index (Here)" },
 { path: "/dev/database", desc: "Raw Table Metrics" },
 { path: "/dev/metrics", desc: "Node.js Telemetry" },
 { path: "/dev/sandbox", desc: "HTTP Testing Sandbox" },
 { path: "/dev/tasks", desc: "Background Task Runner" },
 ]
 }
 ];

 const API_ROUTES = [
 {
 category: "Core Endpoints",
 icon: <Server className="h-4 w-4 text-foreground" />,
 routes: [
 { path: "/api/auth/*", method: "ALL", desc: "NextAuth Authentication Handlers" },
 { path: "/api/users/profile", method: "PATCH", desc: "Update user bios and links" },
 { path: "/api/forum/threads", method: "POST", desc: "Create a new thread" },
 ]
 },
 {
 category: "Admin & Dev Tools",
 icon: <FileJson className="h-4 w-4 text-foreground" />,
 routes: [
 { path: "/api/admin/users/[id]/role", method: "PATCH", desc: "Elevate permissions" },
 { path: "/api/admin/modpacks/[id]", method: "DELETE", desc: "Remove modpack" },
 { path: "/api/dev/seed-dummy", method: "POST", desc: "Inject dummy data into DB" },
 ]
 }
 ];

 return (
 <div className="space-y-8">
 <div>
 <h1 className="text-3xl font-bold flex items-center gap-2 border-b border-border/40 pb-4">
 <Terminal className="h-8 w-8" /> System Index & Architecture
 </h1>
 <p className="text-muted-foreground mt-2">
 Comprehensive sitemap of all active routes, portals, and REST endpoints within the Saints Gaming stack.
 </p>
 </div>

 {/* Quick Metrics */}
 <div className="grid gap-4 md:grid-cols-3">
 <div className="border border-border/40 p-4 rounded-lg bg-card hover:bg-muted transition-colors">
 <div className="flex items-center gap-2 mb-2">
 <Users className="h-4 w-4 text-muted-foreground" />
 <div className="text-sm text-muted-foreground">Total Users</div>
 </div>
 <div className="text-2xl font-bold text-primary">{userCount}</div>
 </div>
 <div className="border border-border/40 p-4 rounded-lg bg-card hover:bg-muted transition-colors">
 <div className="flex items-center gap-2 mb-2">
 <MessageSquare className="h-4 w-4 text-muted-foreground" />
 <div className="text-sm text-muted-foreground">Forum Threads</div>
 </div>
 <div className="text-2xl font-bold text-primary">{threadCount}</div>
 </div>
 <div className="border border-border/40 p-4 rounded-lg bg-card hover:bg-muted transition-colors">
 <div className="flex items-center gap-2 mb-2">
 <Activity className="h-4 w-4 text-muted-foreground" />
 <div className="text-sm text-muted-foreground">FiveM Characters</div>
 </div>
 <div className="text-2xl font-bold text-primary">{charCount}</div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
 {/* Frontend Routes Map */}
 <div className="space-y-6">
 <h2 className="text-xl font-bold border-b border-border/40 pb-2">Frontend Sitemap</h2>
 {APP_ROUTES.map((section, idx) => (
 <div key={idx} className="border border-border/40 rounded-lg overflow-hidden bg-card">
 <div className="bg-muted px-4 py-2 border-b border-border/40 flex items-center gap-2 font-bold">
 {section.icon} {section.category}
 </div>
 <ul className="divide-y divide-border/40">
 {section.routes.map((route, i) => (
 <li key={i} className="px-4 py-3 hover:bg-muted/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-1">
 <Link href={route.path} className="text-sm text-primary hover:underline flex items-center gap-1.5">
 <LinkIcon className="h-3 w-3" />
 {route.path}
 </Link>
 <span className="text-xs text-muted-foreground">{route.desc}</span>
 </li>
 ))}
 </ul>
 </div>
 ))}
 </div>

 {/* Backend API Map & Actions */}
 <div className="space-y-6">
 <h2 className="text-xl font-bold border-b border-border/40 pb-2">API Reference</h2>
 {API_ROUTES.map((section, idx) => (
 <div key={idx} className="border border-border/40 rounded-lg overflow-hidden bg-card">
 <div className="bg-muted px-4 py-2 border-b border-border/40 flex items-center gap-2 font-bold">
 {section.icon} {section.category}
 </div>
 <ul className="divide-y divide-border/40">
 {section.routes.map((route, i) => (
 <li key={i} className="px-4 py-3 hover:bg-muted/50 transition-colors">
 <div className="flex items-center gap-2 mb-1">
 <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border 
 ${route.method === 'GET' ? 'border-blue-900 text-blue-400 bg-blue-950/30' : 
 route.method === 'POST' ? 'border-border/40 text-primary bg-muted' : 
 route.method === 'DELETE' ? 'border-red-900 text-red-400 bg-red-950/30' : 
 route.method === 'PATCH' ? 'border-yellow-900 text-yellow-400 bg-yellow-950/30' : 
 'border-border/40 text-primary bg-muted'}`}
 >
 {route.method}
 </span>
 <code className="text-sm text-foreground">{route.path}</code>
 </div>
 <div className="text-xs text-muted-foreground pl-1">{route.desc}</div>
 </li>
 ))}
 </ul>
 </div>
 ))}

 <div className="mt-8 border border-border/40 rounded-lg p-6 bg-card">
 <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
 <Terminal className="h-5 w-5" /> CLI Shortcuts
 </h2>
 <DevActions />
 </div>
 </div>
 </div>
 </div>
 );
}
