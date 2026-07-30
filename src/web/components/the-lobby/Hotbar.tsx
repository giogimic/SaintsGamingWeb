'use client';

import { useGameStore } from './store';
import { useEffect, useState } from 'react';

export default function Hotbar() {
  const { player, gameMode, combatTarget, emitSocketEvent } = useGameStore();
  const [globalCooldown, setGlobalCooldown] = useState(0);
  const [now, setNow] = useState(Date.now());

  // Force re-render for GCD animation
  useEffect(() => {
    let frame: number;
    const loop = () => {
      setNow(Date.now());
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Default MMO abilities mock for now based on combat style
  const getAbilities = () => {
    if (player.combatStyle === 'MELEE') {
      return [
        { id: 'strike', name: 'Strike', icon: '⚔️', cooldownMs: 1500, type: 'damage' },
        { id: 'cleave', name: 'Cleave', icon: '🌪️', cooldownMs: 4000, type: 'damage' },
        { id: 'dash', name: 'Dash', icon: '💨', cooldownMs: 8000, type: 'utility' },
        { id: 'shout', name: 'War Cry', icon: '🗣️', cooldownMs: 12000, type: 'buff' },
      ];
    } else if (player.combatStyle === 'MAGIC') {
      return [
        { id: 'fireball', name: 'Fireball', icon: '🔥', cooldownMs: 2000, type: 'damage' },
        { id: 'frost', name: 'Frost Nova', icon: '❄️', cooldownMs: 6000, type: 'damage' },
        { id: 'blink', name: 'Blink', icon: '✨', cooldownMs: 8000, type: 'utility' },
        { id: 'shield', name: 'Mana Shield', icon: '🛡️', cooldownMs: 15000, type: 'buff' },
      ];
    } else {
      return [
        { id: 'shoot', name: 'Shoot', icon: '🏹', cooldownMs: 1200, type: 'damage' },
        { id: 'multishot', name: 'Volley', icon: '🌧️', cooldownMs: 5000, type: 'damage' },
        { id: 'trap', name: 'Snare', icon: '🕸️', cooldownMs: 10000, type: 'utility' },
        { id: 'heal', name: 'Bandage', icon: '🩹', cooldownMs: 20000, type: 'heal' },
      ];
    }
  };

  const abilities = getAbilities();

  const slots = [
    { key: '1', action: 'ability', ability: abilities[0] },
    { key: '2', action: 'ability', ability: abilities[1] },
    { key: '3', action: 'ability', ability: abilities[2] },
    { key: '4', action: 'ability', ability: abilities[3] },
    { key: '5', action: 'item', ability: { id: 'potion', name: 'Health Potion', icon: '❤️', cooldownMs: 1000 } },
    { key: '6', action: 'none', ability: null },
    { key: '7', action: 'none', ability: null },
    { key: '8', action: 'none', ability: null },
    { key: '9', action: 'none', ability: null },
  ];

  if (gameMode !== 'EXPLORING' && gameMode !== 'BATTLE') {
    return null;
  }

  const handleCast = (slot: any) => {
    const timeNow = Date.now();
    if (timeNow < globalCooldown) return; // GCD active
    
    if (slot.action === 'none' || !slot.ability) return;

    if (slot.action === 'ability') {
      if (!combatTarget && slot.ability.type === 'damage') {
        useGameStore.getState().showToast('You need a target to cast that!');
        return;
      }
      
      // Send cast to server
      emitSocketEvent?.('combat_cast', { 
        abilityId: slot.ability.id, 
        targetId: combatTarget?.entityId 
      });
      
      // Trigger GCD (1.5s standard MMO GCD)
      setGlobalCooldown(timeNow + 1500);
    }
  };

  // Keyboard shortcut listener mapped to keys 1-9
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      
      const key = e.key;
      const slotIndex = parseInt(key) - 1;
      if (slotIndex >= 0 && slotIndex < 9) {
        handleCast(slots[slotIndex]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [globalCooldown, combatTarget, emitSocketEvent, slots]);

  const gcdActive = now < globalCooldown;
  const gcdPercent = gcdActive ? Math.max(0, (globalCooldown - now) / 1500 * 100) : 0;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-30 pointer-events-auto sg-glass p-2 rounded-xl shadow-2xl border border-white/10">
      {slots.map((slot, i) => (
        <div 
          key={i}
          onClick={() => handleCast(slot)}
          className="relative w-12 h-12 bg-black/50 border border-white/10 rounded-lg flex flex-col justify-center items-center group cursor-pointer hover:border-violet-500/50 hover:bg-violet-900/20 transition-all overflow-hidden"
        >
          {/* Keybind Hint */}
          <span className="absolute top-1 left-1.5 text-[10px] font-mono font-bold text-white/50 group-hover:text-violet-300 transition-colors z-10">{slot.key}</span>
          
          {/* Item Content */}
          {slot.ability ? (
            <>
              <span className="text-2xl drop-shadow-md z-10">{slot.ability.icon}</span>
              {/* Cooldown Sweep Overlay */}
              {gcdActive && (
                <div 
                  className="absolute bottom-0 left-0 w-full bg-black/70 backdrop-blur-sm z-20"
                  style={{ height: `${gcdPercent}%` }}
                />
              )}
            </>
          ) : (
            <span className="text-white/10 text-xl font-bold">+</span>
          )}
        </div>
      ))}
    </div>
  );
}
