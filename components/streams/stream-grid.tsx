"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Streamer {
  id: string;
  user: {
    username: string;
    displayName: string | null;
  };
  platform: string;
  channelUrl: string;
  isLive: boolean;
  streamTitle: string | null;
}

export function StreamGrid({ streamers }: { streamers: Streamer[] }) {
  const [loadedIframes, setLoadedIframes] = useState<Record<string, boolean>>({});

  // Extract channel name from URL (e.g. https://twitch.tv/username -> username)
  const getChannelName = (url: string) => {
    try {
      const parsed = new URL(url);
      const paths = parsed.pathname.split("/").filter(Boolean);
      return paths[paths.length - 1];
    } catch {
      return "";
    }
  };

  const loadStream = (id: string) => {
    setLoadedIframes(prev => ({ ...prev, [id]: true }));
  };

  if (streamers.length === 0) {
    return (
      <div className="text-center py-20 bg-card/40 rounded-lg border border-border/50">
        <h3 className="text-xl font-bold mb-2">No active streamers found</h3>
        <p className="text-muted-foreground">Check back later or apply to join our stream team!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {streamers.map((streamer) => {
        const channelName = getChannelName(streamer.channelUrl);
        const isTwitch = streamer.platform.toLowerCase() === "twitch" || streamer.channelUrl.includes("twitch.tv");
        const isLoaded = loadedIframes[streamer.id];
        
        return (
          <Card key={streamer.id} className="overflow-hidden sg-3d-card bg-card/50 border-border/50 hover:border-primary/50 transition-colors">
            <div className="aspect-video bg-black relative flex items-center justify-center">
              {isTwitch && channelName ? (
                isLoaded ? (
                  <iframe
                    src={`https://player.twitch.tv/?channel=${channelName}&parent=localhost&parent=saintsgaming.net&muted=true`}
                    frameBorder="0"
                    allowFullScreen
                    scrolling="no"
                    height="100%"
                    width="100%"
                    className="absolute inset-0"
                  ></iframe>
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-full bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer group" onClick={() => loadStream(streamer.id)}>
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/40 group-hover:scale-110 transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 text-primary"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    </div>
                    <span className="mt-4 font-medium text-sm text-muted-foreground group-hover:text-foreground transition-colors">Click to load stream</span>
                  </div>
                )
              ) : (
                <div className="text-muted-foreground flex flex-col items-center">
                  <span className="text-2xl font-bold mb-2">{streamer.user.displayName || streamer.user.username}</span>
                  <span className="text-sm">Stream preview not available</span>
                </div>
              )}
            </div>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-lg leading-tight mb-1 truncate" title={streamer.user.displayName || streamer.user.username}>
                    {streamer.user.displayName || streamer.user.username}
                  </h3>
                  {streamer.isLive ? (
                    <div className="flex items-center gap-1.5 text-xs text-red-400 font-bold">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                      LIVE
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground font-medium">OFFLINE</div>
                  )}
                </div>
                <Button asChild size="sm" variant="outline" className="shrink-0 bg-background/50">
                  <a href={streamer.channelUrl} target="_blank" rel="noopener noreferrer">
                    Watch
                  </a>
                </Button>
              </div>
              {streamer.streamTitle && streamer.isLive && (
                <p className="mt-3 text-sm text-muted-foreground line-clamp-2" title={streamer.streamTitle}>
                  {streamer.streamTitle}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
