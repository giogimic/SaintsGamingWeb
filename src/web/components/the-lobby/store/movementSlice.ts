import type { StateCreator } from 'zustand';
import type { GameState } from './types';
import { DEFAULT_PRESET_MODERN, BUILTIN_HUD_PRESETS, ensureCompletePreset } from '../hud/default-presets';
import { DEFAULT_HUD_THEME_ID } from '../hud/hud-themes';
import { HUD_PRESET_STORAGE_KEY, CUSTOM_PRESETS_STORAGE_KEY, HUD_CONFIG_STORAGE_KEY, MOBILE_CONTROL_STORAGE_KEY, DEFAULT_HUD_CONFIG } from './types';
import { INITIAL_SKILLS, DIRECTION_DELTA, PendingMove } from './types';

type GameSlice<T> = StateCreator<GameState, [['zustand/immer', never]], [], T>;

export const createMovementSlice: GameSlice<Pick<GameState, "moveSequence" | "pendingMoves" | "incrementMoveSeq" | "addPendingMove" | "clearPendingMovesUpTo" | "applyServerCorrection">> = (set, get) => ({
moveSequence: 0,

pendingMoves: [],

incrementMoveSeq: () => {
        let seq = 0;
        set((state) => {
          state.moveSequence += 1;
          seq = state.moveSequence;
        });
        return seq;
      },

addPendingMove: (move) => set((state) => {
        state.pendingMoves.push(move);
        // Cap the buffer at 60 to prevent memory leaks
        if (state.pendingMoves.length > 60) {
          state.pendingMoves = state.pendingMoves.slice(-30);
        }
      }),

clearPendingMovesUpTo: (seq, serverX, serverY) => set((state) => {
        const remainingMoves = state.pendingMoves.filter(m => m.seq > seq);
        
        if (serverX !== undefined && serverY !== undefined) {
           let px = serverX;
           let py = serverY;
           for (const m of remainingMoves) {
              const delta = DIRECTION_DELTA[m.direction];
              if (delta) {
                 px += delta.dx;
                 py += delta.dy;
              }
           }
           state.player.position = { x: px, y: py };
        }
        
        state.pendingMoves = remainingMoves;
      }),

applyServerCorrection: (x, y, direction) => set((state) => {
        state.player.position = { x, y };
        state.player.direction = direction;
        state.player.isMoving = false;
        // Clear all pending moves since the server corrected us
        state.pendingMoves = [];
      })
});
