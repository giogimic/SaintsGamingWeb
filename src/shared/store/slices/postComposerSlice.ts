import { StateCreator } from "zustand";
import { AppState } from "../useAppStore";

export interface PostComposerSlice {
  isComposerOpen: boolean;
  isComposerMinimized: boolean;
  isComposerMaximized: boolean;
  openComposer: () => void;
  closeComposer: () => void;
  toggleComposer: () => void;
  setComposerMinimized: (minimized: boolean) => void;
  setComposerMaximized: (maximized: boolean) => void;
}

export const createPostComposerSlice: StateCreator<AppState, [], [], PostComposerSlice> = (set) => ({
  isComposerOpen: false,
  isComposerMinimized: false,
  isComposerMaximized: false,
  openComposer: () => set({ isComposerOpen: true, isComposerMinimized: false }),
  closeComposer: () => set({ isComposerOpen: false, isComposerMinimized: false }),
  toggleComposer: () => set((state) => ({ isComposerOpen: !state.isComposerOpen, isComposerMinimized: false })),
  setComposerMinimized: (minimized) => set({ isComposerMinimized: minimized }),
  setComposerMaximized: (maximized) => set({ isComposerMaximized: maximized }),
});
