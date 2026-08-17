'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useGameStore } from './store';
import { useRealtimeStore } from '@/web/hooks/useRealtimeStore';
import { getUserCharacters, getTopLobbyOperatives } from '@/app/actions/game';
import { soundSynth } from '@/engine/sound-synth';
import GameOptionsMenu from './hud/GameOptionsMenu';
import { DigitalSnowV5 } from '@/web/components/landing/digital-snow-v5';
import { PalmCanopyVignetteV5 } from '@/web/components/landing/palm-canopy-vignette-v5';
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

// ── Theme Palettes (matching Saints Landing Page) ──────────────────────
const THEME = {
  bg: '#0d0221',
  skyGradient: 'linear-gradient(to bottom, #0d0221 0%, #3a0ca3 45%, #f20089 100%)',
  gridColor: '#f20089',
  sunGradient: 'linear-gradient(180deg, #ffbe0b 0%, #fb5607 40%, #ff006e 100%)',
  sunGlow: 'radial-gradient(ellipse at 50% 100%, #fb5607 0%, #f20089 50%, transparent 70%)',
  groundGlow: 'radial-gradient(ellipse at 50% 0%, #fb5607 0%, #f20089 40%, transparent 70%)',
  textColor: '#00f5d4',
  accentColor: '#ffbe0b',
  btnBg: '#f20089',
  btnBorder: '#ffbe0b',
  btnGlow: '#f20089',
  btn2Border: '#00f5d4',
  btn2Text: '#00f5d4',
  logoGlow: 'rgba(242,0,137,0.6)',
  panelBg: 'rgba(13, 2, 33, 0.88)',
  panelBorder: 'rgba(242, 0, 137, 0.35)',
  panelGlow: 'rgba(242, 0, 137, 0.2)',
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

// ── Retro Canvas Synthwave Horizon Background ─────────────────────────
function GatewayAtmosphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const RUNES = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛊ', 'ᛏ', 'ᛒ', 'ᛖ', 'ᛗ', 'ᛚ', 'ᛜ', 'ᛞ', 'ᛟ', '⚔', '✦', '✧', '★'];

    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vy: -(0.2 + Math.random() * 0.4),
      vx: (Math.random() - 0.5) * 0.25,
      size: 11 + Math.random() * 14,
      alpha: 0.08 + Math.random() * 0.2,
      rune: RUNES[Math.floor(Math.random() * RUNES.length)],
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.008 + Math.random() * 0.015,
      color: Math.random() > 0.5 ? '#f20089' : '#00f5d4',
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Deep space radial glow
      const grad = ctx.createRadialGradient(
        canvas.width * 0.5, canvas.height * 0.35, 0,
        canvas.width * 0.5, canvas.height * 0.35, canvas.width * 0.75
      );
      grad.addColorStop(0, 'rgba(58, 12, 163, 0.4)');
      grad.addColorStop(0.5, 'rgba(13, 2, 33, 0.85)');
      grad.addColorStop(1, 'rgba(5, 0, 15, 1)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Floating digital runes / embers
      particles.forEach((p) => {
        p.pulse += p.pulseSpeed;
        const pulseAlpha = Math.max(0.02, p.alpha + Math.sin(p.pulse) * 0.08);
        ctx.font = `${p.size}px monospace, serif`;
        ctx.fillStyle = p.color === '#f20089' 
          ? `rgba(242, 0, 137, ${pulseAlpha})`
          : `rgba(0, 245, 212, ${pulseAlpha})`;
        ctx.fillText(p.rune, p.x, p.y);

        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -30) {
          p.y = canvas.height + 20;
          p.x = Math.random() * canvas.width;
        }
      });

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
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
            { role: 'Original Creature Art', name: 'Tuxemon Open Source Project' },
            { role: 'World Tilesets', name: 'LPC & Community Contributors' },
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
  const mmoPlayerCount = useRealtimeStore((s) => s.mmoPlayerCount);

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

    if (setupStatus && (!setupStatus.isSetupCompleted || setupStatus.mapCount === 0)) {
      window.location.href = '/setup';
      return;
    }

    if (characters.length === 0) {
      if (onCreateCharacter) {
        onCreateCharacter();
      } else {
        setGameMode('CHARACTER_CREATOR');
      }
      return;
    }

    if (activeChar) {
      if (onSelectCharacter) {
        onSelectCharacter(activeChar.id);
      } else {
        setGameMode('EXPLORING');
      }
    } else {
      if (onOpenCharacterSelect) {
        onOpenCharacterSelect();
      } else {
        setGameMode('CHARACTER_SELECT');
      }
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;

    soundSynth?.playUiClick?.();

    const senderName = session?.user?.name || session?.user?.username || activeChar?.name || 'Operative';
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

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-[200] flex flex-col justify-between overflow-x-hidden overflow-y-auto select-none font-sans"
      style={{ backgroundColor: THEME.bg, color: THEME.textColor }}
    >
      {/* Synthwave Sunset Horizon Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Sky Gradient */}
        <div className="absolute top-0 w-full h-[60vh]" style={{ background: THEME.skyGradient }} />

        {/* Retro Grid Floor */}
        <div
          className="absolute bottom-0 w-full h-[40vh] origin-top opacity-50"
          style={{
            backgroundImage: `linear-gradient(transparent 65%, ${THEME.gridColor} 100%), repeating-linear-gradient(0deg, transparent, transparent 19px, ${THEME.gridColor} 20px), repeating-linear-gradient(90deg, transparent, transparent 39px, ${THEME.gridColor} 40px)`,
            transform: 'perspective(500px) rotateX(60deg)',
          }}
        />

        {/* Sun at horizon */}
        <div
          className="absolute top-[52%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[24rem] h-[24rem] rounded-full opacity-70"
          style={{
            background: THEME.sunGradient,
            clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)',
          }}
        />

        {/* Sun Glow */}
        <div
          className="absolute top-[52%] left-1/2 -translate-x-1/2 -translate-y-[100%] w-[38rem] h-[18rem] opacity-40"
          style={{ background: THEME.sunGlow }}
        />

        {/* Ground light reflection */}
        <div
          className="absolute top-[52%] left-1/2 -translate-x-1/2 w-[85%] h-[35vh] opacity-30"
          style={{ background: THEME.groundGlow }}
        />
      </div>

      {/* Atmospheric digital particles & Embers */}
      <GatewayAtmosphere />
      <DigitalSnowV5 />

      {/* Cinematic Vignette */}
      <PalmCanopyVignetteV5 />

      {/* Subtle CRT Scanline overlay */}
      <div
        className="fixed inset-0 z-10 pointer-events-none opacity-15"
        style={{
          backgroundImage:
            'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.05), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.05))',
          backgroundSize: '100% 4px, 3px 100%',
        }}
      />

      {/* ── TOP HEADER / UTILITY BAR ────────────────────────────────────── */}
      <header className="relative z-30 w-full px-4 sm:px-8 py-3 flex items-center justify-between border-b border-pink-500/20 bg-[#0d0221]/70 backdrop-blur-md">
        {/* Left utility tools */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMuted((m) => !m)}
            className="p-2 rounded-lg border border-pink-500/30 text-pink-300 hover:text-white hover:border-pink-400 bg-black/50 transition-all cursor-pointer"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <button
            onClick={() => {
              soundSynth?.playSelectSound?.();
              setShowOptions(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-pink-500/30 text-pink-200 hover:text-white hover:border-pink-400 bg-black/50 text-xs font-mono font-bold tracking-wider uppercase transition-all cursor-pointer"
          >
            <Settings size={14} />
            <span className="hidden sm:inline">Options</span>
          </button>
          <button
            onClick={() => {
              soundSynth?.playSelectSound?.();
              setShowCredits(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-pink-500/30 text-pink-200 hover:text-white hover:border-pink-400 bg-black/50 text-xs font-mono font-bold tracking-wider uppercase transition-all cursor-pointer"
          >
            <ScrollText size={14} />
            <span className="hidden sm:inline">Credits</span>
          </button>
        </div>

        {/* Center Title Brand Mark */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <h1
              className="text-2xl sm:text-3xl font-black tracking-widest font-mono select-none"
              style={{
                background: 'linear-gradient(180deg, #ffffff 0%, #ffbe0b 50%, #f20089 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 16px rgba(242,0,137,0.7))',
              }}
            >
              SAINTS ONLINE
            </h1>
            <span className="px-2 py-0.5 rounded bg-pink-950/80 border border-pink-500/40 text-[#00f5d4] text-[10px] font-mono font-black tracking-wider uppercase shadow-[0_0_10px_rgba(0,245,212,0.3)]">
              MMO GATEWAY
            </span>
          </div>
          <span className="text-[10px] text-amber-400/70 font-mono tracking-[0.25em] uppercase hidden sm:block">
            A WORLD WORTH FIGHTING FOR — EST. 2007
          </span>
        </div>

        {/* Right Account & Leave */}
        <div className="flex items-center gap-3">
          {status === 'authenticated' ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-cyan-500/40 bg-black/60 shadow-[0_0_12px_rgba(0,245,212,0.2)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-mono font-bold text-white leading-tight truncate max-w-[110px]">
                  {session?.user?.name || session?.user?.username || 'Operative'}
                </span>
                <span className="text-[9px] font-mono text-cyan-300/70 tracking-widest uppercase">
                  {session?.user?.permissionLevel && session.user.permissionLevel >= 3 ? 'ADMIN' : 'TAMER'}
                </span>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                soundSynth?.playActionSound?.();
                setGameMode('LOGIN');
              }}
              className="px-4 py-1.5 rounded-xl border border-cyan-400 bg-cyan-500/20 text-cyan-200 font-mono text-xs font-bold uppercase tracking-wider hover:bg-cyan-500/40 transition-all cursor-pointer shadow-[0_0_15px_rgba(0,245,212,0.3)]"
            >
              Sign In
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              window.location.href = '/';
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/50 text-rose-300 hover:bg-rose-950/60 hover:text-white transition-all font-mono text-xs font-bold uppercase tracking-wider cursor-pointer bg-black/60 shadow-[0_0_10px_rgba(244,63,94,0.2)]"
            title="Return to website"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </header>

      {/* ── REALM SETUP BANNER (Glows when fresh install or setup pending) ── */}
      {setupStatus && (!setupStatus.isSetupCompleted || setupStatus.mapCount === 0) && (
        <div className="relative z-30 mx-4 sm:mx-8 my-2 p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/95 via-slate-900/95 to-amber-950/95 border-2 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.3)] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400 flex items-center justify-center text-amber-300 animate-pulse shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-amber-300 uppercase tracking-widest text-sm">Realm Setup Required</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-extrabold uppercase">Fresh Install</span>
              </div>
              <span className="text-slate-300 text-[11px] block mt-0.5">
                Configure realm identity, choose starter bundles (Haven, Meadows, Vance Quests), or jump into Studio to create your first map.
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              soundSynth?.playActionSound?.();
              window.location.href = '/setup';
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 text-slate-950 font-black uppercase tracking-wider hover:scale-105 transition-all shadow-xl shadow-amber-500/30 cursor-pointer flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Launch Setup Wizard →
          </button>
        </div>
      )}

      {/* ── MAIN 3-COLUMN MMO COMMAND DECK ─────────────────────────────── */}
      <main className="relative z-20 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* ── COLUMN 1: HERO STAGE & PEDESTAL (Cols 1-4) ─────────────── */}
          <div
            className="lg:col-span-4 flex flex-col justify-between rounded-2xl border p-5 bg-[#0a031a]/85 backdrop-blur-xl shadow-2xl relative group overflow-hidden"
            style={{
              borderColor: palette.border,
              boxShadow: `0 0 35px ${palette.glow}, inset 0 0 20px rgba(0,0,0,0.8)`,
              clipPath: 'polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px)',
            }}
          >
            {/* Top decorative accent */}
            <div className="flex items-center justify-between border-b border-pink-500/20 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-black text-cyan-200 uppercase tracking-widest">
                  OPERATIVE STAGE
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-mono text-pink-400/70">
                <span>HERO {characters.length > 0 ? activeIdx + 1 : 0} / {characters.length}</span>
              </div>
            </div>

            {/* Pedestal & Character Visual */}
            <div className="flex flex-col items-center justify-center my-2 relative py-4">
              {/* Rune / Energy aura on ground */}
              <div
                className="absolute w-44 h-16 rounded-full bottom-2 blur-md opacity-70 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse at center, ${palette.accent} 0%, transparent 70%)`,
                }}
              />

              {/* Pedestal Platform */}
              <div
                className="w-36 h-8 rounded-[50%] border border-cyan-400/40 bg-black/80 flex items-center justify-center relative shadow-inner mb-[-12px]"
                style={{
                  boxShadow: `0 0 20px ${palette.glow}`,
                }}
              >
                <div className="w-24 h-4 rounded-[50%] border border-pink-500/40 bg-pink-950/40 animate-pulse" />
              </div>

              {/* Character Avatar */}
              <div className="relative z-10 w-24 h-24 flex items-center justify-center">
                {activeChar ? (
                  isCustomSprite ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activeChar.spriteId}
                      alt={activeChar.name}
                      className="w-20 h-20 object-contain pixelated drop-shadow-[0_0_12px_rgba(0,245,212,0.6)]"
                    />
                  ) : (
                    <div
                      className="pixelated bg-no-repeat transition-transform hover:scale-110 duration-200 drop-shadow-[0_0_15px_rgba(242,0,137,0.7)]"
                      style={{
                        backgroundImage: `url('/game-assets/npc/${activeChar.spriteId || 'adventurer'}.png')`,
                        backgroundPosition: '0px -64px',
                        backgroundSize: '96px 128px',
                        width: '32px',
                        height: '32px',
                        transform: 'scale(2.2)',
                      }}
                    />
                  )
                ) : (
                  <div className="w-16 h-16 rounded-2xl border border-dashed border-cyan-500/40 flex flex-col items-center justify-center text-cyan-400/50">
                    <User className="w-8 h-8" />
                  </div>
                )}
              </div>

              {/* Character Selector Carousel Arrows */}
              {characters.length > 1 && (
                <div className="flex items-center justify-between w-full px-4 absolute top-1/2 -translate-y-1/2 pointer-events-none">
                  <button
                    onClick={handlePrevChar}
                    className="pointer-events-auto p-2 rounded-xl bg-black/70 border border-pink-500/40 text-pink-300 hover:text-white hover:border-cyan-400 hover:scale-110 transition-all cursor-pointer shadow-lg"
                    title="Previous Hero"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={handleNextChar}
                    className="pointer-events-auto p-2 rounded-xl bg-black/70 border border-pink-500/40 text-pink-300 hover:text-white hover:border-cyan-400 hover:scale-110 transition-all cursor-pointer shadow-lg"
                    title="Next Hero"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Character Info Card */}
            {activeChar ? (
              <div className="bg-black/60 rounded-xl p-3 border border-pink-500/20 mb-4 font-mono">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <ClassIcon className="w-3.5 h-3.5" style={{ color: palette.accent }} />
                    <span className="text-[11px] font-black uppercase tracking-wider text-white">
                      {activeChar.name}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-400/40 text-[#00f5d4] text-[10px] font-extrabold shadow-[0_0_8px_rgba(0,245,212,0.3)]">
                    LVL {activeCharState.level || 1}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300 mt-2 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-1.5">
                    <Heart className="w-3 h-3 text-rose-400" />
                    <span>HP: <strong className="text-white">{activeCharState.hp || 100}/{activeCharState.maxHp || 100}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Coins className="w-3 h-3 text-amber-400" />
                    <span>Pouch: <strong className="text-amber-300">{(activeCharState.credits || 1000).toLocaleString()} C</strong></span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-4 bg-black/40 rounded-xl border border-dashed border-cyan-500/30 mb-4">
                <p className="text-xs font-mono text-cyan-300/80 font-bold">NO CHAMPION YET</p>
                <p className="text-[10px] font-mono text-slate-400 mt-1">Forge your operative to enter the live world.</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2.5">
              {/* Primary CTA: ENTER REALM */}
              <button
                onClick={handleStartGame}
                className="group relative w-full py-4 overflow-hidden rounded-xl font-mono font-black text-base sm:text-lg tracking-widest uppercase transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-[0_0_30px_rgba(242,0,137,0.6)] text-white"
                style={{
                  background: 'linear-gradient(135deg, #f20089 0%, #7c3aed 50%, #00f5d4 100%)',
                  clipPath: 'polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative flex items-center justify-center gap-2">
                  <Play size={18} fill="currentColor" className="group-hover:animate-pulse text-white" />
                  {status !== 'authenticated' ? 'LOGIN TO PLAY' : activeChar ? 'ENTER REALM' : 'CREATE HERO'}
                </span>
              </button>

              {/* Secondary actions: Hero Vault & Forge */}
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <button
                  onClick={() => {
                    soundSynth?.playSelectSound?.();
                    if (onOpenCharacterSelect) {
                      onOpenCharacterSelect();
                    } else {
                      setGameMode('CHARACTER_SELECT');
                    }
                  }}
                  className="py-2 px-3 rounded-lg bg-black/60 border border-pink-500/30 hover:border-cyan-400 text-pink-200 hover:text-white flex items-center justify-center gap-1.5 font-bold uppercase transition-all cursor-pointer"
                >
                  <Layers size={13} />
                  Hero Vault
                </button>
                <button
                  onClick={() => {
                    soundSynth?.playActionSound?.();
                    if (onCreateCharacter) {
                      onCreateCharacter();
                    } else {
                      setGameMode('CHARACTER_CREATOR');
                    }
                  }}
                  className="py-2 px-3 rounded-lg bg-pink-950/40 border border-pink-500/40 hover:border-pink-400 text-[#00f5d4] hover:text-white flex items-center justify-center gap-1.5 font-bold uppercase transition-all cursor-pointer shadow-[0_0_10px_rgba(242,0,137,0.2)]"
                >
                  <Plus size={13} />
                  Forge Hero
                </button>
              </div>
            </div>
          </div>

          {/* ── COLUMN 2: LIVE GLOBAL LOBBY CHAT (Cols 5-8) ─────────────── */}
          <div
            className="lg:col-span-4 flex flex-col justify-between rounded-2xl border border-cyan-500/30 p-5 bg-[#060e18]/85 backdrop-blur-xl shadow-2xl relative font-mono overflow-hidden"
            style={{
              boxShadow: '0 0 35px rgba(0,245,212,0.2), inset 0 0 20px rgba(0,0,0,0.8)',
              clipPath: 'polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px)',
            }}
          >
            {/* Chat header */}
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-black text-cyan-200 uppercase tracking-widest">
                  GLOBAL LOBBY CHAT
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-cyan-400/70">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>CH: LIVE</span>
              </div>
            </div>

            {/* Chat messages stream */}
            <div
              ref={chatScrollRef}
              className="flex-1 min-h-[220px] max-h-[320px] overflow-y-auto space-y-2 pr-1 custom-scrollbar text-xs"
            >
              {chatMessages.map((m) => {
                const timeStr = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                if (m.type === 'SYSTEM') {
                  return (
                    <div key={m.id} className="p-2 rounded bg-amber-950/30 border border-amber-500/30 text-amber-200 text-[11px]">
                      <div className="flex items-center gap-1 text-[9px] text-amber-400/80 font-bold uppercase mb-0.5">
                        <Flame className="w-2.5 h-2.5" />
                        <span>[SYSTEM] {timeStr}</span>
                      </div>
                      <p>{m.text}</p>
                    </div>
                  );
                }

                if (m.type === 'ANNOUNCE') {
                  return (
                    <div key={m.id} className="p-2 rounded bg-pink-950/40 border border-pink-500/40 text-pink-100 text-[11px] shadow-[0_0_10px_rgba(242,0,137,0.2)]">
                      <div className="flex items-center gap-1 text-[9px] text-pink-300 font-bold uppercase mb-0.5">
                        <Radio className="w-2.5 h-2.5 animate-pulse text-pink-400" />
                        <span>[REALM BROADCAST]</span>
                      </div>
                      <p>{m.text}</p>
                    </div>
                  );
                }

                return (
                  <div key={m.id} className="p-2 rounded bg-black/40 border border-cyan-500/10 text-slate-200 text-[11px]">
                    <div className="flex items-center justify-between text-[9px] text-slate-400 mb-0.5">
                      <div className="flex items-center gap-1">
                        {m.badge && (
                          <span className="px-1 py-0.2 rounded bg-pink-950 text-pink-300 border border-pink-500/40 font-bold uppercase">
                            {m.badge}
                          </span>
                        )}
                        <strong className="text-cyan-300">{m.sender}</strong>
                      </div>
                      <span>{timeStr}</span>
                    </div>
                    <p className="text-slate-100 break-words">{m.text}</p>
                  </div>
                );
              })}
            </div>

            {/* Chat Input Bar */}
            <form onSubmit={handleSendChat} className="mt-3 flex items-center gap-2 pt-3 border-t border-cyan-500/20">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={status === 'authenticated' ? 'Chat in lobby... (Enter)' : 'Sign in to chat...'}
                disabled={status !== 'authenticated'}
                className="flex-1 bg-black/60 border border-cyan-500/30 rounded-lg px-3 py-2 text-xs font-mono text-cyan-100 placeholder:text-cyan-600/50 focus:outline-none focus:border-[#00f5d4] transition-colors"
                maxLength={200}
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || status !== 'authenticated'}
                className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-400/50 text-[#00f5d4] hover:bg-cyan-500/40 hover:text-white disabled:opacity-30 transition-all cursor-pointer shadow-[0_0_10px_rgba(0,245,212,0.2)]"
                title="Send Message"
              >
                <Send size={14} />
              </button>
            </form>
          </div>

          {/* ── COLUMN 3: REALM & HALL OF CHAMPIONS (Cols 9-12) ─────────── */}
          <div
            className="lg:col-span-4 flex flex-col justify-between rounded-2xl border border-amber-500/30 p-5 bg-[#120902]/85 backdrop-blur-xl shadow-2xl relative font-mono overflow-hidden"
            style={{
              boxShadow: '0 0 35px rgba(251,191,36,0.2), inset 0 0 20px rgba(0,0,0,0.8)',
              clipPath: 'polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px)',
            }}
          >
            {/* Top: Realm Status */}
            <div>
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-black text-amber-200 uppercase tracking-widest">
                    REALM GATEWAY
                  </span>
                </div>
                <button
                  onClick={() => {
                    soundSynth?.playSelectSound?.();
                    if (onOpenServerSelect) {
                      onOpenServerSelect();
                    } else {
                      setGameMode('SERVER_SELECT');
                    }
                  }}
                  className="text-[10px] text-amber-300/80 hover:text-white border border-amber-500/30 px-2 py-0.5 rounded bg-black/40 uppercase transition-colors cursor-pointer"
                >
                  Switch
                </button>
              </div>

              {/* Live Shard Status Widget */}
              <div className="p-3 bg-black/60 border border-amber-500/30 rounded-xl mb-4 shadow-inner">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-amber-400" />
                    <div>
                      <h4 className="text-xs font-bold text-white leading-tight">Saints Realm</h4>
                      <p className="text-[9px] text-slate-400">Global Shard 01</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[10px] font-bold uppercase shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>ONLINE</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-300 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-1">
                    <Wifi className="w-3 h-3 text-cyan-400" />
                    <span>Latency: <strong className="text-emerald-400">18ms</strong></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>Pop: <strong className="text-amber-300">{serverStatus.players} / {serverStatus.capacity}</strong></span>
                  </div>
                </div>

                {canStartRealm && (
                  <div className="space-y-1.5 mt-2">
                    <button
                      onClick={() => {
                        soundSynth?.playActionSound?.();
                        window.location.href = '/setup';
                      }}
                      className="w-full py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/50 text-amber-300 text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_10px_rgba(251,191,36,0.2)]"
                    >
                      <Sparkles size={12} className="text-amber-400" />
                      Realm Setup Wizard
                    </button>
                    <button
                      onClick={handleStartDevServer}
                      disabled={isStartingServer}
                      className="w-full py-1 rounded bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/40 text-amber-200 text-[10px] font-bold uppercase transition-all cursor-pointer"
                    >
                      {isStartingServer ? 'Starting Realm...' : 'Restart Dev Realm'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom: Hall of Champions Mini-Leaderboard */}
            <div className="flex-1 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-black text-amber-200 uppercase tracking-wider">
                    HALL OF CHAMPIONS
                  </span>
                </div>
                <button
                  onClick={() => {
                    soundSynth?.playSelectSound?.();
                    fetchLeaderboards();
                  }}
                  className="p-1 text-amber-400 hover:text-white cursor-pointer"
                  title="Refresh Leaderboards"
                >
                  <RefreshCw size={12} className={loadingLeaderboards ? 'animate-spin' : ''} />
                </button>
              </div>

              {/* Leaderboard Top List */}
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar text-[11px]">
                {loadingLeaderboards ? (
                  <p className="text-center text-slate-400 italic py-4">Syncing top operatives...</p>
                ) : topOperatives.length === 0 ? (
                  <p className="text-center text-slate-500 italic py-4">No operative rankings yet.</p>
                ) : (
                  topOperatives.map((op, idx) => (
                    <div
                      key={op.id}
                      className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between ${
                        idx === 0
                          ? 'bg-amber-950/40 border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                          : idx === 1
                          ? 'bg-slate-900/60 border-slate-400/40'
                          : idx === 2
                          ? 'bg-amber-950/20 border-amber-700/30'
                          : 'bg-black/40 border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-4 font-bold text-xs text-center">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </span>
                        <span className="font-bold text-white truncate max-w-[90px]">{op.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-cyan-300 font-bold">LVL {op.level}</span>
                        <span className="text-amber-300/80">{(op.totalXp || 0).toLocaleString()} XP</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* View Full Leaderboards button */}
              <button
                onClick={() => {
                  soundSynth?.playSelectSound?.();
                  setGameMode('LEADERBOARD');
                }}
                className="w-full mt-3 py-2 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 text-amber-200 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_10px_rgba(251,191,36,0.15)] flex items-center justify-center gap-1.5"
              >
                <Crown size={12} className="text-amber-400" />
                View Full Leaderboards
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* ── FOOTER STATUS / SHORTCUTS BAR ──────────────────────────────── */}
      <footer className="relative z-30 w-full px-4 sm:px-8 py-2.5 flex flex-col sm:flex-row items-center justify-between border-t border-pink-500/20 bg-[#0d0221]/80 backdrop-blur-md text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-3">
          <span className="text-pink-400 font-bold">v{process.env.NEXT_PUBLIC_APP_VERSION || '2.1.238'} · Core MMO</span>
          <span className="hidden md:inline text-slate-600">|</span>
          <span className="hidden md:inline text-cyan-400/80">BabylonJS 3D · Go MMO Realtime Engine</span>
        </div>

        <div className="flex items-center gap-4 mt-1 sm:mt-0 text-[10px] text-pink-300/70">
          <span>[ENTER] Enter Realm</span>
          <span>[C] Hero Vault</span>
          <span>[ESC] Options</span>
        </div>
      </footer>

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
