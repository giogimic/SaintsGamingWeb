'use client';

import { useGameStore } from './store';
import { QUEST_DB } from './data/quests';

export default function DialogOverlay() {
  const player = useGameStore(state => state.player);
  const activeDialog = useGameStore(state => state.activeDialog);
  const setGameMode = useGameStore(state => state.setGameMode);
  const setActiveDialog = useGameStore(state => state.setActiveDialog);
  const acceptQuest = useGameStore(state => state.acceptQuest);
  const completeQuest = useGameStore(state => state.completeQuest);
  const modifyInventory = useGameStore(state => state.modifyInventory);
  const modifyCredits = useGameStore(state => state.modifyCredits);
  const gainXp = useGameStore(state => state.gainXp);
  const showToast = useGameStore(state => state.showToast);

  if (!activeDialog) return null;

  const handleClose = () => {
    setActiveDialog(null);
    setGameMode('EXPLORING');
  };

  // Check if this NPC has a quest
  const npcQuest = Object.values(QUEST_DB).find(q => q.npcId === activeDialog.npcId);
  
  let currentText = activeDialog.text;
  let actionButtons = (
    <button 
      onClick={handleClose}
      className="px-6 py-2 bg-[#4f46e5] text-white font-bold font-mono rounded shadow hover:bg-[#4338ca] hover:scale-105 active:scale-95 transition-all"
    >
      [ NEXT ]
    </button>
  );

  if (npcQuest) {
    const isCompleted = player.completedQuests.includes(npcQuest.id);
    const isActive = !!player.activeQuests[npcQuest.id];

    if (isCompleted) {
      currentText = "Thank you for your help, traveler.";
    } else if (isActive) {
      // Check requirements
      const req = npcQuest.requirements;
      let reqMet = true;
      if (req.itemId && req.amount) {
        if ((player.inventory[req.itemId] || 0) < req.amount) {
          reqMet = false;
        }
      }

      if (reqMet) {
        currentText = npcQuest.dialogs.complete;
        actionButtons = (
          <button 
            onClick={() => {
              if (req.itemId && req.amount) {
                modifyInventory(req.itemId, -req.amount);
              }
              const rewards = npcQuest.rewards;
              if (rewards.credits) modifyCredits(rewards.credits);
              if (rewards.xp) gainXp(rewards.xp);
              if (rewards.itemId && rewards.amount) modifyInventory(rewards.itemId, rewards.amount);
              
              showToast(`Quest Completed: ${npcQuest.name}!`);
              completeQuest(npcQuest.id);
              handleClose();
            }}
            className="px-6 py-2 bg-[#16a34a] text-white font-bold font-mono rounded shadow hover:bg-[#15803d] hover:scale-105 active:scale-95 transition-all"
          >
            [ COMPLETE QUEST ]
          </button>
        );
      } else {
        currentText = npcQuest.dialogs.inProgress;
        actionButtons = (
          <button 
            onClick={handleClose}
            className="px-6 py-2 bg-[#4f46e5] text-white font-bold font-mono rounded shadow hover:bg-[#4338ca] hover:scale-105 active:scale-95 transition-all"
          >
            [ OK ]
          </button>
        );
      }
    } else {
      // Not started yet
      currentText = npcQuest.dialogs.start;
      actionButtons = (
        <div className="flex space-x-2">
          <button 
            onClick={handleClose}
            className="px-4 py-2 bg-gray-600 text-white font-bold font-mono rounded shadow hover:bg-gray-500 transition-all"
          >
            [ DECLINE ]
          </button>
          <button 
            onClick={() => {
              acceptQuest(npcQuest.id);
              showToast(`Quest Accepted: ${npcQuest.name}`);
              handleClose();
            }}
            className="px-6 py-2 bg-[#ca8a04] text-white font-bold font-mono rounded shadow hover:bg-[#a16207] hover:scale-105 active:scale-95 transition-all"
          >
            [ ACCEPT QUEST ]
          </button>
        </div>
      );
    }
  }

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
            <h3 className="text-[#a5b4fc] font-bold font-mono text-sm sm:text-lg mb-1 sm:mb-2 uppercase tracking-widest flex items-center justify-between">
              <span>{activeDialog.npcId === 'npc-1' ? 'Village Elder' : 'Stranger'}</span>
              {npcQuest && !player.completedQuests.includes(npcQuest.id) && (
                <span className="text-[#fef08a] text-xs bg-[#ca8a04]/20 px-2 py-1 rounded border border-[#ca8a04]">
                  {player.activeQuests[npcQuest.id] ? 'ACTIVE QUEST' : 'NEW QUEST'}
                </span>
              )}
            </h3>
            <p className="text-white font-mono text-xs sm:text-base leading-relaxed">
              {currentText}
            </p>
          </div>
          
          <div className="flex justify-end mt-4">
            {actionButtons}
          </div>
        </div>
      </div>
    </div>
  );
}
