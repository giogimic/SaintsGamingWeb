/**
 * Saints Gaming — Dynamic Hotbar & Action Slot Dispatcher (Bible 12 & Bible 14)
 * Resolves keyboard activations (keys 1-8) for consumables, equipment tools, abilities, and emotes.
 */

export type HotbarSlotType = 'item' | 'tool' | 'ability' | 'emote' | 'empty';

export interface HotbarSlot {
  index: number; // 0 to 7 (keys 1 to 8)
  type: HotbarSlotType;
  id?: string;
  name?: string;
  icon?: string;
  quantity?: number;
  cooldownSec?: number;
  payload?: Record<string, unknown>;
}

export interface HotbarExecutionContext {
  playerId: string;
  currentHp: number;
  maxHp: number;
  healPlayer: (amount: number) => void;
  equipTool: (toolId: string) => void;
  consumeItem: (itemId: string, quantity: number) => boolean;
  triggerAbility?: (abilityId: string) => void;
  triggerEmote?: (emoteId: string) => void;
  showToast?: (message: string) => void;
}

export interface HotbarExecutionResult {
  success: boolean;
  actionTaken: 'CONSUME_HEAL' | 'EQUIP_TOOL' | 'CAST_ABILITY' | 'PLAY_EMOTE' | 'EMPTY' | 'BLOCKED';
  message?: string;
}

/**
 * Dispatches a hotbar slot action when triggered via keypress (1-8) or UI click.
 */
export function dispatchHotbarSlot(
  slot: HotbarSlot,
  context: HotbarExecutionContext
): HotbarExecutionResult {
  if (slot.type === 'empty' || !slot.id) {
    return { success: false, actionTaken: 'EMPTY', message: 'Slot is empty.' };
  }

  switch (slot.type) {
    case 'item': {
      const healAmount = (slot.payload?.healAmount as number) || 20;

      if (context.currentHp >= context.maxHp) {
        context.showToast?.('Health is already full.');
        return {
          success: false,
          actionTaken: 'BLOCKED',
          message: 'Health is already full.',
        };
      }

      const consumed = context.consumeItem(slot.id, 1);
      if (!consumed) {
        context.showToast?.(`No ${slot.name || 'item'} remaining in inventory.`);
        return {
          success: false,
          actionTaken: 'BLOCKED',
          message: 'Item not in inventory.',
        };
      }

      context.healPlayer(healAmount);
      context.showToast?.(`Used ${slot.name || 'food'} (+${healAmount} HP)`);
      return {
        success: true,
        actionTaken: 'CONSUME_HEAL',
        message: `Healed +${healAmount} HP`,
      };
    }

    case 'tool': {
      context.equipTool(slot.id);
      context.showToast?.(`Equipped ${slot.name || 'tool'}`);
      return {
        success: true,
        actionTaken: 'EQUIP_TOOL',
        message: `Equipped tool ${slot.id}`,
      };
    }

    case 'ability': {
      context.triggerAbility?.(slot.id);
      return {
        success: true,
        actionTaken: 'CAST_ABILITY',
        message: `Cast ability ${slot.id}`,
      };
    }

    case 'emote': {
      context.triggerEmote?.(slot.id);
      return {
        success: true,
        actionTaken: 'PLAY_EMOTE',
        message: `Played emote ${slot.id}`,
      };
    }

    default:
      return { success: false, actionTaken: 'EMPTY' };
  }
}
