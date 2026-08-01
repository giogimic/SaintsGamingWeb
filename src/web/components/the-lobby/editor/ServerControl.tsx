'use client';

import React, { useState, useEffect } from 'react';
import { Server, Power, RefreshCw, Activity, CheckCircle2, XCircle, ShieldAlert, Cpu } from 'lucide-react';

export const ServerControl: React.FC = () => {
  const [statusData, setStatusData] = useState<{ status: 'online' | 'offline'; players: number; capacity: number; isDevMode?: boolean; isDevOverride?: boolean }>({
    status: 'offline',
    players: 0,
    capacity: 500,
  });
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/game/server-status');
      if (res.ok) {
        const data = await res.json();
        setStatusData(data);
      }
    } catch {
      setStatusData({ status: 'offline', players: 0, capacity: 500 });
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleServer = async (targetStatus: 'online' | 'offline') => {
    setLoading(true);
    setActionMessage(`Requesting server ${targetStatus.toUpperCase()} state...`);
    try {
      const res = await fetch('/api/game/server-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: targetStatus === 'online' ? 'start' : 'stop', status: targetStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setStatusData(prev => ({ ...prev, status: data.status }));
        setActionMessage(`Server is now ${data.status.toUpperCase()}`);
      }
    } catch (err: any) {
      setActionMessage(`Error: ${err.message || 'Failed to update server status'}`);
    } finally {
      setLoading(false);
      setTimeout(() => setActionMessage(null), 3000);
      fetchStatus();
    }
  };

  const handleResetDevOverride = async () => {
    setLoading(true);
    try {
      await fetch('/api/game/server-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      await fetchStatus();
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const isOnline = statusData.status === 'online';

  return (
    <div className="bg-[#050b14] border border-slate-800 rounded-xl p-4 space-y-4 shadow-2xl max-w-3xl mx-auto font-mono text-xs">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Server className="w-5 h-5 text-amber-400" />
          <h2 className="font-bold text-slate-100 text-sm uppercase tracking-wide">
            Game Server Controller
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"
            style={{
              background: isOnline ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              border: `1px solid ${isOnline ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: isOnline ? '#6ee7b7' : '#fca5a5',
            }}
          >
            {isOnline ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
            {statusData.status}
          </span>
          <button
            onClick={fetchStatus}
            className="p-1.5 rounded-lg bg-[#0b1320] border border-slate-800 text-slate-400 hover:text-slate-200 transition"
            title="Refresh Status"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Action Notification message */}
      {actionMessage && (
        <div className="px-3 py-2 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-200 text-[11px]">
          {actionMessage}
        </div>
      )}

      {/* Controller Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Server State Controls */}
        <div className="p-4 bg-[#0b1320]/60 rounded-xl border border-slate-800 space-y-3">
          <span className="font-bold text-amber-400 block uppercase text-[10px] tracking-wider">
            1. Server Operations & Power
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleToggleServer('online')}
              disabled={loading || isOnline}
              className="flex-1 py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg disabled:opacity-40"
              style={{
                background: isOnline ? 'rgba(16,185,129,0.2)' : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                border: '1px solid rgba(16,185,129,0.4)',
                color: 'white',
              }}
            >
              <Power size={14} />
              Start Server
            </button>

            <button
              onClick={() => handleToggleServer('offline')}
              disabled={loading || !isOnline}
              className="flex-1 py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg disabled:opacity-40"
              style={{
                background: !isOnline ? 'rgba(239,68,68,0.2)' : 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                border: '1px solid rgba(239,68,68,0.4)',
                color: 'white',
              }}
            >
              <Power size={14} />
              Stop Server
            </button>
          </div>

          <p className="text-[10px] text-slate-500 leading-normal pt-1">
            Click <strong>Start Server</strong> to put the local game realm into active online status.
          </p>
        </div>

        {/* Server Status Metrics */}
        <div className="p-4 bg-[#0b1320]/60 rounded-xl border border-slate-800 space-y-3">
          <span className="font-bold text-amber-400 block uppercase text-[10px] tracking-wider">
            2. Real-Time Metrics & Environment
          </span>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded bg-[#050b14] border border-slate-800">
              <span className="text-slate-400 text-[10px]">Connected Players:</span>
              <span className="font-bold text-white">{statusData.players} / {statusData.capacity}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-[#050b14] border border-slate-800">
              <span className="text-slate-400 text-[10px]">Runtime Environment:</span>
              <span className="font-bold text-amber-300">
                {statusData.isDevOverride ? 'Dev Manual Override' : statusData.isDevMode ? 'Next.js Dev Server' : 'Production'}
              </span>
            </div>

            {statusData.isDevOverride && (
              <button
                onClick={handleResetDevOverride}
                className="w-full py-1 text-[10px] text-slate-400 hover:text-slate-200 underline text-center"
              >
                Reset Manual Override to Auto Detect
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ServerControl;
