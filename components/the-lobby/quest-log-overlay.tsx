'use client';

import React, { useState } from 'react';
import RpgPanel from './rpg-panel';
import { useGameStore } from './store';
import { QUEST_DB, GameQuest } from './data/quests';
import { BookOpen, CheckCircle, Clock, Award } from 'lucide-react';

export default function QuestLogOverlay() {
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');
  const player = useGameStore(state => state.player);
  const setGameMode = useGameStore(state => state.setGameMode);

  const activeQuestIds = Object.keys(player.activeQuests || {});
  const completedQuestIds = player.completedQuests || [];

  const activeQuests: GameQuest[] = activeQuestIds
    .map(id => QUEST_DB[id])
    .filter(Boolean);

  const completedQuests: GameQuest[] = completedQuestIds
    .map(id => QUEST_DB[id])
    .filter(Boolean);

  return (
    <RpgPanel title="QUEST JOURNAL & CAMPAIGN TASKS" onClose={() => setGameMode('EXPLORING')}>
      <div className="flex flex-col gap-4 h-full font-mono text-xs overflow-hidden">
        
        {/* Header Tabs */}
        <div className="flex justify-between items-center bg-[#050b14]/60 p-2 rounded-lg border border-[#806f47]/50">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('ACTIVE')}
              className={`px-3 py-1.5 rounded font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'ACTIVE' ? 'bg-[#806f47]/80 text-[#e2d5b3] border border-[#cbb26a]' : 'text-[#806f47] hover:text-[#e2d5b3] border border-transparent'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> ACTIVE TASKS ({activeQuests.length})
            </button>
            <button
              onClick={() => setActiveTab('COMPLETED')}
              className={`px-3 py-1.5 rounded font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'COMPLETED' ? 'bg-[#1e293b]/80 text-emerald-400 border border-emerald-700/50' : 'text-[#806f47] hover:text-emerald-400 border border-transparent'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" /> COMPLETED ({completedQuests.length})
            </button>
          </div>

          <div className="text-[10px] text-[#e2d5b3] font-bold bg-[#806f47]/20 px-2.5 py-1 rounded border border-[#806f47]/50 flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" /> CAMPAIGN JOURNAL
          </div>
        </div>

        {/* TAB 1: ACTIVE QUESTS */}
        {activeTab === 'ACTIVE' && (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
            {activeQuests.length === 0 ? (
              <div className="p-8 border border-dashed rounded-lg text-center text-slate-500 italic">
                No active campaign tasks right now.<br/>Talk to Mom or Professor Oakwood to receive quests!
              </div>
            ) : (
              activeQuests.map(q => {
                const qState = player.activeQuests[q.id];
                const stageIdx = qState?.stage || 0;

                return (
                  <div key={q.id} className="p-4 bg-[#0b1320]/60 border border-[#806f47]/40 rounded-xl space-y-2 shadow-lg">
                    <div className="flex justify-between items-start">
                      <h3 className="font-extrabold text-sm text-[#e2d5b3]">{q.title}</h3>
                      <span className="text-[9px] px-2 py-0.5 bg-[#050b14]/90 text-[#cbb26a] border border-[#806f47]/50 rounded font-bold uppercase">
                        STAGE {stageIdx + 1}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{q.description}</p>

                    {/* Reward Summary */}
                    <div className="pt-2 border-t border-[#806f47]/30 flex justify-between items-center text-[10px]">
                      <div className="flex gap-3 text-slate-400">
                        <span>XP: <strong className="text-emerald-400">+{q.rewards?.xp || 100}</strong></span>
                        <span>Credits: <strong className="text-[#eab308]">+{q.rewards?.credits || 50} C</strong></span>
                      </div>
                      <div className="text-emerald-400 font-bold flex items-center gap-1">
                        <Award className="w-3.5 h-3.5" /> ACTIVE OBJECTIVE
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: COMPLETED QUESTS */}
        {activeTab === 'COMPLETED' && (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
            {completedQuests.length === 0 ? (
              <div className="p-8 border border-dashed rounded-lg text-center text-slate-500 italic">
                No completed campaign tasks yet.
              </div>
            ) : (
              completedQuests.map(q => (
                <div key={q.id} className="p-3 bg-[#050b14]/40 border border-emerald-900/40 rounded-lg space-y-1">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-xs text-emerald-400">{q.title}</h3>
                    <span className="text-[9px] px-2 py-0.5 bg-[#050b14]/90 text-emerald-500 border border-emerald-900/50 rounded font-bold uppercase">
                      COMPLETED
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{q.description}</p>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </RpgPanel>
  );
}
