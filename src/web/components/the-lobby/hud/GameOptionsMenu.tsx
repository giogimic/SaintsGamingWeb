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
  const isEditingInterface = useGameStore((state) => state.isEditingInterface);
  const setIsEditingInterface = useGameStore((state) => state.setIsEditingInterface);
  const mobileControlMode = useGameStore((state) => state.mobileControlMode);
  const setMobileControlMode = useGameStore((state) => state.setMobileControlMode);

  const enterViewfinderEdit = () => {
    setIsEditingInterface(true);
    onClose(); // Auto-close options so the HUD is immediately editable
  };

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'GAME', label: 'Game', icon: <Settings2 className="w-5 h-5" /> },
    { id: 'GRAPHICS', label: 'Graphics', icon: <Monitor className="w-5 h-5" /> },
    { id: 'AUDIO', label: 'Audio', icon: <Volume2 className="w-5 h-5" /> },
    { id: 'CONTROLS', label: 'Controls', icon: <Gamepad2 className="w-5 h-5" /> },
    { id: 'INTERFACE', label: 'Interface', icon: <Layout className="w-5 h-5" /> },
    { id: 'GAMEPLAY', label: 'Gameplay', icon: <Sliders className="w-5 h-5" /> },
  ];

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm pointer-events-auto p-2 sm:p-4">
      <div className="flex h-[min(600px,92dvh)] w-full max-w-4xl flex-col overflow-hidden rounded-[1.5rem] border-4 border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 sm:rounded-[2rem] md:h-[600px] md:flex-row">
        
        {/* Sidebar — horizontal scroll tabs on phones */}
        <div className="flex shrink-0 flex-col border-b-2 border-slate-100 bg-slate-50 md:w-64 md:border-b-0 md:border-r-2">
          <div className="flex items-center justify-between px-4 py-3 md:block md:border-b-2 md:border-slate-100 md:p-6">
            <h2 className="text-xl font-extrabold tracking-tight text-slate-800 md:text-2xl">Settings</h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-all md:hidden"
              aria-label="Close settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-1 md:flex-col md:space-y-2 md:overflow-y-auto md:p-4 md:pb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all md:w-full md:gap-3 md:rounded-2xl md:px-4 md:py-3 md:text-sm ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
          
          {/* Bottom Actions */}
          <div className="hidden border-t-2 border-slate-100 p-4 md:block">
            <button
              onClick={() => window.location.href = '/'}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-extrabold transition-all active:scale-95 border-2 border-rose-100"
            >
              <LogOut className="w-5 h-5" />
              Leave Game
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="relative flex min-h-0 flex-1 flex-col bg-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 hidden p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 rounded-full md:top-6 md:right-6 md:block"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10">
            <h3 className="mb-4 border-b-2 border-slate-100 pb-3 text-2xl font-extrabold text-slate-800 sm:mb-6 md:mb-8 md:pb-4 md:text-3xl">
              {tabs.find(t => t.id === activeTab)?.label}
            </h3>
            
            {activeTab === 'GAME' && (
              <div className="space-y-6">
                <div className="rounded-3xl border-2 border-slate-100 bg-slate-50 p-4 sm:p-6">
                  <h4 className="mb-4 text-sm font-extrabold uppercase tracking-widest text-slate-400">Display</h4>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-lg font-extrabold text-slate-800">Fullscreen Mode</div>
                      <div className="mt-1 text-sm font-medium text-slate-500">Best on phones when the browser allows it (iOS may block).</div>
                    </div>
                    <button
                      onClick={onToggleFullscreen}
                      className="shrink-0 rounded-xl bg-blue-500 px-5 py-3 font-extrabold text-white shadow-[0_4px_0_0_#2563eb] transition-all hover:bg-blue-400 hover:translate-y-[2px] hover:shadow-[0_2px_0_0_#2563eb] active:scale-95"
                    >
                      {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'INTERFACE' && (
              <div className="space-y-6">
                <div className="bg-slate-50 border-2 border-slate-100 p-6 rounded-3xl">
                  <h4 className="text-sm font-extrabold text-slate-400 mb-4 uppercase tracking-widest">Customization</h4>
                  
                  {isAdminUser && (
                    <div className="flex items-center justify-between p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl mb-6">
                      <span className="text-amber-700 font-extrabold text-sm uppercase">Studio Editor Mode (Ctrl+E)</span>
                      <button 
                        onClick={onToggleDevEditor}
                        className={`w-12 h-6 rounded-full relative transition-colors border-2 ${isCreationMode ? 'bg-amber-400 border-amber-500' : 'bg-slate-200 border-slate-300'}`}
                      >
                        <div className={`absolute top-0.5 bottom-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${isCreationMode ? 'left-[24px]' : 'left-0.5'}`} />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-2 gap-4">
                    <div>
                      <div className="text-slate-800 font-extrabold text-lg">Edit Interface</div>
                      <div className="text-slate-500 text-sm mt-1 font-medium">
                        Opens Viewfinder Edit Mode — this menu closes so you can drag the HUD.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={enterViewfinderEdit}
                      disabled={isEditingInterface}
                      className="px-6 py-3 rounded-xl font-extrabold transition-all active:scale-95 bg-[#10B981] text-white shadow-[0_4px_0_0_#059669] hover:translate-y-[2px] disabled:opacity-60"
                    >
                      Edit Interface
                    </button>
                  </div>
                  
                </div>
              </div>
            )}

            {activeTab === 'CONTROLS' && (
              <div className="space-y-6">
                <div className="bg-slate-50 border-2 border-slate-100 p-6 rounded-3xl">
                  <h4 className="text-sm font-extrabold text-slate-400 mb-4 uppercase tracking-widest">
                    Mobile Touch
                  </h4>
                  <div className="text-slate-800 font-extrabold text-lg mb-1">Movement Style</div>
                  <div className="text-slate-500 text-sm mb-5 font-medium">
                    Default is a floating joystick that appears where you touch. Switch to a fixed D-Pad anytime.
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setMobileControlMode('floating')}
                      className={`px-4 py-4 rounded-2xl font-extrabold text-sm border-2 transition-all ${
                        mobileControlMode === 'floating'
                          ? 'bg-blue-500 text-white border-blue-600 shadow-md'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Floating Joystick
                    </button>
                    <button
                      onClick={() => setMobileControlMode('dpad')}
                      className={`px-4 py-4 rounded-2xl font-extrabold text-sm border-2 transition-all ${
                        mobileControlMode === 'dpad'
                          ? 'bg-blue-500 text-white border-blue-600 shadow-md'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Static D-Pad
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Placeholders for other tabs */}
            {(activeTab === 'GRAPHICS' || activeTab === 'AUDIO' || activeTab === 'GAMEPLAY') && (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                <Settings2 className="w-16 h-16 mb-4 opacity-20" />
                <p className="font-extrabold text-lg">Coming Soon</p>
              </div>
            )}
            
          </div>

          <div className="border-t-2 border-slate-100 p-3 md:hidden">
            <button
              onClick={() => window.location.href = '/'}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-rose-100 bg-rose-50 px-4 py-3 font-extrabold text-rose-600 transition-all active:scale-95"
            >
              <LogOut className="w-5 h-5" />
              Leave Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
