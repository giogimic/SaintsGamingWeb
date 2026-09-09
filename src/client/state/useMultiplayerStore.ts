/**
 * Multiplayer Store — Other players, party members, movement prediction.
 *
 * Manages the state of all remote players on the current map and the
 * client-side movement prediction buffer for server reconciliation.
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Direction, Point2D } from '../net/protocol.d';

export interface RemotePlayer {
  accountId?: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  vz?: number;
  lastUpdateMs?: number;
  mapId?: string;
  name: string;
  assetProfileId: string;
  direction?: Direction;
  isMoving?: boolean;
  chatMessage?: string;
  hp?: number;
  maxHp?: number;
  customization?: {
    skinTone: string;
    hairColor: string;
    shirtColor: string;
    pantsColor: string;
  };
}

export interface PartyMember {
  userId: string;
  socketId: string;
  name: string;
  assetProfileId: string;
  position: Point2D;
  creatureParty: any[];
}

export interface PendingMove {
  seq: number;
  direction: Direction;
  predictedPos: Point2D;
}

const DIRECTION_DELTA: Record<string, { dx: number; dy: number }> = {
  up:    { dx: 0, dy: -1 },
  down:  { dx: 0, dy: 1 },
  left:  { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export interface MultiplayerState {
  // Remote players
  otherPlayers: Record<string, RemotePlayer>;
  setOtherPlayers: (players: Record<string, RemotePlayer>) => void;
  updateOtherPlayer: (socketId: string, data: Partial<RemotePlayer>) => void;
  removeOtherPlayer: (socketId: string) => void;

  // Party
  party: PartyMember[];
  isPartyLeader: boolean;
  setParty: (members: PartyMember[]) => void;
  addPartyMember: (member: PartyMember) => void;
  removePartyMember: (userId: string) => void;
  clearParty: () => void;
  updatePartyMemberPosition: (socketId: string, position: Point2D) => void;

  // Local chat bubble
  localChat: string | null;
  setPlayerChat: (message: string) => void;

  // Movement prediction (server reconciliation)
  moveSequence: number;
  pendingMoves: PendingMove[];
  incrementMoveSeq: () => number;
  addPendingMove: (move: PendingMove) => void;
  clearPendingMovesUpTo: (seq: number, serverX?: number, serverY?: number) => void;
  applyServerCorrection: (x: number, y: number, direction: Direction) => void;
}

export const useMultiplayerStore = create<MultiplayerState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Remote players
      otherPlayers: {},

      setOtherPlayers: (players) => set((s) => {
        const normalized: Record<string, RemotePlayer> = {};
        for (const [id, p] of Object.entries(players || {})) {
          if (!p) continue;
          normalized[id] = {
            ...p,
            assetProfileId: (p as any).assetProfileId || (p as any).spriteId || 'adventurer',
          };
        }
        s.otherPlayers = normalized;
      }),

      updateOtherPlayer: (socketId, data) => set((s) => {
        const resolvedSprite = data.assetProfileId || (data as any).spriteId;
        if (!s.otherPlayers[socketId]) {
          s.otherPlayers[socketId] = {
            x: data.x ?? 0,
            y: data.y ?? 0,
            name: data.name || 'Unknown',
            assetProfileId: resolvedSprite || 'adventurer',
            direction: data.direction,
            isMoving: data.isMoving,
            chatMessage: data.chatMessage,
            customization: data.customization,
          };
        } else {
          const p = s.otherPlayers[socketId];
          if (data.x !== undefined) p.x = data.x;
          if (data.y !== undefined) p.y = data.y;
          if (data.name !== undefined) p.name = data.name;
          if (resolvedSprite !== undefined) p.assetProfileId = resolvedSprite;
          if (data.direction !== undefined) p.direction = data.direction;
          if (data.isMoving !== undefined) p.isMoving = data.isMoving;
          if (data.customization !== undefined) p.customization = data.customization;
          if (data.hp !== undefined) p.hp = data.hp;
          if (data.maxHp !== undefined) p.maxHp = data.maxHp;
          if (data.vx !== undefined) p.vx = data.vx;
          if (data.vy !== undefined) p.vy = data.vy;
          if (data.vz !== undefined) p.vz = data.vz;
          if (data.lastUpdateMs !== undefined) p.lastUpdateMs = data.lastUpdateMs;
          if (data.chatMessage !== undefined) {
            p.chatMessage = data.chatMessage;
            if (data.chatMessage) {
              const msg = data.chatMessage;
              setTimeout(() => set((inner) => {
                if (inner.otherPlayers[socketId]?.chatMessage === msg) {
                  inner.otherPlayers[socketId].chatMessage = undefined;
                }
              }), 7000);
            }
          }
        }
      }),

      removeOtherPlayer: (socketId) => set((s) => {
        delete s.otherPlayers[socketId];
      }),

      // Party
      party: [],
      isPartyLeader: false,

      setParty: (members) => set((s) => { s.party = members; }),

      addPartyMember: (member) => set((s) => {
        if (s.party.length < 4) {
          s.party.push(member);
        }
      }),

      removePartyMember: (userId) => set((s) => {
        s.party = s.party.filter((m) => m.userId !== userId);
      }),

      clearParty: () => set((s) => {
        s.party = [];
        s.isPartyLeader = false;
      }),

      updatePartyMemberPosition: (socketId, position) => set((s) => {
        const member = s.party.find((m) => m.socketId === socketId);
        if (member) member.position = position;
      }),

      // Local chat bubble
      localChat: null,
      setPlayerChat: (message) => {
        set((s) => { s.localChat = message; });
        setTimeout(() => set((s) => {
          if (s.localChat === message) s.localChat = null;
        }), 4000);
      },

      // Movement prediction
      moveSequence: 0,
      pendingMoves: [],

      incrementMoveSeq: () => {
        let seq = 0;
        set((s) => {
          s.moveSequence += 1;
          seq = s.moveSequence;
        });
        return seq;
      },

      addPendingMove: (move) => set((s) => {
        s.pendingMoves.push(move);
        if (s.pendingMoves.length > 60) {
          s.pendingMoves = s.pendingMoves.slice(-30);
        }
      }),

      clearPendingMovesUpTo: (seq, serverX, serverY) => set((s) => {
        const remaining = s.pendingMoves.filter((m) => m.seq > seq);
        // Note: position reconciliation happens in usePlayerStore
        // via the movement system, not here. We only manage the buffer.
        s.pendingMoves = remaining;
      }),

      applyServerCorrection: (x, y, direction) => set((s) => {
        // Clear all pending moves on correction
        s.pendingMoves = [];
      }),
    }))
  )
);
