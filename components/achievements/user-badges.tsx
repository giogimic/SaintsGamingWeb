"use client";

import { ACHIEVEMENTS } from "@/lib/achievements";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Trophy } from "lucide-react";

interface UserBadgesProps {
  achievements: { badgeId: string }[];
  inline?: boolean;
}

export function UserBadges({ achievements, inline = false }: UserBadgesProps) {
  if (!achievements || achievements.length === 0) return null;

  // We only show up to 3 pinned badges horizontally to save space
  const pinnedBadges = achievements.slice(0, 3);

  const containerClass = inline 
    ? "flex flex-wrap items-center gap-1"
    : "flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-border/30 w-full justify-start md:justify-center";

  return (
    <div className={containerClass}>
      <TooltipProvider>
        {pinnedBadges.map(({ badgeId }) => {
          const def = ACHIEVEMENTS[badgeId as keyof typeof ACHIEVEMENTS];
          if (!def) return null;

          const IconComponent = def.Icon || Trophy;

          let colorClass = "text-foreground drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]";
          let bgClass = "bg-muted";

          if (def.rarity === "Common") {
            colorClass = "text-slate-400 drop-shadow-[0_0_8px_rgba(148,163,184,0.3)]";
            bgClass = "bg-slate-500/10";
          } else if (def.rarity === "Uncommon" as any) { // "Uncommon" isn't in AchievementRarity but keeping it just in case
            colorClass = "text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.3)]";
            bgClass = "bg-green-500/10";
          } else if (def.rarity === "Rare") {
            colorClass = "text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.3)]";
            bgClass = "bg-blue-500/10";
          } else if (def.rarity === "Epic") {
            colorClass = "text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.3)]";
            bgClass = "bg-purple-500/10";
          } else if (def.rarity === "Legendary") {
            colorClass = "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]";
            bgClass = "bg-yellow-500/10";
          }

          return (
            <Tooltip key={badgeId}>
              <TooltipTrigger>
                <div className={`rounded-md flex items-center justify-center cursor-help transition-all hover:scale-110 ${bgClass} ${inline ? 'p-1' : 'p-1.5'}`}>
                  <IconComponent className={`${inline ? 'w-4 h-4' : 'w-5 h-5'} ${colorClass}`} />
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-[200px] text-center border-border/50 bg-background/95 backdrop-blur">
                <div className="font-bold text-sm mb-1" style={{ color: colorClass.split(' ')[0].replace('text-', '') }}>{def.title}</div>
                <div className="text-xs text-muted-foreground">{def.description}</div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>
  );
}
