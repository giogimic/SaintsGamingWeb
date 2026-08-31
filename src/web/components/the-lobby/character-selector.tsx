'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Gamepad2,
  Plus,
  Trash2,
  Shield,
  Sparkles,
  Zap,
  Wrench,
  User,
  Play,
  Swords,
  Heart,
  Coins,
  ArrowLeft,
  Trophy,
  Crown,
  MessageSquare,
  Send,
  Wifi,
  RefreshCw,
  AlertTriangle,
  Flame,
  Layers,
  Settings,
  ScrollText,
  Award,
  Check,
  Radio,
} from 'lucide-react';
import { deleteGameCharacter, getTopLobbyOperatives } from '@/app/actions/game';
import { toast } from 'sonner';
import { soundSynth } from '@/engine/sound-synth';
import { useGameStore } from './store';
import { useRealtimeStore } from '@/web/hooks/useRealtimeStore';
import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { MidnightTropicalBackground } from './MidnightTropicalBackground';
import { CharacterSpritePreview } from './CharacterSpritePreview';
import GameOptionsMenu from './hud/GameOptionsMenu';

interface CharacterSelectorProps {
  characters: any[];
  onSelect: (characterId: string) => void;
  onCreateNew: () => void;
  onRefresh: () => void;
  /** Studio author session — return without picking a character. */
  onCancel?: () => void;
}

const CLASS_ICONS: Record<string, any> = {
  BRAWLER: Shield,
  INVOKER: Sparkles,
  ARTISAN: Wrench,
  CYBER: Zap,
  SURVIVOR: Shield,
  WARRIOR: Swords,
  MAGE: Sparkles,
  THIEF: Zap,
  RANGER: Zap,
  PRIEST: Heart,
};

const CLASS_COLORS: Record<string, { glow: string; accent: string; label: string; border: string }> = {
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

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  type?: 'GLOBAL' | 'SYSTEM' | 'ANNOUNCE';
}

