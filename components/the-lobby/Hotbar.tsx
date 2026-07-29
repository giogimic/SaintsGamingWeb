'use client';

import { useGameStore } from './store';

export default function Hotbar() {
  const { player, gameMode, combatTarget, emitSocketEvent } = useGameStore();
  const { equipment } = player;

  // Render a classic 6-slot hotbar
  const slots = [
    { key: '1', item: equipment.weapon, action: 'attack' },
    { key: '2', item: equipment.head, action: 'equip' },
    { key: '3', item: equipment.chest, action: 'equip' },
    { key: '4', item: equipment.legs, action: 'equip' },
    { key: '5', item: 'Tuxeball', action: 'capture' },
    { key: '6', item: null, action: 'none' },
  ];

  if (gameMode !== 'EXPLORING' && gameMode !== 'BATTLE') {
    return null; // Only show hotbar when exploring or in battle
  }

  const handleSlotClick = (slot: any) => {
    if (slot.action === 'capture' && combatTarget && emitSocketEvent) {
      emitSocketEvent("capture_attempt", {
        targetId: combatTarget.entityId,
        item: slot.item
      });
    } else if (slot.action === 'capture' && !combatTarget) {
      useGameStore.getState().showToast("You need a target to throw that!");
    }
  };

  return (
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-30 pointer-events-auto shadow-[2px_2px_10px_rgba(0,0,0,0.8)] p-1 bg-[#383024] border-2 border-[#52493d] border-t-[#7a6f5d] border-l-[#7a6f5d] rounded">
      {slots.map((slot, i) => (
        <div 
          key={i}
          onClick={() => handleSlotClick(slot)}
          className="relative w-10 h-10 bg-[#221c13] border-2 border-[#110e09] border-b-[#383024] border-r-[#383024] flex justify-center items-center group cursor-pointer hover:bg-[#383024] transition-colors"
        >
          {/* Keybind Hint */}
          <span className="absolute top-0 left-0.5 text-[8px] font-bold text-[#d5c3a3] drop-shadow-[1px_1px_0px_black] leading-none mt-0.5">{slot.key}</span>
          
          {/* Item Content */}
          {slot.item && (
            <span className="text-[#4ade80] text-[9px] font-mono break-all text-center leading-tight drop-shadow-[1px_1px_0px_black]">
              {slot.item.substring(0, 4)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
