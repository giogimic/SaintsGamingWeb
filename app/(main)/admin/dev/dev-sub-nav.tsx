"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Terminal, Database, Radio, Cpu, Activity, RefreshCw, Code 
} from "lucide-react";

export const DEV_NAV_ITEMS = [
  { href: "/admin/dev", label: "Console Home", icon: Terminal, exact: true },
  { href: "/admin/dev/database", label: "Database", icon: Database },
  { href: "/admin/realtime", label: "Realtime Bus", icon: Radio },
  { href: "/admin/dev/system", label: "System State", icon: Cpu },
  { href: "/admin/dev/metrics", label: "Metrics", icon: Activity },
  { href: "/admin/dev/tasks", label: "Background Tasks", icon: RefreshCw },
  { href: "/admin/dev/sandbox", label: "API Sandbox", icon: Code },
];

export function DevSubNav() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border/40 pb-2 mb-6">
      {DEV_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = item.exact ? pathname === item.href : (pathname === item.href || pathname.startsWith(item.href + "/"));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 shrink-0 transition-colors ${
              isActive
                ? "bg-primary/15 text-primary font-bold border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
