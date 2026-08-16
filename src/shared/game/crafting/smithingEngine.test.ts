import { describe, it, expect } from 'vitest';
import { smeltOre, forgeItem } from './smithingEngine';

describe('Forge & Anvil Smithing Matrix Engine (Bible 14)', () => {
  it('smelts bronze and steel bars with appropriate ore consumption', () => {
    // Bronze: 1 copper + 1 tin
    const ores = { ore_copper: 2, ore_tin: 2 };
    const smeltBronze = smeltOre('bar_bronze', 1, ores);

    expect(smeltBronze.success).toBe(true);
    expect(smeltBronze.barItemId).toBe('bar_bronze');
    expect(smeltBronze.xpAwarded).toBe(6.25);
    expect(smeltBronze.consumedOres).toEqual({ ore_copper: 1, ore_tin: 1 });

    // Steel: 1 iron + 2 coal (Requires Smithing lvl 30)
    const steelOres = { ore_iron: 1, ore_coal: 2 };
    const smeltSteelFail = smeltOre('bar_steel', 20, steelOres); // Underleveled
    expect(smeltSteelFail.success).toBe(false);
    expect(smeltSteelFail.reason).toContain('Requires Smithing level 30');

    const smeltSteelSuccess = smeltOre('bar_steel', 30, steelOres);
    expect(smeltSteelSuccess.success).toBe(true);
    expect(smeltSteelSuccess.xpAwarded).toBe(17.5);
  });

  it('forges items at anvil requiring a hammer and sufficient bars', () => {
    // Attempt forging without a hammer (blocked)
    const noHammer = forgeItem('bronze_dagger', 1, 5, false);
    expect(noHammer.success).toBe(false);
    expect(noHammer.reason).toContain('need a hammer');

    // Forge bronze platebody (requires 5 bars, level 18)
    const forgePlate = forgeItem('bronze_platebody', 18, 5, true);
    expect(forgePlate.success).toBe(true);
    expect(forgePlate.barsConsumed).toBe(5);
    expect(forgePlate.xpAwarded).toBe(62.5);

    // Insufficient bars check
    const forgeFailBars = forgeItem('bronze_platebody', 18, 4, true);
    expect(forgeFailBars.success).toBe(false);
    expect(forgeFailBars.reason).toContain('need 5 BRONZE bars');
  });
});
