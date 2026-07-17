"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Car, Landmark, LayoutDashboard, Users } from "lucide-react";

export function UcpNavigation() {
  const pathname = usePathname();

  return (
    <div className="pt-24 border-b border-border/50 bg-card/50 sticky top-0 z-40 backdrop-blur-md">
      <div className="w-full px-4 md:px-8 py-3 flex gap-6 overflow-x-auto">
        <Link 
          href="/ucp" 
          className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${pathname === "/ucp" ? "text-primary border-b-2 border-primary pb-1" : "text-muted-foreground"}`}
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Link>
        <Link 
          href="/ucp/garage" 
          className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${pathname?.startsWith("/ucp/garage") ? "text-primary border-b-2 border-primary pb-1" : "text-muted-foreground"}`}
        >
          <Car className="h-4 w-4" />
          My Garage
        </Link>
        <Link 
          href="/ucp/banking" 
          className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${pathname?.startsWith("/ucp/banking") ? "text-primary border-b-2 border-primary pb-1" : "text-muted-foreground"}`}
        >
          <Landmark className="h-4 w-4" />
          Banking
        </Link>
        <Link 
          href="/profile/inbox" 
          className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${pathname?.startsWith("/profile/inbox") ? "text-primary border-b-2 border-primary pb-1" : "text-muted-foreground"}`}
        >
          <Users className="h-4 w-4" />
          The Feed
        </Link>
      </div>
    </div>
  );
}
