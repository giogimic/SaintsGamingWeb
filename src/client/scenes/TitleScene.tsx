import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSessionStore } from '../state/useSessionStore';
import { useAppStore } from "@/shared/store/useAppStore";
import { getUserCharacters, getTopLobbyOperatives } from '@/app/actions/game';
import { soundSynth } from '@/engine/sound-synth';
import { useTheme } from 'next-themes';

import GameOptionsMenu from '@/web/components/the-lobby/hud/GameOptionsMenu';
import { MidnightTropicalBackground } from '@/client/ui/shared/MidnightTropicalBackground';
import { CharacterDetailPreview } from '@/client/ui/shared/CharacterDetailPreview';

import {
  Settings,
  ScrollText,
  Award,
  Gamepad2,
  ChevronLeft,
  ChevronRight,
  Layers,
  Plus
} from 'lucide-react';
import { canUseStudioServerControls } from '@/shared/game/studioPermissions';

import { LobbyChatOverlay } from '../ui/LobbyChatOverlay';

// ── Theme Palettes (matching Saints Dynamic Landing Page) ─────
const THEME_DARK = {
  bg: '#050014',
  textColor: '#ffffff',
};
const THEME_LIGHT = {
  bg: '#240046',
  textColor: '#ffffff',
};
const THEME_VICE = {
  bg: '#1b121c',
  textColor: '#ffffff',
};

// ── Credits Modal ─────────────────────────────────────────────────────
function CreditsModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="pointer-events-auto absolute inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: 'rgba(5, 0, 15, 0.85)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-pink-500/40 p-8 text-center bg-[#0d0221]/95 shadow-[0_0_60px_rgba(242,0,137,0.35)]"
        onClick={(e) => e.stopPropagation()}
        style={{
          clipPath: 'polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px)',
        }}
      >
        <div className="absolute top-0 left-10 right-10 h-[2px] bg-gradient-to-r from-transparent via-[#00f5d4] to-transparent" />

        <div className="flex items-center justify-center gap-2 mb-2">
          <Award className="w-5 h-5 text-amber-400" />
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-pink-400 to-cyan-300 tracking-widest font-mono">
            SAINTS ONLINE CREDITS
          </h2>
        </div>
        <p className="text-cyan-400/60 text-xs tracking-widest uppercase font-mono mb-6">A Community For Gamers — EST. 2007</p>

        <div className="space-y-3.5 text-sm font-mono">
          {[
            { role: 'Game Director & Concept', name: 'The Saints Gaming Team' },
            { role: 'Core Engine & Architecture', name: 'BabylonJS · Next.js 15 · Go MMO' },
            { role: 'Original Creature Art', name: 'Open Source Creature Art Community' },
            { role: 'World Tilesets', name: 'Open Source Community Contributors' },
            { role: 'Sound Synthesis & FX', name: 'Saints WebAudio Engine' },
          ].map((c) => (
            <div key={c.role} className="flex items-center justify-between border-b border-pink-900/40 pb-2.5">
              <span className="text-pink-300/70 text-xs uppercase tracking-wider">{c.role}</span>
              <span className="text-cyan-200 font-bold text-xs">{c.name}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            soundSynth?.playSelectSound?.();
            onClose();
          }}
          className="mt-8 px-8 py-2.5 bg-gradient-to-r from-pink-600/40 to-cyan-600/40 hover:from-pink-600/60 hover:to-cyan-600/60 border border-pink-400/60 rounded-xl text-white text-xs font-mono font-bold tracking-wider transition-all hover:scale-105 cursor-pointer shadow-lg"
        >
          CLOSE CREDITS
        </button>
      </div>
    </div>
  );
}

