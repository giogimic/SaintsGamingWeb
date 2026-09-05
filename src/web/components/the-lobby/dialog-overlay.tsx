'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from './store';
import { soundSynth } from '@/engine/sound-synth';
import { MessageSquare, X, ChevronRight, Sparkles, Terminal } from 'lucide-react';

export default function DialogOverlay() {
  const activeDialog = useGameStore((state) => state.activeDialog);
  const setGameMode = useGameStore((state) => state.setGameMode);
  const setActiveDialog = useGameStore((state) => state.setActiveDialog);
  const emitSocketEvent = useGameStore((state) => state.emitSocketEvent);
  const currentMapId = useGameStore((state) => state.currentMapId);

  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const mapEntities = useGameStore((state) => state.mapEntities);
  const activeMapData = useGameStore((state) => state.activeMapData);

  const foundNpc =
    mapEntities?.find((e) => e.id === activeDialog?.npcId || e.name === activeDialog?.npcName) ||
    (activeMapData?.npcs as any[])?.find((n) => n.id === activeDialog?.npcId || n.name === activeDialog?.npcName);

  const spriteKey =
    (activeDialog as any)?.npcSprite ||
    (activeDialog as any)?.spriteId ||
    foundNpc?.spriteKey ||
    foundNpc?.sprite ||
    'adventurer';

  const npcDisplayName =
    activeDialog?.npcName ||
    (activeDialog?.npcId
      ? activeDialog.npcId
          .replace(/^npc[_-]?/i, '')
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase())
      : 'Stranger');

  const currentText = activeDialog?.text || '';

  useEffect(() => {
    if (!currentText) return;
    setDisplayedText('');
    setIsTyping(true);
    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      setDisplayedText(currentText.slice(0, idx));
      if (idx % 3 === 0) {
        soundSynth?.playUiClick?.();
      }
      if (idx >= currentText.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 20);
    return () => clearInterval(interval);
  }, [currentText]);

  const handleClose = () => {
    soundSynth?.playSelectSound?.();
    setActiveDialog(null);
    setGameMode('EXPLORING');
  };

  const skipTypewriter = () => {
    if (isTyping) {
      setDisplayedText(currentText);
      setIsTyping(false);
    } else if (!activeDialog?.options || activeDialog.options.length === 0) {
      handleClose();
    }
  };

  const handleOptionClick = (opt: any) => {
    if (!emitSocketEvent) {
      console.warn('No socket connection!');
      return;
    }

    soundSynth?.playActionSound?.();
    setDisplayedText('');
    setIsTyping(true);

    emitSocketEvent('dialogue_select', {
      mapId: currentMapId,
      targetId: activeDialog?.npcId,
      seraphtNode: opt.seraphtNode,
      action: opt.action,
      questSlug: opt.questSlug,
    });
  };

  // Keyboard navigation for dialogue (Space, Enter, E, 1-9, Escape)
  useEffect(() => {
    if (!activeDialog) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }

      if (isTyping) {
        if (e.key === ' ' || e.key === 'Enter' || e.key.toLowerCase() === 'e') {
          e.preventDefault();
          skipTypewriter();
        }
        return;
      }

      if (!activeDialog.options || activeDialog.options.length === 0) {
        if (e.key === ' ' || e.key === 'Enter' || e.key.toLowerCase() === 'e') {
          e.preventDefault();
          handleClose();
        }
      } else {
        const optionIdx = parseInt(e.key) - 1;
        if (optionIdx >= 0 && optionIdx < activeDialog.options.length) {
          e.preventDefault();
          handleOptionClick(activeDialog.options[optionIdx]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDialog, isTyping, currentText]);

  if (!activeDialog) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center px-4 pb-6 sm:px-8 sm:pb-10 select-none">
      <div
        className="pointer-events-auto relative w-full max-w-3xl animate-in slide-in-from-bottom-6 fade-in duration-200 p-[1px] bg-gradient-to-r from-cyan-500/60 via-teal-500/40 to-cyan-500/60 shadow-[0_0_25px_rgba(6,182,212,0.25)]"
        style={{
          clipPath: 'polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px)',
        }}
        onClick={skipTypewriter}
      >
        <div 
          className="w-full h-full bg-[#04090e]/95 backdrop-blur-md p-4 sm:p-5 flex gap-4 sm:gap-6 items-start font-mono"
          style={{
            clipPath: 'polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px)',
          }}
        >
          {/* NPC Speaker Pedestal */}
          <div className="hidden sm:flex shrink-0 flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-xl bg-black/80 border border-cyan-500/40 p-1 flex items-center justify-center shadow-[inset_0_0_15px_rgba(6,182,212,0.25)] overflow-hidden">
              {spriteKey && spriteKey !== 'none' ? (
                <div
                  className="pixelated bg-no-repeat transition-transform duration-300"
                  style={{
                    backgroundImage: `url('/game-assets/npc/${spriteKey}.png')`,
                    backgroundPosition: '0px -64px',
                    backgroundSize: '96px 128px',
                    width: '32px',
                    height: '32px',
                    transform: 'scale(1.9)',
                  }}
                />
              ) : (
                <MessageSquare className="h-7 w-7 text-cyan-400 opacity-80" />
              )}
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-cyan-300/70 border border-cyan-500/20 px-1.5 py-0.5 rounded bg-cyan-950/40">
              SPEAKER
            </span>
          </div>

          {/* Dialogue Text & Branch Choices */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              {/* Header Title */}
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-bold text-base text-white uppercase tracking-wider">
                    {npcDisplayName}
                  </h3>
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-400/30 text-cyan-300">
                    TRANSMISSION
                  </span>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                  }}
                  className="text-slate-400 hover:text-white p-1 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Typewriter Text Box */}
              <div className="min-h-[64px] text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                {displayedText}
                {isTyping && (
                  <span className="inline-block w-2 h-4 bg-cyan-400 ml-1 animate-pulse" />
                )}
              </div>
            </div>

            {/* Branch Choices */}
            {!isTyping && activeDialog.options && activeDialog.options.length > 0 && (
              <div className="mt-3.5 space-y-1.5 pt-3 border-t border-cyan-500/20">
                {activeDialog.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOptionClick(opt);
                    }}
                    className="w-full p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-900/30 text-left text-xs font-bold text-cyan-100 flex items-center justify-between transition-all cursor-pointer shadow-sm group"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-cyan-400 group-hover:translate-x-0.5 transition-transform">&gt;</span>
                      <span>{opt.label}</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-black/60 border border-cyan-500/40 text-cyan-300">
                      [{i + 1}]
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Advance Prompt */}
            {!isTyping && (!activeDialog.options || activeDialog.options.length === 0) && (
              <div className="mt-2 flex items-center justify-end gap-1.5 text-[10px] text-cyan-300 font-bold tracking-wider animate-pulse">
                <span>[CLICK OR SPACE TO CONTINUE]</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

