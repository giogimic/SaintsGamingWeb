'use client';

import { useGameStore } from './store';
import { GamePanelShell } from './ui/GamePanelShell';
import { Users, Wifi } from 'lucide-react';

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
      ? `Ch. ${instanceId.match(/_ch(\d+)$/)?.[1]}`
      : instanceId
        ? '…'
        : '—';

  const handleSelectPeer = (socketId: string, peer: any) => {
    setCombatTarget({
      entityId: socketId,
      name: peer.name || 'Tamer',
      hp: 100,
      maxHp: 100,
      behavior: 'friendly',
    });
  };

  return (
    <div className="pointer-events-none flex flex-col font-mono" data-testid="peer-presence-hud">
      <GamePanelShell neonAccent="cyan" className="pointer-events-auto flex flex-col gap-1.5 px-3 py-2 text-[10px] leading-snug text-cyan-50 md:text-[11px] min-w-[210px]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full shrink-0 ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                  : connectionStatus === 'reconnecting' || connectionStatus === 'connecting'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-rose-500'
              }`}
              title={`Realtime: ${connectionStatus}`}
            />
            <span className="text-cyan-200/50 font-extrabold tracking-widest uppercase text-[9px]">Shard</span>
            <span className="font-extrabold text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">{channel}</span>
          </div>

          <div className="flex items-center gap-1 text-[9px] text-slate-400">
            <Wifi className="w-2.5 h-2.5 text-cyan-400/70" />
            <span className={latencyMs < 100 ? 'text-emerald-400' : latencyMs < 250 ? 'text-amber-400' : 'text-rose-400'}>
              {latencyMs > 0 ? `${latencyMs}ms` : '—'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 pt-1 border-t border-cyan-900/40">
          <Users className="w-3 h-3 text-cyan-400/80 shrink-0" />
          <span className="text-cyan-200/50 font-extrabold tracking-widest uppercase text-[9px]">Tamers:</span>
          <span
            className={
              count > 0
                ? 'font-extrabold text-magenta-400 drop-shadow-[0_0_5px_rgba(217,70,239,0.5)] ml-0.5'
                : 'font-extrabold text-cyan-200/50 ml-0.5'
            }
          >
            {count}
          </span>
        </div>

        {count > 0 ? (
          <div className="flex flex-wrap gap-1 max-w-[200px] pt-0.5">
            {peers.slice(0, 4).map(([socketId, p]) => (
              <button
                key={socketId}
                type="button"
                onClick={() => handleSelectPeer(socketId, p)}
                className="px-1.5 py-0.5 rounded bg-cyan-950/60 hover:bg-cyan-800/80 border border-cyan-700/40 text-cyan-200 text-[10px] truncate max-w-[90px] transition-colors cursor-pointer"
                title={`Target ${p.name || 'Tamer'}`}
              >
                {p.name || 'Tamer'}
              </button>
            ))}
            {count > 4 && (
              <span className="text-cyan-400/60 self-center text-[9px]">+{count - 4}</span>
            )}
          </div>
        ) : (
          <div className="text-cyan-200/40 italic text-[10px]">
            No other tamers nearby
          </div>
        )}
      </GamePanelShell>
    </div>
  );
}
