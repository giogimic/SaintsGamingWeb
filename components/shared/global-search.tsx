"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, MessageSquare, Newspaper, Package, User } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type SearchResults = {
  threads: Array<{ id: string; title: string; slug: string }>;
  articles: Array<{ id: string; title: string; slug: string }>;
  modpacks: Array<{ id: string; name: string; slug: string; game: string }>;
  users: Array<{ id: string; username: string; image: string | null }>;
};

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  React.useEffect(() => {
    if (!query || query.trim().length < 2) {
      setTimeout(() => setResults(null), 0);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-full justify-start rounded-[0.5rem] bg-background/50 text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-64 border-border/50 hover:bg-muted/50"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Search Saints Gaming...</span>
        <span className="inline-flex lg:hidden">Search...</span>
        <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-6 select-none items-center gap-1 rounded border border-border/50 bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Search forums, news, modpacks, users..." 
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {isLoading && <div className="p-4 text-sm text-center text-muted-foreground">Searching...</div>}
          {!isLoading && results && 
            results.threads.length === 0 && 
            results.articles.length === 0 && 
            results.modpacks.length === 0 && 
            results.users.length === 0 && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}

          {!isLoading && !query && (
            <CommandGroup heading="Quick Links">
              <CommandItem onSelect={() => runCommand(() => router.push("/home"))}>
                <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Home</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => router.push("/forum"))}>
                <MessageSquare className="mr-2 h-4 w-4 text-purple-400" />
                <span>Forums</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => router.push("/news"))}>
                <Newspaper className="mr-2 h-4 w-4 text-blue-400" />
                <span>News</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => router.push("/profile"))}>
                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Profile settings</span>
              </CommandItem>
            </CommandGroup>
          )}

          {!isLoading && results && (
            <>
              {results.threads.length > 0 && (
                <CommandGroup heading="Forum Threads">
                  {results.threads.map((thread) => (
                    <CommandItem
                      key={`thread-${thread.id}`}
                      value={`thread ${thread.title}`}
                      onSelect={() => runCommand(() => router.push(`/forum/thread/${thread.slug}`))}
                    >
                      <MessageSquare className="mr-2 h-4 w-4 text-purple-400" />
                      <span>{thread.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {results.articles.length > 0 && (
                <CommandGroup heading="News">
                  {results.articles.map((article) => (
                    <CommandItem
                      key={`news-${article.id}`}
                      value={`news ${article.title}`}
                      onSelect={() => runCommand(() => router.push(`/news/${article.slug}`))}
                    >
                      <Newspaper className="mr-2 h-4 w-4 text-blue-400" />
                      <span>{article.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {results.modpacks.length > 0 && (
                <CommandGroup heading="Modpacks & Servers">
                  {results.modpacks.map((modpack) => (
                    <CommandItem
                      key={`modpack-${modpack.id}`}
                      value={`modpack ${modpack.name}`}
                      onSelect={() => runCommand(() => router.push(`/modpacks/${modpack.slug}`))}
                    >
                      <Package className="mr-2 h-4 w-4 text-green-400" />
                      <span>{modpack.name}</span>
                      <Badge variant="outline" className="ml-2 text-[10px] bg-background px-1 h-5">{modpack.game}</Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {results.users.length > 0 && (
                <CommandGroup heading="Users">
                  {results.users.map((user) => (
                    <CommandItem
                      key={`user-${user.id}`}
                      value={`user ${user.username}`}
                      onSelect={() => {
                        // In the future this could go to a public profile page
                        // For now we just close it, or we could redirect to a placeholder
                        runCommand(() => console.log("User selected", user.username));
                      }}
                    >
                      <User className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{user.username}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
