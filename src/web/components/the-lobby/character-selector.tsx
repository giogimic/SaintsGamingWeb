"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
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
  WARRIOR: Shield,
  MAGE: Sparkles,
  THIEF: Zap
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
    <div 
      className="fixed inset-0 w-full h-full overflow-y-auto z-[100]"
      style={{ backgroundColor: 'rgba(240, 248, 255, 0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div className="min-h-full flex flex-col items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-5xl bg-white border-4 border-slate-200 rounded-[2rem] text-slate-800 shadow-2xl p-6 md:p-10 relative">
          
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="p-3 bg-slate-100 rounded-2xl shadow-sm border-2 border-slate-200">
                <Gamepad2 className="w-8 h-8 text-blue-500" />
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold text-slate-800 tracking-tight">
                Select Character
              </h1>
            </div>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-sm mt-3">Choose your hero to enter the world</p>
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
                  className="group relative p-6 rounded-3xl border-4 border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all duration-200 hover:-translate-y-1 flex flex-col justify-between shadow-sm hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden shadow-inner shrink-0 border-2 border-slate-200 group-hover:bg-white group-hover:border-blue-200 transition-colors">
                        {isCustomSprite ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={char.spriteId} alt={char.name} className="w-12 h-12 object-contain pixelated" />
                        ) : (
                          <div 
                            className="w-12 h-12 pixelated bg-no-repeat"
                            style={{ 
                              backgroundImage: `url('/game-assets/characters/${char.spriteId || 'adventurer'}.png')`,
                              backgroundPosition: '0px -64px', // Show facing forward (assuming 32x32 sprites, usually 0px 0px or 0px -64px)
                              backgroundSize: '96px 128px', // scaled 3x assuming 32x32 frames
                              width: '32px',
                              height: '32px'
                            }}
                          />
                        )}
                      </div>

                      <span className="text-xs font-extrabold px-3 py-1.5 bg-blue-100 rounded-xl text-blue-600 shadow-sm border border-blue-200">
                        LVL {state.level || 1}
                      </span>
                    </div>

                    <h3 className="text-2xl font-extrabold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                      {char.name}
                    </h3>
                    <p className="text-sm text-slate-400 font-bold uppercase mt-1 tracking-widest flex items-center gap-1">
                      <Icon className="w-4 h-4" />
                      {char.classId || "HERO"}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t-2 border-slate-100 flex items-center justify-between">
                    <Button
                      size="sm"
                      className="bg-blue-500 hover:bg-blue-400 text-white font-extrabold text-sm uppercase px-5 h-10 shadow-[0_3px_0_0_#2563eb] rounded-xl active:translate-y-[2px] active:shadow-none transition-all tracking-wide"
                    >
                      Play
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={deletingId === char.id}
                      onClick={(e) => handleDelete(e, char.id, char.name)}
                      className="h-10 w-10 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      title="Delete Character"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Create New Card */}
            <div
              onClick={onCreateNew}
              className="p-6 rounded-3xl border-4 border-dashed border-slate-300 hover:border-blue-400 bg-slate-50 hover:bg-blue-50 cursor-pointer transition-all flex flex-col items-center justify-center gap-4 min-h-[220px] group shadow-sm hover:shadow-md hover:-translate-y-1"
            >
              <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border-2 border-slate-200 flex items-center justify-center group-hover:scale-110 group-hover:border-blue-300 transition-transform">
                <Plus className="w-8 h-8 text-slate-400 group-hover:text-blue-500 transition-colors" strokeWidth={3} />
              </div>
              <p className="text-lg font-extrabold text-slate-500 group-hover:text-blue-600 uppercase tracking-widest">
                New Hero
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
