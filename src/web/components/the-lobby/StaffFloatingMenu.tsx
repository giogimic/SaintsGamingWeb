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
} from 'lucide-react';
import { useGameStore } from './store';
import { hasPermission, PERMISSION_LEVELS } from '@/web/lib/permissions';

interface StaffFloatingMenuProps {
  permissionLevel: number;
  /** When true, hide "Open Studio" (already on /studio) */
  isStudioRoute?: boolean;
}

export function StaffFloatingMenu({
  permissionLevel,
  isStudioRoute = false,
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
    emitSocketEvent?.('staff_announce', text);
    showToast('Announcement sent to this map');
    setAnnounce('');
  };

  const tpToPlayer = (socketId: string, name: string) => {
    const peer = (otherPlayers || {})[socketId];
    if (!peer) return;
    useGameStore.getState().setPlayerPosition({ x: peer.x, y: peer.y }, peer.direction || 'down', false);
    emitSocketEvent?.('player_move', { x: peer.x, y: peer.y, direction: peer.direction || 'down' });
    showToast(`Teleported to ${name}`);
  };

  const kickPlayer = (socketId: string, name: string) => {
    if (!isAdmin) return;
    if (!confirm(`Remove ${name} from the map?`)) return;
    emitSocketEvent?.('staff_kick', socketId);
    showToast(`Kick requested for ${name}`);
  };

  return (
    <div className="fixed bottom-24 left-4 z-[80] pointer-events-auto sm:bottom-8 sm:left-8">
      {open && (
        <div className="mb-3 w-[min(92vw,320px)] rounded-2xl border border-[#cbb26a]/40 bg-[#0c1220]/95 backdrop-blur-xl shadow-[0_0_40px_rgba(0,0,0,0.45)] overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#cbb26a]/20">
            <div className="flex items-center gap-2 text-[#e8d5a3] font-mono text-xs uppercase tracking-widest">
              <Shield className="w-4 h-4" />
              Staff Commands
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 space-y-3 max-h-[50vh] overflow-y-auto">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-mono mb-2 flex items-center gap-1">
                <Megaphone className="w-3 h-3" /> Map Announce
              </div>
              <div className="flex gap-2">
                <input
                  value={announce}
                  onChange={(e) => setAnnounce(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendAnnounce()}
                  placeholder="Message to players on this map…"
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-[#cbb26a]/50"
                />
                <button
                  onClick={sendAnnounce}
                  className="px-3 py-2 rounded-xl bg-[#cbb26a]/20 border border-[#cbb26a]/40 text-[#e8d5a3] text-xs font-bold hover:bg-[#cbb26a]/30 cursor-pointer"
                >
                  Send
                </button>
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-mono mb-2 flex items-center gap-1">
                <Users className="w-3 h-3" /> Nearby ({nearby.length})
              </div>
              {nearby.length === 0 ? (
                <p className="text-xs text-slate-500 px-1">No other players visible on this map.</p>
              ) : (
                <ul className="space-y-1">
                  {nearby.map((p) => (
                    <li
                      key={p.socketId}
                      className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-white/5 border border-white/5"
                    >
                      <span className="text-sm text-slate-200 truncate">{p.name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => tpToPlayer(p.socketId, p.name)}
                          className="p-1.5 rounded-md text-cyan-300 hover:bg-cyan-500/20 cursor-pointer"
                          title={`Teleport to ${p.name}`}
                        >
                          <MapPin className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => kickPlayer(p.socketId, p.name)}
                            className="p-1.5 rounded-md text-rose-300 hover:bg-rose-500/20 cursor-pointer"
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

            <div className="grid grid-cols-1 gap-2 pt-1">
              <a
                href="/admin"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 text-xs font-semibold hover:bg-white/10"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#cbb26a]" />
                Open Admin Panel
              </a>
              {isDev && !isStudioRoute && (
                <a
                  href="/studio"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#cbb26a]/15 border border-[#cbb26a]/40 text-[#e8d5a3] text-xs font-semibold hover:bg-[#cbb26a]/25"
                >
                  <Hammer className="w-3.5 h-3.5" />
                  Open Studio
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#0c1220]/90 border border-[#cbb26a]/45 text-[#e8d5a3] shadow-[0_0_25px_rgba(203,178,106,0.2)] backdrop-blur-md hover:bg-[#cbb26a]/15 active:scale-95 transition-all font-mono text-xs uppercase tracking-wider"
        title="Staff commands"
      >
        <Shield className="w-4 h-4" />
        <span>Staff</span>
        <ChevronUp className={`w-3.5 h-3.5 transition-transform ${open ? '' : 'rotate-180'}`} />
      </button>
    </div>
  );
}
