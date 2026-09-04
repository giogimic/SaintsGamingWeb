import type { StateCreator } from 'zustand';
import type { GameState } from './types';
import { DEFAULT_PRESET_MODERN, BUILTIN_HUD_PRESETS, ensureCompletePreset } from '../hud/default-presets';
import { DEFAULT_HUD_THEME_ID } from '../hud/hud-themes';
import { HUD_PRESET_STORAGE_KEY, CUSTOM_PRESETS_STORAGE_KEY, HUD_CONFIG_STORAGE_KEY, MOBILE_CONTROL_STORAGE_KEY, DEFAULT_HUD_CONFIG } from './types';
import { INITIAL_SKILLS } from './types';

type GameSlice<T> = StateCreator<GameState, [['zustand/immer', never]], [], T>;

export const createMultiplayerSlice: GameSlice<Pick<GameState, "otherPlayers" | "localChat" | "setPlayerChat" | "setOtherPlayers" | "updateOtherPlayer" | "removeOtherPlayer" | "connectionStatus" | "setConnectionStatus" | "latencyMs" | "setLatencyMs" | "setEmitSocketEvent" | "inviteToParty" | "acceptPartyInvite" | "leaveParty" | "updatePartyMemberPosition" | "setParty" | "addPartyMember" | "removePartyMember" | "clearParty">> = (set, get) => ({
otherPlayers: {},

localChat: null,

setPlayerChat: (message) => {
        set((state) => { state.localChat = message; });
        setTimeout(() => set((state) => { 
          if (state.localChat === message) state.localChat = null; 
        }), 4000);
      },

setOtherPlayers: (players) => set((state) => {
        const normalized: typeof state.otherPlayers = {};
        for (const [id, p] of Object.entries(players || {})) {
          if (!p) continue;
          normalized[id] = {
            ...p,
            assetProfileId: (p as any).assetProfileId || (p as any).spriteId || 'adventurer',
          };
        }
        state.otherPlayers = normalized;
      }),

updateOtherPlayer: (socketId, data: any) => set((state) => {
        const resolvedSprite = data.assetProfileId || data.spriteId;
        if (!state.otherPlayers[socketId]) {
          state.otherPlayers[socketId] = {
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
          if (data.x !== undefined) state.otherPlayers[socketId].x = data.x;
          if (data.y !== undefined) state.otherPlayers[socketId].y = data.y;
          if (data.name !== undefined) state.otherPlayers[socketId].name = data.name;
          if (resolvedSprite !== undefined) state.otherPlayers[socketId].assetProfileId = resolvedSprite;
          if (data.direction !== undefined) state.otherPlayers[socketId].direction = data.direction;
          if (data.isMoving !== undefined) state.otherPlayers[socketId].isMoving = data.isMoving;
          if (data.customization !== undefined) state.otherPlayers[socketId].customization = data.customization;
          if (data.chatMessage !== undefined) {
            state.otherPlayers[socketId].chatMessage = data.chatMessage;
            if (data.chatMessage) {
              setTimeout(() => set((s) => {
                if (s.otherPlayers[socketId]?.chatMessage === data.chatMessage) {
                  s.otherPlayers[socketId].chatMessage = undefined;
                }
              }), 4000);
            }
          }
          if (data.hp !== undefined) state.otherPlayers[socketId].hp = data.hp;
          if (data.maxHp !== undefined) state.otherPlayers[socketId].maxHp = data.maxHp;
        }
      }),

removeOtherPlayer: (socketId) => set((state) => {
        delete state.otherPlayers[socketId];
      }),

connectionStatus: 'disconnected',

setConnectionStatus: (status) => set((state) => { state.connectionStatus = status; }),

latencyMs: 0,

setLatencyMs: (ms) => set((state) => { state.latencyMs = ms; }),

setEmitSocketEvent: (emitter) => set((state) => {
        state.emitSocketEvent = emitter;
      }),

inviteToParty: (userId) => set((_state) => {
        // This will be implemented with Socket.IO in Phase 7
        console.log('Inviting user to party:', userId);
      }),

acceptPartyInvite: (inviteId) => set((_state) => {
        // This will be implemented with Socket.IO in Phase 7
        console.log('Accepting party invite:', inviteId);
      }),

leaveParty: () => set((state) => {
        state.player.party = [];
        state.player.isPartyLeader = false;
        const id = Date.now() + Math.random();
        state.toasts = [...state.toasts, { id, message: 'You left the party' }].slice(-3);
        setTimeout(() => set((s) => { s.toasts = s.toasts.filter(t => t.id !== id); }), 3000);
      }),

updatePartyMemberPosition: (socketId, position) => set((state) => {
        const member = state.player.party.find(m => m.socketId === socketId);
        if (member) {
          member.position = position;
        }
      }),

setParty: (members) => set((state) => {
        state.player.party = members;
      }),

addPartyMember: (member) => set((state) => {
        if (state.player.party.length < 4) {
          state.player.party.push(member);
          const id = Date.now() + Math.random();
          state.toasts = [...state.toasts, { id, message: `${member.name} joined the party!` }].slice(-3);
          setTimeout(() => set((s) => { s.toasts = s.toasts.filter(t => t.id !== id); }), 3000);
        } else {
          const id = Date.now() + Math.random();
          state.toasts = [...state.toasts, { id, message: 'Party is full!' }].slice(-3);
          setTimeout(() => set((s) => { s.toasts = s.toasts.filter(t => t.id !== id); }), 3000);
        }
      }),

removePartyMember: (userId) => set((state) => {
        state.player.party = state.player.party.filter(m => m.userId !== userId);
      }),

clearParty: () => set((state) => {
        state.player.party = [];
        state.player.isPartyLeader = false;
      })
});
