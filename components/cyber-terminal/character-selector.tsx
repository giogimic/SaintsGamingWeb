"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Gamepad2, Plus, Trash2, Shield, Sparkles, Zap, Wrench, User } from "lucide-react";
import { deleteGameCharacter } from "@/app/actions/game";
import { toast } from "sonner";

interface CharacterSelectorProps {
  characters: any[];
  onSelect: (characterId: string) => void;
  onCreateNew: () => void;
  onRefresh: () => void;
}

const CLASS_ICONS: Record<string, any> = {
  BRAWLER: Shield,
  INVOKER: Sparkles,
  RANGER: Zap,
  ARTISAN: Wrench,
  CYBER: Sparkles,
  SURVIVOR: Shield,
};

export function CharacterSelector({ characters, onSelect, onCreateNew, onRefresh }: CharacterSelectorProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete character "${name}"?`)) return;

    setDeletingId(id);
    const res = await deleteGameCharacter(id);
    if (res.success) {
      toast.success(`Character ${name} deleted.`);
      onRefresh();
    } else {
      toast.error(res.error || "Failed to delete character.");
    }
    setDeletingId(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 md:p-8 bg-card/90 border border-border/50 rounded-2xl text-foreground sg-glass shadow-2xl backdrop-blur-xl my-4 overflow-y-auto max-h-[90vh]">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Gamepad2 className="w-8 h-8 text-primary" />
          <h1 className="text-2xl md:text-4xl font-extrabold bg-gradient-to-r from-purple-400 via-emerald-400 to-amber-400 bg-clip-text text-transparent">
            THE LOBBY VAULT
          </h1>
        </div>
        <p className="text-muted-foreground text-xs md:text-sm">Select your active operative to enter Saints Gaming Lobby</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {characters.map((char) => {
          let state = { level: 1 };
          try {
            if (char.stateData) state = JSON.parse(char.stateData);
          } catch {}

          const Icon = CLASS_ICONS[char.classId] || User;
          const isCustomSprite = char.spriteId && (char.spriteId.startsWith('/') || char.spriteId.startsWith('http'));

          return (
            <div
              key={char.id}
              onClick={() => onSelect(char.id)}
              className="group relative p-5 rounded-xl border border-border/50 bg-background/60 hover:bg-background/90 hover:border-primary/50 cursor-pointer transition-all duration-200 hover:scale-[1.02] flex flex-col justify-between shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 rounded-xl bg-muted/60 border border-border/50 flex items-center justify-center overflow-hidden shadow-inner shrink-0">
                    {isCustomSprite ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={char.spriteId} alt={char.name} className="w-10 h-10 object-contain pixelated" />
                    ) : (
                      <Icon className="w-7 h-7 text-primary" />
                    )}
                  </div>

                  <span className="text-xs font-bold px-2.5 py-1 bg-primary/10 rounded-full border border-primary/20 text-primary">
                    LVL {state.level || 1}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors truncate">
                  {char.name}
                </h3>
                <p className="text-xs text-muted-foreground font-semibold uppercase mt-1 tracking-wider">
                  {char.classId || "OPERATIVE"}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between">
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase px-4 h-9 shadow-md rounded-lg"
                >
                  ENTER LOBBY
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  disabled={deletingId === char.id}
                  onClick={(e) => handleDelete(e, char.id, char.name)}
                  className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                  title="Delete Character"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}

        {/* Create New Card */}
        <div
          onClick={onCreateNew}
          className="p-6 rounded-xl border-2 border-dashed border-border/60 hover:border-primary/60 bg-background/30 hover:bg-primary/5 cursor-pointer transition-all flex flex-col items-center justify-center gap-3 min-h-[180px] group shadow-lg"
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm font-bold text-foreground group-hover:text-primary uppercase tracking-wider">
            Create Operative
          </p>
        </div>
      </div>
    </div>
  );
}
