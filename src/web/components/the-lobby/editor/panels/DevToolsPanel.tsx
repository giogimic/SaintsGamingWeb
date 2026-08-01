'use client';

import React, { useState } from 'react';
import GameConfigEditor from '../GameConfigEditor';
import ClassEditor from '../ClassEditor';
import ServerControl from '../ServerControl';
import { TerminalSquare, UserCheck, Server } from 'lucide-react';

export const DevToolsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'config' | 'classes' | 'server'>('server');

  return (
    <div className="flex flex-col h-full overflow-hidden font-mono">
      <div className="flex bg-[#050b14]/80 border-b border-slate-800/80 p-1 gap-1 text-xs font-medium shrink-0">
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
      </div>

      <div className="flex-1 overflow-y-auto p-2 min-h-[300px]">
        {activeTab === 'server' && <ServerControl />}
        {activeTab === 'config' && <GameConfigEditor />}
        {activeTab === 'classes' && <ClassEditor />}
      </div>
    </div>
  );
};
