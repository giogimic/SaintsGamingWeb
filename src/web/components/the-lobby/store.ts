import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { GameState } from './store/types';
export * from './store/types';

import { createPlayerSlice } from './store/playerSlice';
import { createWorldSlice } from './store/worldSlice';
import { createMultiplayerSlice } from './store/multiplayerSlice';
import { createUiSlice } from './store/uiSlice';
import { createHudSlice } from './store/hudSlice';
import { createMovementSlice } from './store/movementSlice';

export const useGameStore = create<GameState>()(
  subscribeWithSelector(
    immer((...a) => ({
      ...createPlayerSlice(...a),
      ...createWorldSlice(...a),
      ...createMultiplayerSlice(...a),
      ...createUiSlice(...a),
      ...createHudSlice(...a),
      ...createMovementSlice(...a),
    }))
  )
);
