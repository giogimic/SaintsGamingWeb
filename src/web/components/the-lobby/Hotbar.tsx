'use client';

import { useGameStore } from './store';
import { useEffect, useState, useMemo } from 'react';
import { isForbiddenRtCaptureAbility } from '@/shared/game/combatAbilities';
import { soundSynth } from '@/engine/sound-synth';
import { Flame, Wind, Shield, Zap, Sparkles, Heart, Crosshair } from 'lucide-react';

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
    const style = String(player.combatStyle || 'MELEE').toUpperCase();
    if (style === 'MELEE' || style === 'WARRIOR' || style === 'BRAWLER') {
      list = [
        { id: 'strike', name: 'Power Strike', icon: '⚔️', cooldownMs: 1500, type: 'damage', mpCost: 0 },
        { id: 'cleave', name: 'Cleave', icon: '🌪️', cooldownMs: 4000, type: 'damage', mpCost: 15 },
        { id: 'dash', name: 'Phantom Dash', icon: '💨', cooldownMs: 8000, type: 'utility', mpCost: 10 },
        { id: 'shout', name: 'War Cry', icon: '🗣️', cooldownMs: 12000, type: 'buff', mpCost: 20 },
      ];
    } else if (style === 'MAGIC' || style === 'MAGE' || style === 'INVOKER') {
      list = [
        { id: 'fireball', name: 'Fireball', icon: '🔥', cooldownMs: 2000, type: 'damage', mpCost: 10 },
        { id: 'frost', name: 'Frost Nova', icon: '❄️', cooldownMs: 6000, type: 'damage', mpCost: 25 },
        { id: 'blink', name: 'Arcane Blink', icon: '✨', cooldownMs: 8000, type: 'utility', mpCost: 15 },
        { id: 'shield', name: 'Mana Shield', icon: '🛡️', cooldownMs: 15000, type: 'buff', mpCost: 30 },
      ];
    } else {
      list = [
        { id: 'shoot', name: 'Precision Shot', icon: '🏹', cooldownMs: 1200, type: 'damage', mpCost: 0 },
        { id: 'multishot', name: 'Arrow Volley', icon: '🌧️', cooldownMs: 5000, type: 'damage', mpCost: 15 },
        { id: 'trap', name: 'Static Snare', icon: '🕸️', cooldownMs: 10000, type: 'utility', mpCost: 10 },
        { id: 'heal', name: 'Emergency Bandage', icon: '🩹', cooldownMs: 20000, type: 'heal', mpCost: 20 },
      ];
    }
    return list.filter((a) => !isForbiddenRtCaptureAbility(a.id));
  }, [player.combatStyle]);

  // Inventory consumable count
  const potionCount = useMemo(() => {
    const inv = player.inventory || {};
    let total = 0;
    for (const [k, v] of Object.entries(inv)) {
      if (
        (k.toLowerCase().includes('potion') ||
          k.toLowerCase().includes('herb') ||
          k.toLowerCase().includes('food') ||
          k.toLowerCase().includes('patch_kit')) &&
        typeof v === 'number'
      ) {
        total += v;
      }
    }
    return total;
  }, [player.inventory]);

  const slots = useMemo(
    () => [
      { key: '1', action: 'ability', ability: abilities[0] },
      { key: '2', action: 'ability', ability: abilities[1] },
      { key: '3', action: 'ability', ability: abilities[2] },
      { key: '4', action: 'ability', ability: abilities[3] },
      {
        key: '5',
        action: 'item',
        count: potionCount,
        ability: { id: 'potion', name: 'Healing Potion', icon: '🧪', type: 'heal', cooldownMs: 1000 } as HotbarAbility,
      },
    ],
    [abilities, potionCount]
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
    if (timeNow < abilityCd) {
      soundSynth?.playSelectSound?.();
      return; // Individual CD active
    }

    if (slot.action === 'ability') {
      if (isForbiddenRtCaptureAbility(slot.ability.id)) {
        useGameStore.getState().showToast('Capture tools only work in creature battles.');
        return;
      }
      if (!combatTarget && slot.ability.type === 'damage') {
        soundSynth?.playSelectSound?.();
        useGameStore.getState().showToast('Target required to cast offensive ability!');
        return;
      }

      // Play cast sound
      soundSynth?.playActionSound?.();

      // Send cast to server
      emitSocketEvent?.('combat_cast', {
        abilityId: slot.ability.id,
        targetId: combatTarget?.entityId,
      });

      // Set individual cooldown & GCD
      setCooldown(slot.ability.id, timeNow + slot.ability.cooldownMs);
      setGlobalCooldown(timeNow + 1200);
    } else if (slot.action === 'item') {
      const inv = useGameStore.getState().player.inventory || {};
      const potionKey = Object.keys(inv).find(
        (k) =>
          (k.toLowerCase().includes('potion') ||
            k.toLowerCase().includes('herb') ||
            k.toLowerCase().includes('food') ||
            k.toLowerCase().includes('patch_kit')) &&
          (inv[k] ?? 0) > 0
      );
      if (potionKey) {
        soundSynth?.playLevelUpSound?.();
        useGameStore.getState().modifyHp(25);
        useGameStore.getState().modifyInventory(potionKey, -1);
        useGameStore.getState().showToast(`Used Consumable (+25 HP)`);
        setCooldown(slot.ability.id, timeNow + slot.ability.cooldownMs);
        setGlobalCooldown(timeNow + 1000);
      } else {
        soundSynth?.playSelectSound?.();
        useGameStore.getState().showToast('No health potion or consumable in inventory!');
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
    <div className="pointer-events-auto select-none font-mono">
      <div
        className="p-2 bg-[#0a0318]/95 border border-pink-500/30 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-xl relative overflow-hidden flex items-center gap-2"
        style={{
          clipPath: 'polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px)',
          boxShadow: '0 0 25px rgba(242,0,137,0.2), inset 0 0 15px rgba(0,0,0,0.9)',
        }}
      >
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

          const typeBorder =
            ability?.type === 'damage'
              ? 'border-rose-500/60 hover:border-rose-400 bg-rose-950/30 text-rose-200'
              : ability?.type === 'heal'
              ? 'border-emerald-500/60 hover:border-emerald-400 bg-emerald-950/30 text-emerald-200'
              : ability?.type === 'buff'
              ? 'border-amber-500/60 hover:border-amber-400 bg-amber-950/30 text-amber-200'
              : 'border-cyan-500/60 hover:border-cyan-400 bg-cyan-950/30 text-[#00f5d4]';

          return (
            <button
              key={slot.key || i}
              type="button"
              onClick={() => handleCast(slot)}
              className={`group relative flex h-12 w-12 sm:h-13 sm:w-13 cursor-pointer flex-col items-center justify-center overflow-hidden border-2 shadow-inner transition-all active:scale-95 text-left rounded-xl ${typeBorder}`}
              style={{
                clipPath: 'polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)',
              }}
              title={ability ? `${ability.name} [Key: ${slot.key}]` : undefined}
            >
              {/* Hotkey Keybind Tag */}
              <span className="absolute top-1 left-1.5 z-10 font-mono text-[9px] font-black text-cyan-300 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                {slot.key}
              </span>

              {/* Stack Count for Items */}
              {slot.action === 'item' && typeof slot.count === 'number' && (
                <span className="absolute top-1 right-1.5 z-10 font-mono text-[9px] font-black text-amber-300 bg-black/70 px-1 rounded">
                  x{slot.count}
                </span>
              )}

              {ability ? (
                <>
                  <span className="z-10 text-xl sm:text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] transition-transform group-hover:scale-110">
                    {ability.icon}
                  </span>

                  {/* Cooldown Radial Sweep Overlay */}
                  {isLocked && (
                    <div
                      className="absolute bottom-0 left-0 z-20 w-full bg-black/85 backdrop-blur-[1px] transition-all duration-75 ease-linear border-t-2 border-[#00f5d4]"
                      style={{ height: `${showPercent}%` }}
                    />
                  )}

                  {/* Cooldown Numeric Countdown */}
                  {abilityCdActive && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center font-mono font-black text-xs text-[#00f5d4] drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                      {abilityCdRemaining >= 1000
                        ? `${(abilityCdRemaining / 1000).toFixed(0)}s`
                        : `${(abilityCdRemaining / 1000).toFixed(1)}s`}
                    </div>
                  )}
                </>
              ) : (
                <span className="text-base font-bold text-cyan-500/30">+</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
