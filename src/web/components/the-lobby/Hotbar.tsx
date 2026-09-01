'use client';

import { useGameStore } from './store';
import { useEffect, useState, useMemo } from 'react';
import { isForbiddenRtCaptureAbility } from '@/shared/game/combatAbilities';
import { soundSynth } from '@/engine/sound-synth';
import { Flame, Wind, Shield, Zap, Sparkles, Heart, Crosshair } from 'lucide-react';
import { getHudTheme } from './hud/hud-themes';

type HotbarAbility = {
  id: string;
  name: string;
  icon: string;
  cooldownMs: number;
  type?: 'damage' | 'utility' | 'buff' | 'heal';
  mpCost?: number;
};

export default function Hotbar() {
  const combatStyle = useGameStore((s) => s.player.combatStyle);
  const inventory = useGameStore((s) => s.player.inventory);
  const gameMode = useGameStore((s) => s.gameMode);
  const combatTarget = useGameStore((s) => s.combatTarget);
  const cooldowns = useGameStore((s) => s.cooldowns);
  const emitSocketEvent = useGameStore((s) => s.emitSocketEvent);
  const setCooldown = useGameStore((s) => s.setCooldown);

  const [globalCooldown, setGlobalCooldown] = useState(0);
  const [now, setNow] = useState(Date.now());

  // Check if any cooldowns are actively running
  const hasActiveCooldown = useMemo(() => {
    const time = Date.now();
    if (globalCooldown > time) return true;
    return Object.values(cooldowns || {}).some((cdEnd) => typeof cdEnd === 'number' && cdEnd > time);
  }, [globalCooldown, cooldowns, now]);

  // Smooth cooldown ticker — only runs while an active cooldown exists (saves 60-144fps React re-renders)
  useEffect(() => {
    if (!hasActiveCooldown) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 50); // 20 FPS cooldown sweep
    return () => clearInterval(interval);
  }, [hasActiveCooldown]);

  // RT MMO abilities only — capture tools are turn-based (bible 07 / 11)
  const abilities = useMemo((): HotbarAbility[] => {
    let list: HotbarAbility[];
    const style = String(combatStyle || 'MELEE').toUpperCase();
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
  }, [combatStyle]);

  // Inventory consumable count
  const potionCount = useMemo(() => {
    const inv = inventory || {};
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
  }, [inventory]);

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

      const currentMode = useGameStore.getState().gameMode;
      const isCurrentlyPlayable = ['EXPLORING', 'INVENTORY', 'SKILLS', 'EQUIPMENT', 'QUESTS', 'GTC', 'DIALOG'].includes(currentMode);
      if (!isCurrentlyPlayable) return;

      const key = e.key;
      const slotIndex = parseInt(key) - 1;
      if (slotIndex >= 0 && slotIndex < slots.length) {
        handleCast(slots[slotIndex]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [globalCooldown, combatTarget, emitSocketEvent, slots, cooldowns]);

  const hudThemeId = useGameStore((s) => s.hudThemeId);
  const hudConfig = useGameStore((s) => s.hudConfig);
  const theme = getHudTheme(hudThemeId || hudConfig?.themeId);

  const radiusClass =
    hudConfig?.borderRadius === 'compact'
      ? 'rounded-xl'
      : hudConfig?.borderRadius === 'capsule'
      ? 'rounded-3xl'
      : theme.borderRadiusClass || 'rounded-2xl';

  // Hotbar is RT-only — hidden during turn-based creature battles or full-screen screens
  const isPlayable = ['EXPLORING', 'INVENTORY', 'SKILLS', 'EQUIPMENT', 'QUESTS', 'GTC', 'DIALOG'].includes(gameMode);
  if (!isPlayable) {
    return null;
  }

  const gcdActive = now < globalCooldown;
  const gcdPercent = gcdActive ? Math.max(0, ((globalCooldown - now) / 1200) * 100) : 0;

  return (
    <div
      className="pointer-events-auto select-none font-mono"
      style={{
        filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.7))',
        opacity: hudConfig?.opacity ?? 0.95,
      }}
    >
      <div
        className={`p-2 ${theme.palette.glassBg} border ${theme.palette.border} ${radiusClass} backdrop-blur-xl relative overflow-hidden flex items-center gap-2`}
        style={{
          boxShadow: hudConfig?.borderGlow ? theme.palette.accentGlow : undefined,
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
              : `${theme.palette.border} hover:${theme.palette.borderActive} ${theme.palette.glassHeaderBg} text-amber-300`;

          return (
            <button
              key={slot.key || i}
              type="button"
              onClick={() => handleCast(slot)}
              className={`group relative flex h-12 w-12 sm:h-13 sm:w-13 cursor-pointer flex-col items-center justify-center overflow-hidden border shadow-inner transition-all active:scale-95 text-left rounded-xl ${typeBorder}`}
              title={ability ? `${ability.name} [Key: ${slot.key}]` : undefined}
            >
              {/* Hotkey Keybind Tag */}
              {hudConfig?.showHotbarKeybinds !== false && (
                <span className="absolute top-1 left-1.5 z-10 font-mono text-[9px] font-black text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                  {slot.key}
                </span>
              )}

              {/* Stack Count for Items */}
              {slot.action === 'item' && typeof slot.count === 'number' && (
                <span className="absolute top-1 right-1.5 z-10 font-mono text-[9px] font-black text-emerald-300 bg-black/80 px-1 rounded border border-emerald-500/30">
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
                      className="absolute bottom-0 left-0 z-20 w-full bg-black/85 backdrop-blur-[1px] transition-all duration-75 ease-linear border-t-2 border-amber-400"
                      style={{ height: `${showPercent}%` }}
                    />
                  )}

                  {/* Cooldown Numeric Countdown */}
                  {abilityCdActive && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center font-mono font-black text-xs text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                      {abilityCdRemaining >= 1000
                        ? `${(abilityCdRemaining / 1000).toFixed(0)}s`
                        : `${(abilityCdRemaining / 1000).toFixed(1)}s`}
                    </div>
                  )}
                </>
              ) : (
                <span className="text-base font-bold text-amber-500/30">+</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

