"use client";

import { getAchievementDef } from "@/lib/achievements";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface UserAchievementData {
  id: string;
  badgeId: string;
  isPinned: boolean;
  earnedAt: Date;
}

export function AchievementShowcase({ achievements }: { achievements: UserAchievementData[] }) {
  if (!achievements || achievements.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-2xl font-bold sg-text-gradient">Achievements</h2>
        <span className="text-muted-foreground bg-muted px-2 py-0.5 rounded-full text-xs font-semibold">
          {achievements.length}
        </span>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <TooltipProvider>
          {achievements.map(ach => {
            const def = getAchievementDef(ach.badgeId);
            if (!def) return null;

            const Icon = def.Icon;

            return (
              <Tooltip key={ach.id}>
                <TooltipTrigger asChild>
                  <div className="sg-glass p-4 rounded-xl flex flex-col items-center justify-center gap-3 transition-all hover:scale-105 hover:bg-white/5 border border-border/50 cursor-help relative group overflow-hidden">
                    {/* Background subtle glow */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    {ach.isPinned && (
                      <div className="absolute top-1 right-1">
                        <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded shadow-sm">Pinned</span>
                      </div>
                    )}

                    <Icon className={`w-12 h-12 ${def.colorClass} ${def.glowClass} transition-transform group-hover:scale-110 duration-500`} />
                    <span className="text-xs font-bold text-center line-clamp-2 text-foreground/90">{def.title}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-center p-3 sg-glass border-border/50">
                  <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${def.colorClass}`}>{def.rarity}</div>
                  <div className="font-bold mb-1">{def.title}</div>
                  <p className="text-xs text-muted-foreground mb-2">{def.description}</p>
                  <div className="text-[10px] text-muted-foreground/50 border-t border-border/50 pt-2 mt-2">
                    Earned {new Date(ach.earnedAt).toLocaleDateString()}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>
    </div>
  );
}
