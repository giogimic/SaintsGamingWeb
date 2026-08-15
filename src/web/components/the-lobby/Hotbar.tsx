'use client';

import { useGameStore } from './store';
import { useEffect, useState, useMemo } from 'react';
import { HudPanelShell } from './hud/HudPanelShell';
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

  // Force re-render for smooth cooldown countdown
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

  const slots = useMemo(
    () => [
      { key: '1', action: 'ability', ability: abilities[0] },
      { key: '2', action: 'ability', ability: abilities[1] },
      { key: '3', action: 'ability', ability: abilities[2] },
      { key: '4', action: 'ability', ability: abilities[3] },
      {
        key: '5',
        action: 'item',
        ability: { id: 'potion', name: 'Health Potion', icon: '❤️', cooldownMs: 1000 } as HotbarAbility,
      },
    ],
    [abilities]
  );

  // Hotbar is RT-only — hidden during turn-based creature battles or full-screen screens
  const isPlayable = ['EXPLORING', 'INVENTORY', 'SKILLS', 'EQUIPMENT', 'QUESTS', 'GTC', 'DIALOG'].includes(gameMode);
  if (!isPlayable) {
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
        targetId: combatTarget?.entityId,
      });

      // Set individual cooldown & GCD
      setCooldown(slot.ability.id, timeNow + slot.ability.cooldownMs);
      setGlobalCooldown(timeNow + 1200);
    } else if (slot.action === 'item') {
      const inv = useGameStore.getState().player.inventory;
      const potionKey = Object.keys(inv).find(
        (k) =>
          (k.toLowerCase().includes('potion') ||
            k.toLowerCase().includes('herb') ||
            k.toLowerCase().includes('food')) &&
          (inv[k] ?? 0) > 0
      );
      if (potionKey) {
        useGameStore.getState().modifyHp(25);
        useGameStore.getState().modifyInventory(potionKey, -1);
        useGameStore.getState().showToast(`Used Consumable (+25 HP)`);
        setCooldown(slot.ability.id, timeNow + slot.ability.cooldownMs);
        setGlobalCooldown(timeNow + 1000);
      } else {
        useGameStore.getState().showToast('No health potion or consumable available in inventory!');
      }
    }
  };

  // Keyboard shortcut listener mapped to keys 1-5
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      )
        return;

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

  return (
    <HudPanelShell className="pointer-events-auto select-none">
      <div className="flex items-center gap-1.5 md:gap-2">
        {slots.map((slot, i) => {
          const ability = slot.ability;
          const abilityCdEnd = ability ? cooldowns[ability.id] || 0 : 0;
          const abilityCdRemaining = Math.max(0, abilityCdEnd - now);
          const abilityCdActive = abilityCdRemaining > 0;
          const abilityCdPercent = ability
            ? Math.min(100, (abilityCdRemaining / ability.cooldownMs) * 100)
            : 0;

          const isLocked = gcdActive || abilityCdActive;
          const showPercent = abilityCdActive ? abilityCdPercent : gcdPercent;

          return (
            <button
              key={slot.key || i}
              type="button"
              onClick={() => handleCast(slot)}
              className="group relative flex h-11 w-11 cursor-pointer flex-col items-center justify-center overflow-hidden rounded border border-teal-500/30 bg-[#061017] shadow-inner transition-all hover:border-teal-400 hover:bg-teal-950/40 active:scale-95 md:h-12 md:w-12 text-left"
              title={ability ? `${ability.name} (Key: ${slot.key})` : undefined}
            >
              {/* Keybind Badge */}
              <span className="absolute top-0.5 left-1 z-10 font-mono text-[9px] font-bold text-teal-300/70 transition-colors group-hover:text-teal-200 md:top-1 md:left-1.5 md:text-[10px]">
                {slot.key}
              </span>

              {ability ? (
                <>
                  <span className="z-10 text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] md:text-xl transition-transform group-hover:scale-110">
                    {ability.icon}
                  </span>

                  {/* Cooldown Sweep Overlay */}
                  {isLocked && (
                    <div
                      className="absolute bottom-0 left-0 z-20 w-full bg-black/85 backdrop-blur-[1px] transition-all duration-75 ease-linear border-t border-teal-400/50"
                      style={{ height: `${showPercent}%` }}
                    />
                  )}

                  {/* Cooldown Numeric Text */}
                  {abilityCdActive && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center font-mono font-extrabold text-[10px] md:text-[11px] text-teal-200 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">
                      {abilityCdRemaining >= 1000
                        ? `${(abilityCdRemaining / 1000).toFixed(0)}s`
                        : `${(abilityCdRemaining / 1000).toFixed(1)}s`}
                    </div>
                  )}
                </>
              ) : (
                <span className="text-base font-bold text-teal-500/20 md:text-lg">+</span>
              )}
            </button>
          );
        })}
      </div>
    </HudPanelShell>
  );
}
