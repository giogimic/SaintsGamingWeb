'use client';

import React, { useState } from 'react';
import AssetEditor from '../AssetEditor';
import SpriteBrowser from '../SpriteBrowser';
import { ImageIcon, Layers } from 'lucide-react';

export const AssetBrowserPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'manager' | 'sprites'>('manager');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex bg-[#050b14]/80 border-b border-slate-800/80 p-1 gap-1 text-xs font-medium shrink-0">
        <button
          onClick={() => setActiveTab('manager')}
          className={`flex-1 py-1 px-1.5 rounded flex items-center justify-center gap-1 transition-all ${
            activeTab === 'manager'
              ? 'bg-gradient-to-r from-amber-600 to-amber-600 text-white shadow' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Layers className="w-3 h-3" /> Asset Manager
        </button>
        <button
          onClick={() => setActiveTab('sprites')}
          className={`flex-1 py-1 px-1.5 rounded flex items-center justify-center gap-1 transition-all ${
            activeTab === 'sprites'
              ? 'bg-gradient-to-r from-amber-600 to-amber-600 text-white shadow' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <ImageIcon className="w-3 h-3" /> Sprite Browser
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 min-h-[300px]">
        {activeTab === 'manager' && <AssetEditor />}
        {activeTab === 'sprites' && <SpriteBrowser onSelect={() => {}} />}
      </div>
    </div>
  );
};
