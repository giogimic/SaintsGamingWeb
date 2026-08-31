'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useGameStore } from './store';
import { useRealtimeStore } from '@/web/hooks/useRealtimeStore';
import { useVisibilityPolling } from '@/web/hooks/useVisibilityPolling';
import { Globe, Users, Server, Play, ArrowLeft, Wifi, AlertTriangle, Power } from 'lucide-react';
import { canUseStudioServerControls } from '@/shared/game/studioPermissions';
import { soundSynth } from '@/engine/sound-synth';
import { useTheme } from 'next-themes';
import { MidnightTropicalBackground } from './MidnightTropicalBackground';

interface ServerInfo {
  id: string;
  name: string;
  region: string;
  players: number;
  capacity: number;
  status: 'online' | 'offline';
}

function PingDots({ status }: { status: 'online' | 'offline' }) {
  if (status === 'offline') {
    return <span className="w-2 h-2 rounded-full bg-rose-500/70" />;
  }
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f5d4] opacity-50" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00f5d4]" />
    </span>
  );
}

export default function ServerSelect() {
  const { data: session, status: authStatus } = useSession();
  const setGameMode = useGameStore((state) => state.setGameMode);
  const mmoPlayerCount = useRealtimeStore((s) => s.mmoPlayerCount);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [servers, setServers] = useState<ServerInfo[]>([
    { id: 'main', name: 'Saints Realm', region: 'Global', players: 0, capacity: 500, status: 'offline' }
  ]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isStartingServer, setIsStartingServer] = useState(false);

  const canStartRealm =
    authStatus === 'authenticated' &&
    canUseStudioServerControls(session?.user?.permissionLevel);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/game/server-status');
      if (res.ok) {
        const data = await res.json();
        const isOnline = data.status === 'online';
        setServers([
          {
            id: 'main',
            name: 'Saints Realm',
            region: 'Global',
            players: typeof data.players === 'number' ? data.players : 0,
            capacity: data.capacity ?? 500,
            status: data.status,
          }
        ]);
        if (isOnline) {
          setSelectedServer('main');
        } else {
          setSelectedServer(null);
        }
      }
    } catch {
      // Keep offline state
      setSelectedServer(null);
    }
  };

  // Visibility-aware polling every 15s (automatically paused when tab is hidden)
  useVisibilityPolling(fetchStatus, 15_000);

  // Prefer live coarse bus count when available
  useEffect(() => {
    if (mmoPlayerCount <= 0) return;
    setServers((prev) =>
      prev.map((s) =>
        s.id === 'main' ? { ...s, players: mmoPlayerCount, status: 'online' } : s
      )
    );
    setSelectedServer('main');
  }, [mmoPlayerCount]);

  const handleStartDevServer = async () => {
    soundSynth?.playActionSound?.();
    setIsStartingServer(true);
    try {
      await fetch('/api/game/server-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
      await fetchStatus();
    } catch {
      // Ignore
    } finally {
      setIsStartingServer(false);
    }
  };

  const handleConnect = () => {
    const s = servers.find(srv => srv.id === selectedServer);
    if (!selectedServer || s?.status !== 'online') return;
    soundSynth?.playActionSound?.();
    setIsConnecting(true);
    setTimeout(() => {
      setIsConnecting(false);
      setGameMode('CHARACTER_SELECT');
    }, 600);
  };

  const currentServer = servers[0];
  const isServerOnline = currentServer?.status === 'online';
  const isOnline = isServerOnline;
  const players = currentServer?.players ?? 0;
  const capacity = currentServer?.capacity ?? 500;
  const fillPct = Math.min(100, Math.round((players / capacity) * 100));
  const fillColor =
    fillPct > 80 ? '#ef4444' :
    fillPct > 50 ? '#ffbe0b' :
    '#00f5d4';

  const { theme } = useTheme();
  const isLight = theme === 'light';
  const isVice = theme === 'vice' || theme === 'hacker';

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-20 flex flex-col items-center justify-center animate-in fade-in duration-500 select-none font-sans pt-16 pb-14 sm:pt-14 sm:pb-10"
      style={{ backgroundColor: isLight ? '#240046' : isVice ? '#1b121c' : '#050014' }}
    >
      {/* Dynamic Horizon Background */}
      <MidnightTropicalBackground />

      {/* Back button */}
      <button
        onClick={() => {
          soundSynth?.playSelectSound?.();
          setGameMode('TITLE_SCREEN');
        }}
        className="absolute top-16 left-6 z-30 flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-xs tracking-wider uppercase transition-all bg-black/80 border border-pink-500/40 text-pink-300 hover:text-white hover:border-[#00f5d4] hover:bg-pink-950/40 cursor-pointer shadow-lg active:scale-95"
      >
        <ArrowLeft size={14} strokeWidth={2.5} />
        Back to Gateway
      </button>

      {/* Header */}
      <div className="relative z-10 text-center mb-8 font-mono">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Globe size={16} className="text-[#00f5d4]" />
          <h1 className="text-xs font-bold tracking-[0.4em] uppercase text-cyan-300/80">
            REALM SELECTION
          </h1>
          <Globe size={16} className="text-[#00f5d4]" />
        </div>
        <h2
          className="text-4xl font-black tracking-wider uppercase"
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #ffbe0b 50%, #f20089 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 20px rgba(242,0,137,0.6))',
          }}
        >
          World Gateways
        </h2>
      </div>

      {/* Server card */}
      <div className="relative z-10 w-full max-w-lg mx-4 animate-in fade-in zoom-in-95 duration-300">
        <div
          className="rounded-2xl border border-pink-500/40 bg-[#0a0318]/95 shadow-[0_0_60px_rgba(242,0,137,0.3)] overflow-hidden"
          style={{
            clipPath: 'polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px)',
          }}
        >
          <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-[#00f5d4] to-transparent" />

          {/* Offline warning notification */}
          {!isServerOnline && (
            <div className="px-5 py-2.5 flex items-center justify-between border-b border-rose-500/30 bg-rose-950/40 font-mono">
              <div className="flex items-center gap-2 text-rose-300 text-xs">
                <AlertTriangle size={14} className="text-rose-400 shrink-0" />
                <span>
                  {canStartRealm
                    ? 'Realm is offline. Start server to enter.'
                    : 'Realm is offline. Please try again later.'}
                </span>
              </div>
              {canStartRealm && (
                <button
                  onClick={handleStartDevServer}
                  disabled={isStartingServer}
                  className="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 shrink-0 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60 cursor-pointer"
                >
                  <Power size={11} />
                  {isStartingServer ? 'Starting...' : 'Start Realm (Dev)'}
                </button>
              )}
            </div>
          )}

          {/* Server list */}
          <div className="p-5 space-y-3 font-mono">
            {servers.map(s => {
              const isSelected = selectedServer === s.id;
              const isOnline = s.status === 'online';
              return (
                <div
                  key={s.id}
                  onClick={() => {
                    if (isOnline) {
                      soundSynth?.playSelectSound?.();
                      setSelectedServer(s.id);
                    }
                  }}
                  className={`relative rounded-xl p-4 transition-all duration-200 border ${
                    isSelected
                      ? 'bg-pink-950/40 border-pink-500/60 shadow-[0_0_20px_rgba(242,0,137,0.3)]'
                      : isOnline
                      ? 'bg-black/60 border-pink-500/20 hover:border-cyan-400 hover:bg-pink-950/20 cursor-pointer'
                      : 'bg-black/40 border-slate-800 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Server icon */}
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                        isOnline
                          ? 'bg-pink-950/60 border-pink-500/40 text-[#00f5d4]'
                          : 'bg-black/40 border-slate-800 text-slate-600'
                      }`}
                    >
                      <Server size={22} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <PingDots status={s.status} />
                        <h3 className="font-bold text-white text-sm">{s.name}</h3>
                        <span className="text-[10px] font-mono text-cyan-400/70 uppercase tracking-widest">
                          {s.region}
                        </span>
                      </div>

                      {/* Population bar */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/10">
                          <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{ width: `${fillPct}%`, background: fillColor, boxShadow: `0 0 6px ${fillColor}` }}
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users size={11} className="text-cyan-400/70" />
                          <span className="text-[11px] font-mono text-cyan-200 font-bold">
                            {s.players}<span className="text-slate-500">/{s.capacity}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status badge */}
                    <div
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shrink-0 border ${
                        isOnline
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                          : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                      }`}
                    >
                      {s.status}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-5 py-3.5 flex items-center justify-between border-t border-pink-500/20 bg-black/40 font-mono">
            <div className="flex items-center gap-2">
              <Wifi size={14} className="text-[#00f5d4]" />
              <span className="text-[11px] text-cyan-300/70">
                Telemetry 4s heartbeat
              </span>
            </div>

            <button
              disabled={!selectedServer || !isServerOnline || isConnecting}
              onClick={handleConnect}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs tracking-wider uppercase transition-all bg-gradient-to-r from-pink-600 to-cyan-600 hover:from-pink-500 hover:to-cyan-500 text-white shadow-[0_0_20px_rgba(242,0,137,0.4)] disabled:opacity-40 disabled:pointer-events-none cursor-pointer active:scale-98"
            >
              {isConnecting ? (
                <span className="animate-pulse">Connecting...</span>
              ) : (
                <>
                  <Play size={14} fill="currentColor" />
                  Connect
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <p className="relative z-10 mt-6 text-pink-500/40 text-[11px] font-mono tracking-widest uppercase">
        ⚔ Saints Online Live Shard Network ⚔
      </p>
    </div>
  );
}
