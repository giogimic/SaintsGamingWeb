import { StateCreator } from "zustand";
import { AppState } from "../useAppStore";

export type UserSettingsTab = "account" | "posts" | "appearance" | "gaming" | "security";

export interface UserSettingsSlice {
  isSettingsOpen: boolean;
  activeSettingsTab: UserSettingsTab;
  isSettingsMinimized: boolean;
  isSettingsMaximized: boolean;
  openSettings: (tab?: UserSettingsTab) => void;
  closeSettings: () => void;
  toggleSettings: (tab?: UserSettingsTab) => void;
  setSettingsActiveTab: (tab: UserSettingsTab) => void;
  setSettingsMinimized: (minimized: boolean) => void;
  setSettingsMaximized: (maximized: boolean) => void;
}

export const createUserSettingsSlice: StateCreator<AppState, [], [], UserSettingsSlice> = (set) => ({
  isSettingsOpen: false,
  activeSettingsTab: "account",
  isSettingsMinimized: false,
  isSettingsMaximized: false,
  openSettings: (tab) => set((state) => ({ 
    isSettingsOpen: true, 
    isSettingsMinimized: false, 
    activeSettingsTab: tab || state.activeSettingsTab 
  })),
  closeSettings: () => set({ isSettingsOpen: false, isSettingsMinimized: false }),
  toggleSettings: (tab) => set((state) => ({ 
    isSettingsOpen: !state.isSettingsOpen, 
    isSettingsMinimized: false,
    activeSettingsTab: tab || state.activeSettingsTab 
  })),
  setSettingsActiveTab: (tab) => set({ activeSettingsTab: tab }),
  setSettingsMinimized: (minimized) => set({ isSettingsMinimized: minimized }),
  setSettingsMaximized: (maximized) => set({ isSettingsMaximized: maximized }),
});
