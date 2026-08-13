'use client';

import { useGameStore } from './store';
import { useEffect, useState, useMemo } from 'react';
import { GamePanelShell } from './ui/GamePanelShell';
import { isForbiddenRtCaptureAbility } from '@/shared/game/combatAbilities';

type HotbarAbility = {
  id: string;
  name: string;
  icon: string;
  cooldownMs: number;
  type?: 'damage' | 'utility' | 'buff' | 'heal';
  mpCost?: number;
};

export default function Hotbar() {
  const { player, gameMode, combatTarget, emitSocketEvent, cooldowns, setCooldown } = useGameStore();
  const [globalCooldown, setGlobalCooldown] = useState(0);
  const [now, setNow] = useState(Date.now());

  // Force re-render for smooth cooldown animation countdown
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
  const abilities = useMemo((): HotbarAbility[] => {
    let list: HotbarAbility[];
    if (player.combatStyle === 'MELEE') {
      list = [
        { id: 'strike', name: 'Strike', icon: '⚔️', cooldownMs: 1500, type: 'damage', mpCost: 0 },
        { id: 'cleave', name: 'Cleave', icon: '🌪️', cooldownMs: 4000, type: 'damage', mpCost: 15 },
        { id: 'dash', name: 'Dash', icon: '💨', cooldownMs: 8000, type: 'utility', mpCost: 10 },
        { id: 'shout', name: 'War Cry', icon: '🗣️', cooldownMs: 12000, type: 'buff', mpCost: 20 },
      ];
    } else if (player.combatStyle === 'MAGIC') {
      list = [
        { id: 'fireball', name: 'Fireball', icon: '🔥', cooldownMs: 2000, type: 'damage', mpCost: 10 },
        { id: 'frost', name: 'Frost Nova', icon: '❄️', cooldownMs: 6000, type: 'damage', mpCost: 25 },
        { id: 'blink', name: 'Blink', icon: '✨', cooldownMs: 8000, type: 'utility', mpCost: 15 },
        { id: 'shield', name: 'Mana Shield', icon: '🛡️', cooldownMs: 15000, type: 'buff', mpCost: 30 },
      ];
    } else {
      list = [
        { id: 'shoot', name: 'Shoot', icon: '🏹', cooldownMs: 1200, type: 'damage', mpCost: 0 },
        { id: 'multishot', name: 'Volley', icon: '🌧️', cooldownMs: 5000, type: 'damage', mpCost: 15 },
        { id: 'trap', name: 'Snare', icon: '🕸️', cooldownMs: 10000, type: 'utility', mpCost: 10 },
        { id: 'heal', name: 'Bandage', icon: '🩹', cooldownMs: 20000, type: 'heal', mpCost: 20 },
      ];
    }
    return list.filter((a) => !isForbiddenRtCaptureAbility(a.id));
  }, [player.combatStyle]);

  const slots = useMemo(() => [
    { key: '1', action: 'ability', ability: abilities[0] },
    { key: '2', action: 'ability', ability: abilities[1] },
    { key: '3', action: 'ability', ability: abilities[2] },
    { key: '4', action: 'ability', ability: abilities[3] },
    { key: '5', action: 'item', ability: { id: 'potion', name: 'Health Potion', icon: '❤️', cooldownMs: 1000 } as HotbarAbility },
    { key: '6', action: 'none', ability: null as HotbarAbility | null },
    { key: '7', action: 'none', ability: null as HotbarAbility | null },
    { key: '8', action: 'none', ability: null as HotbarAbility | null },
    { key: '9', action: 'none', ability: null as HotbarAbility | null },
  ], [abilities]);

  // Hotbar is RT-only — hidden during turn-based creature battles
  if (gameMode !== 'EXPLORING') {
    return null;
  }

  const handleCast = (slot: (typeof slots)[number]) => {
    const timeNow = Date.now();
    if (timeNow < globalCooldown) return; // GCD active
    
    if (slot.action === 'none' || !slot.ability) return;

    const abilityCd = cooldowns[slot.ability.id] || 0;
    if (timeNow < abilityCd) return; // Individual CD active

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

      // Set individual cooldown & GCD
      setCooldown(slot.ability.id, timeNow + slot.ability.cooldownMs);
      setGlobalCooldown(timeNow + 1200);
    }
  };

  // Keyboard shortcut listener mapped to keys 1-9
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      
      const key = e.key;
      const slotIndex = parseInt(key) - 1;
      if (slotIndex >= 0 && slotIndex < slots.length) {
        handleCast(slots[slotIndex]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [globalCooldown, combatTarget, emitSocketEvent, slots, cooldowns]);

  const gcdActive = now < globalCooldown;
  const gcdPercent = gcdActive ? Math.max(0, ((globalCooldown - now) / 1200) * 100) : 0;

  // Phones: keep 5 combat slots above the touch controls; hide empty + slots.
  const visibleSlots = slots.filter((s, i) => i < 5 || s.ability);

  return (
    <GamePanelShell neonAccent="cyan" className="pointer-events-auto flex gap-1.5 p-1.5 max-md:gap-1 max-md:p-1 md:gap-2 md:p-2 select-none">
      {visibleSlots.map((slot, i) => {
        const ability = slot.ability;
        const abilityCdEnd = ability ? cooldowns[ability.id] || 0 : 0;
        const abilityCdRemaining = Math.max(0, abilityCdEnd - now);
        const abilityCdActive = abilityCdRemaining > 0;
        const abilityCdPercent = ability ? Math.min(100, (abilityCdRemaining / ability.cooldownMs) * 100) : 0;

        const isLocked = gcdActive || abilityCdActive;
        const showPercent = abilityCdActive ? abilityCdPercent : gcdPercent;

        return (
          <button
            key={slot.key || i}
            type="button"
            onClick={() => handleCast(slot)}
            className="group relative flex h-11 w-11 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-[#22d3ee]/30 bg-[#050b14]/80 shadow-[inset_0_0_10px_rgba(34,211,238,0.05)] transition-all hover:border-[#22d3ee]/80 hover:bg-[#22d3ee]/20 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] active:scale-95 max-md:h-10 max-md:w-10 md:h-12 md:w-12 text-left"
            title={ability ? `${ability.name} (Key: ${slot.key})` : undefined}
          >
            {/* Keybind Badge */}
            <span className="absolute top-0.5 left-1 z-10 font-mono text-[9px] font-bold text-cyan-200/60 transition-colors group-hover:text-cyan-300 md:top-1 md:left-1.5 md:text-[10px]">
              {slot.key}
            </span>

            {ability ? (
              <>
                <span className="z-10 text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] md:text-2xl">
                  {ability.icon}
                </span>

                {/* Cooldown Dark Sweep Overlay */}
                {isLocked && (
                  <div
                    className="absolute bottom-0 left-0 z-20 w-full bg-black/85 backdrop-blur-[2px] transition-all duration-75 ease-linear border-t border-cyan-400/50"
                    style={{ height: `${showPercent}%` }}
                  />
                )}

                {/* Cooldown Numeric Text */}
                {abilityCdActive && (
                  <div className="absolute inset-0 z-30 flex items-center justify-center font-mono font-extrabold text-[11px] md:text-xs text-cyan-200 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">
                    {abilityCdRemaining >= 1000
                      ? `${(abilityCdRemaining / 1000).toFixed(0)}s`
                      : `${(abilityCdRemaining / 1000).toFixed(1)}s`}
                  </div>
                )}
              </>
            ) : (
              <span className="text-lg font-bold text-cyan-500/20 md:text-xl">+</span>
            )}
          </button>
        );
      })}
    </GamePanelShell>
  );
}
