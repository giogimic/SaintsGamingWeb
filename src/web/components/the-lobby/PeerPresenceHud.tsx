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
      <div className="lobby-panel rounded-lg px-2.5 py-1.5 text-[10px] leading-snug text-lobby-mist shadow-lg md:text-[11px]">
        <div className="flex items-center gap-2">
          <span className="text-lobby-fog/80">Shard</span>
          <span className="font-semibold text-lobby-film">{channel}</span>
          <span className="text-lobby-fog/50">·</span>
          <span className="text-lobby-fog/80">Nearby</span>
          <span
            className={
              count > 0
                ? 'font-bold text-amber-200'
                : 'font-semibold text-lobby-fog/70'
            }
          >
            {count}
          </span>
        </div>
        {count > 0 ? (
          <div className="mt-0.5 max-w-[14rem] truncate text-amber-100/90">
            {names}
            {extra}
          </div>
        ) : (
          <div className="mt-0.5 max-w-[14rem] text-lobby-fog/55">
            No other tamers on this seat
          </div>
        )}
      </div>
    </div>
  );
}
