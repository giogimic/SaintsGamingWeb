'use client';

import { useGameStore } from './store';

/**
 * Always-visible peer strip for /lobby — separates "socket seat ok" from
 * "sprite off-camera / mistaken for NPC". Shows shard + nearby names.
 */
export default function PeerPresenceHud() {
  const otherPlayers = useGameStore((s) => s.otherPlayers);
  const instanceId = useGameStore((s) => s.instanceId);
  const peers = Object.entries(otherPlayers || {});
  const count = peers.length;
  const channel =
    instanceId && /_ch(\d+)$/.test(instanceId)
      ? `Ch. ${instanceId.match(/_ch(\d+)$/)?.[1]}`
      : instanceId
        ? '…'
        : '—';
  const names = peers
    .map(([, p]) => p.name || 'Tamer')
    .slice(0, 4)
    .join(', ');
  const extra = count > 4 ? ` +${count - 4}` : '';

  return (
    <div
      className="pointer-events-none absolute z-30 font-mono md:top-14 md:left-3"
      style={{
        top: 'max(3.25rem, calc(env(safe-area-inset-top, 0px) + 2.75rem))',
        left: 'max(0.5rem, env(safe-area-inset-left, 0px))',
      }}
      data-testid="peer-presence-hud"
    >
      <div className="flex flex-col gap-1 rounded-xl border border-[#22d3ee]/30 bg-[#050b14]/90 px-3 py-2 text-[10px] leading-snug text-cyan-50 shadow-[0_0_15px_rgba(34,211,238,0.15)] backdrop-blur-md md:text-[11px]">
        <div className="flex items-center gap-2">
          <span className="text-cyan-200/50 font-extrabold tracking-widest uppercase">Shard</span>
          <span className="font-extrabold text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">{channel}</span>
          <span className="text-cyan-200/30">·</span>
          <span className="text-cyan-200/50 font-extrabold tracking-widest uppercase">Nearby</span>
          <span
            className={
              count > 0
                ? 'font-extrabold text-magenta-400 drop-shadow-[0_0_5px_rgba(217,70,239,0.5)]'
                : 'font-extrabold text-cyan-200/50'
            }
          >
            {count}
          </span>
        </div>
        {count > 0 ? (
          <div className="max-w-[14rem] truncate text-cyan-100/90 font-medium">
            {names}
            {extra}
          </div>
        ) : (
          <div className="max-w-[14rem] text-cyan-200/40 italic">
            No other tamers on this seat
          </div>
        )}
      </div>
    </div>
  );
}
