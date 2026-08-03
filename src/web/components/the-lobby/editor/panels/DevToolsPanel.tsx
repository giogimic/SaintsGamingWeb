'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import GameConfigEditor from '../GameConfigEditor';
import ClassEditor from '../ClassEditor';
import ServerControl from '../ServerControl';
import { TerminalSquare, UserCheck, Server, ShieldAlert } from 'lucide-react';
import {
  canUseStudioEngineConfig,
  canUseStudioServerControls,
} from '@/shared/game/studioPermissions';

export const DevToolsPanel: React.FC = () => {
  const { data: session } = useSession();
  const level = session?.user?.permissionLevel ?? 0;
  const canServer = canUseStudioServerControls(level);
  const canEngine = canUseStudioEngineConfig(level);

  const defaultTab: 'config' | 'classes' | 'server' = canServer
    ? 'server'
    : canEngine
      ? 'config'
      : 'server';
  const [activeTab, setActiveTab] = useState<'config' | 'classes' | 'server'>(defaultTab);

  if (!canServer && !canEngine) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-xs text-slate-400 font-mono">
        <ShieldAlert className="w-6 h-6 text-amber-500" />
        <p>Dev Tools require Admin+ (server) or Developer+ (engine config).</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden font-mono">
      <div className="flex bg-[#050b14]/80 border-b border-slate-800/80 p-1 gap-1 text-xs font-medium shrink-0">
        {canServer && (
          <button
            onClick={() => setActiveTab('server')}
            className={`flex-1 py-1 px-1.5 rounded flex items-center justify-center gap-1 transition-all ${
              activeTab === 'server'
                ? 'bg-gradient-to-r from-amber-600 to-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Server className="w-3 h-3 text-amber-400" /> Server Controls
          </button>
        )}
        {canEngine && (
          <button
            onClick={() => setActiveTab('config')}
            className={`flex-1 py-1 px-1.5 rounded flex items-center justify-center gap-1 transition-all ${
              activeTab === 'config'
                ? 'bg-gradient-to-r from-amber-600 to-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <TerminalSquare className="w-3 h-3" /> Engine Config
          </button>
        )}
        {canEngine && (
          <button
            onClick={() => setActiveTab('classes')}
            className={`flex-1 py-1 px-1.5 rounded flex items-center justify-center gap-1 transition-all ${
              activeTab === 'classes'
                ? 'bg-gradient-to-r from-amber-600 to-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <UserCheck className="w-3 h-3" /> Class Registry
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 min-h-[300px]">
        {activeTab === 'server' && canServer && <ServerControl />}
        {activeTab === 'config' && canEngine && <GameConfigEditor />}
        {activeTab === 'classes' && canEngine && <ClassEditor />}
        {activeTab === 'server' && !canServer && (
          <p className="p-4 text-xs text-slate-500">Admin+ required for server controls.</p>
        )}
        {(activeTab === 'config' || activeTab === 'classes') && !canEngine && (
          <p className="p-4 text-xs text-slate-500">Developer+ required for engine config.</p>
        )}
      </div>
    </div>
  );
};
