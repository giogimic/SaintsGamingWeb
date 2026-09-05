'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useGameStore } from './store';
import { useAppStore } from "@/shared/store/useAppStore";
import { getUserCharacters, getTopLobbyOperatives } from '@/app/actions/game';
import { soundSynth } from '@/engine/sound-synth';
import { useTheme } from 'next-themes';
import GameOptionsMenu from './hud/GameOptionsMenu';
import { MidnightTropicalBackground } from './MidnightTropicalBackground';
import {
  Play,
  Volume2,
  VolumeX,
  Settings,
  ScrollText,
  LogOut,
  Trophy,
  Crown,
  Shield,
  Sparkles,
  Zap,
  Swords,
  User,
  Plus,
  ChevronLeft,
  ChevronRight,
  Send,
  Globe,
  Wifi,
  RefreshCw,
  MessageSquare,
  Gamepad2,
  Heart,
  Coins,
  Radio,
  Server,
  Flame,
  Award,
  Layers,
} from 'lucide-react';
import { canUseStudioServerControls } from '@/shared/game/studioPermissions';
import { CharacterSpritePreview } from './CharacterSpritePreview';
import { CharacterDetailPreview } from './CharacterDetailPreview';

// ── Theme Palettes (matching Saints Dynamic Landing Page) ─────
const THEME_DARK = {
  bg: '#050014',
  textColor: '#ffffff',
  accentColor: '#00f5d4',
  btnBg: 'rgba(114, 9, 183, 0.25)',
  btnBorder: '#00f5d4',
  btnGlow: '#7209b7',
  btn2Border: '#4cc9f0',
  btn2Text: '#4cc9f0',
  logoGlow: 'rgba(0, 245, 212, 0.6)',
  panelBg: 'rgba(5, 0, 20, 0.88)',
  panelBorder: 'rgba(0, 245, 212, 0.35)',
  panelGlow: 'rgba(114, 9, 183, 0.25)',
};

const THEME_LIGHT = {
  bg: '#240046',
  textColor: '#ffffff',
  accentColor: '#f9c74f',
  btnBg: 'rgba(247, 37, 133, 0.2)',
  btnBorder: '#f9c74f',
  btnGlow: '#f8961e',
  btn2Border: '#f72585',
  btn2Text: '#f72585',
  logoGlow: 'rgba(248, 150, 30, 0.6)',
  panelBg: 'rgba(36, 0, 70, 0.88)',
  panelBorder: 'rgba(249, 199, 79, 0.4)',
  panelGlow: 'rgba(248, 150, 30, 0.25)',
};

const THEME_VICE = {
  bg: '#1b121c',
  textColor: '#ffffff',
  accentColor: '#ffc15e',
  btnBg: 'rgba(250, 142, 91, 0.25)',
  btnBorder: '#ff007f',
  btnGlow: '#fa8e5b',
  btn2Border: '#00f5d4',
  btn2Text: '#00f5d4',
  logoGlow: 'rgba(255, 0, 127, 0.6)',
  panelBg: 'rgba(27, 18, 28, 0.88)',
  panelBorder: 'rgba(255, 0, 127, 0.4)',
  panelGlow: 'rgba(250, 142, 91, 0.25)',
};

