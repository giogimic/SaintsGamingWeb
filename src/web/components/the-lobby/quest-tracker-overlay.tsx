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
  const { refreshQuestsCounter, gameMode } = useGameStore();

  const fetchQuests = async () => {
    try {
      const res = await fetch("/api/quests/active");
      if (res.ok) {
        const data = await res.json();
        setQuests(data.quests || []);
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
    return (
      <div className="pointer-events-none absolute top-24 right-4 z-40 w-64">
        <div className="lobby-panel rounded-lg p-3">
          <div className="mb-1.5 flex items-center gap-2 border-b border-lobby-border pb-1.5">
            <Compass className="h-4 w-4 text-lobby-film" />
            <h4 className="text-sm font-bold tracking-wide text-lobby-mist uppercase">
              Road to Aethervale
            </h4>
          </div>
          <p className="mt-2 text-xs leading-tight text-lobby-fog">
            Talk to <span className="text-lobby-soul">Warden Vance</span> on the north path
            (click or press E). Take the toolbelt to start Q1.
          </p>
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
          <div key={quest.id} className="lobby-panel pointer-events-auto rounded-lg p-3">
            <div className="mb-1.5 flex items-center gap-2 border-b border-lobby-border pb-1.5">
              <ScrollText className="h-4 w-4 text-lobby-soul" />
              <h4 className="text-sm font-bold tracking-wide text-lobby-mist uppercase drop-shadow-sm">
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

                <div className="min-w-0 flex-1">
                  <p
                    className={`text-xs leading-tight ${isComplete ? "text-lobby-ash line-through" : "text-lobby-fog"}`}
                  >
                    {obj.description}
                  </p>

                  {!isComplete && obj.requiredQty > 1 && (
                    <div className="lobby-stat-track mt-1.5 h-1.5 w-full overflow-hidden rounded-sm">
                      <div
                        className="lobby-stat-fill-film h-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(0, (quest.progress / obj.requiredQty) * 100))}%`,
                          background: "linear-gradient(90deg, #6d28d9, #6ee7b7)",
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
