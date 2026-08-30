"use client";

import { create } from "zustand";

interface ImmersiveState {
  isBarsHidden: boolean;
  hideBars: () => void;
  showBars: () => void;
  toggleBars: () => void;
  setBarsHidden: (hidden: boolean) => void;
}

export const useImmersiveStore = create<ImmersiveState>((set) => ({
  isBarsHidden: false,
  hideBars: () => set({ isBarsHidden: true }),
  showBars: () => set({ isBarsHidden: false }),
  toggleBars: () => set((state) => ({ isBarsHidden: !state.isBarsHidden })),
  setBarsHidden: (hidden: boolean) => set({ isBarsHidden: hidden }),
}));
