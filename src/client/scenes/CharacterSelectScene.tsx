import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useSessionStore } from '../state/useSessionStore';
import { useAppStore } from "@/shared/store/useAppStore";
import { deleteGameCharacter, getUserCharacters } from '@/app/actions/game';
import { toast } from 'sonner';
import { soundSynth } from '@/engine/sound-synth';
import { useTheme } from 'next-themes';
import { useRealmSettings } from '@/web/hooks/studio-data';
import { useAuth } from '@/web/hooks/use-auth';

import {
  Gamepad2, Plus, Trash2, Shield, Sparkles, Zap, Wrench, User, Play, Swords, Heart,
  ArrowLeft, RefreshCw, AlertTriangle, Layers, Settings, ScrollText, Award
} from 'lucide-react';

import { MidnightTropicalBackground } from '@/client/ui/shared/MidnightTropicalBackground';
import { CharacterSpritePreview } from '@/client/ui/shared/CharacterSpritePreview';
import { CharacterDetailPreview } from '@/client/ui/shared/CharacterDetailPreview';
import { LobbySidePanel } from '@/client/ui/shared/LobbySidePanel';
import GameOptionsMenu from '@/web/components/the-lobby/hud/GameOptionsMenu';
import { CharacterSelectAdminWindow } from '@/web/components/the-lobby/admin/CharacterSelectAdminWindow';

const CLASS_ICONS: Record<string, any> = {
  BRAWLER: Shield, INVOKER: Sparkles, ARTISAN: Wrench, CYBER: Zap,
  SURVIVOR: Shield, WARRIOR: Swords, MAGE: Sparkles, THIEF: Zap,
  RANGER: Zap, PRIEST: Heart,
};

const CLASS_COLORS: Record<string, any> = {
  WARRIOR:  { glow: 'rgba(239,68,68,0.45)',   accent: '#f87171', label: '#fca5a5', border: 'rgba(239,68,68,0.6)' },
  MAGE:     { glow: 'rgba(96,165,250,0.5)',   accent: '#60a5fa', label: '#93c5fd', border: 'rgba(96,165,250,0.6)' },
  THIEF:    { glow: 'rgba(16,185,129,0.45)',  accent: '#34d399', label: '#6ee7b7', border: 'rgba(16,185,129,0.6)' },
  RANGER:   { glow: 'rgba(251,191,36,0.45)',  accent: '#fbbf24', label: '#fde68a', border: 'rgba(251,191,36,0.6)' },
  PRIEST:   { glow: 'rgba(226,213,179,0.45)', accent: '#e2d5b3', label: '#f5f0e1', border: 'rgba(226,213,179,0.6)' },
  INVOKER:  { glow: 'rgba(139,92,246,0.5)',   accent: '#a78bfa', label: '#c4b5fd', border: 'rgba(139,92,246,0.6)' },
  ARTISAN:  { glow: 'rgba(251,146,60,0.45)',  accent: '#fb923c', label: '#fdba74', border: 'rgba(251,146,60,0.6)' },
  BRAWLER:  { glow: 'rgba(239,68,68,0.45)',   accent: '#f87171', label: '#fca5a5', border: 'rgba(239,68,68,0.6)' },
  SURVIVOR: { glow: 'rgba(20,184,166,0.45)',  accent: '#2dd4bf', label: '#99f6e4', border: 'rgba(20,184,166,0.6)' },
  CYBER:    { glow: 'rgba(0,245,212,0.45)',   accent: '#00f5d4', label: '#a5f3fc', border: 'rgba(0,245,212,0.6)' },
};
const DEFAULT_COLOR = { glow: 'rgba(203,178,106,0.35)', accent: '#cbb26a', label: '#e5d59f', border: 'rgba(203,178,106,0.5)' };

function CreditsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="pointer-events-auto fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[#050014]/85 backdrop-blur-xl" onClick={onClose}>
      <div className="relative w-full max-w-lg rounded-2xl border border-primary/40 p-6 sm:p-8 text-center bg-[#0a0318]/95 shadow-[0_0_60px_rgba(203,178,106,0.25)]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Award className="w-5 h-5 text-primary" />
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-widest uppercase font-mono">Saints Gaming Credits</h2>
        </div>
        <p className="text-muted-foreground text-xs tracking-widest uppercase font-mono mb-6">A Community For Gamers — EST. 2007</p>
        <button onClick={onClose} className="mt-6 w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-mono font-bold text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all cursor-pointer">
          Close Credits
        </button>
      </div>
    </div>
  );
}

