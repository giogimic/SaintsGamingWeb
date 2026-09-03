"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
  CommandDialog, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList, 
  CommandSeparator 
} from "@/shared/ui/command";
import { 
  getVisibleAdminModules, 
  ADMIN_CATEGORIES, 
  AdminCategoryId,
  AdminModule
} from "@/web/lib/admin-modules";
import { 
  Sparkles, Newspaper, Users, Radio, LifeBuoy, 
  Gamepad2, Home, MessageSquare, Compass, Shield, Flame, Terminal
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";

interface GlobalCommandPaletteProps {
  permissionLevel?: number;
  isWriter?: boolean;
}

export function GlobalCommandPalette({ 
  permissionLevel = 0, 
  isWriter = false 
}: GlobalCommandPaletteProps) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  // Listen for Ctrl+K / Cmd+K
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  const visibleModules = React.useMemo(() => {
    return getVisibleAdminModules(permissionLevel, isWriter);
  }, [permissionLevel, isWriter]);

  // Group modules by category
  const categorizedModules = React.useMemo(() => {
    const map = new Map<AdminCategoryId, AdminModule[]>();
    for (const mod of visibleModules) {
      if (!map.has(mod.category)) {
        map.set(mod.category, []);
      }
      map.get(mod.category)!.push(mod);
    }
    return map;
  }, [visibleModules]);

  const isOperator = permissionLevel >= 200 || isWriter;

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Saints Command Palette" description="Search modules, actions, and public pages...">
      <CommandInput placeholder="Type a command or search modules... (e.g. news, users, settings)" />
      <CommandList className="max-h-[380px] overflow-y-auto">
        <CommandEmpty>No matching commands or modules found.</CommandEmpty>

        {/* ─── QUICK SHORTCUTS / HIGH PRIORITY ACTIONS ──────────────────────── */}
        <CommandGroup heading="Quick Actions">

          {(permissionLevel >= 300 || isWriter) && (
            <CommandItem
              onSelect={() => runCommand(() => router.push("/admin/news/new"))}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Newspaper className="h-4 w-4 text-primary" />
                <span>Draft New News Announcement</span>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">
                /admin/news/new
              </Badge>
            </CommandItem>
          )}

          {permissionLevel >= 400 && (
            <CommandItem
              onSelect={() => runCommand(() => router.push("/admin/realtime"))}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-emerald-400" />
                <span>Realtime Bus Diagnostics</span>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono text-emerald-400">
                /admin/realtime
              </Badge>
            </CommandItem>
          )}

          {isOperator && (
            <CommandItem
              onSelect={() => runCommand(() => router.push("/admin/tickets"))}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <LifeBuoy className="h-4 w-4 text-amber-400" />
                <span>Support Tickets Triage</span>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">
                /admin/tickets
              </Badge>
            </CommandItem>
          )}
        </CommandGroup>

        <CommandSeparator />

        {/* ─── CANONICAL ADMIN MODULES BY CATEGORY ─────────────────────────── */}
        {Array.from(categorizedModules.entries()).map(([catKey, modules]) => {
          const categoryDef = ADMIN_CATEGORIES[catKey];
          return (
            <CommandGroup key={catKey} heading={categoryDef.label}>
              {modules.map((mod) => {
                const Icon = mod.icon;
                return (
                  <CommandItem
                    key={mod.id}
                    value={`${mod.label} ${mod.description} ${mod.keywords?.join(" ") || ""} ${mod.href}`}
                    onSelect={() => runCommand(() => router.push(mod.href))}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className="h-4 w-4 text-primary shrink-0" />
                      <div className="truncate">
                        <span className="font-medium text-foreground">{mod.label}</span>
                        <span className="text-muted-foreground text-xs ml-2 hidden sm:inline truncate">
                          — {mod.description}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground shrink-0 pl-2">
                      {mod.href}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          );
        })}

        <CommandSeparator />

        {/* ─── PUBLIC & USER PAGES ─────────────────────────────────────────── */}
        <CommandGroup heading="Community & Navigation">
          <CommandItem
            onSelect={() => runCommand(() => router.push("/home"))}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-foreground" />
              <span>Community Home Feed</span>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">/home</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => router.push("/profile/inbox"))}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-primary" />
              <span className="text-primary font-medium">The Feed (Social Videos)</span>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">/profile/inbox</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => router.push("/forum"))}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-foreground" />
              <span>Community Forums</span>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">/forum</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => router.push("/lobby"))}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Gamepad2 className="h-4 w-4 text-amber-400" />
              <span className="text-amber-300 font-medium">The Lobby</span>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">/lobby</span>
          </CommandItem>
        </CommandGroup>

      </CommandList>
    </CommandDialog>
  );
}
