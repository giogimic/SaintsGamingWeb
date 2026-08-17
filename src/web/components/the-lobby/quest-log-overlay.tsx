'use client';

import React, { useState } from 'react';
import { HudPanelShell } from './hud/HudPanelShell';
import { useGameStore } from './store';
import { QUEST_DB, GameQuest } from './data/quests';
import { BookOpen, CheckCircle, Clock, Award, Compass, Sparkles } from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';

export default function QuestLogOverlay() {
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');
  const [inspectedQuestId, setInspectedQuestId] = useState<string | null>(null);
  const player = useGameStore(state => state.player);
  const setGameMode = useGameStore(state => state.setGameMode);

  const activeQuestIds = Object.keys(player.activeQuests || {});
  const completedQuestIds = player.completedQuests || [];

  const activeQuests: GameQuest[] = activeQuestIds
    .map(id => QUEST_DB[id] || {
      id,
      title: id.replace(/^QUEST_/, '').replace(/_/g, ' '),
      description: 'Active campaign task.',
    })
    .filter(Boolean);

  const completedQuests: GameQuest[] = completedQuestIds
    .map(id => QUEST_DB[id] || {
      id,
      title: id.replace(/^QUEST_/, '').replace(/_/g, ' '),
      description: 'Completed campaign task.',
    })
    .filter(Boolean);

  const inspectedQuest = inspectedQuestId ? (QUEST_DB[inspectedQuestId] || {
    id: inspectedQuestId,
    title: inspectedQuestId.replace(/^QUEST_/, '').replace(/_/g, ' '),
    description: 'Campaign task details.',
  }) : null;

  return (
    <div className="pointer-events-auto z-40 flex w-[min(95vw,620px)] max-w-full flex-col font-mono text-xs select-none relative">
      <HudPanelShell 
        title="QUEST JOURNAL & CAMPAIGN LOG" 
        icon={<BookOpen className="w-4 h-4 text-amber-400" />}
        onClose={() => setGameMode('EXPLORING')}
        headerRight={
          <span className="text-[9px] font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40 uppercase">
            CAMPAIGN
          </span>
        }
      >
        <div className="flex flex-col gap-3 h-[68vh] p-3">
          
          {/* Header Tabs */}
          <div className="flex justify-between items-center bg-black/60 p-1.5 rounded-xl border border-amber-500/20">
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  soundSynth?.playSelectSound?.();
                  setActiveTab('ACTIVE');
                  setInspectedQuestId(null);
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                  activeTab === 'ACTIVE' 
                    ? 'bg-amber-600/80 text-amber-100 border border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.4)]' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" /> ACTIVE ({activeQuests.length})
              </button>
              <button
                onClick={() => {
                  soundSynth?.playSelectSound?.();
                  setActiveTab('COMPLETED');
                  setInspectedQuestId(null);
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                  activeTab === 'COMPLETED' 
                    ? 'bg-emerald-600/80 text-emerald-100 border border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" /> COMPLETED ({completedQuests.length})
              </button>
            </div>
          </div>

          {/* TAB 1: ACTIVE QUESTS (GLANCE LIST) */}
          {activeTab === 'ACTIVE' && (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {activeQuests.length === 0 ? (
                <div className="p-8 border border-dashed border-slate-800 rounded-xl text-center text-slate-500 italic bg-black/40">
                  No active campaign tasks right now.<br/>Explore the realm and speak with NPCs to receive missions!
                </div>
              ) : (
                activeQuests.map(q => {
                  const qState = player.activeQuests[q.id];
                  const stageIdx = qState?.stage || 0;
                  const title = q.title || q.name || q.id;
                  const desc = q.description || q.summary || 'Active campaign mission';
                  const isSelected = inspectedQuestId === q.id;

                  return (
                    <div 
                      key={q.id} 
                      onClick={() => {
                        soundSynth?.playSelectSound?.();
                        setInspectedQuestId(isSelected ? null : q.id);
                      }}
                      className={`p-3 bg-black/50 border transition-all rounded-xl cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-amber-400 bg-amber-950/30 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                          : 'border-slate-800 hover:border-amber-500/50 hover:bg-black/80'
                      }`}
                      style={{
                        clipPath: 'polygon(6px 0%, 100% 0%, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0% 100%, 0% 6px)',
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-xs text-amber-200 truncate">{title}</h3>
                          <span className="text-[8px] px-1.5 py-0.2 bg-amber-950/80 text-amber-300 border border-amber-500/40 rounded uppercase font-bold shrink-0">
                            STAGE {stageIdx + 1}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{desc}</p>
                      </div>

                      <span className="text-[10px] text-amber-400 font-bold shrink-0 px-2 py-1 bg-black/60 rounded border border-slate-800">
                        {isSelected ? 'INSPECTING' : 'INSPECT →'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: COMPLETED QUESTS */}
          {activeTab === 'COMPLETED' && (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {completedQuests.length === 0 ? (
                <div className="p-8 border border-dashed border-slate-800 rounded-xl text-center text-slate-500 italic bg-black/40">
                  No completed campaign tasks recorded yet.
                </div>
              ) : (
                completedQuests.map(q => {
                  const title = q.title || q.name || q.id;
                  const desc = q.description || q.summary || 'Completed campaign task';
                  return (
                    <div 
                      key={q.id} 
                      className="p-3 bg-black/40 border border-emerald-900/50 rounded-xl space-y-1"
                      style={{
                        clipPath: 'polygon(6px 0%, 100% 0%, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0% 100%, 0% 6px)',
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-xs text-emerald-400">{title}</h3>
                        <span className="text-[9px] px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-700/50 rounded font-bold uppercase">
                          COMPLETED
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">{desc}</p>
                    </div>
                  );
                })
              )}
            </div>
          )}

        </div>
      </HudPanelShell>

      {/* Dedicated Quest Inspect Modal Overlay */}
      {inspectedQuest && (
        <div className="pointer-events-auto absolute inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div 
            className="bg-[#05080d] border border-amber-400 p-4 rounded-2xl max-w-md w-full text-slate-100 font-mono relative shadow-[0_0_25px_rgba(245,158,11,0.3)] space-y-3"
            style={{
              clipPath: 'polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)',
            }}
          >
            <div className="flex justify-between items-start border-b border-amber-500/20 pb-2">
              <div>
                <h3 className="font-extrabold text-sm text-amber-200">
                  {inspectedQuest.title || inspectedQuest.name || inspectedQuest.id}
                </h3>
                <span className="text-[9px] text-amber-400 font-bold uppercase">
                  Stage {(player.activeQuests[inspectedQuest.id]?.stage || 0) + 1}
                </span>
              </div>
              <button
                onClick={() => {
                  soundSynth?.playSelectSound?.();
                  setInspectedQuestId(null);
                }}
                className="text-slate-400 hover:text-white px-2 py-0.5 rounded bg-black/60 border border-slate-800 cursor-pointer font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {inspectedQuest.description || inspectedQuest.summary || 'Campaign task narrative details.'}
            </p>

            {/* Objectives */}
            {inspectedQuest.objectives && inspectedQuest.objectives.length > 0 && (
              <div className="bg-black/60 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">Objectives:</span>
                {inspectedQuest.objectives.map((obj, oIdx) => (
                  <div key={obj.id || oIdx} className="flex items-center gap-2 text-[11px] text-slate-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span>{obj.description}</span>
                    {obj.targetCount > 1 && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({obj.currentCount || 0}/{obj.targetCount})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Rewards */}
            <div className="p-2.5 bg-black/40 rounded-lg border border-amber-500/20 flex justify-between items-center text-[10px]">
              <div className="flex gap-3 text-slate-300">
                <span>XP: <strong className="text-emerald-400">+{inspectedQuest.rewards?.xp ?? inspectedQuest.rewardXp ?? 100}</strong></span>
                <span>Credits: <strong className="text-amber-300">+{inspectedQuest.rewards?.credits ?? inspectedQuest.rewardCredits ?? 50} C</strong></span>
              </div>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Award className="w-3.5 h-3.5" /> ACTIVE TASK
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