// ── Credits Modal ─────────────────────────────────────────────────────
function CreditsModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[#050014]/85 backdrop-blur-xl"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-primary/40 p-6 sm:p-8 text-center bg-[#0a0318]/95 shadow-[0_0_60px_rgba(203,178,106,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Award className="w-5 h-5 text-primary" />
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-widest uppercase font-mono">
            Saints Gaming Credits
          </h2>
        </div>
        <p className="text-muted-foreground text-xs tracking-widest uppercase font-mono mb-6">
          A Community For Gamers — EST. 2007
        </p>

        <div className="space-y-3 text-xs sm:text-sm font-mono text-left">
          {[
            { role: 'Game Director & Concept', name: 'GioGimic & Saints Gaming' },
            { role: 'Core Engine & Architecture', name: 'BabylonJS · Next.js 15 · Go MMO' },
            { role: 'Original Creature Art', name: 'Open Source Community Artists' },
            { role: 'World Tilesets', name: 'Saints Studio Contributors' },
            { role: 'Sound Synthesis & FX', name: 'Saints WebAudio Engine' },
          ].map((c) => (
            <div key={c.role} className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-muted-foreground text-xs uppercase tracking-wider">{c.role}</span>
              <span className="text-foreground font-bold">{c.name}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-mono font-bold text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all cursor-pointer"
        >
          Close Credits
        </button>
      </div>
    </div>
  );
}

export function CharacterSelector({
  characters,
  onSelect,
  onCreateNew,
  onRefresh,
  onCancel,
}: CharacterSelectorProps) {
  const { data: session } = useSession();
  const [selectedCharId, setSelectedCharId] = useState<string | null>(() => characters[0]?.id || null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [deleteModalChar, setDeleteModalChar] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const setGameMode = useGameStore((state) => state.setGameMode);

  // Sync selected character if list changes and current selection is missing
  useEffect(() => {
    if (characters.length > 0) {
      if (!selectedCharId || !characters.some((c) => c.id === selectedCharId)) {
        setSelectedCharId(characters[0].id);
      }
    } else {
      setSelectedCharId(null);
    }
  }, [characters, selectedCharId]);

  // Memoize parsed character state data
  const parsedCharacters = useMemo(() => {
    return characters.map((char) => {
      let state: any = { level: 1, hp: 100, maxHp: 100, credits: 1000, perk: 'SWIFT_TRAVELER' };
      try {
        if (char.stateData) state = JSON.parse(char.stateData);
      } catch {}

      const classKey = (char.classId || 'WARRIOR').toUpperCase();
      const Icon = CLASS_ICONS[classKey] || User;
      const palette = CLASS_COLORS[classKey] || DEFAULT_COLOR;
      const charLayers = state?.customization?.layers || state?.appearance?.layers || (char.spriteId ? [char.spriteId] : ['adventurer']);

      return {
        char,
        state,
        classKey,
        Icon,
        palette,
        charLayers,
      };
    });
  }, [characters]);

  // Social & Comms Deck State (Default to CHAT for active Lobby experience)
  const [activeSideTab, setActiveSideTab] = useState<'CHAT' | 'LEADERBOARD'>('CHAT');
  const [topOperatives, setTopOperatives] = useState<any[]>([]);
  const [loadingLeaderboards, setLoadingLeaderboards] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'sys-1',
      sender: 'Saints Gateway',
      text: 'Welcome to the Saints Gaming MMO Vault. Select your Saint and enter the live realm.',
      timestamp: Date.now() - 60000,
      type: 'SYSTEM',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Realtime count
  const mmoPlayerCount = useRealtimeStore((state) => state.mmoPlayerCount);
  const emitSocketEvent = useGameStore((state) => state.emitSocketEvent);

  // Fetch leaderboard data
  const fetchLeaderboards = async () => {
    setLoadingLeaderboards(true);
    try {
      const res = await getTopLobbyOperatives();
      if (res.success && res.data) {
        setTopOperatives(res.data.slice(0, 6));
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingLeaderboards(false);
    }
  };

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  // Listen for incoming global chat events
  useEffect(() => {
    const handleIncoming = (e: CustomEvent<any>) => {
      const msg = e.detail;
      if (!msg?.text) return;
      setChatMessages((prev) => {
        const item: ChatMessage = {
          id: msg.id || `${Date.now()}-${Math.random()}`,
          sender: msg.sender || 'Saint',
          text: msg.text,
          timestamp: msg.timestamp || Date.now(),
          type: msg.type || 'GLOBAL',
        };
        return [...prev, item].slice(-100);
      });
    };

    window.addEventListener('game_chat_msg' as any, handleIncoming as any);
    return () => window.removeEventListener('game_chat_msg' as any, handleIncoming as any);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, activeSideTab]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;

    soundSynth?.playSelectSound?.();
    const senderName = session?.user?.name || (session?.user as any)?.username || 'Player';
    const newMsg: ChatMessage = {
      id: `${Date.now()}-${Math.random()}`,
      sender: senderName,
      text,
      timestamp: Date.now(),
      type: 'GLOBAL',
    };

    setChatMessages((prev) => [...prev, newMsg].slice(-100));
    emitSocketEvent?.('global_chat', text);
    setChatInput('');
  };

  const confirmDelete = async () => {
    if (!deleteModalChar) return;
    setIsDeleting(true);
    soundSynth?.playActionSound?.();
    const res = await deleteGameCharacter(deleteModalChar.id);
    if (res.success) {
      toast.success(`${deleteModalChar.name} has been archived.`);
      if (selectedCharId === deleteModalChar.id) {
        setSelectedCharId(null);
      }
      onRefresh();
    } else {
      toast.error(res.error || 'Failed to delete character.');
    }
    setIsDeleting(false);
    setDeleteModalChar(null);
  };

  const handleBack = () => {
    soundSynth?.playSelectSound?.();
    if (onCancel) {
      onCancel();
    } else {
      setGameMode('TITLE_SCREEN');
    }
  };

  const handleSelectCharacter = (charId: string) => {
    soundSynth?.playSelectSound?.();
    setSelectedCharId(charId);
  };

  const handleEnterWorld = (charId: string) => {
    soundSynth?.playActionSound?.();
    onSelect(charId);
  };

  return (
    <div
      className="pointer-events-auto absolute inset-0 w-full h-full overflow-y-auto z-20 flex flex-col justify-between p-3 sm:p-6 pt-16 pb-14 sm:pt-14 sm:pb-10 select-none font-sans bg-[#050b14]"
    >
      {/* Dynamic Horizon Background */}
      <MidnightTropicalBackground />

      {/* ── TOP HEADER BAR ── */}
      <header className="relative z-30 w-full max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-4 py-2 border-b border-white/10 mb-4">
        {/* Left: Back button & Title */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-xs tracking-wider uppercase transition-all bg-card/60 border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground cursor-pointer shadow-md active:scale-95"
          >
            <ArrowLeft size={13} strokeWidth={2.5} />
            <span className="hidden sm:inline">Gateway</span>
            <span className="sm:hidden">Back</span>
          </button>

          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-primary drop-shadow-[0_0_8px_rgba(203,178,106,0.6)]" />
            <h1 className="text-base sm:text-xl font-black tracking-widest uppercase font-mono sg-text-gradient">
              Saints Vault
            </h1>
          </div>
        </div>

        {/* Right: Options, Credits & Live Presence */}
        <div className="flex items-center gap-2">
          {/* Options Button */}
          <button
            onClick={() => {
              soundSynth?.playSelectSound?.();
              setShowOptions(true);
            }}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl font-mono font-bold text-xs uppercase transition-all bg-card/60 border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground cursor-pointer shadow-md active:scale-95"
            title="Game Options"
          >
            <Settings size={13} className="text-primary" />
            <span className="hidden sm:inline">Options</span>
          </button>

          {/* Credits Button */}
          <button
            onClick={() => {
              soundSynth?.playSelectSound?.();
              setShowCredits(true);
            }}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl font-mono font-bold text-xs uppercase transition-all bg-card/60 border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground cursor-pointer shadow-md active:scale-95"
            title="Credits & Attribution"
          >
            <ScrollText size={13} className="text-amber-400" />
            <span className="hidden sm:inline">Credits</span>
          </button>

          {/* Server Online Badge */}
          <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-card/60 border border-border text-foreground text-xs font-mono font-bold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">{mmoPlayerCount > 0 ? `${mmoPlayerCount} Online` : 'Connected'}</span>
          </div>
        </div>
      </header>

      {/* ── MAIN 2-COLUMN COMMAND DECK ── */}
      <main className="relative z-20 flex-1 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
        
        {/* ── LEFT SECTION: HEROES ROSTER (Cols 1-8) ── */}
        <section className="lg:col-span-8 flex flex-col justify-between">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-muted-foreground text-xs tracking-wider uppercase font-mono flex items-center gap-2">
              <Layers size={14} className="text-primary" />
              <span>Select Your Saint ({characters.length})</span>
            </p>
            <button
              onClick={() => {
                soundSynth?.playSelectSound?.();
                onRefresh();
              }}
              className="text-[11px] font-mono text-muted-foreground hover:text-foreground flex items-center gap-1.5 bg-card/40 hover:bg-card/70 px-2.5 py-1 rounded-lg border border-border transition-all cursor-pointer"
            >
              <RefreshCw size={11} />
              Refresh
            </button>
          </div>

          {/* Grid of Characters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 auto-rows-fr">
            {parsedCharacters.map(({ char, state, classKey, Icon, palette, charLayers }: any) => {
              const isSelected = selectedCharId === char.id;
              const isHovered = hoveredId === char.id;

              return (
                <div
                  key={char.id}
                  onClick={() => handleSelectCharacter(char.id)}
                  onMouseEnter={() => setHoveredId(char.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`relative cursor-pointer transition-all duration-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between border ${
                    isSelected
                      ? 'bg-card/90 border-primary ring-2 ring-primary/50 shadow-[0_0_30px_rgba(203,178,106,0.35)] scale-[1.01]'
                      : 'bg-card/40 border-border/60 hover:bg-card/70 hover:border-border shadow-md'
                  }`}
                >
                  <div>
                    {/* Top Bar: Class Badge + Selection Indicator */}
                    <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2.5">
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-4 h-4" style={{ color: palette.accent }} />
                        <span className="text-[11px] font-black uppercase tracking-widest font-mono text-foreground">
                          {char.classId || 'WARRIOR'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isSelected && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 border border-primary/40 text-primary text-[10px] font-bold font-mono">
                            <Check size={10} strokeWidth={3} /> ACTIVE
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-muted/60 border border-border text-foreground text-[11px] font-mono font-extrabold">
                          LVL {state.level || 1}
                        </span>
                      </div>
                    </div>

                    {/* Character Avatar & Stats */}
                    <div className="flex items-center gap-3.5 mb-3">
                      <div
                        className={`w-18 h-18 rounded-xl flex items-center justify-center overflow-hidden shrink-0 bg-black/60 border transition-all ${
                          isSelected ? 'border-primary/60 shadow-[0_0_15px_rgba(203,178,106,0.4)]' : 'border-white/10'
                        }`}
                      >
                        <CharacterSpritePreview
                          layers={charLayers}
                          assetProfileId={char.spriteId || 'adventurer'}
                          size={32}
                          scale={1.9}
                          className="transition-transform group-hover:scale-110 duration-200"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className={`text-base sm:text-lg font-black font-mono truncate transition-colors ${
                          isSelected ? 'text-primary' : 'text-foreground'
                        }`}>
                          {char.name}
                        </h3>
                        <div className="flex flex-col gap-1 mt-1 text-[11px] font-mono text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Heart className="w-3 h-3 text-rose-400" />
                            <span>HP: <strong className="text-foreground">{state.hp || 100}/{state.maxHp || 100}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Coins className="w-3 h-3 text-amber-400" />
                            <span>Pouch: <strong className="text-amber-300">{(state.credits || 1000).toLocaleString()} C</strong></span>
                          </div>
                          {state.perk && (
                            <div className="flex items-center gap-1.5 text-[10px] text-cyan-300">
                              <Zap className="w-3 h-3 text-cyan-400" />
                              <span>{state.perk.replace(/_/g, ' ')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Row Under Character */}
                  <div className="pt-3 border-t border-white/10 flex items-center gap-2">
                    {isSelected ? (
                      /* ENTER WORLD (Active on Selected Character) */
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEnterWorld(char.id);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-mono font-bold text-xs sm:text-sm uppercase tracking-wider transition-all bg-primary hover:brightness-110 text-primary-foreground shadow-[0_0_20px_rgba(203,178,106,0.4)] active:scale-95 cursor-pointer"
                      >
                        <Play size={14} fill="currentColor" />
                        ENTER WORLD
                      </button>
                    ) : (
                      /* Select Button */
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectCharacter(char.id);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-mono font-bold text-xs uppercase tracking-wider transition-all bg-card/60 hover:bg-card border border-border text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Select Saint
                      </button>
                    )}

                    {/* Delete character button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        soundSynth?.playSelectSound?.();
                        setDeleteModalChar({ id: char.id, name: char.name });
                      }}
                      className="p-2.5 rounded-xl bg-destructive/10 hover:bg-destructive/25 text-destructive border border-destructive/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                      title="Archive Saint"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Create New Saint Card */}
            <div
              onClick={() => {
                soundSynth?.playActionSound?.();
                onCreateNew();
              }}
              className="cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[200px] rounded-2xl border border-dashed border-primary/40 hover:border-primary bg-card/30 hover:bg-card/60 group p-6 text-center"
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-primary/10 border border-primary/30 group-hover:scale-110 transition-transform shadow-inner mb-2.5">
                <Plus className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" strokeWidth={2.5} />
              </div>
              <p className="text-sm font-black text-primary uppercase tracking-widest font-mono">
                FORGE NEW SAINT
              </p>
              <p className="text-[11px] text-muted-foreground font-mono mt-1">
                Create new character & customize skills
              </p>
            </div>
          </div>
        </section>

        {/* ── RIGHT SECTION: LOBBY CHAT & HALL OF CHAMPIONS (Cols 9-12) ── */}
        <section
          className="lg:col-span-4 flex flex-col justify-between rounded-2xl border border-border/60 p-4 bg-card/60 backdrop-blur-xl shadow-xl relative overflow-hidden"
        >
          {/* Side Tabs Header */}
          <div className="flex items-center gap-2 border-b border-white/10 pb-3 mb-3">
            <button
              onClick={() => {
                soundSynth?.playSelectSound?.();
                setActiveSideTab('CHAT');
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeSideTab === 'CHAT'
                  ? 'bg-primary/20 text-primary border border-primary/40 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground bg-card/30 border border-transparent'
              }`}
            >
              <MessageSquare size={13} className="text-primary" />
              Lobby Chat
            </button>

            <button
              onClick={() => {
                soundSynth?.playSelectSound?.();
                setActiveSideTab('LEADERBOARD');
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeSideTab === 'LEADERBOARD'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground bg-card/30 border border-transparent'
              }`}
            >
              <Trophy size={13} className="text-amber-400" />
              Champions
            </button>
          </div>

          {/* TAB 1: LOBBY CHAT CONTENT (DEFAULT) */}
          {activeSideTab === 'CHAT' && (
            <div className="flex-1 flex flex-col justify-between min-h-[300px]">
              {/* Message History List */}
              <div
                ref={chatScrollRef}
                className="space-y-2.5 overflow-y-auto max-h-[320px] pr-1 mb-3 scrollbar-thin font-mono text-xs"
              >
                {chatMessages.map((msg) => {
                  const isSys = msg.type === 'SYSTEM';
                  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div
                      key={msg.id}
                      className={`p-2.5 rounded-xl border leading-relaxed ${
                        isSys
                          ? 'bg-primary/10 border-primary/20 text-primary text-[11px]'
                          : 'bg-black/50 border-white/5 text-foreground'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1 text-[10px] text-muted-foreground">
                        <span className="font-bold text-primary">
                          {msg.sender}
                        </span>
                        <span>{time}</span>
                      </div>
                      <p className="text-xs break-words">{msg.text}</p>
                    </div>
                  );
                })}
              </div>

              {/* Chat Input Box */}
              <form onSubmit={handleSendChat} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Chat with lobby players..."
                  maxLength={160}
                  className="flex-1 px-3 py-2 rounded-xl bg-black/60 border border-border text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="px-3.5 py-2 rounded-xl bg-primary hover:brightness-110 text-primary-foreground font-mono font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center shadow-sm"
                >
                  <Send size={13} />
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: LEADERBOARD CONTENT */}
          {activeSideTab === 'LEADERBOARD' && (
            <div className="flex-1 flex flex-col justify-between min-h-[300px]">
              <div className="space-y-2 overflow-y-auto max-h-[340px] pr-1">
                {loadingLeaderboards ? (
                  <div className="text-center py-10 text-xs font-mono text-muted-foreground animate-pulse">
                    Scanning realm rankings...
                  </div>
                ) : topOperatives.length === 0 ? (
                  <div className="text-center py-10 text-xs font-mono text-muted-foreground">
                    No champion rankings recorded yet.
                  </div>
                ) : (
                  topOperatives.map((op, idx) => {
                    let st: any = { level: 1, credits: 1000 };
                    try {
                      if (op.stateData) st = JSON.parse(op.stateData);
                    } catch {}
                    const isTop = idx === 0;

                    return (
                      <div
                        key={op.id || idx}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                          isTop
                            ? 'bg-amber-500/10 border-amber-400/40 shadow-sm'
                            : 'bg-black/40 border-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-black ${
                              isTop
                                ? 'bg-amber-500 text-white font-extrabold'
                                : idx === 1
                                ? 'bg-slate-500 text-white'
                                : idx === 2
                                ? 'bg-amber-700 text-white'
                                : 'bg-white/10 text-muted-foreground'
                            }`}
                          >
                            {isTop ? <Crown size={12} /> : idx + 1}
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-bold font-mono text-foreground truncate">
                              {op.name}
                            </div>
                            <div className="text-[10px] font-mono text-primary">
                              {op.classId || 'WARRIOR'}
                            </div>
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <div className="text-xs font-black text-amber-300">
                            LVL {st.level || op.level || 1}
                          </div>
                          <div className="text-[9px] text-muted-foreground">
                            {(st.credits || 1000).toLocaleString()} C
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-3 bg-black/40 rounded-xl border border-white/5 mt-3 text-center">
                <p className="text-[10px] font-mono text-muted-foreground">
                  Earn EXP & Credits in battle to rank up on the Champions Leaderboard.
                </p>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* ── MODALS ── */}
      {/* Delete Confirmation Modal */}
      {deleteModalChar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-2xl border border-destructive/40 bg-card p-6 shadow-2xl font-mono text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/15 border border-destructive/30 flex items-center justify-center mx-auto mb-3 text-destructive">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-black text-foreground uppercase tracking-wider mb-2">
              Archive Saint?
            </h3>
            <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
              Are you sure you want to delete <strong className="text-destructive">{deleteModalChar.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteModalChar(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-border bg-muted/60 text-muted-foreground hover:text-foreground text-xs font-bold uppercase transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                {isDeleting ? 'Archiving...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Options Modal */}
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

      {/* Credits Modal */}
      {showCredits && (
        <CreditsModal onClose={() => setShowCredits(false)} />
      )}
    </div>
  );
}
