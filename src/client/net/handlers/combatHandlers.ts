/**
 * Combat Handlers — battle_started, battle_update, battle_ended, combat_update.
 *
 * Manages both Saints Buddy Battles (turn-based creature encounters)
 * and Hero Battles (real-time MMO combat).
 */
import type {
  BattleStartPayload,
  BattleUpdatePayload,
  BattleEndPayload,
  CombatUpdatePayload,
} from '../protocol.d';
import { useCombatStore, type BattleState } from '../../state/useCombatStore';
import { useSessionStore } from '../../state/useSessionStore';
import { useToastStore } from '../../state/useToastStore';
import { usePlayerStore } from '../../state/usePlayerStore';

/**
 * Turn-based battle started.
 */
export function onBattleStarted(data: BattleStartPayload): void {
  const battle: BattleState = {
    id: data.id || data.combatId || '',
    accountId: data.accountId || '',
    phase: (data.phase as BattleState['phase']) || 'WAITING_FOR_INPUT',
    isTrainer: data.isTrainer,
    trainerName: data.trainerName,
    wildCreature: data.wildCreature || {
      hp: data.creatureHp ?? data.opponentHp ?? 100,
      maxHp: data.creatureMaxHp ?? data.opponentMaxHp ?? 100,
      level: data.level ?? 1,
      spriteKey: data.spriteKey ?? '',
      name: data.creatureName ?? data.opponentName ?? 'Wild Creature',
    },
    playerCreature: data.playerCreature || {
      hp: data.playerHp ?? data.hp ?? 100,
      maxHp: data.playerMaxHp ?? data.maxHp ?? 100,
      level: 1,
      spriteKey: '',
      name: 'Your Creature',
    },
    log: data.log || [],
  };

  useCombatStore.getState().setActiveBattle(battle);
  useSessionStore.getState().setScene('battle');
}

/**
 * Battle state updated (damage dealt, HP changed, etc.).
 */
export function onBattleUpdate(data: BattleUpdatePayload): void {
  const current = useCombatStore.getState().activeBattle;
  if (!current) return;

  const updated: BattleState = {
    ...current,
    phase: (data.phase as BattleState['phase']) || current.phase,
    wildCreature: {
      ...current.wildCreature,
      ...(data.wildCreature || {}),
      hp: data.creatureHp ?? data.opponentHp ?? data.wildCreature?.hp ?? current.wildCreature.hp,
      maxHp: data.creatureMaxHp ?? data.opponentMaxHp ?? data.wildCreature?.maxHp ?? current.wildCreature.maxHp,
    },
    playerCreature: {
      ...current.playerCreature,
      ...(data.playerCreature || {}),
      hp: data.playerHp ?? data.playerCreature?.hp ?? current.playerCreature.hp,
      maxHp: data.playerMaxHp ?? data.playerCreature?.maxHp ?? current.playerCreature.maxHp,
    },
    log: data.log ? [...current.log, ...data.log] : current.log,
  };

  useCombatStore.getState().setActiveBattle(updated);
}

/**
 * Battle ended — capture, win, lose, or flee.
 */
export function onBattleEnded(data: BattleEndPayload): void {
  useCombatStore.getState().setActiveBattle(null);

  // Return to exploring
  useSessionStore.getState().setScene('exploring');

  if (data.result === 'CAPTURE' && data.capture) {
    useToastStore.getState().showToast(
      `Captured ${data.capture.name || 'a creature'}!${data.capture.isRemarkable ? ' ✨ Remarkable!' : ''}`,
    );
    if (data.capture.speciesSlug) {
      usePlayerStore.getState().recordCreatureCapture(data.capture.speciesSlug);
    }
  } else if (data.result === 'WIN') {
    useToastStore.getState().showToast('Battle won!');
  } else if (data.result === 'LOSE') {
    useToastStore.getState().showToast('You were defeated...');
  } else if (data.result === 'FLEE') {
    useToastStore.getState().showToast('Got away safely!');
  }
}

/**
 * Real-time MMO combat update.
 */
export function onCombatUpdate(data: CombatUpdatePayload): void {
  // Forward to combat store for HUD updates
  useCombatStore.getState().setActiveEnemies(data);
}
