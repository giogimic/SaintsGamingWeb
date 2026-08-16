import { describe, it, expect } from 'vitest';
import {
  canEquipItem,
  calculateEquipmentStats,
  equipItem,
  unequipItem,
  EquippableItem,
  PlayerEquipment,
} from './equipmentEngine';

describe('Equipment Slot & Stat Compatibility Engine (Bible 12)', () => {
  const runePickaxe: EquippableItem = {
    id: 'pickaxe_rune',
    name: 'Rune Mining Pickaxe',
    slot: 'tool',
    reqSkill: 'Mining',
    reqLevel: 50,
    stats: { atk: 32 },
  };

  const bronzePlatebody: EquippableItem = {
    id: 'bronze_platebody',
    name: 'Bronze Platebody',
    slot: 'chest',
    reqSkill: 'Defence',
    reqLevel: 1,
    stats: { def: 15, hp: 10 },
  };

  const ironPlatebody: EquippableItem = {
    id: 'iron_platebody',
    name: 'Iron Platebody',
    slot: 'chest',
    reqSkill: 'Defence',
    reqLevel: 10,
    stats: { def: 25, hp: 20 },
  };

  it('checks skill level prerequisites correctly', () => {
    // Player has Mining 40 (requires 50)
    const lowSkill = canEquipItem(runePickaxe, { mining: 40 });
    expect(lowSkill.canEquip).toBe(false);
    expect(lowSkill.reason).toContain('Requires Mining level 50');

    // Player has Mining 55 (meets 50)
    const highSkill = canEquipItem(runePickaxe, { mining: 55 });
    expect(highSkill.canEquip).toBe(true);
  });

  it('equips item, replaces existing slot gear, and calculates aggregate stats', () => {
    const equipment: PlayerEquipment = {};
    const playerSkills = { mining: 60, defence: 20 };

    // 1. Equip bronze chest
    const equip1 = equipItem(equipment, bronzePlatebody, playerSkills);
    expect(equip1.success).toBe(true);
    expect(equip1.unequippedItem).toBeNull();
    expect(equipment.chest?.id).toBe('bronze_platebody');

    // 2. Equip rune tool
    equipItem(equipment, runePickaxe, playerSkills);
    expect(equipment.tool?.id).toBe('pickaxe_rune');

    // 3. Check aggregate stats
    const stats = calculateEquipmentStats(equipment);
    expect(stats.atk).toBe(32);
    expect(stats.def).toBe(15);
    expect(stats.hp).toBe(10);

    // 4. Upgrade chest to iron platebody (displaces bronze)
    const equipUpgrade = equipItem(equipment, ironPlatebody, playerSkills);
    expect(equipUpgrade.success).toBe(true);
    expect(equipUpgrade.unequippedItem?.id).toBe('bronze_platebody');
    expect(equipment.chest?.id).toBe('iron_platebody');

    // 5. Updated stats
    const newStats = calculateEquipmentStats(equipment);
    expect(newStats.def).toBe(25);
    expect(newStats.hp).toBe(20);
  });

  it('unequips gear cleanly from slot', () => {
    const equipment: PlayerEquipment = {
      chest: ironPlatebody,
    };

    const removed = unequipItem(equipment, 'chest');
    expect(removed?.id).toBe('iron_platebody');
    expect(equipment.chest).toBeNull();
  });
});
