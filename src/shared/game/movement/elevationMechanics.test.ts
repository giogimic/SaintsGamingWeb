import { describe, it, expect } from 'vitest';
import { checkElevationTraversal } from './elevationMechanics';
import { MovementProfile } from './types';

describe('Elevation & Cliff Jump Mechanics Engine (Bible 34 §5 & Bible 08)', () => {
  const groundTile = { id: 1, name: 'Ground', elevation: 0 };
  const ledgeHighTile = { id: 2, name: 'Cliff Top', elevation: 1 };
  const mountainPeakTile = { id: 3, name: 'Mountain Peak', elevation: 3 };

  const walkingProfile: MovementProfile = {
    mode: 'grid',
    baseSpeed: 5,
    capabilities: ['walk'],
  };

  const climbingProfile: MovementProfile = {
    mode: 'grid',
    baseSpeed: 5,
    capabilities: ['walk', 'climb'],
  };

  const flyingProfile: MovementProfile = {
    mode: 'grid',
    baseSpeed: 5,
    capabilities: ['fly'],
  };

  it('allows flat ground movement with 0 elevation delta', () => {
    const res = checkElevationTraversal(groundTile as any, groundTile as any, { dx: 1, dy: 0 }, walkingProfile);
    expect(res.canTraverse).toBe(true);
    expect(res.isLedgeJump).toBe(false);
    expect(res.deltaElevation).toBe(0);
  });

  it('blocks walking profile from climbing up a ledge, but allows climbing profile', () => {
    // Walking up: blocked
    const walkRes = checkElevationTraversal(groundTile as any, ledgeHighTile as any, { dx: 0, dy: -1 }, walkingProfile);
    expect(walkRes.canTraverse).toBe(false);
    expect(walkRes.reason).toContain('Requires Climb capability');

    // Climbing up: allowed
    const climbRes = checkElevationTraversal(groundTile as any, ledgeHighTile as any, { dx: 0, dy: -1 }, climbingProfile);
    expect(climbRes.canTraverse).toBe(true);
    expect(climbRes.effect).toBe('climb');
  });

  it('allows single-tier ledge jump down (delta === -1) for walking profile with hop effect', () => {
    const hopRes = checkElevationTraversal(ledgeHighTile as any, groundTile as any, { dx: 0, dy: 1 }, walkingProfile);
    expect(hopRes.canTraverse).toBe(true);
    expect(hopRes.isLedgeJump).toBe(true);
    expect(hopRes.deltaElevation).toBe(-1);
    expect(hopRes.effect).toBe('hop');
  });

  it('blocks steep falls (delta <= -2) for walking profiles to prevent fatal falls', () => {
    const steepRes = checkElevationTraversal(mountainPeakTile as any, groundTile as any, { dx: 0, dy: 1 }, walkingProfile);
    expect(steepRes.canTraverse).toBe(false);
    expect(steepRes.reason).toContain('Fall distance (-3) is too dangerous');
  });

  it('allows flying profile to freely traverse any elevation difference', () => {
    const flyRes = checkElevationTraversal(groundTile as any, mountainPeakTile as any, { dx: 0, dy: -1 }, flyingProfile);
    expect(flyRes.canTraverse).toBe(true);
    expect(flyRes.effect).toBe('glide');
  });
});
