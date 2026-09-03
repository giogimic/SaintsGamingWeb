import React, { useState, useEffect } from 'react';
import { Gamepad2, Minus, Square, Copy, X, Wifi, User, LogOut, ArrowLeft } from 'lucide-react';
import { useDesktopAuth } from '../providers/DesktopAuthProvider';

type AppView = 'home' | 'studio';

export const DesktopTitlebar: React.FC<{ activeMapTitle?: string; appView?: AppView }> = ({
  activeMapTitle,
  appView = 'home',
}) => {
  const { user, serverUrl, logout } = useDesktopAuth();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    // Listen for Electron maximize changes
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.onMaximizeChange) {
      electronAPI.onMaximizeChange((val: boolean) => setIsMaximized(val));
    }

    // Tauri fallback
    const checkMaximized = async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const appWindow = getCurrentWindow();
        setIsMaximized(await appWindow.isMaximized());
        unlisten = await appWindow.onResized(async () => {
          setIsMaximized(await appWindow.isMaximized());
        });
      } catch {
        // Not in Tauri
      }
    };
    checkMaximized();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleMinimize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().minimize();
    } catch {
      (window as any).electronAPI?.minimize?.();
    }
  };

  const handleMaximize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().toggleMaximize();
    } catch {
      (window as any).electronAPI?.toggleMaximize?.();
    }
  };

  const handleClose = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().close();
    } catch {
      (window as any).electronAPI?.close?.();
    }
  };

  return (
    <div
      data-tauri-drag-region
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      className="h-9 w-full bg-[#050b14]/95 border-b border-border/40 flex items-center justify-between px-3 select-none text-xs z-50 text-slate-300"
    >
      {/* Left: Brand Icon & Title */}
      <div className="flex items-center gap-2.5 pointer-events-none">
        <div className="w-5 h-5 rounded bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
          <Gamepad2 className="w-3 h-3" />
        </div>
        <span className="font-bold tracking-tight text-white flex items-center gap-1.5">
          <span>Saints Gaming</span>
          {activeMapTitle && appView === 'studio' && (
            <>
              <span className="text-slate-600">•</span>
              <span className="text-primary font-normal text-[11px]">World Studio</span>
              <span className="text-slate-600">—</span>
              <span className="text-slate-400 font-normal text-[11px]">{activeMapTitle}</span>
            </>
          )}
        </span>
      </div>

      {/* Center: Server Status Indicator */}
      <div className="hidden sm:flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-card/60 border border-border/30 text-[10px] text-muted-foreground pointer-events-none">
        <Wifi className="w-3 h-3 text-emerald-400" />
        <span className="truncate max-w-[180px]">{serverUrl}</span>
      </div>

      {/* Right: User & Window Controls */}
      <div className="flex items-center gap-2" data-no-drag style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {user && (
          <div className="flex items-center gap-2 mr-2">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
              <User className="w-3 h-3 text-primary" />
              <span>{user.displayName || user.username}</span>
            </div>
            <button
              onClick={logout}
              className="p-1 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Windows Control Buttons */}
        <div className="flex items-center">
          <button
            onClick={handleMinimize}
            className="w-8 h-8 flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleMaximize}
            className="w-8 h-8 flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? <Copy className="w-3 h-3 rotate-180" /> : <Square className="w-3 h-3" />}
          </button>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-red-600 text-slate-400 hover:text-white transition cursor-pointer"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

