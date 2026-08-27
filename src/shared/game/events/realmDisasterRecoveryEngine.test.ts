import { describe, expect, it } from 'vitest';
import { RealmDisasterRecoveryEngine } from './realmDisasterRecoveryEngine';

describe('Comprehensive Live Ops Disaster Recovery, Rollback Snapshot & Realm State Freeze Engine (Phase 31)', () => {
  it('manages emergency realm freeze state toggles', () => {
    const engine = new RealmDisasterRecoveryEngine();

    expect(engine.isRealmFrozen()).toBe(false);

    // Trigger emergency freeze
    const freeze = engine.triggerEmergencyFreeze('CRITICAL_EXPLOIT', 'admin_security');
    expect(freeze.isFrozen).toBe(true);
    expect(freeze.reason).toBe('CRITICAL_EXPLOIT');
    expect(engine.isRealmFrozen()).toBe(true);

    // Lift freeze
    const lift = engine.liftFreeze();
    expect(lift.isFrozen).toBe(false);
    expect(engine.isRealmFrozen()).toBe(false);
  });

  it('captures, stores, and restores immutable realm state snapshots', () => {
    const engine = new RealmDisasterRecoveryEngine();

    const snapshot = engine.createSnapshot({
      schemaVersion: '2.1.459-82',
      totalPlayersOnline: 1250,
      activeWorldEvents: ['BLOOD_MOON_ECLIPSE'],
      economyMetrics: {
        totalCirculatingGold: 50000000,
        inflationIndex: 1.05,
      },
      playerStateChecksum: 'sha256_chk_998811',
    });

    expect(snapshot.snapshotId).toContain('snapshot_');
    expect(snapshot.totalPlayersOnline).toBe(1250);

    // Restore snapshot
    const restore = engine.restoreSnapshot(snapshot.snapshotId);
    expect(restore.success).toBe(true);
    expect(restore.snapshot?.playerStateChecksum).toBe('sha256_chk_998811');

    // Unknown snapshot restore fails
    const fail = engine.restoreSnapshot('invalid_id');
    expect(fail.success).toBe(false);
  });

  it('computes scaled player compensation packages for rollback incidents', () => {
    const engine = new RealmDisasterRecoveryEngine();

    const affected = ['player_1', 'player_2'];

    // 45-minute rollback
    const comp45 = engine.calculateCompensation(affected, 45);
    expect(comp45).toHaveLength(2);
    expect(comp45[0].goldCompensation).toBe(22500); // 45 * 500
    expect(comp45[0].bonusXpScrolls).toBe(1);
    expect(comp45[0].membershipDaysAdded).toBe(1);

    // Severe 120-minute rollback
    const comp120 = engine.calculateCompensation(affected, 120);
    expect(comp120[0].goldCompensation).toBe(60000); // 120 * 500
    expect(comp120[0].bonusXpScrolls).toBe(3);
    expect(comp120[0].membershipDaysAdded).toBe(2);
  });
});