const CLASS_ICONS: Record<string, any> = {
  WARRIOR: Swords,
  MAGE: Sparkles,
  THIEF: Zap,
  RANGER: Zap,
  PRIEST: Heart,
  INVOKER: Sparkles,
  ARTISAN: Sparkles,
  BRAWLER: Shield,
  SURVIVOR: Shield,
  CYBER: Zap,
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

const DEFAULT_CLASS_PALETTE = {
  glow: 'rgba(242,0,137,0.4)',
  accent: '#f20089',
  label: '#f472b6',
  border: 'rgba(242,0,137,0.5)',
};

interface ChatItem {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  type: 'GLOBAL' | 'SYSTEM' | 'ANNOUNCE';
  badge?: string;
}

interface GameTitleScreenProps {
  characters?: any[];
  activeCharacterId?: string | null;
  onSelectCharacter?: (id: string) => void;
  onCreateCharacter?: () => void;
  onOpenCharacterSelect?: () => void;
  onOpenServerSelect?: () => void;
  onRefreshCharacters?: () => void;
}



// ── Credits Modal ─────────────────────────────────────────────────────
function CreditsModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[300] flex items-center justify-center p-4"
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

export default function GameTitleScreen({
  characters: initialCharacters,
  activeCharacterId: initialActiveId,
  onSelectCharacter,
  onCreateCharacter,
  onOpenCharacterSelect,
  onOpenServerSelect,
  onRefreshCharacters,
}: GameTitleScreenProps) {
  const { data: session, status } = useSession();
  const setGameMode = useGameStore((state) => state.setGameMode);
  const emitSocketEvent = useGameStore((state) => state.emitSocketEvent);
  const mmoPlayerCount = useAppStore((s) => s.mmoPlayerCount);

  const [characters, setCharacters] = useState<any[]>(initialCharacters || []);
  const [activeIdx, setActiveIdx] = useState(0);
  const [topOperatives, setTopOperatives] = useState<any[]>([]);
  const [loadingLeaderboards, setLoadingLeaderboards] = useState(true);
  const [showCredits, setShowCredits] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isStartingServer, setIsStartingServer] = useState(false);
  const [serverStatus, setServerStatus] = useState<{ status: string; players: number; capacity: number }>({
    status: 'online',
    players: 0,
    capacity: 500,
  });

  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Initial Pre-Game Lobby Chat messages
  const [chatMessages, setChatMessages] = useState<ChatItem[]>([
    {
      id: 'sys-1',
      sender: 'SYSTEM',
      text: 'Welcome to the Saints Online Realm Gateway. Shards synchronized.',
      timestamp: Date.now() - 45000,
      type: 'SYSTEM',
      badge: 'REALM',
    },
    {
      id: 'sys-2',
      sender: 'SaintsBot',
      text: 'Global server event active: +50% XP boost across all 27 mastery skills!',
      timestamp: Date.now() - 25000,
      type: 'ANNOUNCE',
      badge: 'EVENT',
    },
    {
      id: 'msg-1',
      sender: 'NovaStrike',
      text: 'Anyone heading to the Frost Caverns shard?',
      timestamp: Date.now() - 12000,
      type: 'GLOBAL',
      badge: 'VIP',
    },
  ]);

  // Listen for incoming global/lobby chat messages from other players via socket bridge
  useEffect(() => {
    const handleIncoming = (e: CustomEvent) => {
      const msg = e.detail;
      if (!msg || !msg.text) return;

      setChatMessages((prev) => {
        // Deduplicate: avoid appending own optimistic messages twice (sender-agnostic text + timestamp window)
        const isDuplicate = prev.some(
          (m) =>
            m.text === msg.text &&
            Math.abs((m.timestamp || 0) - (msg.timestamp || 0)) < 3000
        );
        if (isDuplicate) return prev;

        const incomingItem: ChatItem = {
          id: msg.id || `${Date.now()}-${Math.random()}`,
          sender: msg.sender || 'Operative',
          text: msg.text,
          timestamp: msg.timestamp || Date.now(),
          type: msg.type || 'GLOBAL',
          badge: msg.badge,
        };
        return [...prev, incomingItem].slice(-100);
      });
    };

    window.addEventListener('game_chat_msg' as any, handleIncoming as any);
    return () => window.removeEventListener('game_chat_msg' as any, handleIncoming as any);
  }, []);

  // Load characters if not passed as prop
  useEffect(() => {
    if (initialCharacters && initialCharacters.length > 0) {
      setCharacters(initialCharacters);
      if (initialActiveId) {
        const found = initialCharacters.findIndex((c) => c.id === initialActiveId);
        if (found >= 0) setActiveIdx(found);
      }
    } else if (status === 'authenticated') {
      getUserCharacters().then((res) => {
        if (res.success && res.data) {
          setCharacters(res.data);
        }
      });
    }
  }, [initialCharacters, initialActiveId, status]);

  // Load Leaderboard top operatives
  const fetchLeaderboards = async () => {
    setLoadingLeaderboards(true);
    try {
      const res = await getTopLobbyOperatives();
      if (res.success && res.data) {
        setTopOperatives(res.data.slice(0, 5));
      }
    } catch {
      // Ignore
    } finally {
      setLoadingLeaderboards(false);
    }
  };

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const [setupStatus, setSetupStatus] = useState<any>(null);

  // Fetch Server & Setup status
  const fetchServerStatus = async () => {
    try {
      const [statusRes, setupRes] = await Promise.all([
        fetch('/api/game/server-status').catch(() => null),
        fetch('/api/setup/status').catch(() => null),
      ]);

      if (statusRes?.ok) {
        const data = await statusRes.json();
        setServerStatus({
          status: data.status || 'online',
          players: typeof data.players === 'number' ? data.players : mmoPlayerCount || 0,
          capacity: data.capacity || 500,
        });
      }

      if (setupRes?.ok) {
        const setupData = await setupRes.json();
        setSetupStatus(setupData.status);
      }
    } catch {
      // Keep default
    }
  };

  useEffect(() => {
    fetchServerStatus();
    const interval = setInterval(fetchServerStatus, 5000);
    return () => clearInterval(interval);
  }, [mmoPlayerCount]);

  // Sync with realtime mmo count
  useEffect(() => {
    if (mmoPlayerCount > 0) {
      setServerStatus((prev) => ({ ...prev, players: mmoPlayerCount, status: 'online' }));
    }
  }, [mmoPlayerCount]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const activeChar = characters[activeIdx] || null;

  let activeCharState: any = { level: 1, hp: 100, maxHp: 100, credits: 1000, perk: 'SWIFT_TRAVELER' };
  if (activeChar?.stateData) {
    try {
      activeCharState = JSON.parse(activeChar.stateData);
    } catch {}
  }

  const classKey = (activeChar?.classId || 'WARRIOR').toUpperCase();
  const ClassIcon = CLASS_ICONS[classKey] || Swords;
  const palette = CLASS_COLORS[classKey] || DEFAULT_CLASS_PALETTE;
  const isCustomSprite = activeChar?.spriteId && (activeChar.spriteId.startsWith('/') || activeChar.spriteId.startsWith('http'));

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
      setGameMode('LOGIN');
      return;
    }

    if (setupStatus && !setupStatus.isSetupCompleted && canStartRealm) {
      window.location.href = '/setup';
      return;
    }

    if (onOpenServerSelect) {
      onOpenServerSelect();
    } else {
      setGameMode('SERVER_SELECT');
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;

    soundSynth?.playUiClick?.();

    const senderName = session?.user?.name || (session?.user as any)?.username || 'Operative';
    const newMsg: ChatItem = {
      id: Date.now().toString(),
      sender: senderName,
      text,
      timestamp: Date.now(),
      type: 'GLOBAL',
      badge: (session?.user as any)?.isFounder ? 'FOUNDER' : (session?.user as any)?.isVIP ? 'VIP' : undefined,
    };

    setChatMessages((prev) => [...prev, newMsg].slice(-100));
    emitSocketEvent?.('global_chat', text);
    setChatInput('');
  };

  const canStartRealm =
    status === 'authenticated' &&
    canUseStudioServerControls(session?.user?.permissionLevel);

  const handleStartDevServer = async () => {
    soundSynth?.playActionSound?.();
    setIsStartingServer(true);
    try {
      await fetch('/api/game/server-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
      await fetchServerStatus();
    } catch {
      // Ignore
    } finally {
      setIsStartingServer(false);
    }
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
      {/* Dynamic Horizon Background */}
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
                  if (onOpenCharacterSelect) {
                    onOpenCharacterSelect();
                  } else {
                    setGameMode('CHARACTER_SELECT');
                  }
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
                  if (onCreateCharacter) {
                    onCreateCharacter();
                  } else {
                    setGameMode('CHARACTER_CREATOR');
                  }
                }}
                className="py-1.5 px-2.5 rounded-lg bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary hover:text-primary-foreground flex items-center gap-1 text-[11px] font-mono font-bold uppercase transition-all cursor-pointer"
              >
                <Plus size={12} strokeWidth={2.5} />
                <span>Forge</span>
              </button>
            </div>
          </div>

          {/* 3-Column Character Detail Preview (Left: Inventory/Equipment, Center: Sprite, Right: Skills) */}
          <CharacterDetailPreview
            character={activeChar}
            onEnterWorld={handleStartGame}
            className="flex-1"
          />
        </section>

        {/* ── RIGHT SECTION: LOBBY CHAT & CHAMPIONS LEADERBOARD (Cols 9-12) ── */}
        <section className="lg:col-span-4 flex flex-col justify-between rounded-2xl border border-border/60 p-4 bg-card/60 backdrop-blur-xl shadow-xl relative overflow-hidden">
          {/* Header with Server presence */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare size={14} className="text-primary" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
                Lobby Comms
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/60 border border-white/10 text-[10px] font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{serverStatus.players > 0 ? `${serverStatus.players} Online` : 'Connected'}</span>
            </div>
          </div>

          {/* Message History */}
          <div
            ref={chatScrollRef}
            className="space-y-2.5 overflow-y-auto max-h-[340px] pr-1 mb-3 scrollbar-thin font-mono text-xs flex-1"
          >
            {chatMessages.map((msg) => {
              const isSys = msg.type === 'SYSTEM';
              const isAnn = msg.type === 'ANNOUNCE';
              const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={msg.id}
                  className={`p-2.5 rounded-xl border leading-relaxed ${
                    isSys
                      ? 'bg-primary/10 border-primary/20 text-primary text-[11px]'
                      : isAnn
                      ? 'bg-amber-500/10 border-amber-400/20 text-amber-300 text-[11px]'
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

          {/* Chat Input */}
          <form onSubmit={handleSendChat} className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Broadcast to lobby players..."
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
        </section>

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
