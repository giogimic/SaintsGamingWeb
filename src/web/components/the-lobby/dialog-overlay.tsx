'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from './store';
import { MessageSquare, XCircle, ChevronRight } from 'lucide-react';

export default function DialogOverlay() {
  const activeDialog = useGameStore((state) => state.activeDialog);
  const setGameMode = useGameStore((state) => state.setGameMode);
  const setActiveDialog = useGameStore((state) => state.setActiveDialog);
  const emitSocketEvent = useGameStore((state) => state.emitSocketEvent);
  const currentMapId = useGameStore((state) => state.currentMapId);

  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

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
    } else if (!activeDialog?.options || activeDialog.options.length === 0) {
      handleClose();
    }
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

  const handleOptionClick = (opt: any) => {
    if (!emitSocketEvent) {
      console.warn('No socket connection!');
      return;
    }

    setDisplayedText('');
    setIsTyping(true);

    emitSocketEvent('dialogue_select', {
      mapId: currentMapId,
      targetId: activeDialog.npcId,
      nextNode: opt.nextNode,
      action: opt.action,
      questSlug: opt.questSlug,
    });
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center px-4 pb-8 sm:px-8 sm:pb-12">
      <div
        className="lobby-panel pointer-events-auto relative w-full max-w-4xl animate-in slide-in-from-bottom-8 fade-in overflow-hidden rounded-xl duration-300"
        onClick={skipTypewriter}
      >
        <div className="lobby-hairline absolute top-0 right-0 left-0 h-px opacity-90" />

        <div className="flex gap-4 p-4 sm:gap-6 sm:p-6">
          <div className="hidden w-24 shrink-0 flex-col items-center gap-2 sm:flex">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-lobby-border-strong bg-lobby-panel-soft p-1.5 shadow-[inset_0_0_16px_rgba(167,139,250,0.2)]">
              <div className="relative flex h-full w-full items-center justify-center rounded-md bg-black/40">
                <MessageSquare className="h-6 w-6 text-lobby-soul opacity-80" />
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-lobby-ash">
              Exposure
            </span>
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-between">
            <div>
              <div className="mb-1.5 flex items-baseline gap-3">
                <h3 className="font-serif text-xl font-bold tracking-wide text-lobby-mist uppercase sm:text-2xl">
                  {npcDisplayName}
                </h3>
                <span className="hidden text-[10px] font-bold uppercase tracking-[0.2em] text-lobby-film sm:inline">
                  Soul Dialog
                </span>
              </div>

              <div className="relative min-h-[72px] sm:min-h-[88px]">
                <p className="pr-8 font-serif text-base leading-relaxed whitespace-pre-wrap text-lobby-fog sm:text-lg">
                  {displayedText}
                  {isTyping && (
                    <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-lobby-soul" />
                  )}
                </p>
                {!isTyping && (!activeDialog.options || activeDialog.options.length === 0) && (
                  <div className="absolute right-0 bottom-0 animate-bounce text-lobby-film">
                    <ChevronRight className="h-6 w-6" />
                  </div>
                )}
              </div>
            </div>

            {!isTyping && activeDialog.options && activeDialog.options.length > 0 && (
              <div className="mt-3 flex flex-col gap-2 border-t border-lobby-border pt-3">
                {activeDialog.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOptionClick(opt);
                    }}
                    className="group relative w-full flex items-center justify-between rounded-md border border-lobby-border bg-black/30 px-4 py-2 text-left text-sm font-medium text-lobby-mist transition-all duration-200 hover:border-lobby-film/50 hover:bg-lobby-film/10"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-lobby-soul opacity-0 transition-opacity group-hover:opacity-100">
                        &gt;
                      </span>
                      <span>{opt.label}</span>
                    </span>
                    <span className="text-[10px] font-mono text-lobby-ash px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                      [{i + 1}]
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className="absolute top-4 right-4 p-1 text-lobby-ash transition-colors hover:text-lobby-mist"
        >
          <XCircle className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