export function CharacterSelectScene() {
  const { data: session, status } = useSession();
  const setScene = useSessionStore((state) => state.setScene);
  const setCharacter = useSessionStore((state) => state.setCharacter);
  const mmoPlayerCount = useAppStore((state) => state.mmoPlayerCount);
  const { isModerator } = useAuth();
  const { settings: realmSettings } = useRealmSettings();
  
  const heroSingular = (realmSettings as any)?.playerClassName || 'Saint';
  const heroPlural = (realmSettings as any)?.playerClassNamePlural || 'Saints';

  const [characters, setCharacters] = useState<any[]>([]);
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [deleteModalChar, setDeleteModalChar] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [showAdminWindow, setShowAdminWindow] = useState(false);

  const fetchChars = async () => {
    if (status !== 'authenticated') return;
    try {
      const res = await getUserCharacters();
      if (res.success && res.data) {
        setCharacters(res.data);
        if (res.data.length > 0 && (!selectedCharId || !res.data.find((c: any) => c.id === selectedCharId))) {
          setSelectedCharId(res.data[0].id);
        } else if (res.data.length === 0) {
          setSelectedCharId(null);
        }
      }
    } catch {}
  };

  useEffect(() => { fetchChars(); }, [status]);

  const parsedCharacters = useMemo(() => {
    return characters.map((char) => {
      let state: any = { level: 1, hp: 100, maxHp: 100, credits: 1000, perk: 'SWIFT_TRAVELER' };
      try { if (char.stateData) state = JSON.parse(char.stateData); } catch {}
      const classKey = (char.classId || 'WARRIOR').toUpperCase();
      const Icon = CLASS_ICONS[classKey] || User;
      const palette = CLASS_COLORS[classKey] || DEFAULT_COLOR;
      return { char, state, classKey, Icon, palette };
    });
  }, [characters]);

  const confirmDelete = async () => {
    if (!deleteModalChar) return;
    setIsDeleting(true);
    soundSynth?.playActionSound?.();
    const res = await deleteGameCharacter(deleteModalChar.id);
    if (res.success) {
      toast.success(`${deleteModalChar.name} has been archived.`);
      fetchChars();
    } else {
      toast.error(res.error || 'Failed to delete character.');
    }
    setIsDeleting(false);
    setDeleteModalChar(null);
  };

  const handleEnterWorld = (charId: string) => {
    soundSynth?.playActionSound?.();
    const char = characters.find(c => c.id === charId);
    if (char) {
      setCharacter(charId, char.name);
      setScene('exploring');
    }
  };

  const { theme } = useTheme();
  const isLight = theme === 'light';
  const isVice = theme === 'vice';

  return (
    <div className="pointer-events-auto absolute inset-0 w-full h-full overflow-y-auto z-20 flex flex-col justify-between p-3 sm:p-6 pt-16 pb-14 sm:pt-14 sm:pb-10 select-none font-sans" style={{ backgroundColor: isLight ? '#240046' : isVice ? '#1b121c' : '#050014' }}>
      <MidnightTropicalBackground />

      {/* HEADER */}
      <header className="relative z-30 w-full max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-4 py-2 border-b border-white/10 mb-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={() => { soundSynth?.playSelectSound?.(); setScene('title'); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-xs tracking-wider uppercase transition-all bg-card/60 border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground cursor-pointer shadow-md active:scale-95">
            <ArrowLeft size={13} strokeWidth={2.5} />
            <span className="hidden sm:inline">Gateway</span>
          </button>
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-primary drop-shadow-[0_0_8px_rgba(203,178,106,0.6)]" />
            <h1 className="text-base sm:text-xl font-black tracking-widest uppercase font-mono sg-text-gradient">{heroPlural} Vault</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => { soundSynth?.playSelectSound?.(); setShowOptions(true); }} className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl font-mono font-bold text-xs uppercase bg-card/60 border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground cursor-pointer shadow-md active:scale-95">
            <Settings size={13} className="text-primary" /><span className="hidden sm:inline">Options</span>
          </button>
          <button onClick={() => { soundSynth?.playSelectSound?.(); setShowCredits(true); }} className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl font-mono font-bold text-xs uppercase bg-card/60 border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground cursor-pointer shadow-md active:scale-95">
            <ScrollText size={13} className="text-amber-400" /><span className="hidden sm:inline">Credits</span>
          </button>
          {isModerator && (
            <button onClick={() => { soundSynth?.playSelectSound?.(); setShowAdminWindow(true); }} className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl font-mono font-bold text-xs uppercase transition-all bg-card/60 border border-primary/40 hover:border-primary text-primary hover:text-primary-foreground hover:bg-primary/20 cursor-pointer shadow-md active:scale-95">
              <Shield size={13} className="text-primary" /><span className="hidden sm:inline">Admin</span>
            </button>
          )}
          <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-card/60 border border-border text-foreground text-xs font-mono font-bold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">{mmoPlayerCount > 0 ? `${mmoPlayerCount} Online` : 'Connected'}</span>
          </div>
        </div>
      </header>

      {/* MAIN DECK */}
      <main className="relative z-20 flex-1 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
        
        {/* LEFT SECTION (Cols 1-8) */}
        <section className="lg:col-span-8 flex flex-col space-y-3.5">
          <div className="bg-card/40 p-3 rounded-2xl border border-border/60 backdrop-blur-xl">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-muted-foreground text-xs tracking-wider uppercase font-mono flex items-center gap-2">
                <Layers size={14} className="text-primary" />
                <span>{heroSingular} Roster ({characters.length})</span>
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => { soundSynth?.playActionSound?.(); setScene('character_create'); }} className="text-[11px] font-mono font-bold text-primary hover:text-primary-foreground hover:bg-primary/20 bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/30 transition-all cursor-pointer flex items-center gap-1">
                  <Plus size={12} strokeWidth={2.5} /><span>Forge {heroSingular}</span>
                </button>
                <button onClick={() => { soundSynth?.playSelectSound?.(); fetchChars(); }} className="text-[11px] font-mono text-muted-foreground hover:text-foreground flex items-center gap-1.5 bg-card/40 hover:bg-card/70 px-2.5 py-1 rounded-lg border border-border transition-all cursor-pointer">
                  <RefreshCw size={11} /><span>Refresh</span>
                </button>
              </div>
            </div>

            {characters.length === 0 ? (
              <div onClick={() => { soundSynth?.playActionSound?.(); setScene('character_create'); }} className="p-4 rounded-xl border border-dashed border-primary/40 bg-black/40 text-center cursor-pointer hover:border-primary transition-all">
                <p className="text-xs font-bold font-mono text-primary uppercase">No {heroPlural} Forged Yet</p>
                <p className="text-[10px] font-mono text-muted-foreground mt-0.5">Click to forge your first {heroSingular} and enter the world.</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {parsedCharacters.map(({ char, state, classKey, palette }: any) => {
                  const isSelected = selectedCharId === char.id;
                  return (
                    <div key={char.id} onClick={() => { soundSynth?.playSelectSound?.(); setSelectedCharId(char.id); }} className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer select-none ${isSelected ? 'bg-card/90 border-primary ring-2 ring-primary/40 shadow-[0_0_20px_rgba(203,178,106,0.3)]' : 'bg-black/40 border-white/10 hover:border-white/25 hover:bg-black/60'}`}>
                      <div className="w-7 h-7 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                        <CharacterSpritePreview assetProfileId={char.spriteId || char.assetProfileId || 'adventurer'} size={32} scale={1.1} />
                      </div>
                      <div className="text-left min-w-[60px]">
                        <div className={`text-[11px] font-black font-mono truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>{char.name}</div>
                        <div className="text-[9px] font-mono text-muted-foreground flex items-center gap-1">
                          <span>LVL {state.level || 1}</span><span className="text-slate-500">·</span><span style={{ color: palette.accent }}>{classKey}</span>
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); soundSynth?.playSelectSound?.(); setDeleteModalChar({ id: char.id, name: char.name }); }} className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors ml-0.5"><Trash2 size={11} /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <CharacterDetailPreview
            character={characters.find((c) => c.id === selectedCharId) || characters[0] || null}
            onEnterWorld={handleEnterWorld}
            className="flex-1"
          />
        </section>

        {/* RIGHT SECTION (Cols 9-12) */}
        <LobbySidePanel />
      </main>

      {/* MODALS */}
      {deleteModalChar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-2xl border border-destructive/40 bg-card p-6 shadow-2xl font-mono text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/15 border border-destructive/30 flex items-center justify-center mx-auto mb-3 text-destructive"><AlertTriangle size={24} /></div>
            <h3 className="text-lg font-black text-foreground uppercase tracking-wider mb-2">Archive {heroSingular}?</h3>
            <p className="text-xs text-muted-foreground mb-6 leading-relaxed">Are you sure you want to delete <strong className="text-destructive">{deleteModalChar.name}</strong>? This action cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteModalChar(null)} disabled={isDeleting} className="flex-1 py-2.5 rounded-xl border border-border bg-muted/60 text-muted-foreground hover:text-foreground text-xs font-bold uppercase transition-all cursor-pointer">Cancel</button>
              <button onClick={confirmDelete} disabled={isDeleting} className="flex-1 py-2.5 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer">{isDeleting ? 'Archiving...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
      {showOptions && <GameOptionsMenu isOpen={showOptions} onClose={() => setShowOptions(false)} isFullscreen={false} onToggleFullscreen={() => {}} isAdminUser={false} isCreationMode={false} onToggleDevEditor={() => {}} />}
      {showCredits && <CreditsModal onClose={() => setShowCredits(false)} />}
      {showAdminWindow && <CharacterSelectAdminWindow isOpen={showAdminWindow} onClose={() => setShowAdminWindow(false)} />}
    </div>
  );
}
