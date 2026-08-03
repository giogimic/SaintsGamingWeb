'use client';

import { useGameStore } from './store';
import { useEffect, useState } from 'react';
import { isForbiddenRtCaptureAbility } from '@/shared/game/combatAbilities';

type HotbarAbility = {
  id: string;
  name: string;
  icon: string;
  cooldownMs: number;
  type?: string;
};

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

  // RT MMO abilities only — capture tools are turn-based (bible 07 / 11)
  const getAbilities = (): HotbarAbility[] => {
    let list: HotbarAbility[];
    if (player.combatStyle === 'MELEE') {
      list = [
        { id: 'strike', name: 'Strike', icon: '⚔️', cooldownMs: 1500, type: 'damage' },
        { id: 'cleave', name: 'Cleave', icon: '🌪️', cooldownMs: 4000, type: 'damage' },
        { id: 'dash', name: 'Dash', icon: '💨', cooldownMs: 8000, type: 'utility' },
        { id: 'shout', name: 'War Cry', icon: '🗣️', cooldownMs: 12000, type: 'buff' },
      ];
    } else if (player.combatStyle === 'MAGIC') {
      list = [
        { id: 'fireball', name: 'Fireball', icon: '🔥', cooldownMs: 2000, type: 'damage' },
        { id: 'frost', name: 'Frost Nova', icon: '❄️', cooldownMs: 6000, type: 'damage' },
        { id: 'blink', name: 'Blink', icon: '✨', cooldownMs: 8000, type: 'utility' },
        { id: 'shield', name: 'Mana Shield', icon: '🛡️', cooldownMs: 15000, type: 'buff' },
      ];
    } else {
      list = [
        { id: 'shoot', name: 'Shoot', icon: '🏹', cooldownMs: 1200, type: 'damage' },
        { id: 'multishot', name: 'Volley', icon: '🌧️', cooldownMs: 5000, type: 'damage' },
        { id: 'trap', name: 'Snare', icon: '🕸️', cooldownMs: 10000, type: 'utility' },
        { id: 'heal', name: 'Bandage', icon: '🩹', cooldownMs: 20000, type: 'heal' },
      ];
    }
    return list.filter((a) => !isForbiddenRtCaptureAbility(a.id));
  };

  const abilities = getAbilities();

  const slots = [
    { key: '1', action: 'ability', ability: abilities[0] },
    { key: '2', action: 'ability', ability: abilities[1] },
    { key: '3', action: 'ability', ability: abilities[2] },
    { key: '4', action: 'ability', ability: abilities[3] },
    { key: '5', action: 'item', ability: { id: 'potion', name: 'Health Potion', icon: '❤️', cooldownMs: 1000 } as HotbarAbility },
    { key: '6', action: 'none', ability: null as HotbarAbility | null },
    { key: '7', action: 'none', ability: null as HotbarAbility | null },
    { key: '8', action: 'none', ability: null as HotbarAbility | null },
    { key: '9', action: 'none', ability: null as HotbarAbility | null },
  ];

  // Hotbar is RT-only — hidden during turn-based creature battles
  if (gameMode !== 'EXPLORING') {
    return null;
  }

  const handleCast = (slot: (typeof slots)[number]) => {
    const timeNow = Date.now();
    if (timeNow < globalCooldown) return; // GCD active
    
    if (slot.action === 'none' || !slot.ability) return;

    if (slot.action === 'ability') {
      if (isForbiddenRtCaptureAbility(slot.ability.id)) {
        useGameStore.getState().showToast('Capture tools only work in creature battles.');
        return;
      }
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

  // Phones: keep 5 combat slots above the touch controls; hide empty + slots.
  const visibleSlots = slots.filter((s, i) => i < 5 || s.ability);

  return (
    <div
      className="lobby-panel pointer-events-auto absolute left-1/2 z-30 flex -translate-x-1/2 gap-1.5 rounded-xl p-1.5 bottom-[max(1.25rem,calc(6.75rem+env(safe-area-inset-bottom,0px)))] max-md:gap-1 max-md:p-1 md:bottom-6 md:gap-2 md:p-2"
    >
      {visibleSlots.map((slot, i) => (
        <div
          key={slot.key || i}
          onClick={() => handleCast(slot)}
          className="group relative flex h-11 w-11 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-lobby-border bg-black/45 transition-all hover:border-lobby-soul/55 hover:bg-lobby-soul/15 max-md:h-10 max-md:w-10 md:h-12 md:w-12"
        >
          <span className="absolute top-0.5 left-1 z-10 font-mono text-[9px] font-bold text-lobby-ash transition-colors group-hover:text-lobby-soul md:top-1 md:left-1.5 md:text-[10px]">
            {slot.key}
          </span>

          {slot.ability ? (
            <>
              <span className="z-10 text-xl drop-shadow-md md:text-2xl">{slot.ability.icon}</span>
              {gcdActive && (
                <div
                  className="absolute bottom-0 left-0 z-20 w-full bg-black/70 backdrop-blur-sm"
                  style={{ height: `${gcdPercent}%` }}
                />
              )}
            </>
          ) : (
            <span className="text-lg font-bold text-lobby-ash/30 md:text-xl">+</span>
          )}
        </div>
      ))}
    </div>
  );
}
