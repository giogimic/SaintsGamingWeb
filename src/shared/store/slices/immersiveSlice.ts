import { StateCreator } from "zustand";
import { AppState } from "../useAppStore";

export interface ImmersiveSlice {
  isBarsHidden: boolean;
  hideBars: () => void;
  showBars: () => void;
  toggleBars: () => void;
  setBarsHidden: (hidden: boolean) => void;
}

export const createImmersiveSlice: StateCreator<AppState, [], [], ImmersiveSlice> = (set) => ({
  isBarsHidden: false,
  hideBars: () => set({ isBarsHidden: true }),
  showBars: () => set({ isBarsHidden: false }),
  toggleBars: () => set((state) => ({ isBarsHidden: !state.isBarsHidden })),
  setBarsHidden: (hidden) => set({ isBarsHidden: hidden }),
});
