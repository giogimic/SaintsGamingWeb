'use client';

import { useState } from 'react';
import { useGameStore } from '../store';
import { X, Monitor, Volume2, Gamepad2, Settings2, Layout, Sliders, LogOut } from 'lucide-react';

interface GameOptionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isAdminUser: boolean;
  isCreationMode: boolean;
  onToggleDevEditor: () => void;
}

type TabType = 'GAME' | 'GRAPHICS' | 'AUDIO' | 'CONTROLS' | 'INTERFACE' | 'GAMEPLAY';

export default function GameOptionsMenu({
  isOpen,
  onClose,
  isFullscreen,
  onToggleFullscreen,
  isAdminUser,
  isCreationMode,
  onToggleDevEditor,
}: GameOptionsMenuProps) {
  const [activeTab, setActiveTab] = useState<TabType>('GAME');
  const isUiEditMode = useGameStore((state) => state.isUiEditMode);
  const setIsUiEditMode = useGameStore((state) => state.setIsUiEditMode);

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'GAME', label: 'Game', icon: <Settings2 className="w-4 h-4" /> },
    { id: 'GRAPHICS', label: 'Graphics', icon: <Monitor className="w-4 h-4" /> },
    { id: 'AUDIO', label: 'Audio', icon: <Volume2 className="w-4 h-4" /> },
    { id: 'CONTROLS', label: 'Controls', icon: <Gamepad2 className="w-4 h-4" /> },
    { id: 'INTERFACE', label: 'Interface', icon: <Layout className="w-4 h-4" /> },
    { id: 'GAMEPLAY', label: 'Gameplay', icon: <Sliders className="w-4 h-4" /> },
  ];

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-auto">
      <div className="w-[800px] h-[550px] bg-[#0a0a0f]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Sidebar */}
        <div className="w-48 bg-black/40 border-r border-white/5 flex flex-col">
          <div className="p-5 border-b border-white/5">
            <h2 className="text-xl font-bold text-white tracking-wide font-mono">OPTIONS</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
          
          {/* Bottom Actions */}
          <div className="p-3 border-t border-white/5">
            <button
              onClick={() => window.location.href = '/'}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/20 rounded-lg text-sm font-medium transition-all active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              Leave Game
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all z-10"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex-1 p-8 overflow-y-auto">
            <h3 className="text-2xl font-bold text-white mb-8 border-b border-white/10 pb-4 font-mono">
              {tabs.find(t => t.id === activeTab)?.label} Settings
            </h3>
            
            {activeTab === 'GAME' && (
              <div className="space-y-6">
                <div className="bg-black/30 border border-white/5 p-5 rounded-xl">
                  <h4 className="text-sm font-semibold text-amber-400 mb-4 uppercase tracking-wider">Display</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">Fullscreen Mode</div>
                      <div className="text-slate-400 text-sm mt-1">Play the game in full screen for the best experience.</div>
                    </div>
                    <button
                      onClick={onToggleFullscreen}
                      className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-white/10 rounded-lg text-sm font-medium transition-all active:scale-95 shadow-lg"
                    >
                      {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'INTERFACE' && (
              <div className="space-y-6">
                <div className="bg-black/30 border border-white/5 p-5 rounded-xl">
                  <h4 className="text-sm font-semibold text-amber-400 mb-4 uppercase tracking-wider">Customization</h4>
                  
                  {isAdminUser && (
                    <div className="flex items-center justify-between p-3 bg-black/40 border border-[#806f47]/30 rounded mb-6">
                      <span className="text-slate-300 font-bold text-xs uppercase">Studio Editor Mode (Ctrl+E)</span>
                      <button 
                        onClick={onToggleDevEditor}
                        className={`w-10 h-5 rounded-full relative transition-colors ${isCreationMode ? 'bg-[#cbb26a]' : 'bg-slate-700'}`}
                      >
                        <div className={`absolute top-0.5 bottom-0.5 w-4 rounded-full bg-black transition-all ${isCreationMode ? 'left-[22px]' : 'left-0.5'}`} />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="text-white font-medium">Edit UI Layout</div>
                      <div className="text-slate-400 text-sm mt-1">Unlock and drag HUD elements to reposition them.</div>
                    </div>
                    <button
                      onClick={() => setIsUiEditMode(!isUiEditMode)}
                      className={`px-5 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 shadow-lg border ${
                        isUiEditMode 
                          ? 'bg-amber-600/40 text-amber-300 border-amber-500/40' 
                          : 'bg-slate-800 hover:bg-slate-700 text-white border-white/10'
                      }`}
                    >
                      {isUiEditMode ? 'Editing...' : 'Edit Layout'}
                    </button>
                  </div>
                  

                </div>
              </div>
            )}

            {/* Placeholders for other tabs */}
            {(activeTab === 'GRAPHICS' || activeTab === 'AUDIO' || activeTab === 'CONTROLS' || activeTab === 'GAMEPLAY') && (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                <Settings2 className="w-12 h-12 mb-3 opacity-20" />
                <p>Additional settings coming soon.</p>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
