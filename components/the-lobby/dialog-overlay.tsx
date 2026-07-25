'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from './store';
import { QUEST_DB } from './data/quests';
import { MessageSquare, Scroll, CheckCircle, XCircle, ChevronRight } from 'lucide-react';

export default function DialogOverlay() {
  const player = useGameStore(state => state.player);
  const activeDialog = useGameStore(state => state.activeDialog);
  const setGameMode = useGameStore(state => state.setGameMode);
  const setActiveDialog = useGameStore(state => state.setActiveDialog);
  const acceptQuest = useGameStore(state => state.acceptQuest);
  const completeQuest = useGameStore(state => state.completeQuest);
  const modifyInventory = useGameStore(state => state.modifyInventory);
  const modifyCredits = useGameStore(state => state.modifyCredits);
  const gainXp = useGameStore(state => state.gainXp);
  const showToast = useGameStore(state => state.showToast);

  // Typewriter state
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  if (!activeDialog) return null;

  const handleClose = () => {
    setActiveDialog(null);
    setGameMode('EXPLORING');
  };

  // Resolve NPC display name from activeDialog, quest data, or fallback
  const npcQuest = Object.values(QUEST_DB).find(q => q.npcId === activeDialog.npcId);
  
  // Use the name passed in activeDialog first, then quest NPC name, then a cleaned-up npcId
  const npcDisplayName = activeDialog.npcName 
    || (npcQuest as any)?.npcName 
    || (activeDialog.npcId ? activeDialog.npcId.replace(/^npc[_-]?/i, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Stranger');

  let currentText = activeDialog.text;
  let questState: 'none' | 'new' | 'active' | 'completable' | 'done' = 'none';

  if (npcQuest) {
    const isCompleted = player.completedQuests.includes(npcQuest.id);
    const isActive = !!player.activeQuests[npcQuest.id];

    if (isCompleted) {
      currentText = "Thank you for your help, traveler. You've proven yourself a true champion.";
      questState = 'done';
    } else if (isActive) {
      const req = npcQuest.requirements;
      let reqMet = true;
      if (req?.itemId && req?.amount) {
        if ((player.inventory[req.itemId] || 0) < req.amount) {
          reqMet = false;
        }
      }

      if (reqMet) {
        currentText = Array.isArray(npcQuest.dialogs?.complete) ? npcQuest.dialogs.complete.join(" ") : (npcQuest.dialogs?.complete || "Quest complete! You've done well.");
        questState = 'completable';
      } else {
        currentText = Array.isArray(npcQuest.dialogs?.in_progress) ? npcQuest.dialogs.in_progress.join(" ") : (npcQuest.dialogs?.inProgress?.join(" ") || "Keep going, you're not done yet...");
        questState = 'active';
      }
    } else {
      currentText = Array.isArray(npcQuest.dialogs?.intro) ? npcQuest.dialogs.intro.join(" ") : (npcQuest.dialogs?.start?.join(" ") || "Greetings, traveler! I have a task for you.");
      questState = 'new';
    }
  }

  // Typewriter effect
  useEffect(() => {
    if (!currentText) return;
    setDisplayedText('');
    setIsTyping(true);
    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      setDisplayedText(currentText.slice(0, idx));
      if (idx >= currentText.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 22);
    return () => clearInterval(interval);
  }, [currentText]);

  const skipTypewriter = () => {
    if (isTyping) {
      setDisplayedText(currentText);
      setIsTyping(false);
    }
  };

  const handleCompleteQuest = () => {
    if (!npcQuest) return;
    const req = npcQuest.requirements;
    if (req?.itemId && req?.amount) {
      modifyInventory(req.itemId, -req.amount);
    }
    const rewards = npcQuest.rewards;
    if (rewards?.credits) modifyCredits(rewards.credits);
    if (rewards?.xp) gainXp(rewards.xp);
    if (rewards?.itemId && rewards?.amount) modifyInventory(rewards.itemId, rewards.amount);
    
    showToast(`Quest Completed: ${npcQuest.name || (npcQuest as any).title || 'Quest'}!`);
    completeQuest(npcQuest.id);
    handleClose();
  };

  const handleAcceptQuest = () => {
    if (!npcQuest) return;
    acceptQuest(npcQuest.id);
    showToast(`Quest Accepted: ${npcQuest.name}`);
    handleClose();
  };

  // Quest badge color
  const questBadgeClasses = {
    none: '',
    new: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
    active: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
    completable: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
    done: 'bg-slate-500/20 text-slate-400 border-slate-500/50',
  };
  const questBadgeLabels = {
    none: '',
    new: '✦ NEW QUEST',
    active: '◈ IN PROGRESS',
    completable: '★ TURN IN',
    done: '✓ COMPLETED',
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center pointer-events-none pb-6 sm:pb-12 px-4">
      {/* Overlay dim */}
      <div 
        className="absolute inset-0 bg-black/30 pointer-events-auto" 
        onClick={skipTypewriter} 
      />

      {/* Dialog Box */}
      <div 
        className="relative w-full max-w-2xl pointer-events-auto animate-in slide-in-from-bottom-8 fade-in duration-300"
        onClick={skipTypewriter}
      >
        {/* Decorative top border glow */}
        <div className="absolute -top-px left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-indigo-400/80 to-transparent" />
        
        <div className="bg-gradient-to-b from-[#1a1840]/98 to-[#0f0d2e]/98 backdrop-blur-xl border border-indigo-500/30 rounded-xl shadow-[0_0_40px_rgba(99,102,241,0.15)] overflow-hidden">
          
          {/* NPC Name Header */}
          <div className="px-5 py-2.5 bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-indigo-900/60 border-b border-indigo-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-indigo-200 text-sm font-mono uppercase tracking-widest">
                {npcDisplayName}
              </span>
            </div>
            {questState !== 'none' && (
              <span className={`text-[10px] font-bold font-mono px-2.5 py-1 rounded-full border ${questBadgeClasses[questState]}`}>
                {questBadgeLabels[questState]}
              </span>
            )}
          </div>

          {/* Dialog Body */}
          <div className="flex p-5 gap-5">
            {/* NPC Portrait */}
            <div className="flex-shrink-0">
              <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-indigo-900/80 to-purple-900/80 border-2 border-indigo-500/40 shadow-[inset_0_0_20px_rgba(99,102,241,0.15)] flex items-center justify-center overflow-hidden">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-400/30 to-purple-400/30 flex items-center justify-center">
                  <span className="text-2xl">👤</span>
                </div>
              </div>
            </div>

            {/* Text Content */}
            <div className="flex-1 min-h-[80px] flex flex-col justify-between">
              <p className="text-white/90 font-mono text-sm leading-relaxed">
                {displayedText}
                {isTyping && <span className="inline-block w-2 h-4 bg-indigo-400 ml-0.5 animate-pulse" />}
              </p>

              {/* Action Buttons */}
              {!isTyping && (
                <div className="flex justify-end gap-2.5 mt-4 animate-in fade-in duration-200">
                  {questState === 'new' && (
                    <>
                      <button 
                        onClick={handleClose}
                        className="px-4 py-2 bg-slate-800/80 text-slate-300 font-bold font-mono text-xs rounded-lg border border-slate-700/60 hover:bg-slate-700 hover:text-white transition-all flex items-center gap-1.5 active:scale-95"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        DECLINE
                      </button>
                      <button 
                        onClick={handleAcceptQuest}
                        className="px-5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold font-mono text-xs rounded-lg shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all active:scale-95"
                      >
                        <Scroll className="w-3.5 h-3.5" />
                        ACCEPT QUEST
                      </button>
                    </>
                  )}

                  {questState === 'completable' && (
                    <button 
                      onClick={handleCompleteQuest}
                      className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold font-mono text-xs rounded-lg shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      COMPLETE QUEST
                    </button>
                  )}

                  {(questState === 'none' || questState === 'active' || questState === 'done') && (
                    <button 
                      onClick={handleClose}
                      className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold font-mono text-xs rounded-lg shadow-lg shadow-indigo-500/20 flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      CONTINUE
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Hint footer */}
          <div className="px-5 py-2 border-t border-indigo-500/10 bg-black/20">
            <span className="text-[10px] text-slate-500 font-mono">
              Click anywhere to skip • Press <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-700 rounded text-indigo-300">E</kbd> to interact
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
