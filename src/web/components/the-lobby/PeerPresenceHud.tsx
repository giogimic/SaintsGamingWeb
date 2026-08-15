'use client';

import { useGameStore } from './store';
import { HudPanelShell } from './hud/HudPanelShell';
import { Users, Wifi, Radio, UserCheck } from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';

/**
 * Always-visible peer strip for /lobby — separates "socket seat ok" from
 * "sprite off-camera / mistaken for NPC". Shows shard + nearby names.
 */
export default function PeerPresenceHud() {
  const otherPlayers = useGameStore((s) => s.otherPlayers);
  const instanceId = useGameStore((s) => s.instanceId);
  const connectionStatus = useGameStore((s) => s.connectionStatus);
  const latencyMs = useGameStore((s) => s.latencyMs);
  const setCombatTarget = useGameStore((s) => s.setCombatTarget);

  const peers = Object.entries(otherPlayers || {});
  const count = peers.length;
  const channel =
    instanceId && /_ch(\d+)$/.test(instanceId)
      ? `CH-${instanceId.match(/_ch(\d+)$/)?.[1]}`
      : instanceId
        ? '…'
        : '—';

  const handleSelectPeer = (socketId: string, peer: any) => {
    soundSynth?.playSelectSound?.();
    setCombatTarget({
      entityId: socketId,
      name: peer.name || 'Tamer',
      hp: 100,
      maxHp: 100,
      behavior: 'friendly',
    });
  };

  return (
    <div className="pointer-events-none flex flex-col font-mono select-none" data-testid="peer-presence-hud">
      <HudPanelShell noPadding className="pointer-events-auto flex flex-col gap-2 p-2.5 text-[10px] leading-snug text-white min-w-[210px] bg-black/80 border-cyan-500/40 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 border-b border-cyan-500/20 pb-1.5">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full shrink-0 ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]'
                  : connectionStatus === 'reconnecting' || connectionStatus === 'connecting'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-rose-500'
              }`}
              title={`Realtime: ${connectionStatus}`}
            />
            <span className="text-slate-400 font-bold uppercase text-[9px]">SHARD</span>
            <span className="font-extrabold text-cyan-400 text-[10px]">{channel}</span>
          </div>

          <div className="flex items-center gap-1 text-[9px] text-slate-400 bg-black/60 px-1.5 py-0.5 rounded border border-slate-800">
            <Wifi className="w-2.5 h-2.5 text-cyan-400" />
            <span className={latencyMs < 100 ? 'text-emerald-400 font-bold' : latencyMs < 250 ? 'text-amber-400 font-bold' : 'text-rose-400 font-bold'}>
              {latencyMs > 0 ? `${latencyMs}ms` : '—'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-slate-400 font-bold uppercase text-[9px]">OPERATIVES:</span>
          </div>
          <span
            className={
              count > 0
                ? 'font-bold text-cyan-300 bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-500/30 text-[9px]'
                : 'font-bold text-slate-500 text-[9px]'
            }
          >
            {count} NEARBY
          </span>
        </div>

        {count > 0 ? (
          <div className="flex flex-wrap gap-1 max-w-[210px] pt-0.5">
            {peers.slice(0, 4).map(([socketId, p]) => (
              <button
                key={socketId}
                type="button"
                onClick={() => handleSelectPeer(socketId, p)}
                className="px-2 py-0.5 rounded-md bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-200 text-[9px] font-bold truncate max-w-[95px] transition-colors cursor-pointer active:scale-95"
                title={`Target ${p.name || 'Operative'}`}
              >
                {p.name || 'Operative'}
              </button>
            ))}
            {count > 4 && (
              <span className="text-cyan-400/80 self-center text-[9px] font-bold">+{count - 4}</span>
            )}
          </div>
        ) : (
          <div className="text-slate-500 italic text-[9px]">
            No operatives in sector range
          </div>
        )}
      </HudPanelShell>
    </div>
  );
}

