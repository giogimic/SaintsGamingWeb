import { describe, expect, it } from 'vitest';
import { DirectTradeEngine } from './directTradeEngine';

describe('Direct Player-to-Player Trading Engine (Phase 14)', () => {
  it('creates trading session in initial offering state', () => {
    const engine = new DirectTradeEngine();
    const session = engine.createSession('p1', 'Alice', 'p2', 'Bob');

    expect(session.status).toBe('OFFERING');
    expect(session.participant1.name).toBe('Alice');
    expect(session.participant2.name).toBe('Bob');
    expect(session.participant1.offer.items).toHaveLength(0);
    expect(session.participant1.offer.gold).toBe(0);
  });

  it('resets acceptance flags when any player modifies their offer (Anti-Scam Protection)', () => {
    const engine = new DirectTradeEngine();
    const session = engine.createSession('p1', 'Alice', 'p2', 'Bob');

    // Alice offers 500 gold
    engine.updateOffer(session.tradeId, 'p1', { items: [], gold: 500 });
    // Alice accepts
    engine.acceptOffer(session.tradeId, 'p1');
    expect(session.participant1.acceptedOffer).toBe(true);

    // Bob modifies his offer by adding an item
    engine.updateOffer(session.tradeId, 'p2', {
      items: [{ itemId: 'item_wooden_shield', quantity: 1 }],
      gold: 0,
    });

    // Alice's acceptance MUST be revoked
    expect(session.participant1.acceptedOffer).toBe(false);
    expect(session.participant2.acceptedOffer).toBe(false);
    expect(session.status).toBe('OFFERING');
  });

  it('executes atomic trade after two-stage acceptance and confirmation', () => {
    const engine = new DirectTradeEngine();
    const session = engine.createSession('p1', 'Alice', 'p2', 'Bob');

    // Offers
    engine.updateOffer(session.tradeId, 'p1', {
      items: [{ itemId: 'item_iron_sword', quantity: 1 }],
      gold: 100,
    });
    engine.updateOffer(session.tradeId, 'p2', {
      items: [{ itemId: 'item_health_potion', quantity: 5 }],
      gold: 250,
    });

    // Stage 1: Accept Offer
    engine.acceptOffer(session.tradeId, 'p1');
    const s1 = engine.acceptOffer(session.tradeId, 'p2');
    expect(s1.status).toBe('STAGE1_ACCEPTED');

    // Stage 2: Final Confirmation
    const res1 = engine.confirmTrade(session.tradeId, 'p1');
    expect(res1.executed).toBe(false);
    expect(res1.session.status).toBe('STAGE2_CONFIRMED');

    const res2 = engine.confirmTrade(session.tradeId, 'p2');
    expect(res2.executed).toBe(true);
    expect(res2.session.status).toBe('COMPLETED');
    expect(res2.transfer?.player1Gives.gold).toBe(100);
    expect(res2.transfer?.player2Gives.gold).toBe(250);
  });

  it('handles manual trade cancellation cleanly', () => {
    const engine = new DirectTradeEngine();
    const session = engine.createSession('p1', 'Alice', 'p2', 'Bob');

    const cancelled = engine.cancelTrade(session.tradeId, 'p1', 'Player declined');
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.cancelReason).toBe('Player declined');
  });
});
