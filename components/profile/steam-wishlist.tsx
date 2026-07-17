"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { addSteamWishlistItem, removeSteamWishlistItem } from "@/app/actions/steam";
import { Loader2, Trash2, Plus, AlertCircle, Gamepad2 } from "lucide-react";
import Image from "next/image";

type SteamGame = {
  id: string;
  appId: string;
  name: string;
  image: string | null;
};

export function SteamWishlist({ games }: { games: SteamGame[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(formData: FormData) {
    setIsAdding(true);
    setError(null);
    try {
      await addSteamWishlistItem(formData);
      (document.getElementById("steam-add-form") as HTMLFormElement).reset();
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRemove(id: string) {
    setRemovingId(id);
    try {
      const formData = new FormData();
      formData.append("id", id);
      await removeSteamWishlistItem(formData);
    } catch (e) {
      console.error(e);
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gamepad2 className="h-5 w-5" /> Steam Wishlist
        </CardTitle>
        <CardDescription>Games you are currently looking to play</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {games.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {games.map(game => (
              <div key={game.id} className="group relative rounded-lg overflow-hidden border border-border/50 bg-muted/30 aspect-[460/215]">
                {game.image ? (
                  <Image 
                    src={game.image} 
                    alt={game.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                    <span className="font-semibold">{game.name}</span>
                  </div>
                )}
                
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8 translate-y-full group-hover:translate-y-0 transition-transform flex justify-between items-end">
                  <span className="text-white text-sm font-medium truncate pr-2 shadow-sm drop-shadow-md">
                    {game.name}
                  </span>
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="h-7 w-7 shrink-0 opacity-80 hover:opacity-100" 
                    onClick={() => handleRemove(game.id)}
                    disabled={removingId === game.id}
                  >
                    {removingId === game.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-muted/20 rounded-lg border border-dashed border-border/50">
            <p className="text-sm text-muted-foreground">Your wishlist is currently empty.</p>
          </div>
        )}

        <div className="pt-2 mt-4 border-t border-border/50">
          <form id="steam-add-form" action={handleAdd} className="flex gap-2">
            <Input 
              name="steamInput" 
              placeholder="Paste Steam URL or App ID..." 
              required 
              disabled={isAdding}
              className="bg-background"
            />
            <Button type="submit" disabled={isAdding}>
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Add Game
            </Button>
          </form>
          {error && (
            <p className="text-destructive text-sm mt-2 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {error}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
