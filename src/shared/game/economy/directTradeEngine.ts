/**
 * Saints Gaming — Direct Player-to-Player (P2P) Trading Engine (Bible 15 / Studio Plan)
 * Authoritative 2-stage verification trade state machine with anti-scam offer modification resets and escrow custody.
 */

export type TradeSessionStatus =
  | 'OFFERING'
  | 'STAGE1_ACCEPTED'
  | 'STAGE2_CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface TradeItem {
  itemId: string;
  quantity: number;
}

export interface TradeOffer {
  items: TradeItem[];
  gold: number;
}

export interface TradeParticipantState {
  playerId: string;
  name: string;
  offer: TradeOffer;
  acceptedOffer: boolean; // Stage 1 acceptance
  confirmedTrade: boolean; // Stage 2 final confirmation
}

export interface DirectTradeSession {
  tradeId: string;
  status: TradeSessionStatus;
  participant1: TradeParticipantState;
  participant2: TradeParticipantState;
  createdAt: number;
  updatedAt: number;
  cancelReason?: string;
}

export interface TradeExecutionResult {
  session: DirectTradeSession;
  executed: boolean;
  transfer?: {
    player1Gives: TradeOffer;
    player2Gives: TradeOffer;
  };
}

export class DirectTradeEngine {
  private sessions = new Map<string, DirectTradeSession>();

  /**
   * Generates a unique trade session identifier.
   */
  public generateTradeId(p1Id: string, p2Id: string): string {
    return `trade_${p1Id}_${p2Id}_${Date.now()}`;
  }

  /**
   * Initiates a new P2P trading session between two players.
   */
  public createSession(
    p1Id: string,
    p1Name: string,
    p2Id: string,
    p2Name: string
  ): DirectTradeSession {
    const tradeId = this.generateTradeId(p1Id, p2Id);
    const now = Date.now();

    const session: DirectTradeSession = {
      tradeId,
      status: 'OFFERING',
      participant1: {
        playerId: p1Id,
        name: p1Name,
        offer: { items: [], gold: 0 },
        acceptedOffer: false,
        confirmedTrade: false,
      },
      participant2: {
        playerId: p2Id,
        name: p2Name,
        offer: { items: [], gold: 0 },
        acceptedOffer: false,
        confirmedTrade: false,
      },
      createdAt: now,
      updatedAt: now,
    };

    this.sessions.set(tradeId, session);
    return session;
  }

  /**
   * Retrieves an active trade session by ID.
   */
  public getSession(tradeId: string): DirectTradeSession | null {
    return this.sessions.get(tradeId) || null;
  }

  /**
   * Updates a player's trade offer.
   * Anti-Scam Protection: Modifying the offer automatically resets acceptance and confirmation for BOTH players.
   */
  public updateOffer(tradeId: string, playerId: string, offer: TradeOffer): DirectTradeSession {
    const session = this.sessions.get(tradeId);
    if (!session) throw new Error(`Trade session '${tradeId}' not found`);
    if (session.status === 'COMPLETED' || session.status === 'CANCELLED') {
      throw new Error(`Cannot update offer on ${session.status} trade session`);
    }

    const cleanGold = Math.max(0, Math.floor(offer.gold || 0));
    const cleanItems = (offer.items || [])
      .filter((i) => i.itemId && i.quantity > 0)
      .map((i) => ({ itemId: i.itemId, quantity: Math.floor(i.quantity) }));

    const cleanOffer: TradeOffer = {
      items: cleanItems,
      gold: cleanGold,
    };

    if (session.participant1.playerId === playerId) {
      session.participant1.offer = cleanOffer;
    } else if (session.participant2.playerId === playerId) {
      session.participant2.offer = cleanOffer;
    } else {
      throw new Error(`Player '${playerId}' is not a participant in trade '${tradeId}'`);
    }

    // Anti-scam reset: reset both acceptances and confirmations
    session.participant1.acceptedOffer = false;
    session.participant1.confirmedTrade = false;
    session.participant2.acceptedOffer = false;
    session.participant2.confirmedTrade = false;
    session.status = 'OFFERING';
    session.updatedAt = Date.now();

    return session;
  }

  /**
   * Stage 1: Player accepts the currently visible offer.
   */
  public acceptOffer(tradeId: string, playerId: string): DirectTradeSession {
    const session = this.sessions.get(tradeId);
    if (!session) throw new Error(`Trade session '${tradeId}' not found`);
    if (session.status === 'COMPLETED' || session.status === 'CANCELLED') {
      throw new Error(`Cannot accept ${session.status} trade session`);
    }

    if (session.participant1.playerId === playerId) {
      session.participant1.acceptedOffer = true;
    } else if (session.participant2.playerId === playerId) {
      session.participant2.acceptedOffer = true;
    } else {
      throw new Error(`Player '${playerId}' is not in trade session`);
    }

    // If both accepted -> transition to STAGE1_ACCEPTED
    if (session.participant1.acceptedOffer && session.participant2.acceptedOffer) {
      session.status = 'STAGE1_ACCEPTED';
    }

    session.updatedAt = Date.now();
    return session;
  }

  /**
   * Stage 2: Player final-confirms the trade review screen.
   */
  public confirmTrade(tradeId: string, playerId: string): TradeExecutionResult {
    const session = this.sessions.get(tradeId);
    if (!session) throw new Error(`Trade session '${tradeId}' not found`);
    if (session.status !== 'STAGE1_ACCEPTED' && session.status !== 'STAGE2_CONFIRMED') {
      throw new Error('Both players must accept the offer before final confirmation');
    }

    if (session.participant1.playerId === playerId) {
      session.participant1.confirmedTrade = true;
    } else if (session.participant2.playerId === playerId) {
      session.participant2.confirmedTrade = true;
    } else {
      throw new Error(`Player '${playerId}' is not in trade session`);
    }

    session.status = 'STAGE2_CONFIRMED';
    session.updatedAt = Date.now();

    // If both confirmed -> execute atomic trade
    if (session.participant1.confirmedTrade && session.participant2.confirmedTrade) {
      session.status = 'COMPLETED';
      return {
        session,
        executed: true,
        transfer: {
          player1Gives: session.participant1.offer,
          player2Gives: session.participant2.offer,
        },
      };
    }

    return { session, executed: false };
  }

  /**
   * Cancels the trade session.
   */
  public cancelTrade(tradeId: string, playerId: string, reason: string = 'Trade cancelled'): DirectTradeSession {
    const session = this.sessions.get(tradeId);
    if (!session) throw new Error(`Trade session '${tradeId}' not found`);

    session.status = 'CANCELLED';
    session.cancelReason = reason;
    session.updatedAt = Date.now();

    return session;
  }
}
