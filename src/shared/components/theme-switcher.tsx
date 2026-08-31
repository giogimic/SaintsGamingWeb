"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Palmtree } from "lucide-react";
import { Button } from "@/shared/ui/button";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch
  React.useEffect(() => {
    setTimeout(() => setMounted(true), 0);
  }, []);

  if (!mounted) {
    return null;
  }

  const isVice = theme === "vice";

  return (
    <div className="flex items-center gap-1 bg-card/80 backdrop-blur-md border border-border/50 p-1 rounded-full sg-glass">
      <Button
        variant="ghost"
        size="icon"
        className={`rounded-full w-8 h-8 transition-all ${theme === "light" ? "bg-amber-500/25 text-amber-300 shadow-xs shadow-amber-500/20" : "text-muted-foreground hover:text-foreground hover:text-amber-300"}`}
        onClick={() => setTheme("light")}
        title="Sunset Theme (Dawn & Dusk)"
      >
        <Sun className="h-4 w-4" />
        <span className="sr-only">Sunset Theme</span>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className={`rounded-full w-8 h-8 transition-all ${theme === "dark" ? "bg-blue-500/25 text-blue-300 shadow-xs shadow-blue-500/20" : "text-muted-foreground hover:text-foreground hover:text-blue-300"}`}
        onClick={() => setTheme("dark")}
        title="Midnight Tropical Theme (Dark)"
      >
        <Moon className="h-4 w-4" />
        <span className="sr-only">Midnight Theme</span>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className={`rounded-full w-8 h-8 transition-all ${isVice ? "bg-pink-500/25 text-pink-400 shadow-xs shadow-pink-500/20" : "text-muted-foreground hover:text-foreground hover:text-pink-400"}`}
        onClick={() => setTheme("vice")}
        title="Vice Theme (Miami Sunset)"
      >
        <Palmtree className="h-4 w-4" />
        <span className="sr-only">Vice Theme</span>
      </Button>
    </div>
  );
}
