import React from 'react';
import {
  Sparkles,
  Paintbrush,
  Globe,
  LogOut,
  Gamepad2,
  Newspaper,
  MessageSquare,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { useDesktopAuth } from '../providers/DesktopAuthProvider';
import { MidnightTropicalBackground } from '@/web/components/the-lobby/MidnightTropicalBackground';
import { canEnterStudio } from '@/shared/game/studioPermissions';

interface DesktopHomeScreenProps {
  onLaunchStudio: () => void;
}

export const DesktopHomeScreen: React.FC<DesktopHomeScreenProps> = ({ onLaunchStudio }) => {
  const { user, serverUrl, logout } = useDesktopAuth();
  const showStudio = canEnterStudio(user?.permissionLevel);

  const handleOpenExternal = (path: string) => {
    const base = serverUrl.replace(/\/+$/, '');
    const url = `${base}${path}`;
    try {
      (window as any).electronAPI?.openExternal?.(url);
    } catch {
      window.open(url, '_blank');
    }
  };

  const handleExit = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().close();
    } catch {
      (window as any).electronAPI?.close?.();
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden select-none">
      {/* ── Atmospheric Background ── */}
      <MidnightTropicalBackground showPalms={true} showWater={true} className="z-0" />

      {/* ── Main Content ── */}
      <div className="relative z-10 w-full max-w-lg space-y-6">
        {/* ── Brand Header ── */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 text-primary shadow-lg shadow-primary/20 mb-1">
            <Gamepad2 className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Saints <span className="sg-text-gradient">Gaming</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-1.5">Time To Play</p>
          </div>
          {user && (
            <p className="text-sm text-slate-300">
              Welcome back, <span className="text-primary font-semibold">{user.displayName || user.username}</span>
            </p>
          )}
        </div>

        {/* ── Primary Action: Launch World Studio (Dev/Admin only) ── */}
        {showStudio && (
          <button
            type="button"
            onClick={onLaunchStudio}
            className="group w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-primary/90 to-amber-500/90 hover:from-primary hover:to-amber-400 text-[#050b14] font-bold text-base transition-all duration-200 flex items-center justify-between shadow-xl shadow-primary/25 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center">
                <Paintbrush className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="block text-sm font-extrabold">Launch World Studio</span>
                <span className="block text-[11px] font-medium opacity-75">3D Voxel World Builder</span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}

        {/* ── Quick Links Grid ── */}
        <div className="grid grid-cols-3 gap-2.5">
          <QuickLinkCard
            icon={<Globe className="w-4 h-4" />}
            label="Website"
            onClick={() => handleOpenExternal('/')}
          />
          <QuickLinkCard
            icon={<Newspaper className="w-4 h-4" />}
            label="News"
            onClick={() => handleOpenExternal('/news')}
          />
          <QuickLinkCard
            icon={<MessageSquare className="w-4 h-4" />}
            label="Forum"
            onClick={() => handleOpenExternal('/forum')}
          />
        </div>

        {/* ── Footer Actions ── */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-slate-200 transition cursor-pointer py-1"
          >
            <LogOut className="w-3 h-3" />
            <span>Sign Out</span>
          </button>

          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Zap className="w-3 h-3 text-emerald-400" />
            <span className="font-mono truncate max-w-[160px]">{serverUrl.replace(/^https?:\/\//, '')}</span>
          </div>

          <button
            type="button"
            onClick={handleExit}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-red-400 transition cursor-pointer py-1"
          >
            <span>Exit</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Quick Link Card ── */
const QuickLinkCard: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({
  icon,
  label,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-card/40 hover:bg-card/70 border border-border/40 hover:border-primary/30 text-slate-300 hover:text-white transition-all duration-200 cursor-pointer"
  >
    <div className="text-primary/80 group-hover:text-primary transition">{icon}</div>
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);
