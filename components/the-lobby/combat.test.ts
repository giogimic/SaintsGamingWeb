import { expect, test } from 'vitest';
import { getCombatMultiplier } from './combat';

test('combat matrix multiplier logic', () => {
  // Neutral matchups
  expect(getCombatMultiplier('Solar', 'Solar')).toBe(1.0);
  expect(getCombatMultiplier('Volt', 'Bio')).toBe(1.0);
  expect(getCombatMultiplier('None', 'Hydro')).toBe(1.0);

  // Advantage matchups (1.5x damage)
  expect(getCombatMultiplier('Solar', 'Bio')).toBe(1.5);
  expect(getCombatMultiplier('Solar', 'Cryo')).toBe(1.5);
  expect(getCombatMultiplier('Cyber', 'Solar')).toBe(1.5);
  expect(getCombatMultiplier('Hydro', 'Geo')).toBe(1.5);

  // Disadvantage matchups (0.5x damage)
  expect(getCombatMultiplier('Bio', 'Solar')).toBe(0.5);
  expect(getCombatMultiplier('Cryo', 'Geo')).toBe(0.5);
  expect(getCombatMultiplier('Volt', 'Cyber')).toBe(0.5);
});
