"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  return (
    <div className="flex items-center gap-1 bg-card/80 backdrop-blur-md border border-border/50 p-1 rounded-full sg-glass">
      <Button
        variant="ghost"
        size="icon"
        className={`rounded-full w-8 h-8 transition-colors ${theme === "light" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
        onClick={() => setTheme("light")}
        title="Light Theme"
      >
        <Sun className="h-4 w-4" />
        <span className="sr-only">Light Theme</span>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className={`rounded-full w-8 h-8 transition-colors ${theme === "dark" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
        onClick={() => setTheme("dark")}
        title="Dark Theme"
      >
        <Moon className="h-4 w-4" />
        <span className="sr-only">Dark Theme</span>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className={`rounded-full w-8 h-8 transition-colors ${theme === "hacker" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
        onClick={() => setTheme("hacker")}
        title="Hacker Theme"
      >
        <Terminal className="h-4 w-4" />
        <span className="sr-only">Hacker Theme</span>
      </Button>
    </div>
  );
}
