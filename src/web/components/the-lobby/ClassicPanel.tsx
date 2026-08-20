'use client';

import React, { useEffect } from 'react';
import { useGameStore } from './store';
import InventoryOverlay from './inventory-overlay';
import SkillsOverlay from './skills-overlay';
import EquipmentOverlay from './equipment-overlay';
import QuestLogOverlay from './quest-log-overlay';
import GtcOverlay from './gtc-overlay';
import {
  Backpack,
  Sword,
  Shield,
  ScrollText,
  Store,
  X,
  Sparkles,
} from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';

export default function ClassicPanel() {
  const { gameMode, setGameMode } = useGameStore();

  const panelModes = ['INVENTORY', 'SKILLS', 'EQUIPMENT', 'QUESTS', 'GTC'];
  const isOpen = panelModes.includes(gameMode);

  // Global hotkeys for utility tabs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      )
        return;

      if (e.key === 'i' || e.key === 'I') {
        soundSynth?.playSelectSound?.();
        setGameMode(gameMode === 'INVENTORY' ? 'EXPLORING' : 'INVENTORY');
      } else if (e.key === 'k' || e.key === 'K') {
        soundSynth?.playSelectSound?.();
        setGameMode(gameMode === 'SKILLS' ? 'EXPLORING' : 'SKILLS');
      } else if (e.key === 'c' || e.key === 'C') {
        soundSynth?.playSelectSound?.();
        setGameMode(gameMode === 'EQUIPMENT' ? 'EXPLORING' : 'EQUIPMENT');
      } else if (e.key === 'l' || e.key === 'L') {
        soundSynth?.playSelectSound?.();
        setGameMode(gameMode === 'QUESTS' ? 'EXPLORING' : 'QUESTS');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameMode, setGameMode]);

  const tabClass = (mode: string) => `
    flex items-center justify-center p-2 rounded-xl cursor-pointer transition-all duration-150 relative group
    ${
      gameMode === mode
        ? 'bg-cyan-500/25 text-[#00f5d4] shadow-[0_0_12px_rgba(0,245,212,0.35)] border border-cyan-400/60'
        : 'text-slate-400 hover:text-cyan-200 hover:bg-white/5 border border-transparent'
    }
  `;

  // Closed utility dock — sized tightly to its actual icon contents
  if (!isOpen) {
    return (
      <div
        className="pointer-events-auto shrink-0 select-none font-mono"
        style={{ filter: 'drop-shadow(0 4px 15px rgba(0,0,0,0.6))' }}
      >
        <div
          className="flex items-center gap-1.5 p-1.5 bg-[#0a0318]/95 border border-pink-500/30 rounded-2xl shadow-[0_0_20px_rgba(242,0,137,0.15)] backdrop-blur-xl"
          style={{
            clipPath: 'polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)',
          }}
        >
          <button
            type="button"
            className={tabClass('INVENTORY')}
            onClick={() => {
              soundSynth?.playSelectSound?.();
              setGameMode('INVENTORY');
            }}
            title="Inventory [I]"
          >
            <Backpack className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 text-[7px] font-bold text-cyan-300 bg-black/80 px-1 rounded border border-cyan-500/30">
              I
            </span>
          </button>
          <button
            type="button"
            className={tabClass('SKILLS')}
            onClick={() => {
              soundSynth?.playSelectSound?.();
              setGameMode('SKILLS');
            }}
            title="Skills [K]"
          >
            <Sword className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 text-[7px] font-bold text-cyan-300 bg-black/80 px-1 rounded border border-cyan-500/30">
              K
            </span>
          </button>
          <button
            type="button"
            className={tabClass('EQUIPMENT')}
            onClick={() => {
              soundSynth?.playSelectSound?.();
              setGameMode('EQUIPMENT');
            }}
            title="Equipment [C]"
          >
            <Shield className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 text-[7px] font-bold text-cyan-300 bg-black/80 px-1 rounded border border-cyan-500/30">
              C
            </span>
          </button>
          <button
            type="button"
            className={tabClass('QUESTS')}
            onClick={() => {
              soundSynth?.playSelectSound?.();
              setGameMode('QUESTS');
            }}
            title="Quest Log [L]"
          >
            <ScrollText className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 text-[7px] font-bold text-cyan-300 bg-black/80 px-1 rounded border border-cyan-500/30">
              L
            </span>
          </button>
          <button
            type="button"
            className={tabClass('GTC')}
            onClick={() => {
              soundSynth?.playSelectSound?.();
              setGameMode('GTC');
            }}
            title="Global Trade Center"
          >
            <Store className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Expanded panel view
  return (
    <div
      className="pointer-events-auto flex w-[min(95vw,390px)] max-w-full flex-col select-none font-mono"
      style={{ filter: 'drop-shadow(0 4px 25px rgba(0,0,0,0.8))' }}
    >
      <div
        className="w-full bg-[#0a0318]/95 border-2 border-pink-500/40 rounded-2xl shadow-[0_0_30px_rgba(242,0,137,0.25)] backdrop-blur-xl flex flex-col overflow-hidden"
        style={{
          clipPath: 'polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px)',
        }}
      >
        {/* Header Tab Bar */}
        <div className="flex items-center justify-between border-b border-pink-500/20 bg-black/60 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className={tabClass('INVENTORY')}
              onClick={() => {
                soundSynth?.playSelectSound?.();
                setGameMode(gameMode === 'INVENTORY' ? 'EXPLORING' : 'INVENTORY');
              }}
              title="Inventory [I]"
            >
              <Backpack className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={tabClass('SKILLS')}
              onClick={() => {
                soundSynth?.playSelectSound?.();
                setGameMode(gameMode === 'SKILLS' ? 'EXPLORING' : 'SKILLS');
              }}
              title="Skills [K]"
            >
              <Sword className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={tabClass('EQUIPMENT')}
              onClick={() => {
                soundSynth?.playSelectSound?.();
                setGameMode(gameMode === 'EQUIPMENT' ? 'EXPLORING' : 'EQUIPMENT');
              }}
              title="Equipment [C]"
            >
              <Shield className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={tabClass('QUESTS')}
              onClick={() => {
                soundSynth?.playSelectSound?.();
                setGameMode(gameMode === 'QUESTS' ? 'EXPLORING' : 'QUESTS');
              }}
              title="Quest Log [L]"
            >
              <ScrollText className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={tabClass('GTC')}
              onClick={() => {
                soundSynth?.playSelectSound?.();
                setGameMode(gameMode === 'GTC' ? 'EXPLORING' : 'GTC');
              }}
              title="Global Trade Center"
            >
              <Store className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              soundSynth?.playSelectSound?.();
              setGameMode('EXPLORING');
            }}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            title="Close Panel (ESC)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Body */}
        <div className="relative m-2 h-[50vh] min-h-[280px] max-h-[600px] flex-1 overflow-hidden rounded-xl bg-black/60 border border-pink-500/20">
          {gameMode === 'INVENTORY' && (
            <div className="scale-wrapper absolute inset-0 overflow-auto">
              <InventoryOverlay />
            </div>
          )}
          {gameMode === 'SKILLS' && (
            <div className="scale-wrapper absolute inset-0 overflow-auto">
              <SkillsOverlay />
            </div>
          )}
          {gameMode === 'EQUIPMENT' && (
            <div className="scale-wrapper absolute inset-0 overflow-auto">
              <EquipmentOverlay />
            </div>
          )}
          {gameMode === 'QUESTS' && (
            <div className="scale-wrapper absolute inset-0 overflow-auto">
              <QuestLogOverlay />
            </div>
          )}
          {gameMode === 'GTC' && (
            <div className="scale-wrapper absolute inset-0 overflow-auto">
              <GtcOverlay />
            </div>
          )}
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .scale-wrapper > div {
          position: relative !important;
          width: 100% !important;
          height: 100% !important;
          max-width: none !important;
          max-height: none !important;
          inset: 0 !important;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
        }
      `,
        }}
      />
    </div>
  );
}
