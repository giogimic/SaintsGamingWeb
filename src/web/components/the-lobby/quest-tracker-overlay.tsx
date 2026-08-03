"use client";

import { useEffect, useState } from "react";
import { ScrollText, Target, CheckCircle2, Compass } from "lucide-react";
import { useGameStore } from "@/web/components/the-lobby/store";

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
      <div className="absolute right-4 top-24 w-64 pointer-events-none z-40">
        <div className="bg-[#0b1320]/80 border border-[#806f47]/30 backdrop-blur-md rounded-md p-3 shadow-lg">
          <div className="flex items-center gap-2 mb-1.5 border-b border-[#806f47]/20 pb-1.5">
            <Compass className="w-4 h-4 text-[#cbb26a]" />
            <h4 className="text-sm font-bold text-[#e2d5b3] uppercase tracking-wide">
              {isSpyderMap
                ? spyderCampaignComplete
                  ? "Spyder Trail Clear"
                  : "Spyder Trail"
                : "Saints Trail"}
            </h4>
          </div>
          <p className="text-xs text-slate-200 leading-tight mt-2">{spyderEmpty}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute top-24 right-4 z-40 w-64 space-y-3">
      {quests.map((quest) => {
        const obj = quest.objective;
        const isComplete = obj && quest.progress >= obj.requiredQty;

        return (
          <div
            key={quest.id}
            className="bg-[#0b1320]/80 border border-[#806f47]/30 backdrop-blur-md rounded-md p-3 shadow-lg pointer-events-auto"
          >
            <div className="flex items-center gap-2 mb-1.5 border-b border-[#806f47]/20 pb-1.5">
              <ScrollText className="w-4 h-4 text-[#cbb26a]" />
              <h4 className="text-sm font-bold text-[#e2d5b3] drop-shadow-sm uppercase tracking-wide">
                {quest.title}
              </h4>
            </div>

            {obj ? (
              <div className="mt-2 flex items-start gap-2">
                {isComplete ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-lobby-film" />
                ) : (
                  <Target className="mt-0.5 h-4 w-4 shrink-0 text-lobby-ash" />
                )}

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs ${isComplete ? "text-slate-400 line-through" : "text-slate-200"} leading-tight`}
                  >
                    {obj.description}
                  </p>

                  {!isComplete && obj.requiredQty > 1 && (
                    <div className="mt-1.5 w-full bg-[#162238] rounded-full h-1.5 border border-[#050b14]">
                      <div
                        className="bg-[#cbb26a] h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(0, (quest.progress / obj.requiredQty) * 100))}%`,
                        }}
                      />
                    </div>
                  )}

                  {!isComplete && obj.requiredQty > 1 && (
                    <p className="mt-0.5 text-right font-mono text-[10px] text-lobby-ash">
                      {quest.progress} / {obj.requiredQty}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-1 text-xs text-lobby-ash italic">No active objectives.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
