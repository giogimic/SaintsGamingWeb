import { describe, it, expect, vi } from 'vitest';
import { dispatchHotbarSlot, HotbarSlot, HotbarExecutionContext } from './hotbarDispatcher';

describe('Dynamic Hotbar & Action Slot Dispatcher (Bible 12 & 14)', () => {
  it('consumes food item and heals player if health is missing', () => {
    const mockContext: HotbarExecutionContext = {
      playerId: 'p1',
      currentHp: 40,
      maxHp: 100,
      healPlayer: vi.fn(),
      equipTool: vi.fn(),
      consumeItem: vi.fn(() => true),
      showToast: vi.fn(),
    };

    const breadSlot: HotbarSlot = {
      index: 0,
      type: 'item',
      id: 'food_bread',
      name: 'Fresh Bread',
      quantity: 5,
      payload: { healAmount: 25 },
    };

    const res = dispatchHotbarSlot(breadSlot, mockContext);

    expect(res.success).toBe(true);
    expect(res.actionTaken).toBe('CONSUME_HEAL');
    expect(mockContext.consumeItem).toHaveBeenCalledWith('food_bread', 1);
    expect(mockContext.healPlayer).toHaveBeenCalledWith(25);
  });

  it('blocks healing if player health is already full', () => {
    const mockContext: HotbarExecutionContext = {
      playerId: 'p1',
      currentHp: 100,
      maxHp: 100,
      healPlayer: vi.fn(),
      equipTool: vi.fn(),
      consumeItem: vi.fn(),
      showToast: vi.fn(),
    };

    const breadSlot: HotbarSlot = {
      index: 0,
      type: 'item',
      id: 'food_bread',
      name: 'Fresh Bread',
      payload: { healAmount: 25 },
    };

    const res = dispatchHotbarSlot(breadSlot, mockContext);

    expect(res.success).toBe(false);
    expect(res.actionTaken).toBe('BLOCKED');
    expect(mockContext.healPlayer).not.toHaveBeenCalled();
  });

  it('equips tools when tool hotbar slot is triggered', () => {
    const mockContext: HotbarExecutionContext = {
      playerId: 'p1',
      currentHp: 100,
      maxHp: 100,
      healPlayer: vi.fn(),
      equipTool: vi.fn(),
      consumeItem: vi.fn(),
    };

    const pickaxeSlot: HotbarSlot = {
      index: 1,
      type: 'tool',
      id: 'pickaxe_rune',
      name: 'Rune Pickaxe',
    };

    const res = dispatchHotbarSlot(pickaxeSlot, mockContext);

    expect(res.success).toBe(true);
    expect(res.actionTaken).toBe('EQUIP_TOOL');
    expect(mockContext.equipTool).toHaveBeenCalledWith('pickaxe_rune');
  });

  it('returns empty for unpopulated hotbar slots', () => {
    const mockContext: HotbarExecutionContext = {
      playerId: 'p1',
      currentHp: 50,
      maxHp: 100,
      healPlayer: vi.fn(),
      equipTool: vi.fn(),
      consumeItem: vi.fn(),
    };

    const emptySlot: HotbarSlot = {
      index: 5,
      type: 'empty',
    };

    const res = dispatchHotbarSlot(emptySlot, mockContext);
    expect(res.success).toBe(false);
    expect(res.actionTaken).toBe('EMPTY');
  });
});
