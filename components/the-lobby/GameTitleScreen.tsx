'use client';

import { useGameStore } from './store';
import { Play, Settings, Users } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function GameTitleScreen() {
  const { data: session, status } = useSession();
  const setGameMode = useGameStore((state) => state.setGameMode);

  const handleStart = () => {
    if (status === 'authenticated') {
      setGameMode('SERVER_SELECT');
    } else {
      setGameMode('LOGIN'); 
    }
  };

  return (
    <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="absolute inset-0 pointer-events-none opacity-20" 
           style={{ backgroundImage: 'radial-gradient(circle at center, #2a1f3d 0%, #000 100%)' }} />

      <div className="relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-1000">
        <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-amber-600 mb-2 drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] font-serif tracking-widest">
          SAINTS
        </h1>
        <h2 className="text-2xl font-bold text-amber-100/50 tracking-[0.5em] mb-12 uppercase">
          Online
        </h2>

        <div className="flex flex-col gap-4 w-64">
          <button 
            onClick={handleStart}
            className="group relative flex items-center justify-center gap-3 w-full py-4 bg-gradient-to-r from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 border-2 border-amber-400/50 rounded-xl text-amber-50 font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(217,119,6,0.4)] transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(217,119,6,0.6)]"
          >
            <Play size={20} className="group-hover:animate-pulse" />
            Enter World
          </button>
          
          <button className="flex items-center justify-center gap-3 w-full py-3 bg-black/50 hover:bg-black/80 border border-white/10 hover:border-white/20 rounded-xl text-gray-300 transition-all">
            <Users size={18} />
            Credits
          </button>
          
          <button className="flex items-center justify-center gap-3 w-full py-3 bg-black/50 hover:bg-black/80 border border-white/10 hover:border-white/20 rounded-xl text-gray-300 transition-all">
            <Settings size={18} />
            Options
          </button>
        </div>
        
        {status === 'authenticated' && (
          <div className="mt-12 text-sm text-gray-500 font-mono">
            Signed in as <span className="text-amber-500/70">{session?.user?.name || 'Player'}</span>
          </div>
        )}
      </div>
    </div>
  );
}