export function TitleScene() {
  const { data: session, status } = useSession();
  const setScene = useSessionStore((state) => state.setScene);
  const mmoPlayerCount = useAppStore((s) => s.mmoPlayerCount);

  const [characters, setCharacters] = useState<any[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [showCredits, setShowCredits] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [setupStatus, setSetupStatus] = useState<any>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      getUserCharacters().then((res) => {
        if (res.success && res.data) {
          setCharacters(res.data);
        }
      });
    }
  }, [status]);

  // Fetch Setup status
  const fetchSetupStatus = async () => {
    try {
      const setupRes = await fetch('/api/setup/status').catch(() => null);
      if (setupRes?.ok) {
        const setupData = await setupRes.json();
        setSetupStatus(setupData.status);
      }
    } catch {
      // Keep default
    }
  };

  useEffect(() => {
    fetchSetupStatus();
  }, []);

  const activeChar = characters[activeIdx] || null;

  const handlePrevChar = () => {
    soundSynth?.playSelectSound?.();
    setActiveIdx((prev) => (prev > 0 ? prev - 1 : characters.length - 1));
  };

  const handleNextChar = () => {
    soundSynth?.playSelectSound?.();
    setActiveIdx((prev) => (prev < characters.length - 1 ? prev + 1 : 0));
  };

  const handleStartGame = () => {
    soundSynth?.playActionSound?.();
    if (status !== 'authenticated') {
      setScene('login');
      return;
    }

    const canStartRealm = canUseStudioServerControls(session?.user?.permissionLevel);
    if (setupStatus && !setupStatus.isSetupCompleted && canStartRealm) {
      window.location.href = '/setup';
      return;
    }

    setScene('server_select');
  };

  const { theme } = useTheme();
  const isLight = theme === 'light';
  const isVice = theme === 'vice';

  const THEME = isLight ? THEME_LIGHT : isVice ? THEME_VICE : THEME_DARK;

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-20 flex flex-col justify-center items-center overflow-x-hidden overflow-y-auto select-none font-sans pt-14 pb-12 sm:pt-12 sm:pb-10"
      style={{ backgroundColor: THEME.bg, color: THEME.textColor }}
    >
      <MidnightTropicalBackground />

      {/* ── MAIN 2-COLUMN COMMAND DECK: 3-COLUMN PREVIEW ON LEFT · LOBBY CHAT ON RIGHT ── */}
      <main className="relative z-20 flex-1 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch px-4 my-auto py-4">
        
        {/* ── LEFT SECTION: CHARACTER SELECTION & 3-COLUMN DETAIL PREVIEW (Cols 1-8) ── */}
        <section className="lg:col-span-8 flex flex-col space-y-3.5">
          {/* Top Bar: Controls & Saint Switcher */}
          <div className="bg-card/40 p-3 rounded-2xl border border-border/60 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground uppercase tracking-widest font-mono">
                  SAINT STAGE
                </span>
              </div>

              {/* Options & Credits buttons */}
              <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded-lg border border-white/10 shadow-sm">
                <button
                  type="button"
                  onClick={() => {
                    soundSynth?.playSelectSound?.();
                    setShowOptions(true);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors cursor-pointer"
                  title="Game Options"
                >
                  <Settings size={12} />
                  <span>Options</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundSynth?.playSelectSound?.();
                    setShowCredits(true);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors cursor-pointer"
                  title="Credits & Attribution"
                >
                  <ScrollText size={12} />
                  <span>Credits</span>
                </button>
              </div>
            </div>

            {/* Right: Quick Switcher & Actions */}
            <div className="flex items-center gap-2">
              {characters.length > 1 && (
                <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded-lg border border-white/10">
                  <button
                    type="button"
                    onClick={handlePrevChar}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors cursor-pointer"
                    title="Previous Saint"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-[10px] font-mono font-bold text-muted-foreground px-1.5">
                    {activeIdx + 1} / {characters.length}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextChar}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors cursor-pointer"
                    title="Next Saint"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  soundSynth?.playSelectSound?.();
                  setScene('character_select');
                }}
                className="py-1.5 px-2.5 rounded-lg bg-black/60 border border-white/10 hover:border-primary/40 text-muted-foreground hover:text-foreground flex items-center gap-1 text-[11px] font-mono font-bold uppercase transition-all cursor-pointer"
              >
                <Layers size={12} />
                <span>Vault</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundSynth?.playActionSound?.();
                  setScene('character_create');
                }}
                className="py-1.5 px-2.5 rounded-lg bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary hover:text-primary-foreground flex items-center gap-1 text-[11px] font-mono font-bold uppercase transition-all cursor-pointer"
              >
                <Plus size={12} strokeWidth={2.5} />
                <span>Forge</span>
              </button>
            </div>
          </div>

          {/* 3-Column Character Detail Preview */}
          <CharacterDetailPreview
            character={activeChar}
            onEnterWorld={handleStartGame}
            className="flex-1"
          />
        </section>

        {/* ── RIGHT SECTION: LOBBY CHAT ── */}
        <div className="lg:col-span-4 h-full">
          <LobbyChatOverlay />
        </div>
      </main>

      {/* Modals */}
      {showCredits && <CreditsModal onClose={() => setShowCredits(false)} />}

      {showOptions && (
        <GameOptionsMenu
          isOpen={showOptions}
          onClose={() => setShowOptions(false)}
          isFullscreen={false}
          onToggleFullscreen={() => {}}
          isAdminUser={false}
          isCreationMode={false}
          onToggleDevEditor={() => {}}
        />
      )}
    </div>
  );
}
