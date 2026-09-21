"use client";

import { Gamepad2 } from "lucide-react";
import Image from "next/image";

export function GamesTab({ wishlist }: { wishlist: any[] }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {wishlist.map((game) => (
          <a 
            key={game.appId} 
            href={`https://store.steampowered.com/app/${game.appId}`} 
            target="_blank"
            rel="noreferrer"
            className="group relative rounded-xl overflow-hidden border border-border/50 bg-card hover:border-[rgb(var(--profile-accent))]/50 transition-all hover:shadow-lg"
          >
            <div className="aspect-[460/215] relative bg-muted">
              {game.image ? (
                <Image src={game.image} alt={game.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">No Image</div>
              )}
            </div>
            <div className="p-3 bg-card/80 backdrop-blur-sm">
              <h3 className="font-semibold text-sm truncate" title={game.name}>{game.name}</h3>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
