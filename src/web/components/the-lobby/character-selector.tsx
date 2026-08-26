'use client';

import React, { useState, useEffect, useRef } from 'react';
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

const DEFAULT_COLOR = { glow: 'rgba(242,0,137,0.35)', accent: '#f20089', label: '#f472b6', border: 'rgba(242,0,137,0.5)' };

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  type?: 'GLOBAL' | 'SYSTEM' | 'ANNOUNCE';
}

export function CharacterSelector({
  characters,
  onSelect,
  onCreateNew,
  onRefresh,
  onCancel,
}: CharacterSelectorProps) {
  const { data: session } = useSession();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [deleteModalChar, setDeleteModalChar] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const setGameMode = useGameStore((state) => state.setGameMode);

  // Social & Comms Deck State
  const [activeSideTab, setActiveSideTab] = useState<'LEADERBOARD' | 'CHAT'>('LEADERBOARD');
  const [topOperatives, setTopOperatives] = useState<any[]>([]);
  const [loadingLeaderboards, setLoadingLeaderboards] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'sys-1',
      sender: 'Saints Gateway',
      text: 'Welcome to the Saints Gaming MMO Vault. Select a Saint to enter the live world.',
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
          sender: msg.sender || 'Operative',
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
    const senderName = session?.user?.name || 'Operative';
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

  const { theme } = useTheme();
  const isLight = theme === 'light';
  const isVice = theme === 'vice' || theme === 'hacker';

  return (
    <div
      className="pointer-events-auto fixed inset-0 w-full h-full overflow-y-auto z-[100] flex flex-col justify-between p-3 sm:p-6 select-none font-sans"
      style={{ backgroundColor: isLight ? '#240046' : isVice ? '#1b121c' : '#050014' }}
    >
      {/* Dynamic Horizon Background */}
      <MidnightTropicalBackground />

      {/* ── TOP HEADER BAR ── */}
      <header className="relative z-30 w-full max-w-7xl mx-auto flex items-center justify-between gap-4 py-2 border-b border-pink-500/20 mb-4">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono font-bold text-xs tracking-wider uppercase transition-all bg-black/80 border border-pink-500/40 text-pink-300 hover:text-white hover:border-[#00f5d4] hover:bg-pink-950/50 cursor-pointer shadow-lg active:scale-95"
        >
          <ArrowLeft size={14} strokeWidth={2.5} />
          <span className="hidden sm:inline">Back to Gateway</span>
          <span className="sm:hidden">Back</span>
        </button>

        {/* Center Title */}
        <div className="flex items-center gap-3">
          <Gamepad2 className="w-5 h-5 text-[#00f5d4] drop-shadow-[0_0_8px_rgba(0,245,212,0.8)]" />
          <h1
            className="text-xl sm:text-2xl font-black tracking-widest uppercase font-mono"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #ffbe0b 50%, #f20089 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 15px rgba(242,0,137,0.5))',
            }}
          >
            SAINTS VAULT
          </h1>
        </div>

        {/* Server Presence Badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-cyan-950/80 border border-cyan-400/40 text-[#00f5d4] text-xs font-mono font-extrabold shadow-[0_0_10px_rgba(0,245,212,0.2)]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{mmoPlayerCount > 0 ? `${mmoPlayerCount} Online` : 'Connected'}</span>
        </div>
      </header>

      {/* ── MAIN 2-COLUMN COMMAND DECK ── */}
      <main className="relative z-20 flex-1 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* ── LEFT SECTION: HEROES ROSTER (Cols 1-8) ── */}
        <section className="lg:col-span-8 flex flex-col justify-between">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-cyan-200/80 text-xs tracking-[0.2em] uppercase font-mono flex items-center gap-2">
              <Layers size={14} className="text-[#00f5d4]" />
              Select Active Saint ({characters.length})
            </p>
            <button
              onClick={() => {
                soundSynth?.playSelectSound?.();
                onRefresh();
              }}
              className="text-[11px] font-mono text-pink-300 hover:text-white flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-pink-500/30 transition-all cursor-pointer"
            >
              <RefreshCw size={11} />
              Refresh
            </button>
          </div>

          {/* Grid of Characters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 auto-rows-fr">
            {characters.map((char) => {
              let state: any = { level: 1, hp: 100, maxHp: 100, credits: 1000, perk: 'SWIFT_TRAVELER' };
              try {
                if (char.stateData) state = JSON.parse(char.stateData);
              } catch {}

              const classKey = (char.classId || 'WARRIOR').toUpperCase();
              const Icon = CLASS_ICONS[classKey] || User;
              const palette = CLASS_COLORS[classKey] || DEFAULT_COLOR;
              const isHovered = hoveredId === char.id;

              const charLayers = state?.customization?.layers || state?.appearance?.layers || (char.spriteId ? [char.spriteId] : ['adventurer']);

              return (
                <div
                  key={char.id}
                  onClick={() => {
                    soundSynth?.playActionSound?.();
                    onSelect(char.id);
                  }}
                  onMouseEnter={() => {
                    soundSynth?.playSelectSound?.();
                    setHoveredId(char.id);
                  }}
                  onMouseLeave={() => setHoveredId(null)}
                  className="relative cursor-pointer transition-all duration-200 overflow-hidden group rounded-2xl p-[1px]"
                  style={{
                    clipPath: 'polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px)',
                    background: isHovered
                      ? `linear-gradient(135deg, ${palette.accent} 0%, rgba(242,0,137,0.6) 100%)`
                      : 'linear-gradient(135deg, rgba(242,0,137,0.4) 0%, rgba(13,2,33,0.9) 100%)',
                    boxShadow: isHovered
                      ? `0 0 30px ${palette.glow}, 0 10px 30px rgba(0,0,0,0.7)`
                      : '0 4px 20px rgba(0,0,0,0.5)',
                    transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
                  }}
                >
                  <div
                    className="w-full h-full bg-[#0a0318]/95 p-4 sm:p-5 flex flex-col justify-between"
                    style={{
                      clipPath: 'polygon(13px 0%, 100% 0%, 100% calc(100% - 13px), calc(100% - 13px) 100%, 0% 100%, 0% 13px)',
                    }}
                  >
                    {/* Top Bar: Class Badge + Level */}
                    <div className="flex items-center justify-between mb-3 border-b border-pink-500/20 pb-2.5">
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-4 h-4" style={{ color: palette.accent }} />
                        <span className="text-[10px] font-black uppercase tracking-widest font-mono text-cyan-200">
                          {char.classId || 'WARRIOR'}
                        </span>
                      </div>
                      <div className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-400/40 text-[#00f5d4] text-[11px] font-mono font-extrabold shadow-[0_0_8px_rgba(0,245,212,0.3)]">
                        LVL {state.level || 1}
                      </div>
                    </div>

                    {/* Character Avatar & Pedestal */}
                    <div className="flex items-center gap-4 mb-3">
                      <div
                        className="w-18 h-18 rounded-xl flex items-center justify-center overflow-hidden shrink-0 bg-black/70 border border-pink-500/30 relative shadow-inner"
                        style={{
                          boxShadow: isHovered ? `0 0 20px ${palette.glow}` : 'inset 0 0 12px rgba(0,0,0,0.8)',
                        }}
                      >
                        <CharacterSpritePreview
                          layers={charLayers}
                          assetProfileId={char.spriteId || 'adventurer'}
                          size={32}
                          scale={1.8}
                          className="transition-transform group-hover:scale-110 duration-200 drop-shadow-[0_0_10px_rgba(242,0,137,0.6)]"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-black font-mono text-white truncate group-hover:text-[#00f5d4] transition-colors">
                          {char.name}
                        </h3>
                        <div className="flex flex-col gap-1 mt-1 text-[11px] font-mono text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <Heart className="w-3 h-3 text-rose-400" />
                            <span>HP: <strong className="text-white">{state.hp || 100}/{state.maxHp || 100}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Coins className="w-3 h-3 text-amber-400" />
                            <span>Pouch: <strong className="text-amber-300">{(state.credits || 1000).toLocaleString()} C</strong></span>
                          </div>
                          {state.perk && (
                            <div className="flex items-center gap-1.5 text-[10px] text-purple-300">
                              <Zap className="w-3 h-3 text-purple-400" />
                              <span>{state.perk.replace(/_/g, ' ')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Row */}
                    <div className="flex items-center justify-between pt-3 border-t border-pink-500/20 gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          soundSynth?.playActionSound?.();
                          onSelect(char.id);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-mono font-bold text-xs uppercase tracking-wider transition-all bg-gradient-to-r from-pink-600 to-cyan-600 hover:from-pink-500 hover:to-cyan-500 text-white shadow-[0_0_15px_rgba(242,0,137,0.4)] active:scale-95 cursor-pointer"
                      >
                        <Play size={12} fill="currentColor" />
                        ENTER REALM
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          soundSynth?.playSelectSound?.();
                          setDeleteModalChar({ id: char.id, name: char.name });
                        }}
                        className="p-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                        title="Delete Saint"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
              className="cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[190px] rounded-2xl p-[1px] group"
              style={{
                clipPath: 'polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px)',
                background: 'linear-gradient(135deg, rgba(0,245,212,0.4) 0%, rgba(242,0,137,0.3) 100%)',
              }}
            >
              <div
                className="w-full h-full bg-[#0a0318]/85 p-6 flex flex-col items-center justify-center text-center group-hover:bg-[#12052a]/90 transition-colors"
                style={{
                  clipPath: 'polygon(13px 0%, 100% 0%, 100% calc(100% - 13px), calc(100% - 13px) 100%, 0% 100%, 0% 13px)',
                }}
              >
                <div className="w-13 h-13 rounded-2xl flex items-center justify-center bg-pink-950/60 border border-pink-500/50 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(242,0,137,0.3)] mb-2">
                  <Plus className="w-6 h-6 text-[#00f5d4] group-hover:text-white transition-colors" strokeWidth={2.5} />
                </div>
                <p className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-[#ffbe0b] to-[#00f5d4] uppercase tracking-widest font-mono">
                  FORGE NEW SAINT
                </p>
                <p className="text-[10px] text-slate-300 font-mono mt-1">Create Saint & customize skills</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── RIGHT SECTION: LIVE COMMS & HALL OF CHAMPIONS (Cols 9-12) ── */}
        <section
          className="lg:col-span-4 flex flex-col justify-between rounded-2xl border p-4 bg-[#0a031a]/90 backdrop-blur-xl shadow-2xl relative overflow-hidden"
          style={{
            borderColor: 'rgba(242,0,137,0.35)',
            boxShadow: '0 0 30px rgba(242,0,137,0.15), inset 0 0 20px rgba(0,0,0,0.8)',
            clipPath: 'polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px)',
          }}
        >
          {/* Side Tabs Header */}
          <div className="flex items-center gap-2 border-b border-pink-500/20 pb-3 mb-3">
            <button
              onClick={() => {
                soundSynth?.playSelectSound?.();
                setActiveSideTab('LEADERBOARD');
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeSideTab === 'LEADERBOARD'
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-400/50 shadow-[0_0_12px_rgba(251,191,36,0.25)]'
                  : 'text-slate-400 hover:text-white bg-white/5 border border-transparent'
              }`}
            >
              <Trophy size={13} className="text-amber-400" />
              Champions
            </button>

            <button
              onClick={() => {
                soundSynth?.playSelectSound?.();
                setActiveSideTab('CHAT');
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeSideTab === 'CHAT'
                  ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/50 shadow-[0_0_12px_rgba(0,245,212,0.25)]'
                  : 'text-slate-400 hover:text-white bg-white/5 border border-transparent'
              }`}
            >
              <MessageSquare size={13} className="text-cyan-400" />
              Global Chat
            </button>
          </div>

          {/* TAB 1: LEADERBOARD CONTENT */}
          {activeSideTab === 'LEADERBOARD' && (
            <div className="flex-1 flex flex-col justify-between">
              <div className="space-y-2 overflow-y-auto max-h-[320px] pr-1">
                {loadingLeaderboards ? (
                  <div className="text-center py-10 text-xs font-mono text-slate-400 animate-pulse">
                    Scanning realm saints...
                  </div>
                ) : topOperatives.length === 0 ? (
                  <div className="text-center py-10 text-xs font-mono text-slate-400">
                    No champion saints registered yet.
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
                            ? 'bg-amber-950/40 border-amber-400/40 shadow-[0_0_10px_rgba(251,191,36,0.15)]'
                            : 'bg-black/50 border-pink-500/20'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-black ${
                              isTop
                                ? 'bg-amber-400 text-slate-950 font-extrabold'
                                : idx === 1
                                ? 'bg-slate-300 text-slate-950'
                                : idx === 2
                                ? 'bg-amber-700 text-white'
                                : 'bg-white/10 text-slate-400'
                            }`}
                          >
                            {isTop ? <Crown size={12} /> : idx + 1}
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-bold font-mono text-white truncate">
                              {op.name}
                            </div>
                            <div className="text-[10px] font-mono text-cyan-300">
                              {op.classId || 'WARRIOR'}
                            </div>
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <div className="text-xs font-black text-amber-300">
                            LVL {st.level || op.level || 1}
                          </div>
                          <div className="text-[9px] text-slate-400">
                            {(st.credits || 1000).toLocaleString()} C
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Leaderboard Footer */}
              <div className="pt-3 border-t border-pink-500/20 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1 text-amber-300">
                  <Flame size={12} /> Live Standings
                </span>
                <span>Top Saints</span>
              </div>
            </div>
          )}

          {/* TAB 2: CHAT CONTENT */}
          {activeSideTab === 'CHAT' && (
            <div className="flex-1 flex flex-col justify-between">
              {/* Message List */}
              <div
                ref={chatScrollRef}
                className="flex-1 space-y-2 overflow-y-auto max-h-[280px] pr-1 mb-2"
              >
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-2 rounded-xl text-xs font-mono ${
                      msg.type === 'SYSTEM'
                        ? 'bg-purple-950/60 border border-purple-500/40 text-purple-200'
                        : 'bg-black/60 border border-pink-500/20 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className={`font-bold ${msg.type === 'SYSTEM' ? 'text-purple-300' : 'text-[#00f5d4]'}`}>
                        {msg.sender}
                      </span>
                      <span className="text-slate-500">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="break-words text-[11px] leading-relaxed">{msg.text}</p>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChat} className="flex gap-2 pt-2 border-t border-pink-500/20">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Transmit to lobby..."
                  maxLength={140}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-black/70 border border-pink-500/30 text-white placeholder:text-slate-500 text-xs font-mono focus:outline-none focus:border-[#00f5d4]"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-pink-600 to-cyan-600 hover:from-pink-500 hover:to-cyan-500 text-white text-xs font-mono font-bold disabled:opacity-40 cursor-pointer"
                >
                  <Send size={12} />
                </button>
              </form>
            </div>
          )}
        </section>
      </main>

      {/* ── FOOTER BAR ── */}
      <footer className="relative z-30 w-full max-w-7xl mx-auto flex items-center justify-between text-[10px] font-mono text-pink-500/60 pt-3 border-t border-pink-500/20 mt-4">
        <span>⚔ Saints Gaming MMO Core Engine // Hero Gate ⚔</span>
        <span className="text-cyan-400/80">Press ENTER or click any card to deploy</span>
      </footer>

      {/* ── HIGH-TECH DELETE CONFIRMATION MODAL ── */}
      {deleteModalChar && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div
            className="w-full max-w-md bg-[#0d0221] border-2 border-rose-500/80 rounded-2xl p-6 shadow-[0_0_50px_rgba(244,63,94,0.4)] relative text-center"
            style={{
              clipPath: 'polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px)',
            }}
          >
            <div className="w-14 h-14 rounded-2xl bg-rose-950/80 border border-rose-500 flex items-center justify-center mx-auto mb-4 text-rose-400">
              <AlertTriangle size={28} />
            </div>

            <h3 className="text-xl font-black font-mono uppercase text-white mb-2 tracking-wider">
              Archive Saint?
            </h3>
            <p className="text-xs font-mono text-rose-200/80 leading-relaxed mb-6">
              Permanently delete Saint <strong className="text-white">"{deleteModalChar.name}"</strong>? All quest
              progression, inventory items, and world rank will be lost.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  soundSynth?.playSelectSound?.();
                  setDeleteModalChar(null);
                }}
                disabled={isDeleting}
                className="py-2.5 rounded-xl font-mono font-bold text-xs uppercase bg-white/10 hover:bg-white/15 text-white border border-white/20 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="py-2.5 rounded-xl font-mono font-black text-xs uppercase bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.5)] transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isDeleting ? 'Archiving...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
