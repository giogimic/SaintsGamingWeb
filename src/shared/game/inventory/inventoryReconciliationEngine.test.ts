import { describe, expect, it } from 'vitest';
import { InventoryReconciliationEngine } from './inventoryReconciliationEngine';

describe('Master Anti-Fraud Item Duplication & Inventory Ledger Engine (Phase 43)', () => {
  it('creates unique items with cryptographic provenance and executes atomic transfers', () => {
    const engine = new InventoryReconciliationEngine();

    // 1. Create unique Dragon Scimitar
    const item = engine.createUniqueItem(
      'dragon_scimitar',
      'LOOT_DROP',
      'boss_vampire_lord',
      'player_alice',
      'INVENTORY'
    );

    expect(item.uid).toContain('item_dragon_scimitar');
    expect(item.ownerId).toBe('player_alice');
    expect(item.containerType).toBe('INVENTORY');

    // 2. Transfer item from Alice's Inventory to Alice's Bank
    const transfer = engine.executeTransfer(item.uid, 'player_alice', 'BANK');
    expect(transfer.success).toBe(true);
    expect(transfer.transaction?.fromContainer).toBe('INVENTORY');
    expect(transfer.transaction?.toContainer).toBe('BANK');

    const updated = engine.getItem(item.uid);
    expect(updated?.containerType).toBe('BANK');
    expect(engine.getLedger()).toHaveLength(1);
  });

  it('detects duplicate collisions, locks items in quarantine, and blocks further transfers', () => {
    const engine = new InventoryReconciliationEngine();

    const item = engine.createUniqueItem(
      'elysian_spirit_shield',
      'CRAFTING',
      'player_bob',
      'player_bob',
      'INVENTORY'
    );

    // Flag item for duplicate packet exploit
    const quarantine = engine.detectAndQuarantineDuplicate(
      item.uid,
      'Duplicate UID collision detected across shard instances'
    );
    expect(quarantine.quarantinedCount).toBe(1);
    expect(quarantine.quarantinedItems[0].isQuarantined).toBe(true);

    // Attempted transfer of quarantined item fails
    const transferAttempt = engine.executeTransfer(item.uid, 'player_charlie', 'TRADE_ESCROW');
    expect(transferAttempt.success).toBe(false);
    expect(transferAttempt.error).toContain('locked in anti-fraud quarantine');
  });

  it('audits player inventory against authoritative ledger and detects anomalies', () => {
    const engine = new InventoryReconciliationEngine();

    const validItem = engine.createUniqueItem(
      'twisted_bow',
      'QUEST_REWARD',
      'system',
      'player_david',
      'INVENTORY'
    );

    const bankItem = engine.createUniqueItem(
      'bandos_chestplate',
      'LOOT_DROP',
      'general_graardor',
      'player_david',
      'BANK'
    );

    const quarantinedItem = engine.createUniqueItem(
      'armadyl_godsword',
      'TRADE_TRANSFER',
      'player_eve',
      'player_david',
      'INVENTORY'
    );
    engine.detectAndQuarantineDuplicate(quarantinedItem.uid, 'Suspicious rollback replay');

    // 1. Audit David's valid inventory
    const audit1 = engine.auditPlayerInventory('player_david', [validItem.uid]);
    expect(audit1.consistent).toBe(true);
    expect(audit1.invalidUids).toHaveLength(0);

    // 2. Audit David claiming bank item in inventory + bogus item + quarantined item
    const audit2 = engine.auditPlayerInventory('player_david', [
      validItem.uid,
      bankItem.uid, // Invalid: It is in BANK, not INVENTORY
      'item_fake_hacked_uid', // Invalid: Doesn't exist
      quarantinedItem.uid, // Quarantined
    ]);

    expect(audit2.consistent).toBe(false);
    expect(audit2.invalidUids).toContain(bankItem.uid);
    expect(audit2.invalidUids).toContain('item_fake_hacked_uid');
    expect(audit2.quarantinedUids).toContain(quarantinedItem.uid);
  });
});
