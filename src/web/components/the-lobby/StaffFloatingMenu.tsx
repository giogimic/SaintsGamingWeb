'use client';

import { useMemo, useState } from 'react';
import {
  Shield,
  Megaphone,
  Users,
  ExternalLink,
  Hammer,
  UserX,
  X,
  ChevronUp,
  MapPin,
  Send,
} from 'lucide-react';
import { useGameStore } from './store';
import { hasPermission, PERMISSION_LEVELS } from '@/web/lib/permissions';
import { HudPanelShell } from './hud/HudPanelShell';
import { soundSynth } from '@/engine/sound-synth';

interface StaffFloatingMenuProps {
  permissionLevel: number;
}

export function StaffFloatingMenu({
  permissionLevel,
}: StaffFloatingMenuProps) {
  const [open, setOpen] = useState(false);
  const [announce, setAnnounce] = useState('');
  const otherPlayers = useGameStore((s) => s.otherPlayers);
  const emitSocketEvent = useGameStore((s) => s.emitSocketEvent);
  const showToast = useGameStore((s) => s.showToast);

  const isMod = hasPermission(permissionLevel, PERMISSION_LEVELS.MODERATOR);
  const isAdmin = hasPermission(permissionLevel, PERMISSION_LEVELS.ADMIN);
  const isDev = hasPermission(permissionLevel, PERMISSION_LEVELS.DEVELOPER);

  const nearby = useMemo(
    () =>
      Object.entries(otherPlayers || {}).map(([socketId, p]) => ({
        socketId,
        name: p.name || 'Unknown',
      })),
    [otherPlayers]
  );

  if (!isMod) return null;

  const sendAnnounce = () => {
    const text = announce.trim();
    if (!text) return;
    soundSynth?.playActionSound?.();
    emitSocketEvent?.('staff_announce', text);
    showToast('Announcement sent to this map');
    setAnnounce('');
  };

  const tpToPlayer = (socketId: string, name: string) => {
    const peer = (otherPlayers || {})[socketId];
    if (!peer) return;
    soundSynth?.playActionSound?.();
    useGameStore.getState().setPlayerPosition({ x: peer.x, y: peer.y }, peer.direction || 'down', false);
    emitSocketEvent?.('player_move', { x: peer.x, y: peer.y, direction: peer.direction || 'down' });
    showToast(`Teleported to ${name}`);
  };

  const kickPlayer = (socketId: string, name: string) => {
    if (!isAdmin) return;
    if (!confirm(`Remove ${name} from the map?`)) return;
    soundSynth?.playActionSound?.();
    emitSocketEvent?.('staff_kick', socketId);
    showToast(`Kick requested for ${name}`);
  };

  return (
    <div className="fixed bottom-24 left-4 z-[80] pointer-events-auto sm:bottom-8 sm:left-8 select-none font-mono">
      {open && (
        <div className="mb-3 w-[min(92vw,340px)] animate-in fade-in slide-in-from-bottom-2">
          <HudPanelShell
            title="STAFF CONTROLS"
            icon={<Shield className="w-4 h-4 text-amber-400" />}
            onClose={() => {
              soundSynth?.playSelectSound?.();
              setOpen(false);
            }}
            headerRight={
              <span className="text-[9px] font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40 uppercase">
                {isAdmin ? 'ADMIN' : 'MOD'}
              </span>
            }
          >
            <div className="p-3 space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1.5 flex items-center gap-1.5">
                  <Megaphone className="w-3.5 h-3.5 text-amber-400" /> Map Announce
                </div>
                <div className="flex gap-1.5">
                  <input
                    value={announce}
                    onChange={(e) => setAnnounce(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendAnnounce()}
                    placeholder="Message to players on this map…"
                    className="flex-1 bg-black/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={sendAnnounce}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-cyan-400" /> Nearby Saints ({nearby.length})
                </div>
                {nearby.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic p-2 bg-black/40 rounded-lg border border-slate-800">
                    No other saints visible on this map.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {nearby.map((p) => (
                      <li
                        key={p.socketId}
                        className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-black/60 border border-slate-800"
                      >
                        <span className="text-xs text-slate-200 font-bold truncate">{p.name}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => tpToPlayer(p.socketId, p.name)}
                            className="p-1 rounded-md bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 transition-colors cursor-pointer"
                            title={`Teleport to ${p.name}`}
                          >
                            <MapPin className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => kickPlayer(p.socketId, p.name)}
                              className="p-1 rounded-md bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-300 transition-colors cursor-pointer"
                              title="Remove from map"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="grid grid-cols-1 gap-1.5 pt-1 border-t border-slate-800">
                <a
                  href="/admin"
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-black/60 border border-slate-700 text-slate-200 text-xs font-bold hover:bg-slate-900 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                  Open Admin Dashboard
                </a>
              </div>
            </div>
          </HudPanelShell>
        </div>
      )}

      <button
        onClick={() => {
          soundSynth?.playSelectSound?.();
          setOpen((v) => !v)}
        }
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-black/80 border border-amber-500/40 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.2)] backdrop-blur-md hover:bg-amber-950/40 active:scale-95 transition-all font-mono text-xs uppercase font-bold cursor-pointer"
        title="Staff commands"
        style={{
          clipPath: 'polygon(6px 0%, 100% 0%, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0% 100%, 0% 6px)',
        }}
      >
        <Shield className="w-4 h-4 text-amber-400" />
        <span>Staff</span>
        <ChevronUp className={`w-3.5 h-3.5 transition-transform ${open ? '' : 'rotate-180'}`} />
      </button>
    </div>
  );
}

