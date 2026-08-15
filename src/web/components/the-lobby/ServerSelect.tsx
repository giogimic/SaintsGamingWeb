'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useGameStore } from './store';
import { useRealtimeStore } from '@/web/hooks/useRealtimeStore';
import { Globe, Users, Server, Play, ArrowLeft, Wifi, AlertTriangle, Power, Shield } from 'lucide-react';
import { canUseStudioServerControls } from '@/shared/game/studioPermissions';
import { soundSynth } from '@/engine/sound-synth';

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
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
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

  // Start Realm is Admin+ only (POST /api/game/server-status). Never show to
  // logged-out users or regular players — the button would 401/403.
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

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

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

  const server = servers[0];
  const isServerOnline = server?.status === 'online';
  const fillPct = server ? Math.round((server.players / server.capacity) * 100) : 0;
  const fillColor =
    fillPct > 80 ? '#ef4444' :
    fillPct > 50 ? '#f59e0b' :
    '#10b981';

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-[200] flex flex-col items-center justify-center animate-in fade-in duration-500 select-none font-mono"
      style={{ background: 'rgba(5,0,15,0.95)', backdropFilter: 'blur(16px)' }}
    >
      {/* Background glow */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
          top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Back button */}
      <button
        onClick={() => {
          soundSynth?.playSelectSound?.();
          setGameMode('TITLE_SCREEN');
        }}
        className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs tracking-wider uppercase transition-all bg-black/80 border border-violet-500/30 text-violet-300 hover:border-violet-400 hover:bg-violet-950/40 cursor-pointer shadow-lg active:scale-98"
      >
        <ArrowLeft size={15} strokeWidth={2.5} />
        Back
      </button>

      {/* Header */}
      <div className="relative z-10 text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Globe size={16} className="text-violet-400" />
          <h1 className="text-xs font-bold tracking-[0.4em] uppercase text-violet-400">
            REALM SELECTION
          </h1>
          <Globe size={16} className="text-violet-400" />
        </div>
        <h2
          className="text-4xl font-black tracking-wider"
          style={{
            fontFamily: 'serif',
            background: 'linear-gradient(180deg, #e8d5ff 0%, #a855f7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 15px rgba(139,92,246,0.4))',
          }}
        >
          World Gateways
        </h2>
      </div>

      {/* Server card */}
      <div className="relative z-10 w-full max-w-lg mx-4 animate-in fade-in zoom-in-95 duration-300">
        <div
          className="rounded-2xl border border-violet-500/30 bg-black/90 shadow-[0_0_60px_rgba(139,92,246,0.25)] overflow-hidden"
          style={{
            clipPath: 'polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px)',
          }}
        >
          <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />

          {/* Offline warning notification */}
          {!isServerOnline && (
            <div
              className="px-5 py-2.5 flex items-center justify-between border-b border-rose-500/30 bg-rose-950/40"
            >
              <div className="flex items-center gap-2 text-rose-300 text-xs font-mono">
                <AlertTriangle size={14} className="text-rose-400 shrink-0" />
                <span>
                  {canStartRealm
                    ? 'Realm is currently offline. Start server to enter.'
                    : 'Realm is currently offline. Please try again later.'}
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
          <div className="p-5 space-y-3">
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
                      ? 'bg-violet-950/40 border-violet-500/60 shadow-[0_0_20px_rgba(139,92,246,0.3)]'
                      : isOnline
                      ? 'bg-black/60 border-violet-500/20 hover:border-violet-500/40 hover:bg-violet-950/20 cursor-pointer'
                      : 'bg-black/40 border-slate-800 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Server icon */}
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                        isOnline
                          ? 'bg-violet-950/60 border-violet-500/40 text-violet-300'
                          : 'bg-black/40 border-slate-800 text-slate-600'
                      }`}
                    >
                      <Server size={22} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <PingDots status={s.status} />
                        <h3 className="font-bold text-violet-100 text-sm">{s.name}</h3>
                        <span className="text-[10px] font-mono text-violet-400/60 uppercase tracking-widest">
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
                          <Users size={11} className="text-violet-400/60" />
                          <span className="text-[11px] font-mono text-violet-300/80 font-bold">
                            {s.players}<span className="text-violet-500/40">/{s.capacity}</span>
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
          <div className="px-5 py-3.5 flex items-center justify-between border-t border-violet-900/40 bg-black/40">
            <div className="flex items-center gap-2">
              <Wifi size={14} className="text-violet-400/50" />
              <span className="text-[11px] font-mono text-violet-400/50">
                Telemetry 4s heartbeat
              </span>
            </div>

            <button
              disabled={!selectedServer || !isServerOnline || isConnecting}
              onClick={handleConnect}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs tracking-wider uppercase transition-all bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] disabled:opacity-40 disabled:pointer-events-none cursor-pointer active:scale-98"
            >
              {isConnecting ? (
                <span className="font-mono animate-pulse">Connecting...</span>
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

      {/* Flavour text */}
      <p className="relative z-10 mt-6 text-violet-500/40 text-[11px] font-mono tracking-widest">
        ᚠ &nbsp; Saints Online Live Shard &nbsp; ᚠ
      </p>
    </div>
  );
}

