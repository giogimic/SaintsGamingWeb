"use client";

import { create } from "zustand";

interface PostComposerState {
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  openComposer: () => void;
  closeComposer: () => void;
  toggleComposer: () => void;
  setMinimized: (minimized: boolean) => void;
  setMaximized: (maximized: boolean) => void;
}

export const usePostComposerStore = create<PostComposerState>((set) => ({
  isOpen: false,
  isMinimized: false,
  isMaximized: false,
  openComposer: () => set({ isOpen: true, isMinimized: false }),
  closeComposer: () => set({ isOpen: false, isMinimized: false }),
  toggleComposer: () => set((state) => ({ isOpen: !state.isOpen, isMinimized: false })),
  setMinimized: (minimized) => set({ isMinimized: minimized }),
  setMaximized: (maximized) => set({ isMaximized: maximized }),
}));
