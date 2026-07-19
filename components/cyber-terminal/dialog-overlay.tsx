'use client';

import { useGameStore } from './store';

export default function DialogOverlay() {
  const activeDialog = useGameStore(state => state.activeDialog);
  const setGameMode = useGameStore(state => state.setGameMode);
  const setActiveDialog = useGameStore(state => state.setActiveDialog);

  if (!activeDialog) return null;

  const handleClose = () => {
    setActiveDialog(null);
    setGameMode('EXPLORING');
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center pointer-events-none pb-8 sm:pb-16 px-4">
      <div className="w-full max-w-2xl bg-[#1e1b4b]/95 border-4 border-[#818cf8] rounded-xl shadow-2xl pointer-events-auto flex p-4 sm:p-6 animate-in slide-in-from-bottom-10 fade-in duration-300">
        
        {/* Avatar Placeholder */}
        <div className="w-16 h-16 sm:w-24 sm:h-24 bg-[#312e81] border-2 border-[#818cf8] rounded overflow-hidden mr-4 sm:mr-6 flex-shrink-0 flex items-center justify-center">
          <div className="w-10 h-10 sm:w-16 sm:h-16 bg-[#6366f1] rounded-full opacity-50" />
        </div>

        {/* Dialog Content */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <h3 className="text-[#a5b4fc] font-bold font-mono text-sm sm:text-lg mb-1 sm:mb-2 uppercase tracking-widest">
              {activeDialog.npcId === 'npc-1' ? 'Village Elder' : 'Stranger'}
            </h3>
            <p className="text-white font-mono text-xs sm:text-base leading-relaxed">
              {activeDialog.text}
            </p>
          </div>
          
          <div className="flex justify-end mt-4">
            <button 
              onClick={handleClose}
              className="px-6 py-2 bg-[#4f46e5] text-white font-bold font-mono rounded shadow hover:bg-[#4338ca] hover:scale-105 active:scale-95 transition-all"
            >
              [ NEXT ]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
