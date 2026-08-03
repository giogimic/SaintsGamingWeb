'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from './store';
import { useRealtimeStore } from '@/web/hooks/useRealtimeStore';
import { Globe, Users, Server, Play, ArrowLeft, Wifi, AlertTriangle, Power } from 'lucide-react';

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
    return <span className="w-2 h-2 rounded-full bg-red-500/70" />;
  }
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
    </span>
  );
}

export default function ServerSelect() {
  const setGameMode = useGameStore((state) => state.setGameMode);
  const mmoPlayerCount = useRealtimeStore((s) => s.mmoPlayerCount);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [servers, setServers] = useState<ServerInfo[]>([
    { id: 'main', name: 'Saints Realm', region: 'Global', players: 0, capacity: 500, status: 'offline' }
  ]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isStartingServer, setIsStartingServer] = useState(false);

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
      className="pointer-events-auto absolute inset-0 z-[100] flex flex-col items-center justify-center animate-in fade-in duration-500"
      style={{ background: 'rgba(5,0,15,0.94)', backdropFilter: 'blur(14px)' }}
    >
      {/* Background glow */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
          top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Back button */}
      <button
        onClick={() => setGameMode('TITLE_SCREEN')}
        className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm tracking-wider uppercase transition-all hover:scale-[1.02]"
        style={{
          background: 'rgba(20,8,48,0.8)',
          border: '1px solid rgba(139,92,246,0.2)',
          color: 'rgba(196,181,253,0.6)',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.5)';
          (e.currentTarget as HTMLElement).style.color = 'rgba(221,214,254,0.9)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.2)';
          (e.currentTarget as HTMLElement).style.color = 'rgba(196,181,253,0.6)';
        }}
      >
        <ArrowLeft size={16} strokeWidth={2.5} />
        Back
      </button>

      {/* Header */}
      <div className="relative z-10 text-center mb-10">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Globe size={18} className="text-violet-400/60" />
          <h1
            className="text-xs font-black tracking-[0.4em] uppercase font-mono"
            style={{ color: 'rgba(139,92,246,0.6)' }}
          >
            Select Realm
          </h1>
          <Globe size={18} className="text-violet-400/60" />
        </div>
        <h2
          className="text-3xl font-black tracking-wider"
          style={{
            fontFamily: 'serif',
            background: 'linear-gradient(180deg, #e8d5ff 0%, #a855f7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 15px rgba(139,92,246,0.4))',
          }}
        >
          World Select
        </h2>
      </div>

      {/* Server card */}
      <div className="relative z-10 w-full max-w-lg mx-4 animate-in fade-in zoom-in-95 duration-300">
        <div
          className="rounded-2xl border overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, rgba(20,8,48,0.98) 0%, rgba(12,4,30,0.98) 100%)',
            border: '1px solid rgba(139,92,246,0.25)',
            boxShadow: '0 0 50px rgba(139,92,246,0.15), 0 25px 50px rgba(0,0,0,0.5)',
          }}
        >
          {/* Top accent */}
          <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

          {/* Offline warning notification */}
          {!isServerOnline && (
            <div
              className="px-6 py-3 flex items-center justify-between border-b"
              style={{
                background: 'rgba(239,68,68,0.1)',
                borderColor: 'rgba(239,68,68,0.2)',
              }}
            >
              <div className="flex items-center gap-2 text-red-300 text-xs font-mono">
                <AlertTriangle size={14} className="text-red-400 shrink-0" />
                <span>Realm is currently offline. Start server to enter.</span>
              </div>
              <button
                onClick={handleStartDevServer}
                disabled={isStartingServer}
                className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shrink-0"
                style={{
                  background: 'rgba(16,185,129,0.2)',
                  border: '1px solid rgba(16,185,129,0.4)',
                  color: '#6ee7b7',
                }}
              >
                <Power size={11} />
                {isStartingServer ? 'Starting...' : 'Start Realm (Dev)'}
              </button>
            </div>
          )}

          {/* Server list */}
          <div className="p-6 space-y-3">
            {servers.map(s => {
              const isSelected = selectedServer === s.id;
              const isOnline = s.status === 'online';
              return (
                <div
                  key={s.id}
                  onClick={() => isOnline && setSelectedServer(s.id)}
                  className="relative rounded-xl p-5 transition-all duration-200"
                  style={{
                    background: isSelected
                      ? 'rgba(139,92,246,0.12)'
                      : isOnline
                        ? 'rgba(255,255,255,0.03)'
                        : 'rgba(255,255,255,0.02)',
                    border: isSelected
                      ? '1px solid rgba(139,92,246,0.5)'
                      : '1px solid rgba(139,92,246,0.12)',
                    boxShadow: isSelected ? '0 0 20px rgba(139,92,246,0.15), inset 0 1px 0 rgba(255,255,255,0.05)' : 'none',
                    opacity: !isOnline ? 0.55 : 1,
                    cursor: !isOnline ? 'not-allowed' : 'pointer',
                  }}
                  onMouseEnter={e => {
                    if (isOnline && !isSelected) {
                      (e.currentTarget as HTMLElement).style.border = '1px solid rgba(139,92,246,0.3)';
                      (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.06)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) {
                      (e.currentTarget as HTMLElement).style.border = '1px solid rgba(139,92,246,0.12)';
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                    }
                  }}
                >
                  <div className="flex items-center gap-4">
                    {/* Server icon */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: isOnline ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${isOnline ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.08)'}`,
                      }}
                    >
                      <Server size={22} className={isOnline ? 'text-violet-400' : 'text-slate-600'} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <PingDots status={s.status} />
                        <h3 className="font-black text-violet-100 text-base">{s.name}</h3>
                        <span className="text-[10px] font-mono text-violet-500/50 uppercase tracking-widest">
                          {s.region}
                        </span>
                      </div>

                      {/* Population bar */}
                      <div className="flex items-center gap-3">
                        <div
                          className="flex-1 h-1.5 rounded-full overflow-hidden"
                          style={{ background: 'rgba(255,255,255,0.07)' }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{ width: `${fillPct}%`, background: fillColor, boxShadow: `0 0 6px ${fillColor}` }}
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users size={11} className="text-violet-500/50" />
                          <span className="text-[11px] font-mono text-violet-300/60">
                            {s.players}<span className="text-violet-600/40">/{s.capacity}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status badge */}
                    <div
                      className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shrink-0"
                      style={{
                        background: isOnline ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        border: `1px solid ${isOnline ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        color: isOnline ? '#6ee7b7' : '#fca5a5',
                      }}
                    >
                      {s.status}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ borderTop: '1px solid rgba(139,92,246,0.12)' }}
          >
            <div className="flex items-center gap-2">
              <Wifi size={14} className="text-violet-500/40" />
              <span className="text-[11px] font-mono text-violet-500/40">
                Auto-refreshing every 4s
              </span>
            </div>

            <button
              disabled={!selectedServer || !isServerOnline || isConnecting}
              onClick={handleConnect}
              className="flex items-center gap-2 px-7 py-2.5 rounded-xl font-black text-sm tracking-wider uppercase transition-all hover:scale-[1.03] active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #9333ea 100%)',
                boxShadow: '0 0 20px rgba(139,92,246,0.4), 0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
                color: 'white',
              }}
            >
              {isConnecting ? (
                <span className="font-mono animate-pulse">Connecting...</span>
              ) : (
                <>
                  <Play size={16} fill="currentColor" />
                  Connect
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Flavour text */}
      <p className="relative z-10 mt-8 text-violet-600/30 text-[11px] font-mono tracking-widest">
        ᚠ &nbsp; Saints Online &nbsp; ᚠ
      </p>
    </div>
  );
}
