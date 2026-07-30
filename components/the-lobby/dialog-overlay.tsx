'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from './store';
import { MessageSquare, XCircle, ChevronRight } from 'lucide-react';

export default function DialogOverlay() {
  const activeDialog = useGameStore(state => state.activeDialog);
  const setGameMode = useGameStore(state => state.setGameMode);
  const setActiveDialog = useGameStore(state => state.setActiveDialog);
  const emitSocketEvent = useGameStore(state => state.emitSocketEvent);
  const currentMapId = useGameStore(state => state.currentMapId);

  // Typewriter state
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  const npcDisplayName = activeDialog?.npcName
    || (activeDialog?.npcId ? activeDialog.npcId.replace(/^npc[_-]?/i, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Stranger');

  const currentText = activeDialog?.text || '';

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

  if (!activeDialog) return null;

  const handleClose = () => {
    setActiveDialog(null);
    setGameMode('EXPLORING');
  };

  const skipTypewriter = () => {
    if (isTyping) {
      setDisplayedText(currentText);
      setIsTyping(false);
    }
  };

  const handleOptionClick = (nextNode: string) => {
    if (!emitSocketEvent) {
      console.warn("No socket connection!");
      return;
    }
    
    // Clear typing and show loading state
    setDisplayedText('');
    setIsTyping(true);
    
    emitSocketEvent('dialogue_select', {
      mapId: currentMapId,
      targetId: activeDialog.npcId,
      nextNode
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none pb-8 sm:pb-12 px-4 sm:px-8">
      <div 
        className="relative w-full max-w-4xl pointer-events-auto shadow-2xl overflow-hidden rounded-xl border border-[#cbb26a]/30 animate-in slide-in-from-bottom-8 fade-in duration-300"
        style={{
          background: 'linear-gradient(180deg, rgba(5,11,20,0.95) 0%, rgba(11,19,32,0.98) 100%)',
          backdropFilter: 'blur(12px)',
        }}
        onClick={skipTypewriter}
      >
        {/* Header Ribbon */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#cbb26a] to-transparent opacity-50" />
        
        <div className="flex p-4 sm:p-6 gap-4 sm:gap-6">
          {/* NPC Portrait */}
          <div className="hidden sm:flex flex-col items-center gap-2 w-24 shrink-0">
            <div className="w-20 h-20 rounded-full bg-[#162238] border-2 border-[#806f47] p-1.5 shadow-inner overflow-hidden">
              <div className="w-full h-full bg-slate-800 rounded-full flex items-center justify-center relative">
                <MessageSquare className="w-6 h-6 text-slate-500 opacity-70" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#050b14]/50" />
              </div>
            </div>
          </div>

          {/* Dialog Content */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <div className="flex items-baseline gap-3 mb-1.5">
                <h3 className="text-xl sm:text-2xl font-black text-[#e2d5b3] tracking-wider uppercase font-serif drop-shadow-md">
                  {npcDisplayName}
                </h3>
              </div>

              <div className="min-h-[72px] sm:min-h-[88px] relative">
                <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-serif pr-8 whitespace-pre-wrap">
                  {displayedText}
                  {isTyping && <span className="inline-block w-2 h-4 bg-[#cbb26a] ml-1 animate-pulse" />}
                </p>
                {!isTyping && (!activeDialog.options || activeDialog.options.length === 0) && (
                  <div className="absolute bottom-0 right-0 animate-bounce text-[#806f47]">
                    <ChevronRight className="w-6 h-6" />
                  </div>
                )}
              </div>
            </div>

            {/* Options (Server-driven) */}
            {!isTyping && activeDialog.options && activeDialog.options.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[#806f47]/20 flex flex-col gap-2">
                {activeDialog.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); handleOptionClick(opt.nextNode); }}
                    className="px-4 py-2 bg-[#162238] hover:bg-[#cbb26a]/20 border border-[#806f47]/30 hover:border-[#cbb26a] text-slate-200 text-sm font-medium rounded transition-all duration-200 text-left relative group w-full"
                  >
                    <span className="absolute left-2 opacity-0 group-hover:opacity-100 transition-opacity text-[#cbb26a]">&gt;</span>
                    <span className="group-hover:pl-4 transition-all">{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Close Button */}
        <button 
          onClick={(e) => { e.stopPropagation(); handleClose(); }}
          className="absolute top-4 right-4 text-slate-500 hover:text-red-400 transition-colors p-1"
        >
          <XCircle className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}