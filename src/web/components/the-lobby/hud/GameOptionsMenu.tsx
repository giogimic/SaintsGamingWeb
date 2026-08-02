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
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm pointer-events-auto p-4">
      <div className="w-full max-w-4xl h-[600px] bg-white border-4 border-slate-200 rounded-[2rem] shadow-2xl flex overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Sidebar */}
        <div className="w-64 bg-slate-50 border-r-2 border-slate-100 flex flex-col">
          <div className="p-6 border-b-2 border-slate-100">
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Settings</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
          
          {/* Bottom Actions */}
          <div className="p-4 border-t-2 border-slate-100">
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
        <div className="flex-1 flex flex-col relative bg-white">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all z-10"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="flex-1 p-10 overflow-y-auto">
            <h3 className="text-3xl font-extrabold text-slate-800 mb-8 border-b-2 border-slate-100 pb-4">
              {tabs.find(t => t.id === activeTab)?.label}
            </h3>
            
            {activeTab === 'GAME' && (
              <div className="space-y-6">
                <div className="bg-slate-50 border-2 border-slate-100 p-6 rounded-3xl">
                  <h4 className="text-sm font-extrabold text-slate-400 mb-4 uppercase tracking-widest">Display</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-slate-800 font-extrabold text-lg">Fullscreen Mode</div>
                      <div className="text-slate-500 text-sm mt-1 font-medium">Play the game in full screen for the best experience.</div>
                    </div>
                    <button
                      onClick={onToggleFullscreen}
                      className="px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white rounded-xl font-extrabold transition-all active:scale-95 shadow-[0_4px_0_0_#2563eb] hover:shadow-[0_2px_0_0_#2563eb] hover:translate-y-[2px]"
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
        </div>
      </div>
    </div>
  );
}
