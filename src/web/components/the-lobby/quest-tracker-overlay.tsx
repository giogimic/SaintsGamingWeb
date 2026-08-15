'use client';

import { useEffect, useState } from 'react';
import { ScrollText, Target, CheckCircle2, Compass, X, ChevronRight } from 'lucide-react';
import { useGameStore } from '@/web/components/the-lobby/store';
import { HudPanelShell } from './hud/HudPanelShell';

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
  const [isDismissed, setIsDismissed] = useState(false);
  const { refreshQuestsCounter, gameMode, currentMapId } = useGameStore();

  const isSpyderMap =
    currentMapId === 'AZURE_TOWN' ||
    currentMapId?.includes('SPYDER') ||
    currentMapId === 'ROUTE1' ||
    currentMapId === 'COTTON_TOWN' ||
    currentMapId === 'COTTON_SCOOP' ||
    currentMapId === 'COTTON_CAFE' ||
    currentMapId === 'SPYDER_COTTON_TUNNEL' ||
    currentMapId === 'SPYDER_ROUTE2' ||
    currentMapId === 'SPYDER_ROUTE3' ||
    currentMapId === 'SPYDER_LEATHER_TOWN' ||
    currentMapId === 'SPYDER_LEATHER_CENTER' ||
    currentMapId === 'SPYDER_LEATHER_SCOOP' ||
    currentMapId === 'SPYDER_LEATHER_GYM' ||
    currentMapId === 'SPYDER_LEATHER_SHAFT1' ||
    currentMapId === 'SPYDER_LEATHER_SHAFT2' ||
    currentMapId === 'COTTON_UNDERGROUND';

  const fetchQuests = async () => {
    try {
      const res = await fetch('/api/quests/active');
      if (res.ok) {
        const data = await res.json();
        setQuests(data.quests || []);
        setSpyderCampaignComplete(!!data.spyderCampaignComplete);
      }
    } catch (e) {
      console.error('Failed to fetch quests:', e);
    }
  };

  useEffect(() => {
    fetchQuests();
  }, [refreshQuestsCounter]);

  if (!['EXPLORING', 'INVENTORY', 'SKILLS', 'EQUIPMENT', 'QUESTS', 'GTC', 'DIALOG'].includes(gameMode)) return null;


  // Minimized / Dismissed state toast pill
  if (isDismissed) {
    return (
      <div className="pointer-events-auto transition-all duration-200 ease-out animate-in fade-in">
        <HudPanelShell
          className="cursor-pointer hover:border-teal-400"
          noPadding
        >
          <button
            type="button"
            onClick={() => setIsDismissed(false)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider text-teal-300 hover:text-white"
          >
            <ScrollText className="w-3 h-3 text-teal-400" />
            <span>Quests ({quests.length})</span>
            <ChevronRight className="w-3 h-3 text-teal-400/60" />
          </button>
        </HudPanelShell>
      </div>
    );
  }

  if (quests.length === 0) {
    const guideText =
      isSpyderMap && spyderCampaignComplete ? (
        <>
          Leather shafts cleared. Rematch <span className="text-amber-300 font-bold">Rook</span> or{' '}
          <span className="text-amber-300 font-bold">Carlos</span>, dig deeper, or roam.
        </>
      ) : isSpyderMap ? (
        <>
          Talk to the <span className="text-amber-300 font-bold">Azure Guide</span> in plaza
          (press E). Accept your charge to begin.
        </>
      ) : (
        <>
          Talk to the <span className="text-amber-300 font-bold">Trail Greeter</span> by the plaza
          (press E) to begin Saints Trail.
        </>
      );

    return (
      <div className="pointer-events-auto w-[min(92vw,220px)] transition-all duration-200 ease-out animate-in fade-in slide-in-from-top-1">
        <HudPanelShell
          title={
            isSpyderMap
              ? spyderCampaignComplete
                ? 'Spyder Trail Clear'
                : 'Spyder Trail'
              : 'Saints Trail'
          }
          icon={<Compass className="w-3.5 h-3.5" />}
          onClose={() => setIsDismissed(true)}
        >
          <p className="text-[10px] md:text-[11px] text-slate-300 leading-snug font-medium font-mono">
            {guideText}
          </p>
        </HudPanelShell>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto w-[min(92vw,220px)] space-y-2 transition-all duration-200 ease-out animate-in fade-in slide-in-from-top-1">
      {quests.map((quest) => {
        const obj = quest.objective;
        const isComplete = obj && quest.progress >= obj.requiredQty;

        return (
          <HudPanelShell
            key={quest.id}
            title={quest.title}
            icon={<ScrollText className="w-3.5 h-3.5" />}
            onClose={() => setIsDismissed(true)}
          >
            {obj ? (
              <div className="space-y-1.5 font-mono">
                <div className="flex items-start gap-1.5">
                  {isComplete ? (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-400" />
                  ) : (
                    <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />
                  )}
                  <p
                    className={`text-[10px] leading-snug font-medium ${
                      isComplete ? 'text-slate-500 line-through' : 'text-slate-200'
                    }`}
                  >
                    {obj.description}
                  </p>
                </div>

                {!isComplete && obj.requiredQty > 1 && (
                  <div className="space-y-1 pt-0.5">
                    <div className="w-full bg-black/60 rounded h-1.5 border border-teal-500/20 overflow-hidden">
                      <div
                        className="bg-teal-400 h-full rounded transition-all duration-300 shadow-[0_0_6px_rgba(20,184,166,0.6)]"
                        style={{
                          width: `${Math.min(100, Math.max(0, (quest.progress / obj.requiredQty) * 100))}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-end text-[9px] font-bold text-teal-300/70">
                      {quest.progress} / {obj.requiredQty}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 italic font-mono">No active objectives.</p>
            )}
          </HudPanelShell>
        );
      })}
    </div>
  );
}
