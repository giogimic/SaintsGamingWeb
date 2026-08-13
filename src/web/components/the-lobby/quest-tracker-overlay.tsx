"use client";

import { useEffect, useState } from "react";
import { ScrollText, Target, CheckCircle2, Compass } from "lucide-react";
import { useGameStore } from "@/web/components/the-lobby/store";
import { GamePanelShell } from "./ui/GamePanelShell";

interface QuestObjective {
  id: string;
  type: string;
  targetSlug: string;
  requiredQty: number;
  description: string;
}

interface ActiveQuest {
  id: string;
  slug: string;
  title: string;
  description: string;
  stage: number;
  progress: number;
  objective: QuestObjective | null;
}

export default function QuestTrackerOverlay() {
  const [quests, setQuests] = useState<ActiveQuest[]>([]);
  const [spyderCampaignComplete, setSpyderCampaignComplete] = useState(false);
  const { refreshQuestsCounter, gameMode, currentMapId } = useGameStore();
  const isSpyderMap =
    currentMapId === "AZURE_TOWN" ||
    currentMapId?.includes("SPYDER") ||
    currentMapId === "ROUTE1" ||
    currentMapId === "COTTON_TOWN" ||
    currentMapId === "COTTON_SCOOP" ||
    currentMapId === "COTTON_CAFE" ||
    currentMapId === "SPYDER_COTTON_TUNNEL" ||
    currentMapId === "SPYDER_ROUTE2" ||
    currentMapId === "SPYDER_ROUTE3" ||
    currentMapId === "SPYDER_LEATHER_TOWN" ||
    currentMapId === "SPYDER_LEATHER_CENTER" ||
    currentMapId === "SPYDER_LEATHER_SCOOP" ||
    currentMapId === "SPYDER_LEATHER_GYM" ||
    currentMapId === "SPYDER_LEATHER_SHAFT1" ||
    currentMapId === "SPYDER_LEATHER_SHAFT2" ||
    currentMapId === "COTTON_UNDERGROUND";

  const fetchQuests = async () => {
    try {
      const res = await fetch("/api/quests/active");
      if (res.ok) {
        const data = await res.json();
        setQuests(data.quests || []);
        setSpyderCampaignComplete(!!data.spyderCampaignComplete);
      }
    } catch (e) {
      console.error("Failed to fetch quests:", e);
    }
  };

  useEffect(() => {
    fetchQuests();
  }, [refreshQuestsCounter]);

  if (gameMode !== "EXPLORING" && gameMode !== "DIALOG") return null;

  if (quests.length === 0) {
    const spyderEmpty =
      isSpyderMap && spyderCampaignComplete ? (
        <>
          Leather shafts cleared. Rematch <span className="text-[#cbb26a]">Rook</span> or{" "}
          <span className="text-[#cbb26a]">Carlos</span>, dig deeper, or roam — more of
          Spyder&apos;s web awaits.
        </>
      ) : isSpyderMap ? (
        <>
          Talk to the <span className="text-[#cbb26a]">Azure Guide</span> in the plaza
          (click or press E). Accept your charge to begin.
        </>
      ) : (
        <>
          Talk to the <span className="text-[#cbb26a]">Trail Greeter</span> by the plaza
          (click or press E). Accept to begin Saints Trail.
        </>
      );

    return (
      <div className="w-[200px] md:w-[240px] pointer-events-none">
        <GamePanelShell neonAccent="cyan" className="pointer-events-auto p-2.5">
          <div className="flex items-center gap-2 mb-1.5 border-b border-[#22d3ee]/20 pb-1.5">
            <Compass className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" />
            <h4 className="text-[10px] font-extrabold text-cyan-200/80 uppercase tracking-widest">
              {isSpyderMap
                ? spyderCampaignComplete
                  ? "Spyder Trail Clear"
                  : "Spyder Trail"
                : "Saints Trail"}
            </h4>
          </div>
          <p className="text-[11px] text-cyan-50/80 leading-tight mt-1.5 font-medium">{spyderEmpty}</p>
        </GamePanelShell>
      </div>
    );
  }

  return (
    <div className="pointer-events-none w-[200px] md:w-[240px] space-y-2">
      {quests.map((quest) => {
        const obj = quest.objective;
        const isComplete = obj && quest.progress >= obj.requiredQty;

        return (
          <GamePanelShell
            key={quest.id}
            neonAccent="cyan"
            className="pointer-events-auto p-2.5"
          >
            <div className="flex items-center gap-2 mb-1.5 border-b border-[#22d3ee]/20 pb-1.5">
              <ScrollText className="w-3.5 h-3.5 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" />
              <h4 className="text-[10px] font-extrabold text-cyan-200/80 drop-shadow-sm uppercase tracking-widest leading-none">
                {quest.title}
              </h4>
            </div>

            {obj ? (
              <div className="mt-1.5 flex items-start gap-1.5">
                {isComplete ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />
                ) : (
                  <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#d946ef]" />
                )}

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-[10px] md:text-[11px] ${isComplete ? "text-cyan-200/40 line-through" : "text-cyan-50/90 font-medium"} leading-tight`}
                  >
                    {obj.description}
                  </p>

                  {!isComplete && obj.requiredQty > 1 && (
                    <div className="mt-1.5 w-full bg-black/60 rounded-full h-1 border border-[#22d3ee]/20">
                      <div
                        className="bg-cyan-400 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                        style={{
                          width: `${Math.min(100, Math.max(0, (quest.progress / obj.requiredQty) * 100))}%`,
                        }}
                      />
                    </div>
                  )}

                  {!isComplete && obj.requiredQty > 1 && (
                    <p className="mt-1 text-right font-mono text-[9px] font-extrabold text-cyan-200/60 tracking-widest leading-none">
                      {quest.progress} / {obj.requiredQty}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-1 text-[10px] text-cyan-200/40 italic">No active objectives.</p>
            )}
          </GamePanelShell>
        );
      })}
    </div>
  );
}
